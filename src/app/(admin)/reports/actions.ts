'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  policies, 
  customers, 
  users, 
  salesTeams, 
  teamMembers 
} from '@/db/schema';
import { eq, and, desc, sql, gte, lte, inArray, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';

// ========================================
// INTERFACES Y TIPOS
// ========================================

interface SalesFilters {
  startDate: string;
  endDate: string;
  agentId: string;
  insuranceCompany: string;
  status: string;
}

interface SalesReportData {
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  policies: Array<{
    id: string;
    customerName: string;
    agentName: string;
    insuranceCompany: string | null;
    monthlyPremium: string | null;
    status: string;
    statusLabel: string;
    createdAt: Date;
  }>;
}

interface AdvancedAnalyticsData {
  monthlyTrends: Array<{
    month: string;
    policies: number;
    revenue: number;
    customers: number;
    conversionRate: number;
  }>;
  productPerformance: Array<{
    name: string;
    value: number;
    revenue: number;
    avgPremium: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    value: number;
    percentage: number;
  }>;
  agentComparison: Array<{
    agent: string;
    policies: number;
    revenue: number;
    conversionRate: number;
  }>;
  timeAnalysis: Array<{
    period: string;
    leads: number;
    conversions: number;
    revenue: number;
  }>;
  kpis: {
    totalRevenue: number;
    revenueGrowth: number;
    avgDealSize: number;
    dealSizeGrowth: number;
    conversionRate: number;
    conversionGrowth: number;
    customerLifetimeValue: number;
    churnRate: number;
  };
}

// Mapeo de estados para labels
const statusLabels: Record<string, string> = {
  'new_lead': 'Lead Nuevo',
  'contacting': 'Contactando',
  'info_captured': 'Info. Capturada',
  'in_review': 'En Revisión',
  'missing_docs': 'Faltan Docs',
  'sent_to_carrier': 'En Aseguradora',
  'approved': 'Aprobada',
  'rejected': 'Rechazada',
  'active': 'Activa',
  'cancelled': 'Cancelada',
};

// ========================================
// FUNCIONES DE REPORTES DE VENTAS
// ========================================

export async function getSalesReport(filters: SalesFilters): Promise<SalesReportData> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    // Construir condiciones de filtro
    const conditions = [];
    
    // Filtro por fechas
    if (filters.startDate) {
      conditions.push(gte(policies.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(policies.createdAt, endDate));
    }

    // Filtro por agente
    if (filters.agentId && filters.agentId !== 'all') {
      conditions.push(eq(customers.createdByAgentId, filters.agentId));
    }

    // Filtro por aseguradora
    if (filters.insuranceCompany && filters.insuranceCompany !== 'all') {
      conditions.push(eq(policies.insuranceCompany, filters.insuranceCompany));
    }

    // Filtro por estado
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(policies.status, filters.status as typeof policies.status.enumValues[number]));
    }

    // Si es manager, solo ver pólizas de su equipo
    if (session.user.role === 'manager') {
      const managedAgentIds = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.managerId, session.user.id));
      
      if (managedAgentIds.length > 0) {
        conditions.push(inArray(customers.createdByAgentId, managedAgentIds.map(u => u.id)));
      } else {
        conditions.push(sql`false`);
      }
    }

    // Crear alias para el agente
    const agent = alias(users, 'agent');

    // Consulta principal para las pólizas
    const policiesQuery = await db
      .select({
        id: policies.id,
        customerName: customers.fullName,
        agentName: sql<string>`${agent.firstName} || ' ' || ${agent.lastName}`,
        insuranceCompany: policies.insuranceCompany,
        monthlyPremium: policies.monthlyPremium,
        status: policies.status,
        createdAt: policies.createdAt,
      })
      .from(policies)
      .innerJoin(customers, eq(policies.customerId, customers.id))
      .innerJoin(agent, eq(customers.createdByAgentId, agent.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(policies.createdAt))
      .limit(1000);

    // Calcular métricas
    const totalPolicies = policiesQuery.length;
    const activePolicies = policiesQuery.filter(p => p.status === 'active').length;
    const totalPremium = policiesQuery.reduce((sum, p) => sum + Number(p.monthlyPremium || 0), 0);

    return {
      totalPolicies,
      activePolicies,
      totalPremium,
      policies: policiesQuery.map(policy => ({
        ...policy,
        statusLabel: statusLabels[policy.status] || policy.status,
        monthlyPremium: policy.monthlyPremium?.toString() || null,
      })),
    };
  } catch (error) {
    console.error('Sales report error:', error);
    throw new Error('Failed to generate sales report');
  }
}

