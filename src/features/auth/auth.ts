// src/features/auth/auth.ts
"use server";

import { eq, desc } from "drizzle-orm";
import { hash } from "bcryptjs";
import { signIn } from "@/features/auth";
import { AuthCredentials } from "@/lib/types"; 
import { db } from "@/lib/db";
import { users, endUsers, clients, branches } from "@/lib/schema";
import { getFullUserSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/actions/audit";
import { sendWelcomeEmail } from "@/features/email/actions";
import { endUserRegisterSchema, EndUserRegisterFormData } from "@/features/auth/validations";
// LÍNEA AÑADIDA: Importar la función 'cookies' de Next.js para manejar cookies en Server Actions
import { cookies } from 'next/headers';

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">,
) => {
  const { email, password } = params;

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "CredentialsSignin") {
        return { success: false, error: "Email o contraseña incorrectos." };
      }
      return { success: false, error: result.error };
    }

    // Registrar login en auditoría
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length > 0) {
      await createAuditLog({
        userId: user[0].id,
        action: 'login',
        resource: 'User',
        resourceId: user[0].id.toString(),
        level: 'info',
        details: `Usuario ${user[0].name} inició sesión`,
      });
    }

    return { success: true };
  } catch (error) {
    console.log(error, "Signin error");
    return { success: false, error: "Error inesperado al iniciar sesión." };
  }
};

// --- FUNCIÓN CORREGIDA ---
// Función para login de clientes finales
export const signInEndUser = async (
  params: { email: string; password: string; branchSlug?: string }
) => {
  const { email, password, branchSlug } = params;

  try {
    // Verificar si es un endUser
    const endUser = await db.query.endUsers.findFirst({
      where: eq(endUsers.email, email),
      with: {
        client: true,
        branch: true,
        plan: true,
      },
    });

    if (!endUser) {
      return { success: false, error: "Credenciales incorrectas." };
    }

    // Verificar contraseña
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, endUser.passwordHash);
    
    if (!isPasswordValid) {
      return { success: false, error: "Credenciales incorrectas." };
    }

    // Verificar que el cliente esté activo
    if (endUser.status !== 'active') {
      return { success: false, error: "Tu cuenta está inactiva. Contacta al administrador." };
    }

    // Si se proporciona branchSlug, verificar que coincida
    if (branchSlug && endUser.client.slug !== branchSlug) {
      return { success: false, error: "No tienes acceso a esta sucursal." };
    }

    // --- BLOQUE AÑADIDO: Crear y establecer la cookie de sesión ---
    const sessionData = {
        userId: endUser.id,
        expires: Date.now() + (24 * 60 * 60 * 1000), // 24 horas de expiración
    }
    
    // Codificamos la sesión para guardarla en la cookie
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64')
    
    // Usamos la función cookies() para establecer la cookie en el navegador
    cookies().set("client-session-token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 horas en segundos
        path: '/',
    });
    // --- FIN DEL BLOQUE AÑADIDO ---

    // Actualizar último login
    await db.update(endUsers)
      .set({ lastLogin: new Date() })
      .where(eq(endUsers.id, endUser.id));

    // Registrar login en auditoría
    await createAuditLog({
      action: 'login',
      resource: 'EndUser',
      resourceId: endUser.id.toString(),
      level: 'info',
      details: `Cliente ${endUser.name} inició sesión en el portal`,
      metadata: { branchSlug, clientId: endUser.clientId },
    });

    return { 
      success: true, 
      user: {
        id: endUser.id,
        name: endUser.name,
        email: endUser.email,
        mailboxNumber: endUser.mailboxNumber,
        client: endUser.client,
        branch: endUser.branch,
        plan: endUser.plan,
      }
    };
  } catch (error) {
    console.error("EndUser signin error:", error);
    return { success: false, error: "Error inesperado al iniciar sesión." };
  }
};

export const signUp = async (params: AuthCredentials & { createdBy?: number }) => {
  const { fullName, email, password, branchId, createdBy } = params;

  if (!fullName || !email || !password || !branchId) {
    return { success: false, error: "Todos los campos son requeridos para el registro." };
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "Ya existe un usuario con este correo electrónico." };
  }

  const hashedPassword = await hash(password, 10);

  try {
    const [newUser] = await db.insert(users).values({
      name: fullName,
      email,
      passwordHash: hashedPassword,
      role: "employee",
      branchId: branchId,
      createdBy: createdBy,
    }).returning();

    // Registrar creación en auditoría
    await createAuditLog({
      userId: createdBy,
      action: 'create',
      resource: 'User',
      resourceId: newUser.id.toString(),
      level: 'info',
      details: `Usuario ${fullName} creado`,
    });

    await signInWithCredentials({ email, password });

    return { success: true };
  } catch (error) {
    console.log(error, "Signup error");
    return { success: false, error: "No se pudo completar el registro. Inténtalo de nuevo." };
  }
};

