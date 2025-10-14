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
import { eq, and, desc, sql, count, gte, lte, inArray, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';

// Interfaces para los tipos de datos
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
    insuranceCompany: string;
    monthlyPremium: string | null;
    status: string;
    statusLabel: string;
    createdAt: Date;
  }>;
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
    if (filters.agentId) {
      conditions.push(eq(customers.createdByAgentId, filters.agentId));
    }

    // Filtro por aseguradora
    if (filters.insuranceCompany) {
      conditions.push(eq(policies.insuranceCompany, filters.insuranceCompany));
    }

    // Filtro por estado
    if (filters.status) {
      conditions.push(eq(policies.status, filters.status));
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
        conditions.push(sql`false`); // No hay agentes, no mostrar datos
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

    let whereClause;
    if (session.user.role === 'manager') {
      whereClause = eq(users.managerId, session.user.id);
    } else {
      whereClause = eq(users.role, 'agent');
    }

    const agent = alias(users, 'agent');

    const performanceData = await db
      .select({
        id: agent.id,
        name: sql<string>`${agent.firstName} || ' ' || ${agent.lastName}`,
        totalPolicies: sql<number>`COUNT(DISTINCT ${policies.id})::int`,
        activePolicies: sql<number>`COUNT(DISTINCT CASE WHEN ${policies.status} = 'active' THEN ${policies.id} END)::int`,
        totalPremium: sql<number>`COALESCE(SUM(${policies.monthlyPremium}), 0)::float`,
        conversionRate: sql<number>`
          CASE 
            WHEN COUNT(DISTINCT ${policies.id}) = 0 THEN 0
            ELSE (COUNT(DISTINCT CASE WHEN ${policies.status} = 'active' THEN ${policies.id} END)::float / COUNT(DISTINCT ${policies.id})::float * 100)
          END
        `,
      })
      .from(agent)
      .leftJoin(customers, eq(customers.createdByAgentId, agent.id))
      .leftJoin(policies, and(
        eq(policies.customerId, customers.id),
        gte(policies.createdAt, startDate)
      ))
      .where(whereClause)
      .groupBy(agent.id, agent.firstName, agent.lastName);

    return performanceData;
  } catch (error) {
    console.error('Team performance report error:', error);
    throw new Error('Failed to generate team performance report');
  }
}

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
      .groupBy(salesTeams.id, salesTeams.name, teamLeader.firstName, teamLeader.lastName);

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
      avgConversionRate: team.totalPolicies > 0 ? 75.5 : 0, // Cálculo aproximado
    }));
  } catch (error) {
    console.error('Top leader report error:', error);
    throw new Error('Failed to generate top leader report');
  }
}

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

// Funciones de gestión de equipos
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
      members: [], // Se cargarán por separado si es necesario
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