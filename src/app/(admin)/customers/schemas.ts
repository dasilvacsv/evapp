// (admin)/customers/schemas.ts
import { z } from 'zod';

// Schema para el cliente - CON VALIDACIONES MEJORADAS Y ACTUALIZADAS
const customerSchema = z.object({
  fullName: z.string()
    .min(1, "El nombre completo es requerido")
    .max(255, "El nombre es demasiado largo")
    .transform(val => val.toUpperCase().trim()), // AUTO-MAYÚSCULAS
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthDate: z.date({ required_error: "La fecha de nacimiento es requerida" }),
  // ACTUALIZADO: Email ahora es OBLIGATORIO
  email: z.string()
    .min(1, "El correo electrónico es requerido")
    .email("Formato de correo electrónico inválido")
    .transform(val => val.toLowerCase().trim()),
  // ACTUALIZADO: Validación mejorada para teléfono (solo números)
  phone: z.string()
    .optional()
    .refine((val) => !val || /^\d{10,15}$/.test(val.replace(/\D/g, '')), {
      message: "El teléfono debe contener solo números (10-15 dígitos)"
    })
    .transform(val => val ? val.replace(/\D/g, '') : val),
  // ACTUALIZADO: SSN con validación estricta de 9 dígitos
  ssn: z.string()
    .optional()
    .transform(val => val ? val.replace(/\D/g, '') : '')
    .pipe(z.string().refine((val) => !val || val.length === 9, {
      message: "El SSN debe tener exactamente 9 dígitos"
    }))
    .or(z.literal("")),
  appliesToCoverage: z.boolean().default(true),
  zipCode: z.string().optional(),
  immigrationStatus: z.enum([
    'citizen', 'green_card', 'work_permit_ssn', 'u_visa', 
    'political_asylum', 'parole', 'notice_of_action', 'other'
  ]).optional(),
  // NUEVO: Campo adicional para "Otro" en estatus migratorio
  immigrationStatusOther: z.string().optional(),
  documentType: z.enum([
    'foreign_passport', 'drivers_license', 'credentials', 
    'work_permit_ssn_card', 'ssn_card', 'work_student_visa_holder', 
    'permanent_residence', 'voter_registration', 'citizen_passport', 
    'marriage_certificate', 'income_proof', 'other'
  ]).optional(),
  // NUEVO: Campo adicional para "Otro" en tipo de documento
  documentTypeOther: z.string().optional(),
  address: z.string()
    .optional()
    .transform(val => val ? val.toUpperCase().trim() : val), // AUTO-MAYÚSCULAS
  county: z.string()
    .optional()
    .transform(val => val ? val.toUpperCase().trim() : val), // AUTO-MAYÚSCULAS
  state: z.string().optional(),
  taxType: z.enum(['w2', '1099', 'not_yet_declared']).optional(),
  income: z.number().positive("Los ingresos deben ser mayor a 0").optional(),
  declaresOtherPeople: z.boolean().default(false),
}).refine((data) => {
  // Validación condicional: Si immigration status es "other", debe especificar
  if (data.immigrationStatus === 'other') {
    return data.immigrationStatusOther && data.immigrationStatusOther.trim().length > 0;
  }
  return true;
}, {
  message: "Debe especificar el estatus migratorio cuando selecciona 'Otro'",
  path: ["immigrationStatusOther"]
}).refine((data) => {
  // Validación condicional: Si document type es "other", debe especificar
  if (data.documentType === 'other') {
    return data.documentTypeOther && data.documentTypeOther.trim().length > 0;
  }
  return true;
}, {
  message: "Debe especificar el tipo de documento cuando selecciona 'Otro'",
  path: ["documentTypeOther"]
});

// Schema para la póliza - CON VALIDACIONES MEJORADAS
const policySchema = z.object({
  insuranceCompany: z.string().min(1, "La aseguradora es requerida").max(100, "El nombre de la aseguradora es demasiado largo"),
  marketplaceId: z.string().optional(),
  planName: z.string()
    .min(1, "El nombre del plan es requerido.")
    .transform(val => val.toUpperCase().trim()), // AUTO-MAYÚSCULAS
  monthlyPremium: z.number().positive("La prima debe ser mayor a 0").optional(),
  effectiveDate: z.date().optional(),
  planLink: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  taxCredit: z.number().positive("El crédito fiscal debe ser mayor a 0").optional(),
  aorLink: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  notes: z.string()
    .optional()
    .transform(val => val ? val.toUpperCase().trim() : val), // AUTO-MAYÚSCULAS
});

