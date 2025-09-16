// db/schema.ts

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  decimal,
  pgEnum,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { AdapterAccount } from "next-auth/adapters";

// --- ENUMS ---

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "manager",
  "agent",
  "processor",
  "commission_analyst",
  "customer_service",
]);

export const policyStatusEnum = pgEnum("policy_status", [
  "new_lead", "contacting", "info_captured", "in_review", "missing_docs", "sent_to_carrier", "approved", "rejected", "active", "cancelled",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending", "calculated", "in_dispute", "paid",
]);

export const batchStatusEnum = pgEnum("batch_status", ["pending_approval", "approved", "paid"]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const immigrationStatusEnum = pgEnum("immigration_status", [
  "citizen", "green_card", "work_permit_ssn", "u_visa", "political_asylum", "parole", "notice_of_action", "other",
]);

// ACTUALIZADO: Documentos válidos para el mercado de salud
export const documentTypeEnum = pgEnum("document_type", [
  "foreign_passport", "drivers_license", "state_id", "work_permit_ssn_card", "permanent_residence", "citizen_passport", "birth_certificate", "naturalization_certificate", "employment_authorization", "income_proof", "tax_return", "other",
]);

export const taxDeclarationTypeEnum = pgEnum("tax_declaration_type", ["w2", "1099", "not_yet_declared"]);

export const paymentMethodTypeEnum = pgEnum("payment_method_type", ["debit_card", "credit_card", "bank_account"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "completed", "cancelled", "rescheduled"]);
export const claimStatusEnum = pgEnum("claim_status", ["submitted", "in_review", "information_requested", "approved", "denied"]);

// --- TABLAS ---

export const appointments = pgTable("appointments", {
    id: uuid("id").primaryKey().defaultRandom(),
    policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => users.id, { onDelete: "set null" }),
    appointmentDate: timestamp("appointment_date").notNull(),
    notes: text("notes"),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const claims = pgTable("claims", {
    id: uuid("id").primaryKey().defaultRandom(),
    policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    claimNumber: varchar("claim_number", { length: 100 }),
    description: text("description").notNull(),
    dateFiled: date("date_filed").notNull(),
    status: claimStatusEnum("status").notNull().default("submitted"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default('agent'),
  managerId: uuid("manager_id").references((): any => users.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts", {
    userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"), access_token: text("access_token"), expires_at: integer("expires_at"), token_type: text("token_type"), scope: text("scope"), id_token: text("id_token"), session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  gender: genderEnum("gender"),
  birthDate: date("birth_date").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  ssn: varchar("ssn", { length: 9 }),
  
  appliesToCoverage: boolean("applies_to_coverage"),
  immigrationStatus: immigrationStatusEnum("immigration_status"),
  // NUEVO: Campos adicionales para "Otro"
  immigrationStatusOther: text("immigration_status_other"),
  documentType: documentTypeEnum("document_type"),
  documentTypeOther: text("document_type_other"),
  address: text("address"),
  zipCode: varchar("zip_code", { length: 10 }),
  county: varchar("county", { length: 100 }),
  state: varchar("state", { length: 100 }),
  taxType: taxDeclarationTypeEnum("tax_type"),
  income: decimal("income", { precision: 12, scale: 2 }),
  declaresOtherPeople: boolean("declares_other_people").default(false),
  
  createdByAgentId: uuid("created_by_agent_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: policyStatusEnum("status").notNull().default("in_review"),
  insuranceCompany: varchar("insurance_company", { length: 100 }),
  monthlyPremium: decimal("monthly_premium", { precision: 10, scale: 2 }),
  
  marketplaceId: varchar("marketplace_id", { length: 100 }),
  planName: varchar("plan_name", { length: 255 }),
  effectiveDate: date("effective_date"),
  planLink: text("plan_link"),
  taxCredit: decimal("tax_credit", { precision: 10, scale: 2 }),
  aorLink: text("aor_link"),
  notes: text("notes"),

  assignedProcessorId: uuid("assigned_processor_id").references(() => users.id, { onDelete: "set null" }),
  commissionStatus: commissionStatusEnum("commission_status").default("pending"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const processorManagerAssignments = pgTable("processor_manager_assignments", {
  processorId: uuid("processor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  managerId: uuid("manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => {
  return { pk: primaryKey({ columns: [table.processorId, table.managerId] }) };
});

export const commissionBatches = pgTable("commission_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  periodDescription: varchar("period_description", { length: 100 }).notNull(),
  status: batchStatusEnum("status").notNull().default("pending_approval"),
  createdByAnalystId: uuid("created_by_analyst_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionRecords = pgTable("commission_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  calculationDate: timestamp("calculation_date").defaultNow().notNull(),
  processedByAnalystId: uuid("processed_by_analyst_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  paymentBatchId: uuid("payment_batch_id").references(() => commissionBatches.id, { onDelete: "cascade" }),
});

export const dependents = pgTable("dependents", {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    relationship: varchar("relationship", { length: 100 }),
    birthDate: date("birth_date"),
    immigrationStatus: immigrationStatusEnum("immigration_status"),
    // NUEVO: Campo adicional para "Otro" en dependientes
    immigrationStatusOther: text("immigration_status_other"),
    appliesToPolicy: boolean("applies_to_policy").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
    id: uuid("id").primaryKey().defaultRandom(),
    policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
    methodType: paymentMethodTypeEnum("method_type").notNull(),
    provider: varchar("provider", { length: 50 }),
    providerToken: text("provider_token").notNull().unique(),
    cardBrand: varchar("card_brand", { length: 50 }),
    cardLast4: varchar("card_last_4", { length: 4 }),
    cardExpiration: varchar("card_expiration", { length: 7 }),
    bankName: varchar("bank_name", { length: 100 }),
    accountLast4: varchar("account_last_4", { length: 4 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id").references(() => policies.id, { onDelete: "set null" }),
    s3Key: text("s3_key").notNull().unique(),
    dependentId: uuid("dependent_id").references(() => dependents.id, { onDelete: "set null" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    fileSize: integer("file_size").notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELACIONES ---

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, { fields: [users.managerId], references: [users.id], relationName: "manager_to_agents" }),
  managedAgents: many(users, { relationName: "manager_to_agents" }),
  createdCustomers: many(customers),
  assignedPolicies: many(policies),
  processorAssignments: many(processorManagerAssignments, { relationName: 'processor_assignments' }),
  managerAssignments: many(processorManagerAssignments, { relationName: 'manager_assignments' }),
  accounts: many(accounts),
  uploadedDocuments: many(documents),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  createdByAgent: one(users, { fields: [customers.createdByAgentId], references: [users.id] }),
  policies: many(policies),
  dependents: many(dependents),
  documents: many(documents),
}));

export const policiesRelations = relations(policies, ({ one, many }) => ({
    customer: one(customers, { fields: [policies.customerId], references: [customers.id] }),
    assignedProcessor: one(users, { fields: [policies.assignedProcessorId], references: [users.id] }),
    commissionRecords: many(commissionRecords),
    paymentMethod: one(paymentMethods),
    documents: many(documents),
    appointments: many(appointments),
    claims: many(claims),
}));

export const processorManagerAssignmentsRelations = relations(processorManagerAssignments, ({ one }) => ({
  processor: one(users, { fields: [processorManagerAssignments.processorId], references: [users.id], relationName: 'processor_assignments' }),
  manager: one(users, { fields: [processorManagerAssignments.managerId], references: [users.id], relationName: 'manager_assignments' }),
}));

export const commissionBatchesRelations = relations(commissionBatches, ({ one, many }) => ({
  createdBy: one(users, { fields: [commissionBatches.createdByAnalystId], references: [users.id] }),
  approvedBy: one(users, { fields: [commissionBatches.approvedById], references: [users.id] }),
  records: many(commissionRecords),
}));

export const commissionRecordsRelations = relations(commissionRecords, ({ one }) => ({
  policy: one(policies, { fields: [commissionRecords.policyId], references: [policies.id] }),
  agent: one(users, { fields: [commissionRecords.agentId], references: [users.id] }),
  processedBy: one(users, { fields: [commissionRecords.processedByAnalystId], references: [users.id] }),
  batch: one(commissionBatches, { fields: [commissionRecords.paymentBatchId], references: [commissionBatches.id] }),
}));

export const dependentsRelations = relations(dependents, ({ one, many }) => ({
  customer: one(customers, { fields: [dependents.customerId], references: [customers.id] }),
  documents: many(documents),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
    policy: one(policies, { fields: [paymentMethods.policyId], references: [policies.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  customer: one(customers, { fields: [documents.customerId], references: [customers.id] }),
  policy: one(policies, { fields: [documents.policyId], references: [policies.id] }),
  uploadedByUser: one(users, { fields: [documents.uploadedByUserId], references: [users.id] }),
  dependent: one(dependents, { fields: [documents.dependentId], references: [dependents.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
    policy: one(policies, { fields: [appointments.policyId], references: [policies.id] }),
    customer: one(customers, { fields: [appointments.customerId], references: [customers.id] }),
    agent: one(users, { fields: [appointments.agentId], references: [users.id] }),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
    policy: one(policies, { fields: [claims.policyId], references: [policies.id] }),
    customer: one(customers, { fields: [claims.customerId], references: [customers.id] }),
}));

// Add type definitions for better TypeScript support
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;
export type Dependent = typeof dependents.$inferSelect;
export type NewDependent = typeof dependents.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;