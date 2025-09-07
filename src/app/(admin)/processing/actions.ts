// actions.ts

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { policies, customers, users, processorManagerAssignments } from '@/db/schema';
import { eq, and, desc, sql, count, or, isNull, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { alias } from 'drizzle-orm/pg-core';

export async function getProcessingQueue(page = 1, limit = 10, status = '') {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['processor', 'super_admin', 'manager'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  try {
    const offset = (page - 1) * limit;
    
    // Crea los alias para la tabla 'users'
    const agent = alias(users, 'agent');
    const processor = alias(users, 'processor');

    let whereClause;

    // Si el usuario es un 'procesador' o 'gerente', filtramos su cola de trabajo
    if (userRole === 'processor' || userRole === 'manager') {
      const assignedManagers = await db.select({ managerId: processorManagerAssignments.managerId })
        .from(processorManagerAssignments)
        .where(eq(processorManagerAssignments.processorId, userId));
      
      const managerIds = assignedManagers.map(am => am.managerId);
      
      // Construir la cláusula WHERE para un procesador
      if (managerIds.length > 0) {
        // Un procesador puede ver sus propias pólizas asignadas O pólizas no asignadas de agentes
        // que pertenecen a un manager al que él está asignado.
        const managedAgents = await db.select({ id: users.id })
          .from(users)
          .where(or(
            inArray(users.managerId, managerIds),
            inArray(users.id, managerIds) // Incluir al manager si también es un agente
          ));
        
        const managedAgentIds = managedAgents.map(ma => ma.id);
        
        whereClause = or(
          eq(policies.assignedProcessorId, userId),
          and(
            isNull(policies.assignedProcessorId),
            inArray(customers.createdByAgentId, managedAgentIds)
          )
        );
      } else {
        // Si no tiene managers asignados, solo ve las pólizas asignadas directamente a él.
        whereClause = eq(policies.assignedProcessorId, userId);
      }
    }

    // Consulta principal
    const processingQuery = db.select({
      id: policies.id,
      status: policies.status,
      insuranceCompany: policies.insuranceCompany,
      monthlyPremium: policies.monthlyPremium,
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
    .orderBy(desc(policies.updatedAt))
    .limit(limit)
    .offset(offset);

    // Aplica la cláusula WHERE si no es 'super_admin'
    if (whereClause) {
      processingQuery.where(whereClause);
    }

    // Aplica el filtro de estado si está presente
    if (status) {
      processingQuery.where(eq(policies.status, status as any));
    }

    const processingList = await processingQuery;

    // Conteo total para la paginación
    const totalQuery = db.select({ count: count() }).from(policies)
      .innerJoin(customers, eq(policies.customerId, customers.id));
    
    if (whereClause) {
      totalQuery.where(whereClause);
    }
    if (status) {
      totalQuery.where(eq(policies.status, status as any));
    }
    
    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    return {
      policies: processingList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get processing queue error:', error);
    throw new Error('Failed to fetch processing queue');
  }
}

export async function assignPolicyToProcessor(policyId: string, processorId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['processor', 'manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    await db.update(policies)
      .set({ 
        assignedProcessorId: processorId,
        updatedAt: new Date(),
      })
      .where(eq(policies.id, policyId));

    revalidatePath('/processing');
    revalidatePath('/policies');
    return { success: true, message: 'Policy assigned to processor successfully' };
  } catch (error) {
    console.error('Assign policy error:', error);
    throw new Error('Failed to assign policy');
  }
}

export async function requestMissingDocs(policyId: string, notes: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['processor', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    await db.update(policies)
      .set({ 
        status: 'missing_docs',
        updatedAt: new Date(),
      })
      .where(eq(policies.id, policyId));
      
    revalidatePath('/processing');
    revalidatePath('/policies');
    return { success: true, message: 'Missing documents request sent successfully' };
  } catch (error) {
    console.error('Request missing docs error:', error);
    throw new Error('Failed to request missing documents');
  }
}

export async function getProcessingStats() {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['processor', 'super_admin', 'manager'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  const userId = session.user.id;
  const userRole = session.user.role;
  
  try {
    let whereClause;

    if (userRole === 'processor' || userRole === 'manager') {
      whereClause = eq(policies.assignedProcessorId, userId);
    }

    const statusCounts = await db.select({
      status: policies.status,
      count: count(),
    })
    .from(policies)
    .where(whereClause)
    .groupBy(policies.status);

    const totalAssigned = await db.select({ count: count() })
      .from(policies)
      .where(whereClause || sql`1=1`);

    const needingAttention = await db.select({ count: count() })
      .from(policies)
      .where(and(
        whereClause || sql`1=1`,
        or(
          eq(policies.status, 'in_review'),
          eq(policies.status, 'missing_docs')
        )
      ));

    return {
      totalAssigned: totalAssigned[0]?.count || 0,
      needingAttention: needingAttention[0]?.count || 0,
      statusCounts,
      userRole
    };
  } catch (error) {
    console.error('Get processing stats error:', error);
    throw new Error('Failed to fetch processing stats');
  }
}