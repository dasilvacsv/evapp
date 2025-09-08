'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, users, policies, dependents, documents, paymentMethods } from '@/db/schema';
import { and, eq, desc, inArray, ilike, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createPresignedPostForUpload, deleteFromS3 } from "@/lib/s3";
import { createFullApplicationSchema } from './schemas';

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

// --- FUNCIONES AUXILIARES ---
function formatDateForDB(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  // Asegurar que la fecha se guarde correctamente sin problemas de zona horaria
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- ACCIONES PRINCIPALES DEL MÓDULO DE CLIENTES ---

/**
 * Obtiene la lista de clientes usando el nuevo schema
 */
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
      if (agentIds.length === 0) {
        return { customers: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }
      conditions.push(inArray(customers.createdByAgentId, agentIds));
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
            lastName: true 
          } 
        },
        policies: {
          orderBy: [desc(policies.createdAt)],
          limit: 1,
          columns: { status: true }
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

/**
 * Obtiene los detalles completos de un cliente
 */
export async function getCustomerDetails(customerId: string) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || !user.role) throw new Error("No autorizado");

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
            dependents: { orderBy: [desc(dependents.createdAt)] },
            documents: { 
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
              with: { 
                assignedProcessor: { 
                  columns: { 
                    firstName: true, 
                    lastName: true,
                    name: true 
                  } 
                },
                paymentMethod: true
              }, 
              orderBy: [desc(policies.createdAt)] 
            },
        }
    });

    if (!customerDetails) return null;

    // Verificación de acceso por rol
    if (user.role === 'agent' && customerDetails.createdByAgentId !== user.id) {
        throw new Error("Acceso denegado.");
    }
    if (user.role === 'manager' && customerDetails.createdByAgent?.managerId !== user.id) {
        throw new Error("Acceso denegado.");
    }

    return customerDetails;
}

/**
 * Crea la aplicación completa con el nuevo schema - VERSIÓN CORREGIDA
 */
