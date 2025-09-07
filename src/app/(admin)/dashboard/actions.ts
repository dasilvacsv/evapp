// app/(admin)/dashboard/actions.ts

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/db';
import { policies, customers, users, commissionRecords } from '@/db/schema';
import { eq, count, sql, desc, sum, and, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// 1. Define el tipo para la consulta de rendimiento del equipo
type TeamPerformance = {
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
  teamPerformance: TeamPerformance[]; // Asigna el tipo TeamPerformance[]
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
    let teamPerformance: TeamPerformance[] = []; // 3. Inicializa la variable con el tipo definido

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
      } else {
        teamWhereClause = undefined; 
      }

      const agentWithStats = alias(users, 'agentWithStats');
      const teamPerformanceQuery = await db.select({
        agentId: agentWithStats.id,
        agentName: sql<string>`${agentWithStats.firstName} || ' ' || ${agentWithStats.lastName}`,
        totalCustomers: sql<number>`count(${customers.id})`,
        totalPolicies: sql<number>`count(${policies.id})`,
        activePolicies: sql<number>`sum(CASE WHEN ${policies.status} = 'active' THEN 1 ELSE 0 END)`,
      })
      .from(agentWithStats)
      .leftJoin(customers, eq(customers.createdByAgentId, agentWithStats.id))
      .leftJoin(policies, eq(policies.customerId, customers.id))
      .where(and(eq(agentWithStats.role, 'agent'), teamWhereClause))
      .groupBy(agentWithStats.id, agentWithStats.firstName, agentWithStats.lastName);
      
      // Asigna los datos a la variable tipada
      teamPerformance = teamPerformanceQuery as TeamPerformance[];
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
      policyStatusCounts,
      recentPolicies,
      userRole,
      teamPerformance,
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw new Error('Failed to fetch dashboard stats');
  }
}