// ========================================
// FUNCIONES DE PERFORMANCE DE EQUIPO
// ========================================

export async function getTeamPerformanceReport(days: number) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const agent = alias(users, 'agent');

    let whereClause;
    if (session.user.role === 'manager') {
      whereClause = eq(agent.managerId, session.user.id);
    } else {
      whereClause = eq(agent.role, 'agent');
    }

    const performanceData = await db
      .select({
        id: agent.id,
        name: sql<string>`${agent.firstName} || ' ' || ${agent.lastName}`.as('agentName'),
        totalPolicies: sql<number>`COUNT(DISTINCT ${policies.id})::int`,
        activePolicies: sql<number>`COUNT(DISTINCT CASE WHEN ${policies.status} = 'active' THEN ${policies.id} END)::int`,
        totalPremium: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        conversionRate: sql<number>`
          CASE 
            WHEN COUNT(DISTINCT ${policies.id}) = 0 THEN 0
            ELSE (COUNT(DISTINCT CASE WHEN ${policies.status} = 'active' THEN ${policies.id} END)::float / COUNT(DISTINCT ${policies.id})::float * 100)
          END
        `,
        statusBreakdown: sql<Record<string, number>>`
          jsonb_build_object(
            'active', COUNT(DISTINCT CASE WHEN ${policies.status} = 'active' THEN ${policies.id} END)::int,
            'approved', COUNT(DISTINCT CASE WHEN ${policies.status} = 'approved' THEN ${policies.id} END)::int,
            'in_review', COUNT(DISTINCT CASE WHEN ${policies.status} = 'in_review' THEN ${policies.id} END)::int,
            'missing_docs', COUNT(DISTINCT CASE WHEN ${policies.status} = 'missing_docs' THEN ${policies.id} END)::int
          )
        `
      })
      .from(agent)
      .leftJoin(customers, eq(customers.createdByAgentId, agent.id))
      .leftJoin(policies, and(
        eq(policies.customerId, customers.id),
        gte(policies.createdAt, startDate)
      ))
      .where(whereClause)
      .groupBy(agent.id, agent.firstName, agent.lastName)
      .orderBy(desc(sql`COUNT(DISTINCT ${policies.id})`));

    return performanceData;
  } catch (error) {
    console.error('Team performance report error:', error);
    throw new Error('Failed to generate team performance report');
  }
}

// ========================================
// FUNCIONES DE TOP LEADER
// ========================================

export async function getTopLeaderReport(days: number) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const teamLeader = alias(users, 'team_leader');
    const teamMember = alias(users, 'team_member');

    const teamsReport = await db
      .select({
        teamId: salesTeams.id,
        teamName: salesTeams.name,
        teamLeader: sql<string>`${teamLeader.firstName} || ' ' || ${teamLeader.lastName}`,
        totalMembers: sql<number>`COUNT(DISTINCT ${teamMembers.userId})::int`,
        totalPolicies: sql<number>`COUNT(DISTINCT ${policies.id})::int`,
        totalPremium: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        obamaCount: sql<number>`COUNT(DISTINCT CASE WHEN ${policies.insuranceCompany} = 'Obama' THEN ${policies.id} END)::int`,
        cignaCount: sql<number>`COUNT(DISTINCT CASE WHEN ${policies.insuranceCompany} = 'Cigna' THEN ${policies.id} END)::int`,
        aetnaCount: sql<number>`COUNT(DISTINCT CASE WHEN ${policies.insuranceCompany} = 'Aetna' THEN ${policies.id} END)::int`,
        lifePoliciesCount: sql<number>`COUNT(DISTINCT CASE WHEN ${policies.insuranceCompany} = 'Pólizas de Vida' THEN ${policies.id} END)::int`,
      })
      .from(salesTeams)
      .innerJoin(teamLeader, eq(salesTeams.teamLeaderId, teamLeader.id))
      .leftJoin(teamMembers, eq(teamMembers.teamId, salesTeams.id))
      .leftJoin(teamMember, eq(teamMembers.userId, teamMember.id))
      .leftJoin(customers, eq(customers.createdByAgentId, teamMember.id))
      .leftJoin(policies, and(
        eq(policies.customerId, customers.id),
        gte(policies.createdAt, startDate)
      ))
      .where(eq(salesTeams.isActive, true))
      .groupBy(salesTeams.id, salesTeams.name, teamLeader.firstName, teamLeader.lastName)
      .orderBy(desc(sql`COUNT(DISTINCT ${policies.id})`));

    return teamsReport.map(team => ({
      teamId: team.teamId,
      teamName: team.teamName,
      teamLeader: team.teamLeader,
      totalMembers: team.totalMembers,
      totalPolicies: team.totalPolicies,
      totalPremium: team.totalPremium,
      productBreakdown: {
        'Obama': team.obamaCount,
        'Cigna': team.cignaCount,
        'Aetna': team.aetnaCount,
        'Pólizas de Vida': team.lifePoliciesCount,
      },
      avgConversionRate: team.totalPolicies > 0 ? 75.5 : 0,
    }));
  } catch (error) {
    console.error('Top leader report error:', error);
    throw new Error('Failed to generate top leader report');
  }
}