export async function createFullApplication(data: unknown) {
  const session = await auth();
  const agent = session?.user;

  if (!agent?.id || agent.role !== 'agent') {
    return { success: false, message: "Solo los agentes pueden crear aplicaciones." };
  }
  
  const agentRecord = await db.query.users.findFirst({ where: eq(users.id, agent.id) });
  if (!agentRecord?.managerId) {
    return { success: false, message: "Tu cuenta de agente no está asignada a un manager." };
  }

  // Validación mejorada con mejor manejo de errores
  const parseResult = createFullApplicationSchema.safeParse(data);
  if (!parseResult.success) {
    console.error("Error de validación del schema:", parseResult.error);
    return { 
      success: false, 
      message: "Datos del formulario inválidos.", 
      errors: parseResult.error.flatten().fieldErrors,
      zodError: parseResult.error.issues
    };
  }
  const validatedData = parseResult.data;

  try {
    console.log("Iniciando transacción de creación de aplicación...");
    
    const result = await db.transaction(async (tx) => {
      console.log("1. Creando cliente...");
      
      // Validar campos requeridos antes de insertar
      if (!validatedData.customer.birthDate) {
        throw new Error("La fecha de nacimiento es requerida para el cliente");
      }
      
      if (!validatedData.customer.fullName.trim()) {
        throw new Error("El nombre completo del cliente es requerido");
      }

      // 1. Crear el cliente - CON MEJOR MANEJO DE FECHAS
      const [newCustomer] = await tx.insert(customers).values({
        fullName: validatedData.customer.fullName.trim(),
        gender: validatedData.customer.gender || null,
        birthDate: formatDateForDB(validatedData.customer.birthDate)!,
        email: validatedData.customer.email || null,
        phone: validatedData.customer.phone || null,
        ssn: validatedData.customer.ssn || null,
        appliesToCoverage: validatedData.customer.appliesToCoverage,
        immigrationStatus: validatedData.customer.immigrationStatus || null,
        documentType: validatedData.customer.documentType || null,
        address: validatedData.customer.address || null,
        county: validatedData.customer.county || null,
        state: validatedData.customer.state || null,
        taxType: validatedData.customer.taxType || null,
        income: validatedData.customer.income ? validatedData.customer.income.toString() : null,
        declaresOtherPeople: validatedData.customer.declaresOtherPeople,
        createdByAgentId: agent.id!,
      }).returning({ id: customers.id });
      
      if (!newCustomer?.id) {
        throw new Error("No se pudo crear el cliente");
      }
      
      const customerId = newCustomer.id;
      console.log("Cliente creado con ID:", customerId);

      // 2. Crear la póliza - CON VALIDACIONES MEJORADAS
      console.log("2. Creando póliza...");
      
      if (!validatedData.policy.insuranceCompany?.trim()) {
        throw new Error("La aseguradora es requerida");
      }

      const [newPolicy] = await tx.insert(policies).values({
        customerId: customerId,
        insuranceCompany: validatedData.policy.insuranceCompany.trim(),
        policyNumber: validatedData.policy.policyNumber || null,
        monthlyPremium: validatedData.policy.monthlyPremium ? validatedData.policy.monthlyPremium.toString() : null,
        effectiveDate: formatDateForDB(validatedData.policy.effectiveDate),
        planLink: validatedData.policy.planLink || null,
        taxCredit: validatedData.policy.taxCredit ? validatedData.policy.taxCredit.toString() : null,
        aorLink: validatedData.policy.aorLink || null,
        notes: validatedData.policy.notes || null,
        status: 'new_lead',
      }).returning({ id: policies.id });

      if (!newPolicy?.id) {
        throw new Error("No se pudo crear la póliza");
      }
      
      console.log("Póliza creada con ID:", newPolicy.id);

      // 3. Crear dependientes si existen - CON VALIDACIONES MEJORADAS
      if (validatedData.dependents?.length) {
        console.log("3. Creando dependientes...");
        
        const dependentsData = validatedData.dependents.map((dep, index) => {
          if (!dep.fullName?.trim()) {
            throw new Error(`El nombre del dependiente ${index + 1} es requerido`);
          }
          if (!dep.relationship?.trim()) {
            throw new Error(`La relación del dependiente ${index + 1} es requerida`);
          }
          
          return {
            customerId: customerId,
            fullName: dep.fullName.trim(),
            relationship: dep.relationship.trim(),
            birthDate: formatDateForDB(dep.birthDate),
            immigrationStatus: dep.immigrationStatus || null,
            appliesToPolicy: dep.appliesToPolicy,
          };
        });

        const createdDependents = await tx.insert(dependents).values(dependentsData).returning({ id: dependents.id });
        console.log(`${createdDependents.length} dependientes creados`);
      }

      // 4. Crear documentos si existen - CON VALIDACIONES MEJORADAS
      if (validatedData.documents?.length) {
        console.log("4. Creando documentos...");
        
        const documentsData = validatedData.documents.map((doc, index) => {
          if (!doc.s3Key?.trim()) {
            throw new Error(`La clave S3 del documento ${index + 1} es requerida`);
          }
          if (!doc.fileName?.trim()) {
            throw new Error(`El nombre del documento ${index + 1} es requerido`);
          }
          
          return {
            customerId: customerId,
            policyId: newPolicy.id,
            s3Key: doc.s3Key.trim(),
            fileName: doc.fileName.trim(),
            fileType: doc.fileType || 'application/octet-stream',
            fileSize: doc.fileSize || 0,
            uploadedByUserId: agent.id!,
          };
        });

        const createdDocuments = await tx.insert(documents).values(documentsData).returning({ id: documents.id });
        console.log(`${createdDocuments.length} documentos creados`);
      }
      
      // 5. Crear método de pago si existe - CON VALIDACIONES MEJORADAS
      if (validatedData.payment && validatedData.payment.methodType) {
        console.log("5. Creando método de pago...");
        
        // Validaciones específicas por tipo de pago
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
        
        // En un escenario real, aquí procesarías con Stripe/etc y obtendrías un token
        const mockProviderToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; 
        
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

      return { customerId, policyId: newPolicy.id };
    });

    console.log("Transacción completada exitosamente:", result);
    revalidatePath('/customers');
    return { success: true, message: "Aplicación creada con éxito.", data: result };
    
  } catch (error) {
    console.error("Error detallado creando aplicación:", error);
    
    // Manejo más específico de errores
    if (error instanceof Error) {
      return { success: false, message: `Error: ${error.message}` };
    }
    
    return { success: false, message: "Ocurrió un error desconocido en el servidor." };
  }
}

/**
 * Acción para obtener datos de pago (simplificada para el nuevo schema)
 */
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
    
    // En un escenario real, aquí harías llamadas a la API del proveedor de pagos
    // para obtener los detalles usando el providerToken
    return { 
      success: true, 
      data: {
        methodType: paymentMethod.methodType,
        cardBrand: paymentMethod.cardBrand,
        cardLast4: paymentMethod.cardLast4,
        bankName: paymentMethod.bankName,
        // Los detalles completos se obtendrían del proveedor de pagos
      }
    };
  } catch (error) {
    console.error("Error al obtener método de pago:", error);
    return { success: false, error: "No se pudo obtener la información de pago." };
  }
}