'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, users, policies, dependents, documents, paymentMethods, policyStatusEnum, claims, appointments, customerTasks, postSaleTasks, documentTemplates, generatedDocuments, taskComments, documentSigners, signatureDocuments } from '@/db/schema';
import { and, eq, desc, inArray, ilike, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createPresignedPostForUpload, deleteFromS3, getPresignedUrlForDownload } from "@/lib/s3";
import { createAppointmentSchema, createClaimSchema, createFullApplicationSchema, createTaskSchema, createPostSaleTaskSchema, createTemplateSchema } from './schemas';
import { generateReadablePolicyId, formatDateUS, formatTextUppercase } from '@/lib/policy-utils';
import { AORService } from '@/lib/aor-service'; // Usar el servicio actualizado
import { SignatureService } from '@/lib/signature-service';

// --- UTILIDADES DE PERMISOS ---

function hasDownloadPermission(user: any): boolean {
  if (!user) return false;
  // Solo super_admin, manager y processor pueden descargar documentos
  const allowedRoles = ['super_admin', 'manager', 'processor'];
  return allowedRoles.includes(user.role) && user.canDownload;
}

function canAccessCustomerDetails(user: any, customer: any): boolean {
  if (!user || !customer) return false;

  // Super admin puede ver todo
  if (user.role === 'super_admin') return true;

  // Si el caso ya fue enviado a procesamiento, solo processor y super_admin pueden verlo
  if (customer.processingStartedAt) {
    return ['super_admin', 'processor'].includes(user.role);
  }

  // Manager puede ver casos de su equipo
  if (user.role === 'manager') {
    // Necesitamos verificar si el agente creador pertenece al manager
    return true; // Se verifica en la consulta
  }

  // Agent solo puede ver sus propios casos
  if (user.role === 'agent') {
    return customer.createdByAgentId === user.id;
  }

  // Call center puede ver casos si tiene agente asignado
  if (user.role === 'call_center') {
    return customer.createdByAgentId === user.assignedAgentId;
  }

  // Customer service puede ver todo lo que no esté en procesamiento
  if (user.role === 'customer_service') {
    return !customer.processingStartedAt;
  }

  return false;
}

// --- NUEVO: Server Action para obtener la URL de descarga del AOR firmado ---
export async function getSignedAorUrl(policyId: string) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || !hasDownloadPermission(user)) {
        return { success: false, message: "No tienes permiso para descargar documentos." };
    }

    try {
        const policy = await db.query.policies.findFirst({
            where: eq(policies.id, policyId),
            columns: { aorDocumentId: true }
        });

        if (!policy || !policy.aorDocumentId) {
            return { success: false, message: "Esta póliza no tiene un AOR asociado o aún no ha sido firmado." };
        }
        
        // Usamos el aorDocumentId (que es el ID del signatureDocument) para obtener la URL
        return await SignatureService.getSignedDocumentUrl(policy.aorDocumentId);

    } catch (error) {
        console.error("Error al obtener la URL del AOR firmado:", error);
        return { success: false, message: "Error interno al obtener el documento." };
    }
}

// --- NUEVO: Server Action para obtener el enlace de copia para el cliente ---
export async function getClientCopyLink(policyId: string) {
    const session = await auth();
    const user = session?.user;
    // Permitir a más roles compartir el enlace, no solo los que pueden descargar
    const allowedRoles = ['super_admin', 'manager', 'processor', 'agent', 'customer_service'];
    if (!user?.id || !allowedRoles.includes(user.role)) {
        return { success: false, message: "No tienes permiso para esta acción." };
    }

    try {
        const policy = await db.query.policies.findFirst({
            where: eq(policies.id, policyId),
            columns: { aorDocumentId: true }
        });
        
        if (!policy?.aorDocumentId) {
            return { success: false, message: "Póliza sin AOR asociado." };
        }
        
        const doc = await db.query.signatureDocuments.findFirst({
            where: eq(signatureDocuments.id, policy.aorDocumentId),
            columns: { publicToken: true, status: true }
        });

        if (!doc || doc.status !== 'completed' || !doc.publicToken) {
            return { success: false, message: "El documento aún no está listo para ser compartido." };
        }

        // --- ATENCIÓN: Este endpoint aún no existe. Deberás crearlo. ---
        // Por ahora, devolvemos el enlace de firma, pero lo ideal es tener un /download/[publicToken]
        const signer = await db.query.documentSigners.findFirst({
            where: eq(documentSigners.documentId, policy.aorDocumentId),
            columns: { signerToken: true }
        });

        if (!signer) return { success: false, message: "No se encontró firmante." };

        // Devolvemos el mismo enlace de firma. La página ahora sabe qué hacer si ya está firmado.
        const copyUrl = `${process.env.NEXTAUTH_URL}/sign/${signer.signerToken}`;
        
        return { success: true, url: copyUrl };

    } catch (error) {
        return { success: false, message: "Error al generar el enlace." };
    }
}

