'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { policies, customers, users, commissionRecords, commissionBatches } from '@/db/schema';
import { eq, and, desc, sql, count, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { alias } from 'drizzle-orm/pg-core';

const createCommissionBatchSchema = z.object({
  periodDescription: z.string().min(1, 'Period description is required'),
  policyIds: z.array(z.string().uuid()).min(1, 'At least one policy must be selected'),
});

export async function getCommissionablePolicies(page = 1, limit = 10, search = '') {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['commission_analyst', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const offset = (page - 1) * limit;
    
    const agent = alias(users, 'agent');
    
    const conditions = [
      eq(policies.status, 'active'),
      isNull(commissionRecords.id),
    ];
    if (search) {
      conditions.push(sql`${customers.fullName} ILIKE ${`%${search}%`}`);
    }

    const policiesList = await db.select({
      id: policies.id,
      status: policies.status,
      insuranceCompany: policies.insuranceCompany,
      monthlyPremium: policies.monthlyPremium,
      marketplaceId: policies.marketplaceId, // Cambiado de policyNumber
      planName: policies.planName, // Nuevo campo
      taxCredit: policies.taxCredit,
      effectiveDate: policies.effectiveDate,
      commissionStatus: policies.commissionStatus,
      createdAt: policies.createdAt,
      customerName: customers.fullName,
      customerId: customers.id,
      agentId: customers.createdByAgentId,
      agentName: sql<string>`${agent.firstName} || ' ' || ${agent.lastName}`,
      hasCommissionRecord: sql<boolean>`CASE WHEN ${commissionRecords.id} IS NOT NULL THEN true ELSE false END`,
    })
    .from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .leftJoin(agent, eq(customers.createdByAgentId, agent.id))
    .leftJoin(commissionRecords, eq(commissionRecords.policyId, policies.id))
    .where(and(...conditions))
    .orderBy(desc(policies.createdAt))
    .limit(limit)
    .offset(offset);

    const totalResult = await db.select({ count: count() })
      .from(policies)
      .innerJoin(customers, eq(policies.customerId, customers.id))
      .leftJoin(commissionRecords, eq(commissionRecords.policyId, policies.id))
      .where(and(...conditions));
    
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
    console.error('Get commissionable policies error:', error);
    throw new Error('Failed to fetch commissionable policies');
  }
}

export async function createCommissionBatch(data: z.infer<typeof createCommissionBatchSchema>) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['commission_analyst', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const validatedData = createCommissionBatchSchema.parse(data);

    // Create the batch
    const [batchResult] = await db.insert(commissionBatches).values({
      periodDescription: validatedData.periodDescription,
      createdByAnalystId: session.user.id,
      status: 'pending_approval',
    }).returning({ id: commissionBatches.id });

    // Get policy and agent information for commission calculation
    const agent = alias(users, 'agent');
    const policyData = await db.select({
      policyId: policies.id,
      agentId: customers.createdByAgentId,
      monthlyPremium: policies.monthlyPremium,
    })
    .from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .leftJoin(agent, eq(customers.createdByAgentId, agent.id))
    .where(sql`${policies.id} IN ${validatedData.policyIds}`);

    // Create commission records
    const commissionRecordsData = policyData.map(policy => ({
      policyId: policy.policyId,
      agentId: policy.agentId,
      commissionAmount: String(Number(policy.monthlyPremium) * 0.1), // 10% commission rate
      processedByAnalystId: session.user.id,
      paymentBatchId: batchResult.id,
    }));

    await db.insert(commissionRecords).values(commissionRecordsData);

    // Update policy commission status
    await db.update(policies)
      .set({ commissionStatus: 'calculated' })
      .where(sql`${policies.id} IN ${validatedData.policyIds}`);

    revalidatePath('/commissions');
    return { success: true, message: 'Commission batch created successfully' };
  } catch (error) {
    console.error('Create commission batch error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Validation error', errors: error.errors };
    }
    throw new Error('Failed to create commission batch');
  }
}

export async function getCommissionBatches(page = 1, limit = 10) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['commission_analyst', 'super_admin', 'manager'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const offset = (page - 1) * limit;
    
    const creator = alias(users, 'creator');
    const approver = alias(users, 'approver');

    const batchesQuery = db.select({
      id: commissionBatches.id,
      periodDescription: commissionBatches.periodDescription,
      status: commissionBatches.status,
      createdAt: commissionBatches.createdAt,
      createdByName: sql<string>`${creator.firstName} || ' ' || ${creator.lastName}`,
      approvedByName: sql<string>`${approver.firstName} || ' ' || ${approver.lastName}`,
      recordCount: sql<number>`CAST(COUNT(${commissionRecords.id}) AS int)`,
      totalAmount: sql<string>`COALESCE(SUM(${commissionRecords.commissionAmount}), '0')`,
    })
    .from(commissionBatches)
    .leftJoin(creator, eq(commissionBatches.createdByAnalystId, creator.id))
    .leftJoin(approver, eq(commissionBatches.approvedById, approver.id))
    .leftJoin(commissionRecords, eq(commissionRecords.paymentBatchId, commissionBatches.id))
    .groupBy(
      commissionBatches.id,
      creator.firstName,
      creator.lastName,
      approver.firstName,
      approver.lastName
    )
    .orderBy(desc(commissionBatches.createdAt))
    .limit(limit)
    .offset(offset);

    const batchesList = await batchesQuery;

    const totalQuery = db.select({ count: count() }).from(commissionBatches);
    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    return {
      batches: batchesList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get commission batches error:', error);
    throw new Error('Failed to fetch commission batches');
  }
}

export async function approveCommissionBatch(batchId: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    await db.update(commissionBatches)
      .set({
        status: 'approved',
        approvedById: session.user.id,
      })
      .where(eq(commissionBatches.id, batchId));

    revalidatePath('/commissions');
    return { success: true, message: 'Commission batch approved successfully' };
  } catch (error) {
    console.error('Approve commission batch error:', error);
    throw new Error('Failed to approve commission batch');
  }
}

export async function getCommissionStats() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['commission_analyst', 'super_admin', 'manager'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const totalCommissions = await db.select({
      total: sql<string>`COALESCE(SUM(${commissionRecords.commissionAmount}), '0')`
    }).from(commissionRecords);

    const pendingCommissions = await db.select({ count: count() })
      .from(policies)
      .leftJoin(commissionRecords, eq(commissionRecords.policyId, policies.id))
      .where(and(
        eq(policies.status, 'active'),
        isNull(commissionRecords.id)
      ));

    const batchStatusCounts = await db.select({
      status: commissionBatches.status,
      count: count(),
    })
    .from(commissionBatches)
    .groupBy(commissionBatches.status);

    return {
      totalCommissions: totalCommissions[0]?.total || '0',
      pendingCommissions: pendingCommissions[0]?.count || 0,
      batchStatusCounts,
    };
  } catch (error) {
    console.error('Get commission stats error:', error);
    throw new Error('Failed to fetch commission stats');
  }
}