// FUNCIÓN CORREGIDA: Registro público de clientes finales
export const registerEndUser = async (formData: EndUserRegisterFormData) => {
  console.log("=== INICIO registerEndUser ===");
  console.log("Datos recibidos:", formData);
  
  // 1. VALIDAR DATOS EN EL SERVIDOR (Paso de seguridad crucial)
  const validatedFields = endUserRegisterSchema.safeParse(formData);

  if (!validatedFields.success) {
    console.error("Error de Validación en Servidor:", validatedFields.error.flatten().fieldErrors);
    return { 
      success: false, 
      error: "Los datos del formulario son inválidos. Por favor, revisa los campos.",
      details: validatedFields.error.flatten().fieldErrors 
    };
  }

  console.log("Datos validados:", validatedFields.data);

  // 2. EXTRAER DATOS YA VALIDADOS
  const { 
    name, 
    email, 
    password, 
    phone, 
    countryCode, 
    identificationDocument,
    deliveryAddress, 
    branchId, // Es un string aquí
  } = validatedFields.data;

  try {
    console.log("Verificando si existe usuario con email:", email);
    
    // Verificar si ya existe un usuario con este email
    const existingEndUser = await db.query.endUsers.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });

    if (existingEndUser) {
      console.log("Usuario ya existe:", existingEndUser.email);
      return { success: false, error: "Ya existe una cuenta con este correo electrónico." };
    }

    // 3. CONVERTIR ID DE STRING A NÚMERO
    const numericBranchId = parseInt(branchId, 10);
    console.log("ID de sucursal convertido:", numericBranchId);

    if (isNaN(numericBranchId)) {
      return { success: false, error: "La sucursal seleccionada no es válida." };
    }

    // Obtener información de la sucursal y cliente con el ID numérico
    console.log("Buscando sucursal con ID:", numericBranchId);
    
    const branch = await db.query.branches.findFirst({
      where: (b, { eq }) => eq(b.id, numericBranchId),
      with: {
        client: {
          with: {
            portalConfig: true,
          },
        },
      },
    });

    if (!branch) {
      console.log("Sucursal no encontrada para ID:", numericBranchId);
      return { success: false, error: "La sucursal seleccionada no es válida." };
    }

    console.log("Sucursal encontrada:", branch.name, "Cliente:", branch.client.companyName);

    // Verificar si el registro público está habilitado
    if (!branch.client.portalConfig?.allowPublicRegistration) {
      console.log("Registro público no habilitado para cliente:", branch.client.id);
      return { success: false, error: "El registro público no está habilitado para esta empresa." };
    }

    // Usar plan por defecto de la configuración
    const finalPlanId = branch.client.portalConfig.defaultPlanId;
    if (!finalPlanId) {
      console.log("No hay plan por defecto para cliente:", branch.client.id);
      return { success: false, error: "No hay un plan por defecto configurado para el registro." };
    }

    console.log("Plan por defecto:", finalPlanId);

    // Generar próximo número de casillero (específico para ese cliente)
    const latestMailbox = await db.query.endUsers.findFirst({
      where: (user, { eq }) => eq(user.clientId, branch.clientId),
      orderBy: [desc(endUsers.mailboxNumber)],
    });

    const nextMailboxNumber = (latestMailbox?.mailboxNumber || 0) + 1;
    console.log("Próximo número de casillero:", nextMailboxNumber);

    // Hash de la contraseña
    const hashedPassword = await hash(password, 12);
    console.log("Contraseña hasheada exitosamente");

    // Crear el usuario final en la base de datos
    console.log("Creando usuario en la base de datos...");
    
    const [newEndUser] = await db.insert(endUsers).values({
      clientId: branch.clientId,
      branchId: numericBranchId,
      planId: finalPlanId,
      mailboxNumber: nextMailboxNumber,
      name,
      email,
      phone,
      countryCode,
      identificationDocument,
      deliveryAddress,
      passwordHash: hashedPassword,
      status: branch.client.portalConfig.requireApproval ? 'inactive' : 'active',
    }).returning();

    console.log("Usuario creado exitosamente:", newEndUser.id);

    // Registrar en auditoría
    await createAuditLog({
      action: 'create',
      resource: 'EndUser',
      resourceId: newEndUser.id.toString(),
      level: 'info',
      details: `Cliente ${name} se registró públicamente`,
      metadata: { branchId: numericBranchId, requiresApproval: branch.client.portalConfig.requireApproval },
    });

    // CORRECCIÓN CLAVE: Enviar email de bienvenida con clientId
    console.log("Enviando email de bienvenida...");
    
    try {
      await sendWelcomeEmail({
        clientId: branch.clientId, // ESTE CAMPO FALTABA
        email: newEndUser.email,
        name: newEndUser.name,
        mailboxNumber: `${branch.code || 'PVM'}-${nextMailboxNumber.toString().padStart(3, '0')}`,
        tempPassword: password,
        companyName: branch.client.companyName,
        branchAddress: branch.address,
        requiresApproval: branch.client.portalConfig.requireApproval,
      });
      console.log("Email de bienvenida enviado exitosamente");
    } catch (emailError) {
      console.error("Error al enviar el email de bienvenida:", emailError);
      // No devolvemos un error al usuario, el registro fue exitoso
    }

    console.log("=== REGISTRO COMPLETADO EXITOSAMENTE ===");

    return { 
      success: true, 
      user: newEndUser,
      requiresApproval: branch.client.portalConfig.requireApproval,
      mailboxNumber: `${branch.code || 'PVM'}-${nextMailboxNumber.toString().padStart(3, '0')}`,
    };
  } catch (error) {
    console.error("Error en el registro del usuario final:", error);
    return { 
      success: false, 
      error: "No se pudo completar el registro. Por favor, inténtalo de nuevo.",
      details: error instanceof Error ? error.message : String(error)
    };
  }
};