// +++ ACCIONES PARA EL TABLERO KANBAN DE POST-VENTA +++
export async function getPoliciesForBoard() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    throw new Error('No autorizado');
  }

  try {
    const conditions = [];
    if (user.role === 'agent') {
      const agentCustomerIds = await db.select({ id: customers.id }).from(customers).where(eq(customers.createdByAgentId, user.id));
      if (agentCustomerIds.length > 0) {
        conditions.push(inArray(policies.customerId, agentCustomerIds.map(c => c.id)));
      } else {
        return {};
      }
    } else if (user.role === 'manager') {
      const teamAgentIds = await db.select({ id: users.id }).from(users).where(eq(users.managerId, user.id));
      const agentIds = teamAgentIds.map(a => a.id);
      agentIds.push(user.id);
      const managerCustomerIds = await db.select({ id: customers.id }).from(customers).where(inArray(customers.createdByAgentId, agentIds));
       if (managerCustomerIds.length > 0) {
        conditions.push(inArray(policies.customerId, managerCustomerIds.map(c => c.id)));
      } else {
        return {};
      }
    } else if (user.role === 'call_center' && user.assignedAgentId) {
      const callCenterCustomerIds = await db.select({ id: customers.id }).from(customers).where(eq(customers.createdByAgentId, user.assignedAgentId));
      if (callCenterCustomerIds.length > 0) {
        conditions.push(inArray(policies.customerId, callCenterCustomerIds.map(c => c.id)));
      } else {
        return {};
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const allPolicies = await db.query.policies.findMany({
      where: whereClause,
      with: {
        customer: {
          columns: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [desc(policies.createdAt)],
    });

    const policiesByStatus = allPolicies.reduce((acc, policy) => {
      const status = policy.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(policy);
      return acc;
    }, {} as Record<typeof policyStatusEnum.enumValues[number], typeof allPolicies>);

    return policiesByStatus;

  } catch (error) {
    console.error('Error al obtener pólizas para el tablero:', error);
    throw new Error('No se pudieron obtener las pólizas.');
  }
}

// --- ACCIONES PARA SUBIDA DE ARCHIVOS CON PERMISOS ---
export async function generatePresignedUrlForUpload({ fileName, fileType }: { fileName: string, fileType: string }) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return { success: false, error: "No autorizado" };
  }
  const presignedPost = await createPresignedPostForUpload({
    userId: user.id,
    fileName,
    fileType,
  });
  return presignedPost;
}

export async function deleteFileFromS3(key: string) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || !hasDownloadPermission(user)) {
        return { success: false, error: "No autorizado" };
    }
    await deleteFromS3(key);
    return { success: true };
}

