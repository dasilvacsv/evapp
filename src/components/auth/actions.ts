// components/auth/actions.ts

"use server";

import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

// --- ESQUEMA DE VALIDACIÓN PARA EL REGISTRO ---
const SignupSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  email: z.string().email({ message: "Por favor, introduce un correo válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

/**
 * Server Action para registrar un nuevo usuario.
 */
export async function signup(values: z.infer<typeof SignupSchema>) {
  // 1. Validar los datos con Zod
  const validatedFields = SignupSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Datos inválidos. Revisa los campos." };
  }

  const { name, email, password } = validatedFields.data;

  try {
    // 2. Comprobar si el email ya existe en la base de datos
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return { error: "Este correo electrónico ya está en uso." };
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insertar el nuevo usuario en la base de datos
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    });

    return { success: "¡Registro exitoso! Ahora puedes iniciar sesión." };

  } catch (error) {
    console.error("Error en el registro:", error);
    return { error: "Ocurrió un error inesperado. Inténtalo de nuevo." };
  }
}


// --- ESQUEMA DE VALIDACIÓN PARA EL LOGIN ---
const LoginSchema = z.object({
  email: z.string().email({ message: "El correo es requerido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

/**
 * Server Action para iniciar sesión.
 * Esta acción es un 'wrapper' alrededor de la función signIn de NextAuth.
 */
export async function login(values: z.infer<typeof LoginSchema>) {
  // 1. Validar campos
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Datos inválidos." };
  }
  
  const { email, password } = validatedFields.data;

  try {
    // 2. Intentar iniciar sesión con NextAuth
    await signIn('credentials', {
      email,
      password,
      redirect: false, // ¡Cambio clave! Desactiva la redirección del servidor.
    });

    return { success: true };
  } catch (error) {
    // 3. Manejar errores específicos de NextAuth
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Credenciales incorrectas.' };
        default:
          return { error: 'Algo salió mal.' };
      }
    }
    throw error;
  }
}