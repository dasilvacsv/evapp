'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
// MODIFICADO: Se añade 'customerTasks' a las importaciones del schema
import { policies, customers, users, signatureDocuments, customerTasks } from '@/db/schema';
// MODIFICADO: Se importan más operadores de Drizzle
import { eq, and, desc, sql, count, gte, lte, ilike } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { alias } from 'drizzle-orm/pg-core';

const createPolicySchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  insuranceCompany: z.string().min(1, 'Insurance company is required'),
  monthlyPremium: z.string().min(1, 'Monthly premium is required'),
  marketplaceId: z.string().optional(),
  effectiveDate: z.string().optional(),
  taxCredit: z.string().optional(),
  assignedProcessorId: z.string().uuid().optional().or(z.literal(''))
    .transform(val => val === '' ? null : val),
});

const updatePolicyStatusSchema = z.object({
  policyId: z.string().uuid('Invalid policy ID'),
  status: z.enum(['new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs', 'sent_to_carrier', 'approved', 'rejected', 'active', 'cancelled']),
  insuranceCompany: z.string().optional(),
  monthlyPremium: z.string().optional(),
  marketplaceId: z.string().optional(),
  effectiveDate: z.string().optional(),
  taxCredit: z.string().optional(),
});

// NUEVO: Función para verificar permisos de edición
export async function canEditPolicy(policy: { status: string; customer: { createdByAgentId: string | null } }) {
    const session = await auth();
    const user = session?.user;

    if (!user) return false;

    const { role, id } = user;

    if (role === 'super_admin' || role === 'manager') {
        return true;
    }

    const isProcessed = !['new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs'].includes(policy.status);

    if ((role === 'agent' || role === 'call_center') && isProcessed) {
        // Solo pueden editar si un admin lo pone "En Revisión"
        return policy.status === 'in_review';
    }

    // El agente creador puede editar antes de que se procese
    if (role === 'agent' && policy.customer.createdByAgentId === id) {
        return !isProcessed;
    }

    return false;
}