// --- FUNCIONES AUXILIARES MEJORADAS ---
function formatDateForDB(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- ACCIONES PRINCIPALES DEL MÓDULO DE CLIENTES CON PERMISOS ---

export async function getCustomers(page = 1, limit = 10, search = '') {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    throw new Error('No autorizado');
  }

  try {
    const conditions = [];
    
    // Control de acceso por rol
    if (user.role === 'agent') {
      conditions.push(eq(customers.createdByAgentId, user.id));
    } else if (user.role === 'manager') {
      const teamAgentIds = await db.select({ id: users.id }).from(users).where(eq(users.managerId, user.id));
      const agentIds = teamAgentIds.map(a => a.id);
      agentIds.push(user.id);
      if (agentIds.length > 0) {
        conditions.push(inArray(customers.createdByAgentId, agentIds));
      }
    } else if (user.role === 'call_center' && user.assignedAgentId) {
      conditions.push(eq(customers.createdByAgentId, user.assignedAgentId));
    } else if (user.role === 'customer_service') {
      // Customer service ve todo excepto casos en procesamiento
      conditions.push(eq(customers.processingStartedAt, null));
    }
    // super_admin y processor ven todo

    if (search) {
      conditions.push(ilike(customers.fullName, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const customersList = await db.query.customers.findMany({
      where: whereClause,
      orderBy: [desc(customers.createdAt)],
      limit: limit,
      offset: (page - 1) * limit,
      with: {
        createdByAgent: { 
          columns: { 
            firstName: true, 
            lastName: true,
            name: true,
          } 
        },
        policies: {
          orderBy: [desc(policies.createdAt)],
          limit: 1,
          columns: { 
            status: true,
            marketplaceId: true,
            planName: true,
            insuranceCompany: true
          }
        }
      }
    });

    const totalQuery = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(whereClause);
    const total = totalQuery[0]?.count || 0;

    return {
      customers: customersList,
      pagination: {
        page, limit, total, totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    throw new Error('No se pudieron obtener los clientes.');
  }
}

export async function getCustomerDetails(customerId: string) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || !user.role) {
        throw new Error("No autorizado");
    }

    try {
        const customerDetails = await db.query.customers.findFirst({
            where: eq(customers.id, customerId),
            with: {
                createdByAgent: {
                    columns: {
                        firstName: true,
                        lastName: true,
                        name: true
                    }
                },
                dependents: {
                    with: {
                        documents: {
                            with: {
                                uploadedByUser: {
                                    columns: {
                                        firstName: true,
                                        lastName: true,
                                        name: true,
                                    }
                                }
                            },
                            orderBy: [desc(documents.createdAt)]
                        }
                    },
                    orderBy: [desc(dependents.createdAt)]
                },
                documents: {
                    where: sql`${documents.dependentId} IS NULL`,
                    with: {
                        uploadedByUser: {
                            columns: {
                                firstName: true,
                                lastName: true,
                                name: true
                            }
                        }
                    },
                    orderBy: [desc(documents.createdAt)]
                },
                policies: {
                    columns: {
                        id: true,
                        customerId: true,
                        status: true,
                        insuranceCompany: true,
                        monthlyPremium: true,
                        marketplaceId: true,
                        planName: true,
                        effectiveDate: true,
                        planLink: true,
                        taxCredit: true,
                        aorLink: true,
                        aorDocumentId: true,
                        notes: true,
                        assignedProcessorId: true,
                        commissionStatus: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    with: {
                        assignedProcessor: {
                            columns: {
                                firstName: true,
                                lastName: true,
                                name: true
                            }
                        },
                        paymentMethod: true,
                        claims: {
                            orderBy: [desc(claims.dateFiled)]
                        },
                        appointments: {
                            orderBy: [desc(appointments.appointmentDate)]
                        }
                    },
                    orderBy: [desc(policies.createdAt)]
                },
                tasks: {
                    with: {
                        assignedTo: {
                            columns: { firstName: true, lastName: true, name: true }
                        },
                        createdBy: {
                            columns: { firstName: true, lastName: true, name: true }
                        },
                        comments: {
                            with: {
                                createdBy: {
                                    columns: { firstName: true, lastName: true, name: true }
                                }
                            },
                            orderBy: [desc(taskComments.createdAt)]
                        }
                    },
                    orderBy: [desc(customerTasks.createdAt)]
                },
                generatedDocuments: {
                    with: {
                        template: true,
                        generatedBy: {
                            columns: { firstName: true, lastName: true, name: true }
                        }
                    },
                    orderBy: [desc(generatedDocuments.createdAt)]
                }
            }
        });

        if (!customerDetails) {
            return null;
        }

        // Verificar permisos de acceso
        if (!canAccessCustomerDetails(user, customerDetails)) {
            throw new Error("Acceso denegado.");
        }

        return customerDetails;

    } catch (error) {
        console.error("Error al obtener detalles del cliente:", error);
        throw new Error("No se pudieron obtener los detalles del cliente.");
    }
}

export async function getDocumentUrl(s3Key: string) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || !hasDownloadPermission(user)) {
        return { success: false, error: "No tienes permiso para descargar documentos" };
    }
    try {
        const url = await getPresignedUrlForDownload(s3Key);
        return { success: true, url };
    } catch (error) {
        console.error("Error getting presigned URL:", error);
        return { success: false, error: "No se pudo obtener la URL del documento." };
    }
}

/**
 * Crea la aplicación completa con validaciones mejoradas, formateo automático y AOR automático
 */
export async function createFullApplication(data: unknown) {
    const session = await auth();
    const agent = session?.user;
    if (!agent?.id || !['agent', 'manager', 'call_center'].includes(agent.role)) {
        return { success: false, message: "No tienes permiso para crear aplicaciones." };
    }

    const parseResult = createFullApplicationSchema.safeParse(data);
    if (!parseResult.success) {
        console.error("Error de validación Zod:", parseResult.error.flatten());
        return {
            success: false,
            message: "Datos del formulario inválidos.",
            errors: parseResult.error.flatten().fieldErrors,
        };
    }
    const validatedData = parseResult.data;

    try {
        const result = await db.transaction(async (tx) => {
            console.log("1. Creando cliente...");
            
            // Determinar el agente que debe registrarse
            let actualAgentId = agent.id;
            if (agent.role === 'call_center' && agent.assignedAgentId) {
                actualAgentId = agent.assignedAgentId;
            }
            
            // 1. Crear el cliente con formateo automático
            const [newCustomer] = await tx.insert(customers).values({
                fullName: formatTextUppercase(validatedData.customer.fullName),
                gender: validatedData.customer.gender || null,
                birthDate: formatDateForDB(validatedData.customer.birthDate)!,
                email: validatedData.customer.email?.toLowerCase().trim() || null,
                phone: validatedData.customer.phone?.replace(/\D/g, '') || null,
                ssn: validatedData.customer.ssn?.replace(/\D/g, '') || null,
                appliesToCoverage: validatedData.customer.appliesToCoverage,
                immigrationStatus: validatedData.customer.immigrationStatus || null,
                documentType: validatedData.customer.documentType || null,
                address: formatTextUppercase(validatedData.customer.address),
                zipCode: validatedData.customer.zipCode || null,
                county: formatTextUppercase(validatedData.customer.county),
                state: validatedData.customer.state || null,
                taxType: validatedData.customer.taxType || null,
                income: validatedData.customer.income ? String(validatedData.customer.income) : null,
                declaresOtherPeople: validatedData.customer.declaresOtherPeople,
                createdByAgentId: actualAgentId,
            }).returning({ id: customers.id });

            if (!newCustomer?.id) throw new Error("No se pudo crear el cliente");
            const customerId = newCustomer.id;
            console.log(`Cliente creado con ID: ${customerId}`);

            console.log("2. Creando póliza...");
            
            // 2. Crear la póliza con ID legible
            const readablePolicyId = generateReadablePolicyId(validatedData.policy.insuranceCompany);
            
            const [newPolicy] = await tx.insert(policies).values({
                customerId: customerId,
                insuranceCompany: validatedData.policy.insuranceCompany.trim(),
                marketplaceId: readablePolicyId,
                planName: formatTextUppercase(validatedData.policy.planName),
                monthlyPremium: validatedData.policy.monthlyPremium ? String(validatedData.policy.monthlyPremium) : null,
                effectiveDate: formatDateForDB(validatedData.policy.effectiveDate),
                planLink: validatedData.policy.planLink || null,
                taxCredit: validatedData.policy.taxCredit ? String(validatedData.policy.taxCredit) : null,
                aorLink: validatedData.policy.aorLink || null,
                notes: formatTextUppercase(validatedData.policy.notes),
                status: 'new_lead',
            }).returning({ id: policies.id });

            if (!newPolicy?.id) throw new Error("No se pudo crear la póliza");
            const policyId = newPolicy.id;
            console.log(`Póliza creada con ID: ${policyId} (ID legible: ${readablePolicyId})`);

            console.log("3. Creando dependientes y sus documentos...");
            // 3. Crear dependientes con formateo automático
            if (validatedData.dependents?.length) {
                for (const dep of validatedData.dependents) {
                    const [newDependent] = await tx.insert(dependents).values({
                        customerId: customerId,
                        fullName: formatTextUppercase(dep.fullName),
                        relationship: formatTextUppercase(dep.relationship),
                        birthDate: formatDateForDB(dep.birthDate),
                        immigrationStatus: dep.immigrationStatus || null,
                        appliesToPolicy: dep.appliesToPolicy,
                    }).returning({ id: dependents.id });

                    if (dep.documents?.length) {
                        const dependentDocsData = dep.documents.map(doc => ({
                            customerId: customerId,
                            policyId: policyId,
                            dependentId: newDependent.id,
                            s3Key: doc.s3Key,
                            fileName: doc.fileName,
                            fileType: doc.fileType,
                            fileSize: doc.fileSize,
                            uploadedByUserId: agent.id!,
                        }));
                        await tx.insert(documents).values(dependentDocsData);
                        console.log(`Insertados ${dependentDocsData.length} documentos para el dependiente ${dep.fullName}`);
                    }
                }
            }
            
            console.log("4. Creando documentos generales del titular...");
            // 4. Crear documentos generales
            if (validatedData.documents?.length) {
                const generalDocsData = validatedData.documents.map(doc => ({
                    customerId: customerId,
                    policyId: policyId,
                    s3Key: doc.s3Key,
                    fileName: doc.fileName,
                    fileType: doc.fileType,
                    fileSize: doc.fileSize,
                    uploadedByUserId: agent.id!,
                }));
                await tx.insert(documents).values(generalDocsData);
                console.log(`Insertados ${generalDocsData.length} documentos generales.`);
            }
    
            // 5. Crear método de pago con validaciones mejoradas
            if (validatedData.payment && validatedData.payment.methodType) {
                console.log("5. Creando método de pago...");
                
                if (validatedData.payment.methodType === 'credit_card' || validatedData.payment.methodType === 'debit_card') {
                    if (!validatedData.payment.cardHolderName?.trim()) {
                        throw new Error("El nombre del titular de la tarjeta es requerido");
                    }
                    if (!validatedData.payment.cardNumber?.trim()) {
                        throw new Error("El número de tarjeta es requerido");
                    }
                } else if (validatedData.payment.methodType === 'bank_account') {
                    if (!validatedData.payment.bankName?.trim()) {
                        throw new Error("El nombre del banco es requerido");
                    }
                    if (!validatedData.payment.routingNumber?.trim()) {
                        throw new Error("El número de ruta es requerido");
                    }
                    if (!validatedData.payment.accountNumber?.trim()) {
                        throw new Error("El número de cuenta es requerido");
                    }
                }
                
                const mockProviderToken = `policy_${readablePolicyId}_${Date.now()}`; 
                
                const paymentData = {
                    policyId: newPolicy.id,
                    methodType: validatedData.payment.methodType,
                    provider: 'mock_provider',
                    providerToken: mockProviderToken,
                    cardBrand: validatedData.payment.cardNumber ? 'visa' : null,
                    cardLast4: validatedData.payment.cardNumber ? validatedData.payment.cardNumber.replace(/\D/g, '').slice(-4) : null,
                    cardExpiration: validatedData.payment.expirationDate || null,
                    bankName: validatedData.payment.bankName || null,
                    accountLast4: validatedData.payment.accountNumber ? validatedData.payment.accountNumber.slice(-4) : null,
                };

                const [createdPaymentMethod] = await tx.insert(paymentMethods).values(paymentData).returning({ id: paymentMethods.id });
                console.log("Método de pago creado con ID:", createdPaymentMethod.id);
            }

            return { customerId, policyId: newPolicy.id, readablePolicyId, actualAgentId };
        });

        console.log("Transacción completada exitosamente:", result);

        // 6. GENERACIÓN AUTOMÁTICA DE AOR CON NUESTRO SISTEMA
        console.log("6. Generando y enviando AOR con sistema propio...");
        try {
            const aorResult = await AORService.createAndSendAOR({
                customerId: result.customerId,
                policyId: result.policyId,
                policyData: {
                    insuranceCompany: validatedData.policy.insuranceCompany,
                    planName: validatedData.policy.planName,
                    marketplaceId: result.readablePolicyId,
                    effectiveDate: validatedData.policy.effectiveDate ? formatDateUS(validatedData.policy.effectiveDate) : undefined,
                    monthlyPremium: validatedData.policy.monthlyPremium ? String(validatedData.policy.monthlyPremium) : undefined,
                },
                createdByAgentId: result.actualAgentId,
            });

            console.log("AOR creado y enviado exitosamente con sistema propio:", aorResult);

            // Actualizar la póliza con el enlace del AOR
            await db.update(policies)
                .set({ 
                    aorLink: aorResult.signingUrl,
                    aorDocumentId: aorResult.id,
                    status: 'contacting'
                })
                .where(eq(policies.id, result.policyId));

            // 7. Crear tarea automática para seguimiento del AOR
            await db.insert(customerTasks).values({
                customerId: result.customerId,
                policyId: result.policyId,
                title: "Seguimiento de Firma AOR",
                description: `AOR enviado automáticamente para la póliza ${result.readablePolicyId}. Pendiente de firma del cliente.`,
                type: "aor_signature",
                priority: "high",
                assignedToId: result.actualAgentId,
                createdById: agent.id!,
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
            });

        } catch (aorError) {
            console.warn("Advertencia: No se pudo generar el AOR automáticamente:", aorError);
        }

        revalidatePath('/customers');
        return { 
            success: true, 
            message: `Aplicación creada con éxito. ID de Póliza: ${result.readablePolicyId}. AOR enviado automáticamente para firma electrónica.`, 
            data: result 
        };
        
    } catch (error) {
        console.error("Error detallado creando aplicación:", error);
        const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        return { success: false, message: `Error: ${message}` };
    }
}


// --- ACCIONES DE POST-VENTA ---

export async function getCustomersForSelection() {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) throw new Error("No autorizado");

    const conditions = [];
    if (user.role === 'agent') {
      conditions.push(eq(customers.createdByAgentId, user.id));
    } else if (user.role === 'manager') {
      const teamAgentIds = await db.select({ id: users.id }).from(users).where(eq(users.managerId, user.id));
      const agentIds = teamAgentIds.map(a => a.id);
      agentIds.push(user.id);
      conditions.push(inArray(customers.createdByAgentId, agentIds));
    } else if (user.role === 'call_center' && user.assignedAgentId) {
      conditions.push(eq(customers.createdByAgentId, user.assignedAgentId));
    } else if (user.role === 'customer_service') {
      conditions.push(eq(customers.processingStartedAt, null));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const customerList = await db.query.customers.findMany({
        where: whereClause,
        columns: { id: true, fullName: true },
        with: {
            policies: {
                columns: { id: true, planName: true, insuranceCompany: true, marketplaceId: true }
            }
        },
        orderBy: [desc(customers.createdAt)],
    });

    return customerList.filter(c => c.policies.length > 0);
}

export async function createAppointment(data: unknown) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return { success: false, message: "No autorizado." };

    const parseResult = createAppointmentSchema.safeParse(data);
    if (!parseResult.success) {
        return { success: false, message: "Datos inválidos.", errors: parseResult.error.flatten() };
    }
    const { customerId, policyId, appointmentDate, notes } = parseResult.data;

    try {
        await db.insert(appointments).values({
            customerId,
            policyId,
            appointmentDate,
            notes: notes ? formatTextUppercase(notes) : null,
            agentId: user.id,
        });

        revalidatePath('/customers');
        return { success: true, message: "Cita agendada con éxito." };
    } catch (error) {
        console.error("Error al crear la cita:", error);
        return { success: false, message: "No se pudo agendar la cita." };
    }
}

export async function createClaim(data: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "No autorizado." };

    const parseResult = createClaimSchema.safeParse(data);
    if (!parseResult.success) {
        return { success: false, message: "Datos inválidos.", errors: parseResult.error.flatten() };
    }
     const { customerId, policyId, dateFiled, claimNumber, description } = parseResult.data;

    try {
        await db.insert(claims).values({
            customerId,
            policyId,
            dateFiled: formatDateForDB(dateFiled)!,
            claimNumber: claimNumber ? claimNumber.toUpperCase() : null,
            description: formatTextUppercase(description),
        });

        revalidatePath('/customers');
        return { success: true, message: "Reclamo registrado con éxito." };
    } catch (error) {
        console.error("Error al crear el reclamo:", error);
        return { success: false, message: "No se pudo registrar el reclamo." };
    }
}

