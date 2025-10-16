// app/(admin)/dashboard/actions.ts

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { policies, customers, users, commissionRecords, dependents } from '@/db/schema';
import { eq, count, sql, desc, and, inArray, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// Define el tipo para la consulta de rendimiento del equipo (MEJORADO)
export type TeamPerformance = {
  agentId: string;
  agentName: string;
  totalCustomers: number;
  totalPolicies: number;
  statusBreakdown: {
    active: number;
    in_review: number;
    approved: number;
    missing_docs: number;
    sent_to_carrier: number;
    rejected: number;
    cancelled: number;
  };
  monthlyRevenue: number;
  conversionRate: number;
  avgPolicyValue: number;
};

// Define el tipo de retorno para la función principal (MEJORADO)
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
  memberTracking: {
    weekly: number;
    fortnightly: number;
    monthly: number;
  };
  // NUEVAS MÉTRICAS
  monthlyTrends: {
    currentMonth: {
      policies: number;
      customers: number;
      revenue: number;
    };
    previousMonth: {
      policies: number;
      customers: number;
      revenue: number;
    };
    growth: {
      policies: number;
      customers: number;
      revenue: number;
    };
  };
  topPerformers: {
    agentId: string;
    agentName: string;
    score: number;
  }[];
  productBreakdown: {
    [key: string]: number;
  };
  conversionFunnel: {
    leads: number;
    contacted: number;
    inReview: number;
    approved: number;
    active: number;
  };
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
    if (userRole === 'agent' || userRole === 'call_center') {
      whereClause = eq(customers.createdByAgentId, userId);
    } else if (userRole === 'manager') {
       const managedAgentIds = await db.select({ id: users.id }).from(users).where(eq(users.managerId, userId));
      if (managedAgentIds.length > 0) {
        whereClause = inArray(customers.createdByAgentId, managedAgentIds.map(u => u.id));
      } else {
        whereClause = sql`false`;
      }
    }

    const customerIdsQuery = db.select({ id: customers.id }).from(customers).where(whereClause);
    const customerIdsResult = await customerIdsQuery;
    const customerIdList = customerIdsResult.map(c => c.id);

    const myCustomers = await db.select({ count: count() }).from(customers).where(whereClause);
    myCustomersCount = myCustomers[0]?.count || 0;
    
    if (customerIdList.length > 0) {
      const myPolicies = await db.select({ count: count() }).from(policies)
        .where(inArray(policies.customerId, customerIdList));
      myPoliciesCount = myPolicies[0]?.count || 0;
    }

    const policyStatusCounts = await db.select({
      status: policies.status,
      count: count(),
    }).from(policies)
    .innerJoin(customers, eq(policies.customerId, customers.id))
    .where(whereClause)
    .groupBy(policies.status);

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
    .limit(10);
    recentPolicies = await recentPoliciesQuery;

    // Métricas mejoradas de rendimiento del equipo
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
          statusBreakdown: {
            active: sql<number>`sum(case when ${policies.status} = 'active' then 1 else 0 end)::int`,
            in_review: sql<number>`sum(case when ${policies.status} = 'in_review' then 1 else 0 end)::int`,
            approved: sql<number>`sum(case when ${policies.status} = 'approved' then 1 else 0 end)::int`,
            missing_docs: sql<number>`sum(case when ${policies.status} = 'missing_docs' then 1 else 0 end)::int`,
            sent_to_carrier: sql<number>`sum(case when ${policies.status} = 'sent_to_carrier' then 1 else 0 end)::int`,
            rejected: sql<number>`sum(case when ${policies.status} = 'rejected' then 1 else 0 end)::int`,
            cancelled: sql<number>`sum(case when ${policies.status} = 'cancelled' then 1 else 0 end)::int`,
          },
          monthlyRevenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
          conversionRate: sql<number>`
            CASE 
              WHEN COUNT(DISTINCT ${policies.id}) = 0 THEN 0
              ELSE (COUNT(DISTINCT CASE WHEN ${policies.status} = 'active' THEN ${policies.id} END)::float / COUNT(DISTINCT ${policies.id})::float * 100)
            END
          `,
          avgPolicyValue: sql<number>`
            CASE 
              WHEN COUNT(DISTINCT ${policies.id}) = 0 THEN 0
              ELSE COALESCE(AVG(${policies.monthlyPremium}), 0)::float
            END
          `
        })
        .from(users)
        .leftJoin(customers, eq(customers.createdByAgentId, users.id))
        .leftJoin(policies, eq(policies.customerId, customers.id))
        .where(and(eq(users.role, 'agent'), teamWhereClause))
        .groupBy(users.id, users.firstName, users.lastName)
        .orderBy(desc(sql`count(distinct ${policies.id})`));
      
      teamPerformance = teamPerformanceQuery;
    }

    // Seguimiento de miembros mejorado
    const memberTracking = { weekly: 0, fortnightly: 0, monthly: 0 };
    if (customerIdList.length > 0) {
        const now = new Date();
        const periods = {
            weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            fortnightly: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
            monthly: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };

        for (const [period, startDate] of Object.entries(periods)) {
            const policiesInPeriod = await db.select({ customerId: policies.customerId })
                .from(policies)
                .where(and(
                    inArray(policies.customerId, customerIdList),
                    gte(policies.createdAt, startDate)
                ));

            if (policiesInPeriod.length > 0) {
                const customerIdsInPeriod = policiesInPeriod.map(p => p.customerId);
                const dependentsCountResult = await db.select({ count: count() })
                    .from(dependents)
                    .where(inArray(dependents.customerId, customerIdsInPeriod));
                
                const totalMembers = policiesInPeriod.length + (dependentsCountResult[0]?.count || 0);
                memberTracking[period as keyof typeof memberTracking] = totalMembers;
            }
        }
    }

    // NUEVAS MÉTRICAS: Tendencias mensuales
    const currentMonth = new Date();
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const currentMonthStats = await db
      .select({
        policies: sql<number>`COUNT(DISTINCT ${policies.id})::int`,
        customers: sql<number>`COUNT(DISTINCT ${customers.id})::int`,
        revenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
      })
      .from(policies)
      .innerJoin(customers, eq(policies.customerId, customers.id))
      .where(and(
        whereClause,
        gte(policies.createdAt, currentMonthStart)
      ));

    const previousMonthStats = await db
      .select({
        policies: sql<number>`COUNT(DISTINCT ${policies.id})::int`,
        customers: sql<number>`COUNT(DISTINCT ${customers.id})::int`,
        revenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
      })
      .from(policies)
      .innerJoin(customers, eq(policies.customerId, customers.id))
      .where(and(
        whereClause,
        gte(policies.createdAt, previousMonth),
        lte(policies.createdAt, currentMonthStart)
      ));

    const current = currentMonthStats[0] || { policies: 0, customers: 0, revenue: 0 };
    const previous = previousMonthStats[0] || { policies: 0, customers: 0, revenue: 0 };

    const monthlyTrends = {
      currentMonth: current,
      previousMonth: previous,
      growth: {
        policies: previous.policies > 0 ? ((current.policies - previous.policies) / previous.policies) * 100 : 0,
        customers: previous.customers > 0 ? ((current.customers - previous.customers) / previous.customers) * 100 : 0,
        revenue: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
      }
    };

    // Top performers
    const topPerformers = teamPerformance
      .map(agent => ({
        agentId: agent.agentId,
        agentName: agent.agentName,
        score: agent.totalPolicies * 10 + agent.statusBreakdown.active * 15 + agent.conversionRate
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Product breakdown
    const productBreakdownQuery = await db
      .select({
        product: policies.insuranceCompany,
        count: count(),
      })
      .from(policies)
      .innerJoin(customers, eq(policies.customerId, customers.id))
      .where(whereClause)
      .groupBy(policies.insuranceCompany);

    const productBreakdown = productBreakdownQuery.reduce((acc, item) => {
      acc[item.product || 'Otros'] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Conversion funnel
    const conversionFunnel = {
      leads: policyStatusCounts.find(s => s.status === 'new_lead')?.count || 0,
      contacted: policyStatusCounts.find(s => s.status === 'contacting')?.count || 0,
      inReview: policyStatusCounts.find(s => s.status === 'in_review')?.count || 0,
      approved: policyStatusCounts.find(s => s.status === 'approved')?.count || 0,
      active: policyStatusCounts.find(s => s.status === 'active')?.count || 0,
    };

    let totalCommissions = '0';
    if (userRole === 'commission_analyst' || userRole === 'super_admin') {
      const commissionSum = await db.select({
        total: sql<string>`COALESCE(SUM(${commissionRecords.commissionAmount}), '0')`
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
      memberTracking,
      monthlyTrends,
      topPerformers,
      productBreakdown,
      conversionFunnel,
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw new Error('Failed to fetch dashboard stats');
  }
}