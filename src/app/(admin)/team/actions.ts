'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, customers, policies } from '@/db/schema';
// 1. Importa la función 'alias'
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { alias } from 'drizzle-orm/pg-core';

export async function getTeamMembers() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  const userId = session.user.id;

  try {
    // 2. Crea el alias para la tabla 'users'
    const manager = alias(users, 'manager');

    let whereClause;
    if (session.user.role === 'manager') {
      whereClause = eq(users.managerId, userId);
    } else {
      whereClause = and(eq(users.isActive, true), sql`${users.role} != 'super_admin'`);
    }
    
    // 3. Usa el alias en la consulta
    const teamMembers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      managerName: sql<string>`${manager.firstName} || ' ' || ${manager.lastName}`,
    })
    .from(users)
    .leftJoin(manager, eq(users.managerId, manager.id)) // Se usa el alias
    .where(whereClause)
    .orderBy(desc(users.createdAt));

    const teamWithStats = await Promise.all(
      teamMembers.map(async (member) => {
        const customerCount = await db.select({ count: count() })
          .from(customers)
          .where(eq(customers.createdByAgentId, member.id));

        const policyCount = await db.select({ count: count() })
          .from(policies)
          .innerJoin(customers, eq(policies.customerId, customers.id))
          .where(eq(customers.createdByAgentId, member.id));

        const activePolicyCount = await db.select({ count: count() })
          .from(policies)
          .innerJoin(customers, eq(policies.customerId, customers.id))
          .where(and(
            eq(customers.createdByAgentId, member.id),
            eq(policies.status, 'active')
          ));

        return {
          ...member,
          stats: {
            customers: customerCount[0]?.count || 0,
            policies: policyCount[0]?.count || 0,
            activePolicies: activePolicyCount[0]?.count || 0,
          },
        };
      })
    );

    return teamWithStats;
  } catch (error) {
    console.error('Get team members error:', error);
    throw new Error('Failed to fetch team members');
  }
}

export async function getTeamPerformance() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  const userId = session.user.id;

  try {
    let whereClause;
    if (session.user.role === 'manager') {
      whereClause = eq(users.managerId, userId);
    } else {
      whereClause = eq(users.role, 'agent');
    }

    const performance = await db.select({
      agentId: users.id,
      agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      totalCustomers: sql<number>`CAST(COUNT(DISTINCT ${customers.id}) AS int)`,
      totalPolicies: sql<number>`CAST(COUNT(DISTINCT ${policies.id}) AS int)`,
      activePolicies: sql<number>`CAST(COUNT(DISTINCT CASE WHEN ${policies.status} = 'active' THEN ${policies.id} END) AS int)`,
      totalPremium: sql<string>`COALESCE(SUM(${policies.monthlyPremium}), '0')`,
    })
    .from(users)
    .leftJoin(customers, eq(customers.createdByAgentId, users.id))
    .leftJoin(policies, eq(policies.customerId, customers.id))
    .where(whereClause)
    .groupBy(users.id, users.firstName, users.lastName)
    .orderBy(sql`CAST(COUNT(DISTINCT ${policies.id}) AS int) DESC`);

    return performance;
  } catch (error) {
    console.error('Get team performance error:', error);
    throw new Error('Failed to fetch team performance');
  }
}

export async function assignLeadToAgent(customerId: string, agentId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    await db.update(customers)
      .set({ 
        createdByAgentId: agentId,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    revalidatePath('/team');
    revalidatePath('/customers');
    return { success: true, message: 'Lead assigned successfully' };
  } catch (error) {
    console.error('Assign lead error:', error);
    throw new Error('Failed to assign lead');
  }
}