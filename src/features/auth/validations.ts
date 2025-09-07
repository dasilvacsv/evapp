import { z } from "zod";

// Sin cambios
export const signInSchema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// Sin cambios (para registro de usuarios internos/admins)
export const signUpSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  branchId: z.number({ required_error: "Debes seleccionar o crear una sucursal." }),
});

// Sin cambios
export const endUserSignInSchema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  branchSlug: z.string().optional(),
});

// SCHEMA CORREGIDO Y ACTUALIZADO
export const endUserRegisterSchema = z.object({
  name: z.string().min(2, "El nombre completo es requerido."),
  email: z.string().email("Ingresa un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  
  // Campo para confirmar contraseña
  confirmPassword: z.string().min(6, "Debes confirmar la contraseña."),
  
  // Información personal
  countryCode: z.string().min(1, "Debes seleccionar un país."),
  phone: z.string().min(4, "El número de teléfono es requerido."),
  identificationDocument: z.string().optional(),
  deliveryAddress: z.string().min(5, "La dirección de entrega es requerida."),

  // IDs como strings (vienen del formulario así)
  clientId: z.string({ required_error: "Debes seleccionar una empresa." })
    .min(1, "Debes seleccionar una empresa."),
  branchId: z.string({ required_error: "Debes seleccionar una sucursal." })
    .min(1, "Debes seleccionar una sucursal."),

  // Aceptar términos
  acceptTerms: z.boolean(),
})
// Validaciones adicionales
.refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
})
.refine((data) => data.acceptTerms === true, {
  message: "Debes aceptar los términos y condiciones para continuar.",
  path: ["acceptTerms"],
});

// Tipos inferidos
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type EndUserSignInFormData = z.infer<typeof endUserSignInSchema>;
export type EndUserRegisterFormData = z.infer<typeof endUserRegisterSchema>;