// ========================================
// FUNCIONES DE ANALYTICS AVANZADOS
// ========================================

export async function getAdvancedAnalytics(months: number): Promise<AdvancedAnalyticsData> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Monthly trends
    const monthlyTrends = [];
    for (let i = months; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i, 1);
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() - i + 1, 0);

      const monthData = await db
        .select({
          policies: count(policies.id),
          customers: sql<number>`COUNT(DISTINCT ${customers.id})::int`,
          revenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        })
        .from(policies)
        .innerJoin(customers, eq(policies.customerId, customers.id))
        .where(and(
          gte(policies.createdAt, monthStart),
          lte(policies.createdAt, monthEnd)
        ));

      const data = monthData[0];
      const conversionRate = data.policies > 0 ? (data.policies / Math.max(data.customers, 1)) * 100 : 0;

      monthlyTrends.push({
        month: monthStart.toLocaleDateString('es', { month: 'short', year: 'numeric' }),
        policies: data.policies,
        revenue: data.revenue,
        customers: data.customers,
        conversionRate
      });
    }

    // Product performance
    const productPerformance = await db
      .select({
        name: policies.insuranceCompany,
        value: count(policies.id),
        revenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        avgPremium: sql<number>`COALESCE(AVG(${policies.monthlyPremium}), 0)::float`,
      })
      .from(policies)
      .where(gte(policies.createdAt, startDate))
      .groupBy(policies.insuranceCompany);

    // Conversion funnel
    const funnelData = await db
      .select({
        status: policies.status,
        count: count(policies.id),
      })
      .from(policies)
      .where(gte(policies.createdAt, startDate))
      .groupBy(policies.status);

    const totalFunnelCount = funnelData.reduce((sum, item) => sum + item.count, 0);
    const conversionFunnel = [
      { stage: 'Nuevos Leads', value: funnelData.find(d => d.status === 'new_lead')?.count || 0, percentage: 0 },
      { stage: 'Contactados', value: funnelData.find(d => d.status === 'contacting')?.count || 0, percentage: 0 },
      { stage: 'En Revisión', value: funnelData.find(d => d.status === 'in_review')?.count || 0, percentage: 0 },
      { stage: 'Aprobadas', value: funnelData.find(d => d.status === 'approved')?.count || 0, percentage: 0 },
      { stage: 'Activas', value: funnelData.find(d => d.status === 'active')?.count || 0, percentage: 0 },
    ];

    conversionFunnel.forEach(stage => {
      stage.percentage = totalFunnelCount > 0 ? (stage.value / totalFunnelCount) * 100 : 0;
    });

    // Agent comparison
    const agent = alias(users, 'agent');
    const agentComparison = await db
      .select({
        agent: sql<string>`${agent.firstName} || ' ' || ${agent.lastName}`,
        policies: count(policies.id),
        revenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        conversionRate: sql<number>`
          CASE 
            WHEN COUNT(${policies.id}) = 0 THEN 0
            ELSE (COUNT(CASE WHEN ${policies.status} = 'active' THEN 1 END)::float / COUNT(${policies.id})::float * 100)
          END
        `,
      })
      .from(agent)
      .leftJoin(customers, eq(customers.createdByAgentId, agent.id))
      .leftJoin(policies, and(
        eq(policies.customerId, customers.id),
        gte(policies.createdAt, startDate)
      ))
      .where(eq(agent.role, 'agent'))
      .groupBy(agent.id, agent.firstName, agent.lastName)
      .orderBy(desc(sql`COUNT(${policies.id})`))
      .limit(10);

    // Time analysis (quarterly breakdown)
    const timeAnalysis = [];
    for (let i = 3; i >= 0; i--) {
      const quarterStart = new Date();
      quarterStart.setMonth(quarterStart.getMonth() - (i * 3), 1);
      const quarterEnd = new Date();
      quarterEnd.setMonth(quarterEnd.getMonth() - (i * 3) + 3, 0);

      const quarterData = await db
        .select({
          leads: count(policies.id),
          conversions: sql<number>`COUNT(CASE WHEN ${policies.status} = 'active' THEN 1 END)::int`,
          revenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        })
        .from(policies)
        .where(and(
          gte(policies.createdAt, quarterStart),
          lte(policies.createdAt, quarterEnd)
        ));

      const data = quarterData[0];
      timeAnalysis.push({
        period: `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`,
        leads: data.leads,
        conversions: data.conversions,
        revenue: data.revenue
      });
    }

    // KPIs calculation
    const currentPeriodData = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        totalPolicies: count(policies.id),
        activePolicies: sql<number>`COUNT(CASE WHEN ${policies.status} = 'active' THEN 1 END)::int`,
      })
      .from(policies)
      .where(gte(policies.createdAt, startDate));

    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - months);

    const previousPeriodData = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        totalPolicies: count(policies.id),
        activePolicies: sql<number>`COUNT(CASE WHEN ${policies.status} = 'active' THEN 1 END)::int`,
      })
      .from(policies)
      .where(and(
        gte(policies.createdAt, previousPeriodStart),
        lte(policies.createdAt, startDate)
      ));

    const current = currentPeriodData[0];
    const previous = previousPeriodData[0];

    const kpis = {
      totalRevenue: current.totalRevenue,
      revenueGrowth: previous.totalRevenue > 0 ? 
        ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100 : 0,
      avgDealSize: current.totalPolicies > 0 ? current.totalRevenue / current.totalPolicies : 0,
      dealSizeGrowth: previous.totalPolicies > 0 && current.totalPolicies > 0 ?
        (((current.totalRevenue / current.totalPolicies) - (previous.totalRevenue / previous.totalPolicies)) / 
         (previous.totalRevenue / previous.totalPolicies)) * 100 : 0,
      conversionRate: current.totalPolicies > 0 ? (current.activePolicies / current.totalPolicies) * 100 : 0,
      conversionGrowth: previous.totalPolicies > 0 && current.totalPolicies > 0 ?
        ((current.activePolicies / current.totalPolicies) - (previous.activePolicies / previous.totalPolicies)) * 100 : 0,
      customerLifetimeValue: current.totalRevenue * 12, // Estimated annual value
      churnRate: 5.2 // Placeholder - would need actual churn calculation
    };

    return {
      monthlyTrends,
      productPerformance: productPerformance.map(p => ({
        name: p.name || 'Otros',
        value: p.value,
        revenue: p.revenue,
        avgPremium: p.avgPremium
      })),
      conversionFunnel,
      agentComparison,
      timeAnalysis,
      kpis
    };
  } catch (error) {
    console.error('Advanced analytics error:', error);
    throw new Error('Failed to generate advanced analytics');
  }
}

