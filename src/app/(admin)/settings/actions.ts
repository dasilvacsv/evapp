'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, processorManagerAssignments } from '@/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { alias } from 'drizzle-orm/pg-core';

// Schemas de Zod actualizados con los roles del schema
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['super_admin', 'manager', 'agent', 'processor', 'commission_analyst', 'customer_service']),
  managerId: z.string().uuid().optional(),
});

const updateUserRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['super_admin', 'manager', 'agent', 'processor', 'commission_analyst', 'customer_service']),
  managerId: z.string().uuid().optional(),
  isActive: z.boolean(),
});

const assignProcessorSchema = z.object({
  processorId: z.string().uuid('Invalid processor ID'),
  managerIds: z.array(z.string().uuid()),
});

export async function getAllUsers(page = 1, limit = 10, search = '', role = '') {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'super_admin') {
    throw new Error('Insufficient permissions');
  }

  try {
    const offset = (page - 1) * limit;
    
    // Crea el alias para la tabla 'users'
    const manager = alias(users, 'manager');

    // Construir las condiciones de filtro
    const conditions = [];
    if (search) {
      conditions.push(sql`(${users.firstName} || ' ' || ${users.lastName} || ' ' || ${users.email}) ILIKE ${`%${search}%`}`);
    }
    if (role && role !== 'all') {
      conditions.push(eq(users.role, role as any));
    }

    // Consulta principal
    const usersList = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      managerId: users.managerId, 
      managerName: sql<string>`${manager.firstName} || ' ' || ${manager.lastName}`,
    })
    .from(users)
    .leftJoin(manager, eq(users.managerId, manager.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

    // Consulta para el conteo total
    const totalResult = await db.select({ count: count() })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
      
    const total = totalResult[0]?.count || 0;

    return {
      users: usersList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get all users error:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function createUser(data: z.infer<typeof createUserSchema>) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'super_admin') {
    throw new Error('Insufficient permissions');
  }

  try {
    const validatedData = createUserSchema.parse(data);
    
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, message: 'Email already exists' };
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    await db.insert(users).values({
      email: validatedData.email,
      passwordHash,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      role: validatedData.role,
      managerId: validatedData.managerId || null,
      isActive: true,
    });

    revalidatePath('/settings');
    return { success: true, message: 'User created successfully' };
  } catch (error) {
    console.error('Create user error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Validation error', errors: error.errors };
    }
    throw new Error('Failed to create user');
  }
}

export async function updateUserRole(prevState: any, formData: FormData) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== 'super_admin') {
    return { success: false, message: 'Unauthorized' };
  }

  // Extraemos los datos del FormData
  const dataToValidate = {
    userId: formData.get('userId'),
    role: formData.get('role'),
    managerId: formData.get('managerId') || undefined,
    isActive: formData.get('isActive') === 'on', 
  };
  
  try {
    const validatedData = updateUserRoleSchema.parse(dataToValidate);
    
    await db.update(users)
      .set({
        role: validatedData.role,
        managerId: validatedData.managerId || null,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, validatedData.userId));

    revalidatePath('/settings');
    return { success: true, message: 'User updated successfully' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Validation error. Please check the fields.' };
    }
    console.error('Update user role error:', error);
    return { success: false, message: 'Failed to update user' };
  }
}

export async function getManagers() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'super_admin') {
    throw new Error('Insufficient permissions');
  }

  try {
    const managers = await db.select({
      id: users.id,
      name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
    })
    .from(users)
    .where(and(eq(users.role, 'manager'), eq(users.isActive, true)));

    return managers;
  } catch (error) {
    console.error('Get managers error:', error);
    throw new Error('Failed to fetch managers');
  }
}

export async function getProcessors() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'super_admin') {
    throw new Error('Insufficient permissions');
  }

  try {
    const processors = await db.select({
      id: users.id,
      name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
    })
    .from(users)
    .where(and(eq(users.role, 'processor'), eq(users.isActive, true)));

    return processors;
  } catch (error) {
    console.error('Get processors error:', error);
    throw new Error('Failed to fetch processors');
  }
}

export async function assignProcessorToManagers(data: z.infer<typeof assignProcessorSchema>) {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'super_admin') {
    throw new Error('Insufficient permissions');
  }

  try {
    const validatedData = assignProcessorSchema.parse(data);
    
    await db.delete(processorManagerAssignments)
      .where(eq(processorManagerAssignments.processorId, validatedData.processorId));

    if (validatedData.managerIds.length > 0) {
      const assignments = validatedData.managerIds.map(managerId => ({
        processorId: validatedData.processorId,
        managerId,
      }));

      await db.insert(processorManagerAssignments).values(assignments);
    }

    revalidatePath('/settings');
    return { success: true, message: 'Processor assignments updated successfully' };
  } catch (error) {
    console.error('Assign processor error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: 'Validation error', errors: error.errors };
    }
    throw new Error('Failed to assign processor');
  }
}

export async function getProcessorAssignments() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'super_admin') {
    throw new Error('Insufficient permissions');
  }

  try {
    // Crear los alias para 'processor' y 'manager'
    const processor = alias(users, 'processor');
    const manager = alias(users, 'manager');

    const assignments = await db.select({
      processorId: processorManagerAssignments.processorId,
      processorName: sql<string>`${processor.firstName} || ' ' || ${processor.lastName}`,
      managerId: processorManagerAssignments.managerId,
      managerName: sql<string>`${manager.firstName} || ' ' || ${manager.lastName}`,
    })
    .from(processorManagerAssignments)
    .innerJoin(processor, eq(processorManagerAssignments.processorId, processor.id))
    .innerJoin(manager, eq(processorManagerAssignments.managerId, manager.id));

    return assignments;
  } catch (error) {
    console.error('Get processor assignments error:', error);
    throw new Error('Failed to fetch processor assignments');
  }
}