// Schema para documentos - CON VALIDACIONES MEJORADAS
const documentSchema = z.object({
  s3Key: z.string().min(1, "La clave S3 es requerida"),
  fileName: z.string().min(1, "El nombre del archivo es requerido"),
  fileType: z.string().min(1, "El tipo de archivo es requerido"),
  fileSize: z.number().min(1, "El tamaño del archivo debe ser mayor a 0"),
  dependentId: z.string().optional(),
});

// Schema para dependientes - CON VALIDACIONES MEJORADAS
const dependentSchema = z.object({
  fullName: z.string()
    .min(1, "El nombre del dependiente es requerido")
    .max(255, "El nombre es demasiado largo")
    .transform(val => val.toUpperCase().trim()), // AUTO-MAYÚSCULAS
  relationship: z.string()
    .min(1, "La relación es requerida")
    .transform(val => val.toUpperCase().trim()), // AUTO-MAYÚSCULAS
  birthDate: z.date().optional(),
  immigrationStatus: z.enum([
    'citizen', 'green_card', 'work_permit_ssn', 'u_visa', 
    'political_asylum', 'parole', 'notice_of_action', 'other'
  ]).optional(),
  // NUEVO: Campo adicional para "Otro" en estatus migratorio de dependientes
  immigrationStatusOther: z.string().optional(),
  appliesToPolicy: z.boolean().default(true),
  documents: z.array(documentSchema).default([]),
}).refine((data) => {
  // Validación condicional para dependientes
  if (data.immigrationStatus === 'other') {
    return data.immigrationStatusOther && data.immigrationStatusOther.trim().length > 0;
  }
  return true;
}, {
  message: "Debe especificar el estatus migratorio cuando selecciona 'Otro'",
  path: ["immigrationStatusOther"]
});

// Schema para método de pago - CON VALIDACIONES CONDICIONALES MEJORADAS
const paymentSchema = z.object({
  methodType: z.enum(['debit_card', 'credit_card', 'bank_account']).optional(),
  cardHolderName: z.string().optional(),
  cardNumber: z.string()
    .optional()
    .transform(val => val ? val.replace(/\D/g, '') : val), // Solo números
  expirationDate: z.string().optional(),
  cvv: z.string()
    .optional()
    .transform(val => val ? val.replace(/\D/g, '') : val), // Solo números
  bankName: z.string().optional(),
  routingNumber: z.string()
    .optional()
    .transform(val => val ? val.replace(/\D/g, '') : val), // Solo números
  accountNumber: z.string()
    .optional()
    .transform(val => val ? val.replace(/\D/g, '') : val), // Solo números
}).refine((data) => {
  if (data.methodType === 'credit_card' || data.methodType === 'debit_card') {
    return data.cardHolderName && data.cardNumber && data.expirationDate;
  }
  if (data.methodType === 'bank_account') {
    return data.bankName && data.routingNumber && data.accountNumber;
  }
  return true;
}, {
  message: "Faltan campos requeridos para el método de pago seleccionado",
});

// Schema principal para la aplicación completa - CON VALIDACIONES MEJORADAS
export const createFullApplicationSchema = z.object({
  customer: customerSchema,
  dependents: z.array(dependentSchema).default([]),
  policy: policySchema,
  documents: z.array(documentSchema).default([]),
  payment: paymentSchema.optional(),
}).refine((data) => {
  const dependentNames = data.dependents.map(d => d.fullName.toLowerCase().trim());
  const uniqueNames = new Set(dependentNames);
  return uniqueNames.size === dependentNames.length;
}, {
  message: "Los dependientes no pueden tener nombres duplicados",
  path: ["dependents"]
});

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid("Debes seleccionar un cliente."),
  policyId: z.string().uuid("Debes seleccionar una póliza."),
  appointmentDate: z.date({ required_error: "La fecha de la cita es obligatoria." }),
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
});

export const createClaimSchema = z.object({
  customerId: z.string().uuid("Debes seleccionar un cliente."),
  policyId: z.string().uuid("Debes seleccionar una póliza."),
  dateFiled: z.date({ required_error: "La fecha del reclamo es obligatoria." }),
  claimNumber: z.string().max(100, "El número de reclamo es muy largo.").optional(),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres.").max(1000, "La descripción no puede exceder los 1000 caracteres."),
});

export type FullApplicationFormData = z.infer<typeof createFullApplicationSchema>;