export async function getPaymentMethodDetails(policyId: string) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || user.role !== 'super_admin') {
    return { success: false, error: "No tienes permiso para realizar esta acción." };
  }

  try {
    const paymentMethod = await db.query.paymentMethods.findFirst({ 
      where: eq(paymentMethods.policyId, policyId) 
    });

    if (!paymentMethod) {
      return { success: false, error: "No se encontró método de pago." };
    }
    
    return { 
      success: true, 
      data: {
        methodType: paymentMethod.methodType,
        cardBrand: paymentMethod.cardBrand,
        cardLast4: paymentMethod.cardLast4,
        bankName: paymentMethod.bankName,
      }
    };
  } catch (error) {
    console.error("Error al obtener método de pago:", error);
    return { success: false, error: "No se pudo obtener la información de pago." };
  }
}

// ACCIÓN: Reenviar AOR manualmente (actualizada)
export async function resendAOR(customerId: string, policyId: string) {
    const session = await auth();
    const user = session?.user;

    if (!user?.id || !['agent', 'manager', 'customer_service'].includes(user.role)) {
        return { success: false, message: "No tienes permiso para esta acción." };
    }

    try {
        const policy = await db.query.policies.findFirst({
            where: eq(policies.id, policyId),
            with: {
                customer: true,
            },
        });

        if (!policy || !policy.customer) {
            return { success: false, message: "Póliza no encontrada." };
        }

        // Verificar permisos
        if (!canAccessCustomerDetails(user, policy.customer)) {
            return { success: false, message: "No tienes permiso para esta póliza." };
        }

        // Generar y enviar nuevo AOR con nuestro sistema
        const aorResult = await AORService.createAndSendAOR({
            customerId,
            policyId,
            policyData: {
                insuranceCompany: policy.insuranceCompany || '',
                planName: policy.planName || '',
                marketplaceId: policy.marketplaceId || undefined,
                effectiveDate: policy.effectiveDate ? formatDateUS(policy.effectiveDate) : undefined,
                monthlyPremium: policy.monthlyPremium || undefined,
            },
            createdByAgentId: policy.customer.createdByAgentId,
        });

        // Actualizar la póliza con el nuevo enlace
        await db.update(policies)
            .set({ 
                aorLink: aorResult.signingUrl,
                aorDocumentId: aorResult.id,
            })
            .where(eq(policies.id, policyId));

        revalidatePath('/customers');
        return { 
            success: true, 
            message: "AOR reenviado con éxito usando sistema propio.",
            data: { signingUrl: aorResult.signingUrl }
        };

    } catch (error) {
        console.error("Error reenviando AOR:", error);
        return { 
            success: false, 
            message: `Error al reenviar AOR: ${error instanceof Error ? error.message : 'Error desconocido'}` 
        };
    }
}