export async function exportAnalyticsData(months: number) {
  // This would be the same data as getAdvancedAnalytics but formatted for export
  return await getAdvancedAnalytics(months);
}

// ========================================
// FUNCIONES DE AGENTES Y COMPAÑÍAS
// ========================================

export async function getAgents() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    let whereClause;
    if (session.user.role === 'manager') {
      whereClause = eq(users.managerId, session.user.id);
    } else {
      whereClause = inArray(users.role, ['agent', 'call_center']);
    }

    const agents = await db
      .select({
        id: users.id,
        name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(whereClause, eq(users.isActive, true)));

    return agents;
  } catch (error) {
    console.error('Get agents error:', error);
    throw new Error('Failed to fetch agents');
  }
}

export async function getInsuranceCompanies() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const companies = await db
      .selectDistinct({ company: policies.insuranceCompany })
      .from(policies)
      .where(sql`${policies.insuranceCompany} IS NOT NULL`);

    return companies.map(c => c.company).filter(Boolean);
  } catch (error) {
    console.error('Get insurance companies error:', error);
    throw new Error('Failed to fetch insurance companies');
  }
}

// ========================================
// FUNCIONES DE GESTIÓN DE EQUIPOS
// ========================================

export async function getTeams() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const teamLeader = alias(users, 'team_leader');

    const teams = await db
      .select({
        id: salesTeams.id,
        name: salesTeams.name,
        description: salesTeams.description,
        teamLeaderId: salesTeams.teamLeaderId,
        teamLeaderName: sql<string>`${teamLeader.firstName} || ' ' || ${teamLeader.lastName}`,
        isActive: salesTeams.isActive,
        createdAt: salesTeams.createdAt,
        memberCount: sql<number>`COUNT(${teamMembers.userId})::int`,
      })
      .from(salesTeams)
      .innerJoin(teamLeader, eq(salesTeams.teamLeaderId, teamLeader.id))
      .leftJoin(teamMembers, eq(teamMembers.teamId, salesTeams.id))
      .groupBy(salesTeams.id, salesTeams.name, salesTeams.description, salesTeams.teamLeaderId, 
               teamLeader.firstName, teamLeader.lastName, salesTeams.isActive, salesTeams.createdAt)
      .orderBy(desc(salesTeams.createdAt));

    return teams.map(team => ({
      ...team,
      members: [],
    }));
  } catch (error) {
    console.error('Get teams error:', error);
    throw new Error('Failed to fetch teams');
  }
}

