// app/(admin)/dashboard/actions.ts

'use server';

// =================================================================
// CAMBIOS REALIZADOS:
// 1. **TeamPerformance Mejorado**: El tipo y la consulta ahora incluyen un desglose
//    detallado del estado de las pólizas por agente (`statusBreakdown`), no solo activas.
// 2. **Seguimiento de Miembros**:
//    - Se añadió una nueva consulta (`memberTracking`) que cuenta al titular de la póliza
//      más sus dependientes.
//    - Calcula los totales para la última semana, quincena (15 días) y mes (30 días).
// 3. **Tipos de Datos Actualizados**: Se actualizó el tipo `DashboardStats` para reflejar
//    la nueva data.
// 4. **Lógica de Filtrado**: Se aseguró que las nuevas consultas también respeten el
//    filtrado por rol del usuario (agente, manager, etc.).
// =================================================================

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { policies, customers, users, commissionRecords, dependents } from '@/db/schema';
import { eq, count, sql, desc, and, inArray, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// 1. Define el tipo para la consulta de rendimiento del equipo (ACTUALIZADO)
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
  };
};

// 2. Define el tipo de retorno para la función principal (ACTUALIZADO)
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
  // NUEVO: Objeto para el seguimiento de miembros
  memberTracking: {
    weekly: number;
    fortnightly: number;
    monthly: number;
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
       // Un manager ve las pólizas de los agentes que él gestiona
      const managedAgentIds = await db.select({ id: users.id }).from(users).where(eq(users.managerId, userId));
      if (managedAgentIds.length > 0) {
        whereClause = inArray(customers.createdByAgentId, managedAgentIds.map(u => u.id));
      } else {
         // Si el manager no tiene agentes, no verá datos de clientes
        whereClause = sql`false`;
      }
    }
    // Para super_admin, whereClause es undefined y se ven todos los datos.

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
          // NUEVO: Desglose de estados
          statusBreakdown: {
            active: sql<number>`sum(case when ${policies.status} = 'active' then 1 else 0 end)::int`,
            in_review: sql<number>`sum(case when ${policies.status} = 'in_review' then 1 else 0 end)::int`,
            approved: sql<number>`sum(case when ${policies.status} = 'approved' then 1 else 0 end)::int`,
            missing_docs: sql<number>`sum(case when ${policies.status} = 'missing_docs' then 1 else 0 end)::int`
          }
        })
        .from(users)
        .leftJoin(customers, eq(customers.createdByAgentId, users.id))
        .leftJoin(policies, eq(policies.customerId, customers.id))
        .where(and(eq(users.role, 'agent'), teamWhereClause))
        .groupBy(users.id, users.firstName, users.lastName)
        .orderBy(desc(sql`count(distinct ${policies.id})`));
      
      teamPerformance = teamPerformanceQuery;
    }

    // NUEVO: Lógica para el seguimiento de miembros (titular + dependientes)
    const memberTracking = { weekly: 0, fortnightly: 0, monthly: 0 };
    if (customerIdList.length > 0) {
        const now = new Date();
        const periods = {
            weekly: new Date(now.setDate(now.getDate() - 7)),
            fortnightly: new Date(now.setDate(now.getDate() + 7 - 15)), // Reset date and subtract 15
            monthly: new Date(now.setDate(now.getDate() + 15 - 30)), // Reset date and subtract 30
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
      memberTracking, // NUEVO: Devolver los datos de seguimiento
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw new Error('Failed to fetch dashboard stats');
  }
}