// ACCIÓN: Marcar caso como enviado a procesamiento
export async function sendToProcessing(customerId: string) {
  const session = await auth();
  const user = session?.user;
  
  if (!user?.id || !['agent', 'manager'].includes(user.role)) {
    return { success: false, message: "No tienes permiso para esta acción." };
  }

  try {
    await db.update(customers)
      .set({ processingStartedAt: new Date() })
      .where(eq(customers.id, customerId));

    revalidatePath('/customers');
    return { success: true, message: "Caso enviado a procesamiento." };
  } catch (error) {
    console.error("Error enviando a procesamiento:", error);
    return { success: false, message: "Error al enviar a procesamiento." };
  }
}

// --- NUEVAS ACCIONES PARA SISTEMA DE TAREAS ---

export async function createCustomerTask(data: unknown) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { success: false, message: "No autorizado." };

  const parseResult = createTaskSchema.safeParse(data);
  if (!parseResult.success) {
    return { success: false, message: "Datos inválidos.", errors: parseResult.error.flatten() };
  }

  const { customerId, policyId, title, description, type, priority, assignedToId, dueDate } = parseResult.data;

  try {
    await db.insert(customerTasks).values({
      customerId,
      policyId,
      title: formatTextUppercase(title),
      description: description ? formatTextUppercase(description) : null,
      type,
      priority,
      assignedToId,
      createdById: user.id,
      dueDate,
    });

    revalidatePath('/customers');
    return { success: true, message: "Tarea creada con éxito." };
  } catch (error) {
    console.error("Error al crear tarea:", error);
    return { success: false, message: "No se pudo crear la tarea." };
  }
}