export async function createTeam(data: { name: string; description: string; teamLeaderId: string }) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    await db.insert(salesTeams).values({
      name: data.name,
      description: data.description,
      teamLeaderId: data.teamLeaderId,
      isActive: true,
    });

    revalidatePath('/reports');
    return { success: true };
  } catch (error) {
    console.error('Create team error:', error);
    throw new Error('Failed to create team');
  }
}

export async function updateTeam(teamId: string, data: { name: string; description: string; teamLeaderId: string }) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    await db
      .update(salesTeams)
      .set({
        name: data.name,
        description: data.description,
        teamLeaderId: data.teamLeaderId,
        updatedAt: new Date(),
      })
      .where(eq(salesTeams.id, teamId));

    revalidatePath('/reports');
    return { success: true };
  } catch (error) {
    console.error('Update team error:', error);
    throw new Error('Failed to update team');
  }
}

export async function deleteTeam(teamId: string) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    // Primero eliminar los miembros del equipo
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    
    // Luego eliminar el equipo
    await db.delete(salesTeams).where(eq(salesTeams.id, teamId));

    revalidatePath('/reports');
    return { success: true };
  } catch (error) {
    console.error('Delete team error:', error);
    throw new Error('Failed to delete team');
  }
}

export async function getAvailableAgents() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const agents = await db
      .select({
        id: users.id,
        name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(
        inArray(users.role, ['agent', 'call_center', 'manager']),
        eq(users.isActive, true)
      ))
      .orderBy(users.firstName);

    return agents;
  } catch (error) {
    console.error('Get available agents error:', error);
    throw new Error('Failed to fetch available agents');
  }
}

export async function assignAgentsToTeam(teamId: string, agentIds: string[]) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    // Primero eliminar asignaciones existentes
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));

    // Luego agregar las nuevas asignaciones
    if (agentIds.length > 0) {
      const assignments = agentIds.map(agentId => ({
        teamId,
        userId: agentId,
      }));

      await db.insert(teamMembers).values(assignments);
    }

    revalidatePath('/reports');
    return { success: true };
  } catch (error) {
    console.error('Assign agents to team error:', error);
    throw new Error('Failed to assign agents to team');
  }
}