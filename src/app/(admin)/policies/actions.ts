'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { policies, customers, users } from '@/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { alias } from 'drizzle-orm/pg-core';

const createPolicySchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  insuranceCompany: z.string().min(1, 'Insurance company is required'),
  monthlyPremium: z.string().min(1, 'Monthly premium is required'),
  marketplaceId: z.string().optional(), // CAMBIO REALIZADO
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
  marketplaceId: z.string().optional(), // CAMBIO REALIZADO
  effectiveDate: z.string().optional(),
  taxCredit: z.string().optional(),
});

export async function getPolicies(page = 1, limit = 10, search = '', status = '') {
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

    let whereClause;
    if (userRole === 'agent') {
      whereClause = eq(customers.createdByAgentId, userId);
    } else if (userRole === 'manager') {
      const managedAgents = await db.select({ id: users.id }).from(users).where(eq(users.managerId, userId));
      const agentIds = managedAgents.map(a => a.id);
      agentIds.push(userId);
      whereClause = sql`${customers.createdByAgentId} IN ${agentIds}`;
    } else if (userRole === 'processor') {
      whereClause = eq(policies.assignedProcessorId, userId);
    }

    const policiesQuery = db.select({
      id: policies.id,
      status: policies.status,
      insuranceCompany: policies.insuranceCompany,
      monthlyPremium: policies.monthlyPremium,
      marketplaceId: policies.marketplaceId, // CAMBIO REALIZADO
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
    .orderBy(desc(policies.createdAt))
    .limit(limit)
    .offset(offset);

    if (whereClause) {
      policiesQuery.where(whereClause);
    }

    if (search) {
      policiesQuery.where(sql`${customers.fullName} ILIKE ${`%${search}%`}`);
    }

    if (status) {
      policiesQuery.where(eq(policies.status, status as any));
    }

    const policiesList = await policiesQuery;

    const totalQuery = db.select({ count: count() }).from(policies)
      .innerJoin(customers, eq(policies.customerId, customers.id));
    
    if (whereClause) {
      totalQuery.where(whereClause);
    }
    if (search) {
      totalQuery.where(sql`${customers.fullName} ILIKE ${`%${search}%`}`);
    }
    if (status) {
      totalQuery.where(eq(policies.status, status as any));
    }
    
    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    return {
      policies: policiesList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    if (validatedData.marketplaceId) { // CAMBIO REALIZADO
      policyData.marketplaceId = validatedData.marketplaceId; // CAMBIO REALIZADO
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
    if (validatedData.marketplaceId) { // CAMBIO REALIZADO
      updateData.marketplaceId = validatedData.marketplaceId; // CAMBIO REALIZADO
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

export async function getPolicyById(id: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const agent = alias(users, 'agent');
    const processor = alias(users, 'processor');

    const policy = await db.select({
      id: policies.id,
      status: policies.status,
      insuranceCompany: policies.insuranceCompany,
      monthlyPremium: policies.monthlyPremium,
      marketplaceId: policies.marketplaceId, // CAMBIO REALIZADO
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
    })
    .from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .leftJoin(agent, eq(customers.createdByAgentId, agent.id))
    .leftJoin(processor, eq(policies.assignedProcessorId, processor.id))
    .where(eq(policies.id, id))
    .limit(1);

    if (!policy[0]) {
      throw new Error('Policy not found');
    }

    return policy[0];
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