export async function updateCustomerTask(taskId: string, data: unknown) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { success: false, message: "No autorizado." };

  try {
    const updateData: any = {};
    const parsedData = data as any;

    if (parsedData.status) updateData.status = parsedData.status;
    if (parsedData.status === 'completed') updateData.completedAt = new Date();
    if (parsedData.notes) updateData.notes = formatTextUppercase(parsedData.notes);

    await db.update(customerTasks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(customerTasks.id, taskId));

    revalidatePath('/customers');
    return { success: true, message: "Tarea actualizada con éxito." };
  } catch (error) {
    console.error("Error al actualizar tarea:", error);
    return { success: false, message: "No se pudo actualizar la tarea." };
  }
}

export async function createPostSaleTask(data: unknown) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !['customer_service', 'manager', 'super_admin'].includes(user.role)) {
    return { success: false, message: "No autorizado." };
  }

  const parseResult = createPostSaleTaskSchema.safeParse(data);
  if (!parseResult.success) {
    return { success: false, message: "Datos inválidos.", errors: parseResult.error.flatten() };
  }

  const taskData = parseResult.data;

  try {
    await db.insert(postSaleTasks).values({
      ...taskData,
      title: formatTextUppercase(taskData.title),
      description: taskData.description ? formatTextUppercase(taskData.description) : null,
      createdById: user.id,
    });

    revalidatePath('/customers');
    return { success: true, message: "Tarea de post-venta creada con éxito." };
  } catch (error) {
    console.error("Error al crear tarea de post-venta:", error);
    return { success: false, message: "No se pudo crear la tarea." };
  }
}

