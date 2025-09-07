// app/actions/auth.actions.ts

'use server';

import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const registerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function registerUser(data: unknown) {
  const validation = registerSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: 'Datos inválidos. Por favor, revisa los campos.' };
  }
  
  const { firstName, lastName, email, password } = validation.data;

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return { success: false, error: 'El email ya se encuentra registrado.' };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      firstName: firstName,
      lastName: lastName,
      // AÑADIDO: Se popula el campo 'name' concatenando nombre y apellido
      // para mantener la consistencia con el registro de Google.
      name: `${firstName} ${lastName}`,
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      role: 'agent',
      isActive: true,
    });

    return { success: true, message: '¡Registro exitoso! Ahora puedes iniciar sesión.' };

  } catch (e) {
    console.error("Error en el registro:", e);
    return { success: false, error: 'Ocurrió un error inesperado en el servidor.' };
  }
}


// --- ESTA FUNCIÓN ESTÁ CORRECTA Y NO REQUIERE CAMBIOS ---

export async function checkUserExists(email: string) {
  if (!email || typeof email !== 'string') {
    return { exists: false };
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return { exists: !!user };

  } catch (error) {
    console.error("Error al verificar la existencia del usuario:", error);
    return { exists: false };
  }
}