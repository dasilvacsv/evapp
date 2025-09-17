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
  "call_center", // NUEVO: Rol Call Center
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

export const documentTypeEnum = pgEnum("document_type", [
  "foreign_passport", "drivers_license", "state_id", "work_permit_ssn_card", "permanent_residence", "citizen_passport", "birth_certificate", "naturalization_certificate", "employment_authorization", "income_proof", "tax_return", "other",
]);

export const taxDeclarationTypeEnum = pgEnum("tax_declaration_type", ["w2", "1099", "not_yet_declared"]);

export const paymentMethodTypeEnum = pgEnum("payment_method_type", ["debit_card", "credit_card", "bank_account"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "completed", "cancelled", "rescheduled"]);
export const claimStatusEnum = pgEnum("claim_status", ["submitted", "in_review", "information_requested", "approved", "denied"]);

// NUEVOS ENUMS PARA TAREAS Y PLANTILLAS
export const taskStatusEnum = pgEnum("task_status", [
  "pending", "in_progress", "completed", "cancelled", "on_hold"
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low", "medium", "high", "urgent"
]);

export const taskTypeEnum = pgEnum("task_type", [
  "follow_up", "document_request", "birthday_reminder", "renewal_reminder", "address_change", "claim_follow_up", "payment_reminder", "general", "aor_signature"
]);

export const templateTypeEnum = pgEnum("template_type", [
  "income_letter", "coverage_confirmation", "renewal_notice", "birthday_greeting", "address_change_confirmation", "general_correspondence"
]);

// --- TABLAS EXISTENTES ---

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
  assignedAgentId: uuid("assigned_agent_id").references((): any => users.id, { onDelete: "set null" }), // NUEVO: Para Call Center
  isActive: boolean("is_active").default(true).notNull(),
  canDownload: boolean("can_download").default(true).notNull(), // NUEVO: Permiso de descarga
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
  processingStartedAt: timestamp("processing_started_at"), // NUEVO: Para controlar acceso
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
  aorDocumentId: varchar("aor_document_id", { length: 100 }), // NUEVO: ID de Documenso
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

// --- NUEVAS TABLAS PARA SISTEMA DE TAREAS Y PLANTILLAS ---