export async function getPostSaleTasks() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !['customer_service', 'manager', 'super_admin'].includes(user.role)) {
    throw new Error("No autorizado");
  }

  try {
    const tasks = await db.query.postSaleTasks.findMany({
      with: {
        customer: { columns: { id: true, fullName: true } },
        policy: { columns: { id: true, marketplaceId: true, insuranceCompany: true } },
        assignedTo: { columns: { id: true, name: true, firstName: true, lastName: true } },
        createdBy: { columns: { id: true, name: true, firstName: true, lastName: true } },
      },
      orderBy: [desc(postSaleTasks.createdAt)],
    });

    // Organizar por columnas del tablero
    const tasksByColumn = tasks.reduce((acc, task) => {
      const column = task.boardColumn || 'pending';
      if (!acc[column]) acc[column] = [];
      acc[column].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

    return tasksByColumn;
  } catch (error) {
    console.error("Error al obtener tareas de post-venta:", error);
    throw new Error("No se pudieron obtener las tareas.");
  }
}

export async function updatePostSaleTask(taskId: string, data: unknown) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { success: false, message: "No autorizado." };

  try {
    const updateData: any = { updatedAt: new Date() };
    const parsedData = data as any;

    if (parsedData.status) updateData.status = parsedData.status;
    if (parsedData.boardColumn) updateData.boardColumn = parsedData.boardColumn;
    if (parsedData.status === 'completed') updateData.completedAt = new Date();

    await db.update(postSaleTasks)
      .set(updateData)
      .where(eq(postSaleTasks.id, taskId));

    revalidatePath('/customers');
    return { success: true, message: "Tarea actualizada con éxito." };
  } catch (error) {
    console.error("Error al actualizar tarea:", error);
    return { success: false, message: "No se pudo actualizar la tarea." };
  }
}

// --- NUEVAS ACCIONES PARA PLANTILLAS DINÁMICAS ---

export async function createDocumentTemplate(data: unknown) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !['manager', 'super_admin'].includes(user.role)) {
    return { success: false, message: "No autorizado." };
  }

  const parseResult = createTemplateSchema.safeParse(data);
  if (!parseResult.success) {
    return { success: false, message: "Datos inválidos.", errors: parseResult.error.flatten() };
  }

  const templateData = parseResult.data;

  try {
    await db.insert(documentTemplates).values({
      ...templateData,
      createdById: user.id,
    });

    revalidatePath('/customers');
    return { success: true, message: "Plantilla creada con éxito." };
  } catch (error) {
    console.error("Error al crear plantilla:", error);
    return { success: false, message: "No se pudo crear la plantilla." };
  }
}

export async function getDocumentTemplates() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");

  try {
    return await db.query.documentTemplates.findMany({
      where: eq(documentTemplates.isActive, true),
      with: {
        createdBy: { columns: { name: true, firstName: true, lastName: true } }
      },
      orderBy: [desc(documentTemplates.createdAt)],
    });
  } catch (error) {
    console.error("Error al obtener plantillas:", error);
    throw new Error("No se pudieron obtener las plantillas.");
  }
}

