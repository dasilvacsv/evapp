// app/(admin)/dashboard/actions.ts

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { policies, customers, users, commissionRecords } from '@/db/schema';
import { eq, count, sql, desc, sum, and, inArray } from 'drizzle-orm';

// 1. Define el tipo para la consulta de rendimiento del equipo
export type TeamPerformance = {
  agentId: string;
  agentName: string;
  totalCustomers: number;
  totalPolicies: number;
  activePolicies: number;
};

// 2. Define el tipo de retorno para la función principal
type DashboardStats = {
  totalCustomers: number;
  totalPolicies: number;
  totalCommissions: string;
  policyStatusCounts: { status: string; count: number }[];
  recentPolicies: {
    id: string;
    customerName: string;
    status: string;
    insuranceCompany: string | null;
    monthlyPremium: string | null;
    createdAt: Date;
  }[];
  userRole: string;
  teamPerformance: TeamPerformance[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    let whereClause;
    let myCustomersCount = 0;
    let myPoliciesCount = 0;
    let recentPolicies = [];
    let teamPerformance: TeamPerformance[] = [];

    // Lógica de filtrado por rol
    if (userRole === 'agent') {
      whereClause = eq(customers.createdByAgentId, userId);
    }

    // Obtener el total de clientes y pólizas (filtrado por rol si aplica)
    const myCustomers = await db.select({ count: count() }).from(customers).where(whereClause);
    myCustomersCount = myCustomers[0]?.count || 0;
    
    const customerIds = await db.select({ id: customers.id }).from(customers).where(whereClause);
    if (customerIds.length > 0) {
      const myPolicies = await db.select({ count: count() }).from(policies)
        .where(inArray(policies.customerId, customerIds.map(c => c.id)));
      myPoliciesCount = myPolicies[0]?.count || 0;
    }

    // Desglose del estado de la póliza
    const policyStatusCounts = await db.select({
      status: policies.status,
      count: count(),
    }).from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .where(whereClause)
    .groupBy(policies.status);

    // Pólizas recientes (filtradas por rol si aplica)
    const recentPoliciesQuery = db.select({
      id: policies.id,
      customerName: customers.fullName,
      status: policies.status,
      insuranceCompany: policies.insuranceCompany,
      monthlyPremium: policies.monthlyPremium,
      createdAt: policies.createdAt,
    }).from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .where(whereClause)
    .orderBy(desc(policies.createdAt))
    .limit(5);

    recentPolicies = await recentPoliciesQuery;

    // Métricas de rendimiento del equipo (solo para Manager y Super Admin)
    if (userRole === 'manager' || userRole === 'super_admin') {
      let teamWhereClause;
      if (userRole === 'manager') {
        teamWhereClause = eq(users.managerId, userId);
      }

      const teamPerformanceQuery = await db
        .select({
          agentId: users.id,
          agentName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          totalCustomers: sql<number>`count(distinct ${customers.id})::int`,
          totalPolicies: sql<number>`count(distinct ${policies.id})::int`,
          activePolicies: sql<number>`sum(case when ${policies.status} = 'active' then 1 else 0 end)::int`,
        })
        .from(users)
        .leftJoin(customers, eq(customers.createdByAgentId, users.id))
        .leftJoin(policies, eq(policies.customerId, customers.id))
        .where(and(eq(users.role, 'agent'), teamWhereClause))
        .groupBy(users.id, users.firstName, users.lastName);
      
      teamPerformance = teamPerformanceQuery;
    }

    // Estadísticas de comisiones
    let totalCommissions = '0';
    if (userRole === 'commission_analyst' || userRole === 'super_admin') {
      const commissionSum = await db.select({
        total: sql<string>`COALESCE(SUM(${commissionRecords.commissionAmount}), 0)`
      }).from(commissionRecords);
      totalCommissions = commissionSum[0]?.total || '0';
    }

    return {
      totalCustomers: myCustomersCount,
      totalPolicies: myPoliciesCount,
      totalCommissions,
      policyStatusCounts: policyStatusCounts.map(item => ({
        status: item.status || 'unknown',
        count: item.count
      })),
      recentPolicies: recentPolicies.map(policy => ({
        ...policy,
        monthlyPremium: policy.monthlyPremium?.toString() || null
      })),
      userRole,
      teamPerformance,
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw new Error('Failed to fetch dashboard stats');
  }
}