// MODIFICADO: getPolicies ahora acepta más filtros
export async function getPolicies(
    page = 1,
    limit = 10,
    search = '',
    status = '',
    startDate = '',
    endDate = '',
    insuranceCompany = ''
) {
    const session = await auth();

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    try {
        const offset = (page - 1) * limit;

        const agent = alias(users, 'agent');
        const processor = alias(users, 'processor');

        const conditions = [];

        // Filtro por rol
        if (userRole === 'agent') {
            conditions.push(eq(customers.createdByAgentId, userId));
        } else if (userRole === 'manager') {
            const managedAgents = await db.select({ id: users.id }).from(users).where(eq(users.managerId, userId));
            const agentIds = managedAgents.map(a => a.id);
            agentIds.push(userId);
            conditions.push(sql`${customers.createdByAgentId} IN ${agentIds}`);
        } else if (userRole === 'processor') {
            conditions.push(eq(policies.assignedProcessorId, userId));
        }

        // Filtros de búsqueda
        if (search) {
            conditions.push(ilike(customers.fullName, `%${search}%`));
        }
        if (status) {
            conditions.push(eq(policies.status, status as any));
        }
        // NUEVO: Aplicar nuevos filtros
        if (startDate) {
            conditions.push(gte(policies.createdAt, new Date(startDate)));
        }
        if (endDate) {
            // Añadimos un día para que incluya el día final completo
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            conditions.push(lte(policies.createdAt, nextDay));
        }
        if (insuranceCompany) {
            conditions.push(ilike(policies.insuranceCompany, `%${insuranceCompany}%`));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const policiesQuery = db.select({
            id: policies.id,
            status: policies.status,
            insuranceCompany: policies.insuranceCompany,
            monthlyPremium: policies.monthlyPremium,
            marketplaceId: policies.marketplaceId,
            effectiveDate: policies.effectiveDate,
            taxCredit: policies.taxCredit,
            commissionStatus: policies.commissionStatus,
            createdAt: policies.createdAt,
            customerName: customers.fullName,
            customerId: customers.id,
            agentName: sql<string>`${agent.firstName} || ' ' || ${agent.lastName}`,
            processorName: sql<string>`${processor.firstName} || ' ' || ${processor.lastName}`,
        })
        .from(policies)
        .innerJoin(customers, eq(policies.customerId, customers.id))
        .leftJoin(agent, eq(customers.createdByAgentId, agent.id))
        .leftJoin(processor, eq(policies.assignedProcessorId, processor.id))
        .where(whereClause) // Aplicar todas las condiciones juntas
        .orderBy(desc(policies.createdAt))
        .limit(limit)
        .offset(offset);

        const policiesList = await policiesQuery;

        const totalQuery = db.select({ count: count() })
            .from(policies)
            .innerJoin(customers, eq(policies.customerId, customers.id))
            .where(whereClause);

        const totalResult = await totalQuery;
        const total = totalResult[0]?.count || 0;

        return {
            policies: policiesList,
            pagination: {
                page, limit, total, totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error('Get policies error:', error);
        throw new Error('Failed to fetch policies');
    }
}

export async function createPolicy(data: z.infer<typeof createPolicySchema>) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['agent', 'manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const validatedData = createPolicySchema.parse(data);
    
    const policyData: any = {
      customerId: validatedData.customerId,
      insuranceCompany: validatedData.insuranceCompany,
      monthlyPremium: validatedData.monthlyPremium,
      assignedProcessorId: validatedData.assignedProcessorId || null,
      status: 'new_lead',
      commissionStatus: 'pending',
    };

    if (validatedData.marketplaceId) {
      policyData.marketplaceId = validatedData.marketplaceId;
    }
    if (validatedData.effectiveDate) {
      policyData.effectiveDate = validatedData.effectiveDate;
    }
    if (validatedData.taxCredit) {
      policyData.taxCredit = validatedData.taxCredit;
    }
    
    await db.insert(policies).values(policyData);

    revalidatePath('/policies');
    return { success: true, message: 'Policy created successfully' };
  } catch (error) {
    console.error('Create policy error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Validation error', errors: error.errors };
    }
    throw new Error('Failed to create policy');
  }
}

export async function updatePolicyStatus(data: z.infer<typeof updatePolicyStatusSchema>) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const validatedData = updatePolicyStatusSchema.parse(data);
    
    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date(),
    };

    if (validatedData.insuranceCompany) {
      updateData.insuranceCompany = validatedData.insuranceCompany;
    }
    if (validatedData.monthlyPremium) {
      updateData.monthlyPremium = validatedData.monthlyPremium;
    }
    if (validatedData.marketplaceId) {
      updateData.marketplaceId = validatedData.marketplaceId;
    }
    if (validatedData.effectiveDate) {
      updateData.effectiveDate = validatedData.effectiveDate;
    }
    if (validatedData.taxCredit) {
      updateData.taxCredit = validatedData.taxCredit;
    }

    await db.update(policies)
      .set(updateData)
      .where(eq(policies.id, validatedData.policyId));

    revalidatePath('/policies');
    revalidatePath(`/policies/${validatedData.policyId}`);
    return { success: true, message: 'Policy updated successfully' };
  } catch (error) {
    console.error('Update policy error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Validation error', errors: error.errors };
    }
    throw new Error('Failed to update policy');
  }
}

