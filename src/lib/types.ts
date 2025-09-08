// lib/types.ts

// Tipos para el sistema de usuarios
export type UserRole = 'super_admin' | 'manager' | 'agent' | 'processor' | 'commission_analyst' | 'customer_service';

// Tipos para métodos de pago
export type PaymentMethodType = 'debit_card' | 'credit_card' | 'bank_account';

export interface PaymentMethod {
  id: string;
  policyId: string;
  methodType: PaymentMethodType;
  provider?: string;
  providerToken: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpiration?: string;
  bankName?: string;
  accountLast4?: string;
  createdAt: Date;
}

// Tipos para estados de póliza
export type PolicyStatus = 
  | 'new_lead' 
  | 'contacting' 
  | 'info_captured' 
  | 'in_review' 
  | 'missing_docs' 
  | 'sent_to_carrier' 
  | 'approved' 
  | 'rejected' 
  | 'active' 
  | 'cancelled';

// Tipos para documentos
export interface Document {
  id: string;
  customerId: string;
  policyId?: string;
  s3Key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedByUserId: string;
  createdAt: Date;
}

// Tipos para dependientes
export interface Dependent {
  id: string;
  customerId: string;
  fullName: string;
  relationship?: string;
  birthDate?: string;
  immigrationStatus?: string;
  appliesToPolicy: boolean;
  createdAt: Date;
}

// Tipo para clientes con relaciones
export interface CustomerWithRelations {
  id: string;
  fullName: string;
  gender?: string;
  birthDate: string;
  email?: string;
  phone?: string;
  ssn?: string;
  appliesToCoverage?: boolean;
  immigrationStatus?: string;
  documentType?: string;
  address?: string;
  county?: string;
  state?: string;
  taxType?: string;
  income?: string;
  declaresOtherPeople: boolean;
  createdByAgentId: string;
  createdAt: Date;
  updatedAt: Date;
  createdByAgent: {
    firstName: string;
    lastName: string;
    name?: string;
  };
  policies: Array<{
    id: string;
    status: PolicyStatus;
    insuranceCompany?: string;
    monthlyPremium?: string;
    effectiveDate?: string;
    paymentMethod?: PaymentMethod;
  }>;
  dependents: Dependent[];
  documents: Document[];
}