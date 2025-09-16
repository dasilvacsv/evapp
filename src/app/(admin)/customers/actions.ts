'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, users, policies, dependents, documents, paymentMethods, policyStatusEnum, claims, appointments } from '@/db/schema';
import { and, eq, desc, inArray, ilike, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createPresignedPostForUpload, deleteFromS3, getPresignedUrlForDownload } from "@/lib/s3";
import { createAppointmentSchema, createClaimSchema, createFullApplicationSchema } from './schemas';
import { generateReadablePolicyId, formatDateUS, formatTextUppercase } from '@/lib/policy-utils';
import { AORService } from '@/lib/aor-service';

// +++ NUEVA ACCIÓN PARA EL TABLERO KANBAN DE POST-VENTA +++
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

// --- ACCIONES PARA SUBIDA DE ARCHIVOS ---
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
    if (!session?.user?.id) {
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

// --- ACCIONES PRINCIPALES DEL MÓDULO DE CLIENTES ---

export async function getCustomers(page = 1, limit = 10, search = '') {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    throw new Error('No autorizado');
  }

  try {
    const conditions = [];
    if (user.role === 'agent') {
      conditions.push(eq(customers.createdByAgentId, user.id));
    } else if (user.role === 'manager') {
      const teamAgentIds = await db.select({ id: users.id }).from(users).where(eq(users.managerId, user.id));
      const agentIds = teamAgentIds.map(a => a.id);
      agentIds.push(user.id);
      if (agentIds.length > 0) {
        conditions.push(inArray(customers.createdByAgentId, agentIds));
      }
    }

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
            }
        });

        if (!customerDetails) {
            return null;
        }

        if (user.role === 'agent' && customerDetails.createdByAgentId !== user.id) {
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
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
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
 * Crea la aplicación completa con validaciones mejoradas y formateo automático
 * ACTUALIZADO: Ahora incluye generación automática de AOR
 */
export async function createFullApplication(data: unknown) {
    const session = await auth();
    const agent = session?.user;
    if (!agent?.id || (agent.role !== 'agent' && agent.role !== 'manager')) {
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
                createdByAgentId: agent.id!,
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
                marketplaceId: readablePolicyId, // Usar el ID legible aquí
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

            return { customerId, policyId: newPolicy.id, readablePolicyId };
        });

        console.log("Transacción completada exitosamente:", result);

        // 6. NUEVO: Generar y enviar AOR automáticamente
        console.log("6. Generando y enviando AOR automáticamente...");
        try {
            const aorResult = await AORService.createAndSendAOR({
                customerId: result.customerId,
                policyData: {
                    insuranceCompany: validatedData.policy.insuranceCompany,
                    planName: validatedData.policy.planName,
                    marketplaceId: result.readablePolicyId,
                    effectiveDate: validatedData.policy.effectiveDate ? formatDateUS(validatedData.policy.effectiveDate) : undefined,
                    monthlyPremium: validatedData.policy.monthlyPremium ? String(validatedData.policy.monthlyPremium) : undefined,
                },
                createdByAgentId: agent.id!,
            });

            console.log("AOR creado y enviado exitosamente:", aorResult);

            // Actualizar la póliza con el enlace del AOR
            await db.update(policies)
                .set({ 
                    aorLink: aorResult.signingUrl,
                    status: 'contacting' // Cambiar el estado a "contactando" ya que se envió el AOR
                })
                .where(eq(policies.id, result.policyId));

        } catch (aorError) {
            console.warn("Advertencia: No se pudo generar el AOR automáticamente:", aorError);
            // No fallar toda la transacción si solo falla el AOR
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

// NUEVA ACCIÓN: Reenviar AOR manualmente
export async function resendAOR(customerId: string, policyId: string) {
  const session = await auth();
  const user = session?.user;
  
  if (!user?.id || (user.role !== 'agent' && user.role !== 'manager')) {
    return { success: false, message: "No tienes permiso para esta acción." };
  }

  try {
    // Obtener datos de la póliza
    const policy = await db.query.policies.findFirst({
      where: eq(policies.id, policyId),
      with: {
        customer: true,
      },
    });

    if (!policy) {
      return { success: false, message: "Póliza no encontrada." };
    }

    // Verificar permisos del agente
    if (user.role === 'agent' && policy.customer.createdByAgentId !== user.id) {
      return { success: false, message: "No tienes permiso para esta póliza." };
    }

    // Generar y enviar nuevo AOR
    const aorResult = await AORService.createAndSendAOR({
      customerId,
      policyData: {
        insuranceCompany: policy.insuranceCompany || '',
        planName: policy.planName || '',
        marketplaceId: policy.marketplaceId || undefined,
        effectiveDate: policy.effectiveDate ? formatDateUS(policy.effectiveDate) : undefined,
        monthlyPremium: policy.monthlyPremium || undefined,
      },
      createdByAgentId: user.id,
    });

    // Actualizar la póliza con el nuevo enlace
    await db.update(policies)
      .set({ aorLink: aorResult.signingUrl })
      .where(eq(policies.id, policyId));

    revalidatePath('/customers');
    return { 
      success: true, 
      message: "AOR reenviado con éxito.",
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