// (admin)/customers/schemas.ts
import { z } from 'zod';

// Schema para el cliente - CON VALIDACIONES MEJORADAS
const customerSchema = z.object({
  fullName: z.string().min(1, "El nombre completo es requerido").max(255, "El nombre es demasiado largo"),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birthDate: z.date({ required_error: "La fecha de nacimiento es requerida" }),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  ssn: z.string()
    .transform(val => val.replace(/\D/g, '')) // Elimina no-dígitos
    .pipe(z.string().length(9, "El SSN debe tener 9 dígitos"))
    .optional()
    .or(z.literal("")),
  appliesToCoverage: z.boolean().default(true),
  zipCode: z.string().optional(),
  immigrationStatus: z.enum([
    'citizen', 'green_card', 'work_permit_ssn', 'u_visa', 
    'political_asylum', 'parole', 'notice_of_action', 'other'
  ]).optional(),
  documentType: z.enum([
    'foreign_passport', 'drivers_license', 'credentials', 
    'work_permit_ssn_card', 'ssn_card', 'work_student_visa_holder', 
    'permanent_residence', 'voter_registration', 'citizen_passport', 
    'marriage_certificate', 'income_proof', 'other'
  ]).optional(),
  address: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  taxType: z.enum(['w2', '1099', 'not_yet_declared']).optional(),
  income: z.number().positive("Los ingresos deben ser mayor a 0").optional(),
  declaresOtherPeople: z.boolean().default(false),
});



// Schema para la póliza - CON VALIDACIONES MEJORADAS
const policySchema = z.object({
  insuranceCompany: z.string().min(1, "La aseguradora es requerida").max(100, "El nombre de la aseguradora es demasiado largo"),
  // MODIFICADO: Renombrado
  marketplaceId: z.string().optional(),
  // NUEVO: Nombre del plan
  planName: z.string().min(1, "El nombre del plan es requerido."),
  monthlyPremium: z.number().positive("La prima debe ser mayor a 0").optional(),
  effectiveDate: z.date().optional(),
  planLink: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  taxCredit: z.number().positive("El crédito fiscal debe ser mayor a 0").optional(),
  aorLink: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  notes: z.string().optional(),
});

// Schema para documentos - CON VALIDACIONES MEJORADAS
const documentSchema = z.object({
  s3Key: z.string().min(1, "La clave S3 es requerida"),
  fileName: z.string().min(1, "El nombre del archivo es requerido"),
  fileType: z.string().min(1, "El tipo de archivo es requerido"),
  fileSize: z.number().min(1, "El tamaño del archivo debe ser mayor a 0"),
  // NUEVO: ID opcional del dependiente al que pertenece
  dependentId: z.string().optional(),
});

// Schema para dependientes - CON VALIDACIONES MEJORADAS
const dependentSchema = z.object({
  fullName: z.string().min(1, "El nombre del dependiente es requerido").max(255, "El nombre es demasiado largo"),
  relationship: z.string().min(1, "La relación es requerida"),
  birthDate: z.date().optional(),
  immigrationStatus: z.enum([
    'citizen', 'green_card', 'work_permit_ssn', 'u_visa', 
    'political_asylum', 'parole', 'notice_of_action', 'other'
  ]).optional(),
  appliesToPolicy: z.boolean().default(true),
  documents: z.array(documentSchema).default([]),
  
});

// Schema para método de pago - CON VALIDACIONES CONDICIONALES MEJORADAS
const paymentSchema = z.object({
  methodType: z.enum(['debit_card', 'credit_card', 'bank_account']).optional(),
  cardHolderName: z.string().optional(),
  cardNumber: z.string().optional(),
  expirationDate: z.string().optional(),
  cvv: z.string().optional(),
  bankName: z.string().optional(),
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
}).refine((data) => {
  // Validaciones condicionales para tarjetas
  if (data.methodType === 'credit_card' || data.methodType === 'debit_card') {
    return data.cardHolderName && data.cardNumber && data.expirationDate;
  }
  // Validaciones condicionales para cuenta bancaria
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
  // Validación adicional: si hay dependientes, deben tener nombres únicos
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