export const customerTasks = pgTable("customer_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  policyId: uuid("policy_id").references(() => policies.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: taskTypeEnum("type").notNull().default("general"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("pending"),
  assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postSaleTasks = pgTable("post_sale_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: taskTypeEnum("type").notNull(),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("pending"),
  assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  policyId: uuid("policy_id").references(() => policies.id, { onDelete: "cascade" }),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  boardColumn: varchar("board_column", { length: 50 }).default("pending"),
  position: integer("position").default(0),
  tags: text("tags"), // JSON array of strings
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: templateTypeEnum("type").notNull(),
  content: text("content").notNull(), // HTML/markdown content with variables
  variables: text("variables"), // JSON array of variable definitions
  isActive: boolean("is_active").default(true).notNull(),
  createdById: uuid("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generatedDocuments = pgTable("generated_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").notNull().references(() => documentTemplates.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  policyId: uuid("policy_id").references(() => policies.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  generatedContent: text("generated_content").notNull(),
  s3Key: text("s3_key"), // Si se guarda como archivo
  generatedById: uuid("generated_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => customerTasks.id, { onDelete: "cascade" }),
  postSaleTaskId: uuid("post_sale_task_id").references(() => postSaleTasks.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdById: uuid("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELACIONES ACTUALIZADAS ---

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, { fields: [users.managerId], references: [users.id], relationName: "manager_to_agents" }),
  managedAgents: many(users, { relationName: "manager_to_agents" }),
  assignedAgent: one(users, { fields: [users.assignedAgentId], references: [users.id], relationName: "call_center_agent" }),
  callCenterAgents: many(users, { relationName: "call_center_agent" }),
  createdCustomers: many(customers),
  assignedPolicies: many(policies),
  assignedTasks: many(customerTasks, { relationName: "assigned_tasks" }),
  createdTasks: many(customerTasks, { relationName: "created_tasks" }),
  assignedPostSaleTasks: many(postSaleTasks, { relationName: "assigned_post_sale_tasks" }),
  createdPostSaleTasks: many(postSaleTasks, { relationName: "created_post_sale_tasks" }),
  createdTemplates: many(documentTemplates),
  generatedDocuments: many(generatedDocuments),
  taskComments: many(taskComments),
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
  tasks: many(customerTasks),
  postSaleTasks: many(postSaleTasks),
  generatedDocuments: many(generatedDocuments),
}));

export const policiesRelations = relations(policies, ({ one, many }) => ({
    customer: one(customers, { fields: [policies.customerId], references: [customers.id] }),
    assignedProcessor: one(users, { fields: [policies.assignedProcessorId], references: [users.id] }),
    commissionRecords: many(commissionRecords),
    paymentMethod: one(paymentMethods),
    documents: many(documents),
    appointments: many(appointments),
    claims: many(claims),
    tasks: many(customerTasks),
    postSaleTasks: many(postSaleTasks),
    generatedDocuments: many(generatedDocuments),
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
    customer: one(customers, { fields: [claims.customerId], references: [claims.id] }),
}));

// --- NUEVAS RELACIONES PARA TAREAS Y PLANTILLAS ---

export const customerTasksRelations = relations(customerTasks, ({ one, many }) => ({
  customer: one(customers, { fields: [customerTasks.customerId], references: [customers.id] }),
  policy: one(policies, { fields: [customerTasks.policyId], references: [policies.id] }),
  assignedTo: one(users, { fields: [customerTasks.assignedToId], references: [users.id], relationName: "assigned_tasks" }),
  createdBy: one(users, { fields: [customerTasks.createdById], references: [users.id], relationName: "created_tasks" }),
  comments: many(taskComments),
}));

export const postSaleTasksRelations = relations(postSaleTasks, ({ one, many }) => ({
  customer: one(customers, { fields: [postSaleTasks.customerId], references: [customers.id] }),
  policy: one(policies, { fields: [postSaleTasks.policyId], references: [policies.id] }),
  assignedTo: one(users, { fields: [postSaleTasks.assignedToId], references: [users.id], relationName: "assigned_post_sale_tasks" }),
  createdBy: one(users, { fields: [postSaleTasks.createdById], references: [users.id], relationName: "created_post_sale_tasks" }),
  comments: many(taskComments),
}));

export const documentTemplatesRelations = relations(documentTemplates, ({ one, many }) => ({
  createdBy: one(users, { fields: [documentTemplates.createdById], references: [users.id] }),
  generatedDocuments: many(generatedDocuments),
}));

export const generatedDocumentsRelations = relations(generatedDocuments, ({ one }) => ({
  template: one(documentTemplates, { fields: [generatedDocuments.templateId], references: [documentTemplates.id] }),
  customer: one(customers, { fields: [generatedDocuments.customerId], references: [customers.id] }),
  policy: one(policies, { fields: [generatedDocuments.policyId], references: [policies.id] }),
  generatedBy: one(users, { fields: [generatedDocuments.generatedById], references: [users.id] }),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(customerTasks, { fields: [taskComments.taskId], references: [customerTasks.id] }),
  postSaleTask: one(postSaleTasks, { fields: [taskComments.postSaleTaskId], references: [postSaleTasks.id] }),
  createdBy: one(users, { fields: [taskComments.createdById], references: [users.id] }),
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
export type CustomerTask = typeof customerTasks.$inferSelect;
export type NewCustomerTask = typeof customerTasks.$inferInsert;
export type PostSaleTask = typeof postSaleTasks.$inferSelect;
export type NewPostSaleTask = typeof postSaleTasks.$inferInsert;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type NewGeneratedDocument = typeof generatedDocuments.$inferInsert;
export type TaskComment = typeof taskComments.$inferSelect;
export type NewTaskComment = typeof taskComments.$inferInsert;