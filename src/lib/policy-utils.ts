// lib/policy-utils.ts

/**
 * Genera un ID de póliza legible para mostrar al usuario
 * Formato: [Aseguradora]-[Año][Mes]-[4 dígitos aleatorios]
 * Ejemplo: AMB-2025001-7432
 */
export function generateReadablePolicyId(insuranceCompany: string): string {
  // Tomar las 3 primeras letras de la aseguradora
  const companyPrefix = insuranceCompany.substring(0, 3).toUpperCase();
  
  // Obtener año y mes actual
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Generar número secuencial de 3 dígitos (en un sistema real, esto vendría de la BD)
  const sequential = Math.floor(Math.random() * 999) + 1;
  const sequentialPadded = String(sequential).padStart(3, '0');
  
  // Generar 4 dígitos aleatorios
  const randomDigits = Math.floor(Math.random() * 9999) + 1;
  const randomPadded = String(randomDigits).padStart(4, '0');
  
  return `${companyPrefix}-${year}${month}${sequentialPadded}-${randomPadded}`;
}

/**
 * Formatea fechas al formato estándar MM/DD/AAAA
 */
export function formatDateUS(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Convierte texto a mayúsculas y limpia espacios
 */
export function formatTextUppercase(text: string | null | undefined): string {
  return text ? text.toUpperCase().trim() : '';
}

/**
 * Formatea SSN para mostrar con guiones
 */
export function formatSSN(ssn: string | null | undefined): string {
  if (!ssn) return '';
  
  const digits = ssn.replace(/\D/g, '');
  if (digits.length !== 9) return ssn;
  
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Lista actualizada de documentos válidos para el mercado de salud
 */
export const VALID_DOCUMENTS = {
  'foreign_passport': 'Pasaporte Extranjero',
  'drivers_license': 'Licencia de Conducción',
  'state_id': 'Identificación Estatal',
  'work_permit_ssn_card': 'Permiso de Trabajo y Tarjeta de SSN',
  'permanent_residence': 'Tarjeta de Residencia Permanente',
  'citizen_passport': 'Pasaporte de Ciudadano',
  'birth_certificate': 'Certificado de Nacimiento',
  'naturalization_certificate': 'Certificado de Naturalización',
  'employment_authorization': 'Autorización de Empleo',
  'income_proof': 'Comprobante de Ingresos',
  'tax_return': 'Declaración de Impuestos',
  'other': 'Otro (especificar)'
} as const;

export type ValidDocumentType = keyof typeof VALID_DOCUMENTS;