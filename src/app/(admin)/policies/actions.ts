'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { policies, customers, users, signatureDocuments, customerTasks } from '@/db/schema';
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
        return policy.status === 'in_review';
    }

    if (role === 'agent' && policy.customer.createdByAgentId === id) {
        return !isProcessed;
    }

    return false;
}

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
    const user = session?.user;

    if (!user) {
        throw new Error('Unauthorized');
    }

    const userRole = user.role;
    const userId = user.id;

    try {
        const offset = (page - 1) * limit;

        const agent = alias(users, 'agent');
        const processor = alias(users, 'processor');

        const conditions: any[] = [];

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

        if (search) {
            conditions.push(ilike(customers.fullName, `%${search}%`));
        }
        if (status) {
            conditions.push(eq(policies.status, status as any));
        }
        if (startDate) {
            conditions.push(gte(policies.createdAt, new Date(startDate)));
        }
        if (endDate) {
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
        .where(whereClause)
        .orderBy(desc(policies.createdAt))
        .limit(limit)
        .offset(offset);

        const policiesList = await policiesQuery;

        const editableStatuses = ['new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs'];
        const policiesWithEditFlag = policiesList.map(policy => ({
            ...policy,
            isEditableStatus: editableStatuses.includes(policy.status),
        }));

        const totalQuery = db.select({ count: count() })
            .from(policies)
            .innerJoin(customers, eq(policies.customerId, customers.id))
            .where(whereClause);

        const totalResult = await totalQuery;
        const total = totalResult[0]?.count || 0;

        return {
            policies: policiesWithEditFlag,
            pagination: {
                page, limit, total, totalPages: Math.ceil(total / limit),
            },
            currentUserRole: userRole,
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
    const user = session?.user;

    if (!user) {
        return { success: false, message: 'No autorizado' };
    }

    try {
        const validatedData = updatePolicyStatusSchema.parse(data);

        const originalPolicy = await db.query.policies.findFirst({
            where: eq(policies.id, validatedData.policyId),
        });

        if (!originalPolicy) {
            return { success: false, message: 'Póliza no encontrada' };
        }

        const changes = [];
        if (originalPolicy.status !== validatedData.status) {
            changes.push(`Estado cambiado de '${originalPolicy.status}' a '${validatedData.status}'.`);
        }
        if (validatedData.insuranceCompany && originalPolicy.insuranceCompany !== validatedData.insuranceCompany) {
            changes.push(`Aseguradora cambiada a '${validatedData.insuranceCompany}'.`);
        }
        if (validatedData.monthlyPremium && originalPolicy.monthlyPremium !== validatedData.monthlyPremium) {
            changes.push(`Prima mensual cambiada a '${validatedData.monthlyPremium}'.`);
        }
        if (validatedData.marketplaceId !== undefined && originalPolicy.marketplaceId !== validatedData.marketplaceId) {
            changes.push(`ID Marketplace cambiado a '${validatedData.marketplaceId || 'N/A'}'.`);
        }
        if (validatedData.effectiveDate !== undefined && originalPolicy.effectiveDate !== validatedData.effectiveDate) {
            changes.push(`Fecha efectiva cambiada a '${validatedData.effectiveDate || 'N/A'}'.`);
        }

        const auditDescription = changes.length > 0
            ? `El usuario ${user.name} editó la póliza. Cambios: ${changes.join(' ')}`
            : `El usuario ${user.name} guardó la póliza sin cambios significativos.`;

        const updateData: any = {
            status: validatedData.status,
            updatedAt: new Date(),
            updatedById: user.id,
            insuranceCompany: validatedData.insuranceCompany,
            monthlyPremium: validatedData.monthlyPremium,
            marketplaceId: validatedData.marketplaceId,
            effectiveDate: validatedData.effectiveDate,
            taxCredit: validatedData.taxCredit,
        };

        await db.update(policies)
            .set(updateData)
            .where(eq(policies.id, validatedData.policyId));
        
        if (changes.length > 0) {
            await db.insert(customerTasks).values({
                customerId: originalPolicy.customerId,
                policyId: validatedData.policyId,
                title: "Póliza Editada",
                description: auditDescription,
                type: 'general',
                priority: 'low',
                status: 'completed',
                createdById: user.id,
                assignedToId: user.id,
                completedAt: new Date(),
            });
        }

        revalidatePath('/policies');
        revalidatePath(`/policies/${validatedData.policyId}`);
        return { success: true, message: 'Póliza actualizada exitosamente' };

    } catch (error) {
        console.error('Update policy error:', error);
        if (error instanceof z.ZodError) {
            return { success: false, message: 'Error de validación', errors: error.errors };
        }
        throw new Error('Fallo al actualizar la póliza');
    }
}

export async function getPolicyById(id: string) {
    const session = await auth();
    const user = session?.user;
    
    if (!user) {
        throw new Error('Unauthorized');
    }

    try {
        console.log('Searching for policy with ID:', id);
        console.log('ID type:', typeof id);

        const agent = alias(users, 'agent');
        const processor = alias(users, 'processor');

        // SOLUCIÓN: Usar sql con casting explícito
        const policyResult = await db.select({
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
            createdByAgentId: customers.createdByAgentId, // AÑADIDO: necesario para canEditPolicy
        })
        .from(policies)
        .innerJoin(customers, eq(policies.customerId, customers.id))
        .leftJoin(agent, eq(customers.createdByAgentId, agent.id))
        .leftJoin(processor, eq(policies.assignedProcessorId, processor.id))
        .where(sql`${policies.id} = ${id}::uuid`) // CASTING EXPLÍCITO A UUID
        .limit(1);

        if (!policyResult[0]) {
            throw new Error('Policy not found');
        }

        const policy = policyResult[0];

        const isProcessed = !['new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs'].includes(policy.status);

        // Si es call_center y está procesada, devolvemos vista limitada
        if (user.role === 'call_center' && isProcessed) {
            return {
                id: policy.id,
                status: policy.status,
                customerName: policy.customerName,
                insuranceCompany: policy.insuranceCompany,
                monthlyPremium: policy.monthlyPremium,
                createdAt: policy.createdAt,
                effectiveDate: policy.effectiveDate,
                marketplaceId: 'Restringido',
                taxCredit: null,
                planLink: null,
                aorLink: null,
                notes: 'Información restringida post-venta.',
                commissionStatus: 'Restringido',
                updatedAt: policy.updatedAt,
                customerEmail: 'Restringido',
                customerPhone: 'Restringido',
                customerId: policy.customerId,
                agentName: null,
                processorName: null,
                aorStatus: null,
            };
        }

        // Obtenemos el estado AOR por separado si existe aorLink
        let aorStatus = null;
        if (policy.aorLink) {
            // Buscamos el documento de firma relacionado con esta política
            const aorDoc = await db.select({
                status: signatureDocuments.status
            })
            .from(signatureDocuments)
            .where(sql`${signatureDocuments.id}::text = ${policy.aorLink}`) // Asumiendo que aorLink es el ID del documento
            .limit(1);
            
            aorStatus = aorDoc[0]?.status || null;
        }

        return {
            ...policy,
            aorStatus
        };

    } catch (error) {
        console.error('Get policy error:', error);
        // Para debugging más detallado
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
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

        await db.update(policies)
            .set({ status: 'in_review', updatedAt: new Date() })
            .where(eq(policies.id, policyId));

        await db.insert(customerTasks).values({
            customerId: policy.customerId,
            policyId: policyId,
            title: "Edición Habilitada por Supervisor",
            description: `El usuario ${user.name} (${user.role}) cambió el estado a "En Revisión" para permitir la edición.`,
            type: 'general',
            priority: 'medium',
            assignedToId: user.id,
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