// MODIFICADO: getPolicyById para limitar la vista post-venta
export async function getPolicyById(id: string) {
    const session = await auth();
    const user = session?.user;
    
    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        const agent = alias(users, 'agent');
        const processor = alias(users, 'processor');
        const sigDoc = alias(signatureDocuments, 'sigDoc');

        const result = await db.query.policies.findFirst({
            where: eq(policies.id, id),
            with: {
                customer: {
                    columns: {
                        createdByAgentId: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        id: true,
                    }
                },
                assignedProcessor: {
                    columns: {
                        firstName: true,
                        lastName: true
                    }
                },
                // ... otras relaciones que necesites ...
            }
        });

        if (!result) {
            throw new Error('Policy not found');
        }

        const policyData = { ...result }; // Clonamos el resultado para evitar mutaciones

        // Lógica de visibilidad post-venta para Call Center
        const isProcessed = !['new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs'].includes(policyData.status);

        if (user.role === 'call_center' && isProcessed) {
            // Devolvemos solo los campos permitidos y vaciamos el resto
            return {
                id: policyData.id,
                status: policyData.status,
                customerName: policyData.customer.fullName,
                insuranceCompany: policyData.insuranceCompany,
                monthlyPremium: policyData.monthlyPremium,
                createdAt: policyData.createdAt,
                effectiveDate: policyData.effectiveDate,
                // Vaciamos campos sensibles
                marketplaceId: 'Restringido',
                taxCredit: null,
                planLink: null,
                aorLink: null,
                notes: 'Información restringida post-venta.',
                commissionStatus: 'Restringido',
                updatedAt: policyData.updatedAt,
                customerEmail: 'Restringido',
                customerPhone: 'Restringido',
                customerId: policyData.customer.id,
                agentName: null,
                processorName: null,
                aorStatus: null,
            };
        }

        // Si no es call center o no está procesado, devolvemos todo
        const fullPolicyDetails = await db.select({
            id: policies.id,
            status: policies.status,
            insuranceCompany: policies.insuranceCompany,
            monthlyPremium: policies.monthlyPremium,
            marketplaceId: policies.marketplaceId,
            effectiveDate: policies.effectiveDate,
            taxCredit: policies.taxCredit,
            planLink: policies.planLink,
            aorLink: policies.aorLink,
            notes: policies.notes,
            commissionStatus: policies.commissionStatus,
            createdAt: policies.createdAt,
            updatedAt: policies.updatedAt,
            customerName: customers.fullName,
            customerEmail: customers.email,
            customerPhone: customers.phone,
            customerId: customers.id,
            agentName: sql<string>`${agent.firstName} || ' ' || ${agent.lastName}`,
            processorName: sql<string>`${processor.firstName} || ' ' || ${processor.lastName}`,
            aorStatus: sigDoc.status,
        })
        .from(policies)
        .innerJoin(customers, eq(policies.customerId, customers.id))
        .leftJoin(agent, eq(customers.createdByAgentId, agent.id))
        .leftJoin(processor, eq(policies.assignedProcessorId, processor.id))
        .leftJoin(sigDoc, eq(policies.aorDocumentId, sigDoc.id))
        .where(eq(policies.id, id))
        .limit(1);
        
        return fullPolicyDetails[0];

    } catch (error) {
        console.error('Get policy error:', error);
        throw new Error('Failed to fetch policy');
    }
}

export async function getAvailableProcessors() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const processors = await db.select({
      id: users.id,
      name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
    })
    .from(users)
    .where(and(eq(users.role, 'processor'), eq(users.isActive, true)));

    return processors;
  } catch (error) {
    console.error('Get processors error:', error);
    throw new Error('Failed to fetch processors');
  }
}

// NUEVO: Acción para habilitar la edición
export async function enableEditingForPolicy(policyId: string) {
    const session = await auth();
    const user = session?.user;

    if (!user || !['super_admin', 'manager'].includes(user.role)) {
        throw new Error('Permission denied');
    }

    try {
        const policy = await db.query.policies.findFirst({
            where: eq(policies.id, policyId),
            columns: { customerId: true }
        });

        if (!policy) {
            throw new Error('Policy not found');
        }

        // Cambiar estado de la póliza
        await db.update(policies)
            .set({ status: 'in_review', updatedAt: new Date() })
            .where(eq(policies.id, policyId));

        // Registrar quién y cuándo otorgó el permiso en una tarea
        await db.insert(customerTasks).values({
            customerId: policy.customerId,
            policyId: policyId,
            title: "Edición Habilitada por Supervisor",
            description: `El usuario ${user.name} (${user.role}) cambió el estado a "En Revisión" para permitir la edición.`,
            type: 'general',
            priority: 'medium',
            assignedToId: user.id, // O al agente de la póliza si lo prefieres
            createdById: user.id,
        });

        revalidatePath(`/policies/${policyId}`);
        revalidatePath('/policies');

        return { success: true, message: 'Edición habilitada. El estado se ha cambiado a "En Revisión".' };

    } catch (error) {
        console.error('Enable editing error:', error);
        return { success: false, message: 'No se pudo habilitar la edición.' };
    }
}