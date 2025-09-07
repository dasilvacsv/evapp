'use server';

import { auth } from '@/lib/auth'; // 👈 1. Importación actualizada
import { db } from '@/lib/db';
import { customers, users, policies } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createCustomerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  birthDate: z.string().min(1, 'Birth date is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  ssn: z.string().optional(),
  immigrationStatus: z.enum(['citizen', 'green_card', 'work_permit', 'other']).optional(),
  taxType: z.enum(['w2', '1099']).optional(),
  income: z.string().optional(),
});

export async function getCustomers(page = 1, limit = 10, search = '') {
  const session = await auth(); // 👈 2. Se obtiene la sesión con auth()

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    const offset = (page - 1) * limit;
    
    let whereClause;
    if (userRole === 'agent') {
      whereClause = eq(customers.createdByAgentId, userId);
    } else if (userRole === 'manager') {
      const managedAgents = await db.select({ id: users.id }).from(users).where(eq(users.managerId, userId));
      const agentIds = managedAgents.map(agent => agent.id);
      agentIds.push(userId);
      whereClause = sql`${customers.createdByAgentId} IN ${agentIds}`;
    }

    // El resto de la lógica no cambia...
    const customersQuery = db.select({
        id: customers.id,
        fullName: customers.fullName,
        email: customers.email,
        phone: customers.phone,
        birthDate: customers.birthDate,
        immigrationStatus: customers.immigrationStatus,
        createdAt: customers.createdAt,
        agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        policyCount: sql<number>`CAST(COUNT(${policies.id}) AS int)`,
      })
      .from(customers)
      .leftJoin(users, eq(customers.createdByAgentId, users.id))
      .leftJoin(policies, eq(customers.id, policies.customerId))
      .groupBy(customers.id, users.firstName, users.lastName)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      customersQuery.where(whereClause);
    }

    if (search) {
      customersQuery.where(sql`${customers.fullName} ILIKE ${`%${search}%`}`);
    }

    const customersList = await customersQuery;

    const totalQuery = db.select({ count: sql<number>`COUNT(*)::int` }).from(customers);
    if (whereClause) {
      totalQuery.where(whereClause);
    }
    if (search) {
      totalQuery.where(sql`${customers.fullName} ILIKE ${`%${search}%`}`);
    }
    
    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    return {
      customers: customersList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get customers error:', error);
    throw new Error('Failed to fetch customers');
  }
}

export async function createCustomer(data: z.infer<typeof createCustomerSchema>) {
  const session = await auth(); // 👈 Cambio aplicado aquí también
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (!['agent', 'manager', 'super_admin'].includes(session.user.role)) {
    throw new Error('Insufficient permissions');
  }

  try {
    const validatedData = createCustomerSchema.parse(data);
    
    await db.insert(customers).values({
      ...validatedData,
      birthDate: validatedData.birthDate,
      email: validatedData.email || null,
      income: validatedData.income ? validatedData.income : null,
      createdByAgentId: session.user.id,
    });

    revalidatePath('/admin/customers');
    return { success: true, message: 'Customer created successfully' };
  } catch (error) {
    console.error('Create customer error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Validation error', errors: error.errors };
    }
    throw new Error('Failed to create customer');
  }
}

export async function getCustomerById(id: string) {
  const session = await auth(); // 👈 Y aquí también
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const customer = await db.select({
        id: customers.id,
        fullName: customers.fullName,
        gender: customers.gender,
        birthDate: customers.birthDate,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        ssn: customers.ssn,
        immigrationStatus: customers.immigrationStatus,
        taxType: customers.taxType,
        income: customers.income,
        createdAt: customers.createdAt,
        agentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(customers)
      .leftJoin(users, eq(customers.createdByAgentId, users.id))
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer[0]) {
      throw new Error('Customer not found');
    }

    const customerPolicies = await db.select({
        id: policies.id,
        status: policies.status,
        insuranceCompany: policies.insuranceCompany,
        monthlyPremium: policies.monthlyPremium,
        commissionStatus: policies.commissionStatus,
        createdAt: policies.createdAt,
        processorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(policies)
      .leftJoin(users, eq(policies.assignedProcessorId, users.id))
      .where(eq(policies.customerId, id))
      .orderBy(desc(policies.createdAt));

    return {
      customer: customer[0],
      policies: customerPolicies,
    };
  } catch (error) {
    console.error('Get customer error:', error);
    throw new Error('Failed to fetch customer');
  }
}