export async function generateDocumentFromTemplate(templateId: string, customerId: string, policyId?: string) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { success: false, message: "No autorizado." };

  try {
    // Obtener la plantilla
    const template = await db.query.documentTemplates.findFirst({
      where: eq(documentTemplates.id, templateId)
    });

    if (!template) {
      return { success: false, message: "Plantilla no encontrada." };
    }

    // Obtener datos del cliente y póliza
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      with: {
        policies: policyId ? {
          where: eq(policies.id, policyId)
        } : { limit: 1 }
      }
    });

    if (!customer) {
      return { success: false, message: "Cliente no encontrado." };
    }

    const policy = customer.policies[0];

    // Generar contenido reemplazando variables
    let generatedContent = template.content;
    const variables = {
      customerName: customer.fullName,
      customerEmail: customer.email || '',
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      policyId: policy?.marketplaceId || '',
      insuranceCompany: policy?.insuranceCompany || '',
      planName: policy?.planName || '',
      monthlyPremium: policy?.monthlyPremium || '',
      currentDate: new Date().toLocaleDateString(),
    };

    // Reemplazar variables en el contenido
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      generatedContent = generatedContent.replace(regex, value);
    });

    // Guardar documento generado
    const [generatedDoc] = await db.insert(generatedDocuments).values({
      templateId,
      customerId,
      policyId,
      title: `${template.name} - ${customer.fullName}`,
      generatedContent,
      generatedById: user.id,
    }).returning({ id: generatedDocuments.id });

    revalidatePath('/customers');
    return {
      success: true,
      message: "Documento generado con éxito.",
      data: { documentId: generatedDoc.id, content: generatedContent }
    };
  } catch (error) {
    console.error("Error al generar documento:", error);
    return { success: false, message: "No se pudo generar el documento." };
  }
}

// Acción para obtener usuarios del equipo para asignar tareas
export async function getTeamUsers() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new Error("No autorizado");

  try {
    const conditions = [];

    if (user.role === 'manager') {
      // Manager ve su equipo
      const teamIds = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.managerId, user.id));
      const agentIds = teamIds.map(u => u.id);
      agentIds.push(user.id);
      conditions.push(inArray(users.id, agentIds));
    } else if (user.role === 'super_admin') {
      // Super admin ve todos
      conditions.push(eq(users.isActive, true));
    } else {
      // Otros roles solo se ven a sí mismos
      conditions.push(eq(users.id, user.id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db.query.users.findMany({
      where: whereClause,
      columns: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [users.firstName],
    });
  } catch (error) {
    console.error("Error al obtener usuarios del equipo:", error);
    throw new Error("No se pudieron obtener los usuarios.");
  }
}

export async function updatePolicyStatus(policyId: string, newStatus: string) {
    // --> 1. Obtener la sesión del usuario
    const session = await auth();
    const user = session?.user;

    // --> 2. Validar que el usuario esté autenticado
    if (!user?.id || !user.role) {
        return { success: false, message: 'No autenticado.' };
    }

    // --> 3. Definir qué roles tienen permiso para cambiar el estado de una póliza
    const authorizedRoles = ['super_admin', 'manager', 'processor']; // <-- AJUSTA ESTOS ROLES SEGÚN NECESITES
    
    if (!authorizedRoles.includes(user.role)) {
        return { success: false, message: 'No tienes permiso para cambiar el estado de las pólizas.' };
    }

    // --> 4. Obtener la póliza y el cliente para verificar la propiedad
    const policy = await db.query.policies.findFirst({
        where: eq(policies.id, policyId),
        with: {
            customer: true,
        },
    });

    if (!policy || !policy.customer) {
        return { success: false, message: "Póliza o cliente no encontrado." };
    }

    // --> 5. Usar tu propia función para asegurar que el usuario tenga acceso a este cliente específico
    if (!canAccessCustomerDetails(user, policy.customer)) {
        return { success: false, message: "No tienes acceso a esta póliza." };
    }

    // El resto de la lógica se mantiene, ahora protegida por las validaciones anteriores
    const allowedStatuses = policyStatusEnum.enumValues;
    if (!allowedStatuses.includes(newStatus as any)) {
        return { success: false, message: 'Estado no válido.' };
    }

    try {
        await db.update(policies)
            .set({
                status: newStatus as typeof policyStatusEnum.enumValues[number],
                updatedAt: new Date(), // Actualiza la fecha de modificación
            })
            .where(eq(policies.id, policyId));

        revalidatePath('/customers'); // Invalida el caché de la página para que se actualice
        revalidatePath('/post-venta'); // También es buena idea revalidar esta ruta

        return { success: true };
    } catch (error) {
        console.error("Error al actualizar el estado de la póliza:", error);
        return { success: false, message: 'No se pudo actualizar la póliza.' };
    }
}