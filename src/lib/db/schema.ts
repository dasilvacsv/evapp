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
  integer, // Añadido
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { AdapterAccount } from "next-auth/adapters"; // Añadido

// --- ENUMS ---
// (Tus enums existentes van aquí sin cambios)
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "manager",
  "agent",
  "processor",
  "commission_analyst",
  "customer_service",
]);

export const policyStatusEnum = pgEnum("policy_status", [
  "new_lead",
  "contacting",
  "info_captured",
  "in_review",
  "missing_docs",
  "sent_to_carrier",
  "approved",
  "rejected",
  "active",
  "cancelled",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "calculated",
  "in_dispute",
  "paid",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"]);

export const immigrationStatusEnum = pgEnum("immigration_status", [
  "citizen",
  "green_card",
  "work_permit",
  "other",
]);

export const taxTypeEnum = pgEnum("tax_type", ["w2", "1099"]);

export const batchStatusEnum = pgEnum("batch_status", ["pending_approval", "approved", "paid"]);


// --- TABLAS ---

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // MODIFICADO: Ahora es opcional (nullable) para cuentas de OAuth
  passwordHash: text("password_hash"),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  // AÑADIDO: Campos que NextAuth puede llenar desde el proveedor de OAuth
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default('agent'),
  managerId: uuid("manager_id").references((): any => users.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AÑADIDO: Tabla de Cuentas (Accounts) para NextAuth.js
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  gender: genderEnum("gender"),
  birthDate: date("birth_date").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  ssn: text("ssn"),
  immigrationStatus: immigrationStatusEnum("immigration_status"),
  taxType: taxTypeEnum("tax_type"),
  income: decimal("income", { precision: 12, scale: 2 }),
  createdByAgentId: uuid("created_by_agent_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: policyStatusEnum("status").notNull().default("new_lead"),
  insuranceCompany: varchar("insurance_company", { length: 100 }),
  monthlyPremium: decimal("monthly_premium", { precision: 10, scale: 2 }),
  assignedProcessorId: uuid("assigned_processor_id").references(() => users.id, { onDelete: "set null" }),
  commissionStatus: commissionStatusEnum("commission_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const processorManagerAssignments = pgTable("processor_manager_assignments", {
  processorId: uuid("processor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  managerId: uuid("manager_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.processorId, table.managerId] }),
  };
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


// --- RELACIONES ---

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager_to_agents",
  }),
  managedAgents: many(users, { relationName: "manager_to_agents" }),
  createdCustomers: many(customers),
  assignedPolicies: many(policies),
  processorAssignments: many(processorManagerAssignments, { relationName: 'processor_assignments' }),
  managerAssignments: many(processorManagerAssignments, { relationName: 'manager_assignments' }),
  // AÑADIDO: Relación con la tabla de cuentas
  accounts: many(accounts),
}));

// AÑADIDO: Relaciones para la nueva tabla de cuentas
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  createdByAgent: one(users, {
    fields: [customers.createdByAgentId],
    references: [users.id],
  }),
  policies: many(policies),
}));

export const policiesRelations = relations(policies, ({ one, many }) => ({
  customer: one(customers, {
    fields: [policies.customerId],
    references: [customers.id],
  }),
  assignedProcessor: one(users, {
    fields: [policies.assignedProcessorId],
    references: [users.id],
  }),
  commissionRecords: many(commissionRecords),
}));

export const processorManagerAssignmentsRelations = relations(processorManagerAssignments, ({ one }) => ({
  processor: one(users, {
    fields: [processorManagerAssignments.processorId],
    references: [users.id],
    relationName: 'processor_assignments'
  }),
  manager: one(users, {
    fields: [processorManagerAssignments.managerId],
    references: [users.id],
    relationName: 'manager_assignments'
  }),
}));

export const commissionBatchesRelations = relations(commissionBatches, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [commissionBatches.createdByAnalystId],
    references: [users.id]
  }),
  approvedBy: one(users, {
    fields: [commissionBatches.approvedById],
    references: [users.id]
  }),
  records: many(commissionRecords),
}));

export const commissionRecordsRelations = relations(commissionRecords, ({ one }) => ({
  policy: one(policies, {
    fields: [commissionRecords.policyId],
    references: [policies.id],
  }),
  agent: one(users, {
    fields: [commissionRecords.agentId],
    references: [users.id],
  }),
  processedBy: one(users, {
    fields: [commissionRecords.processedByAnalystId],
    references: [users.id],
  }),
  batch: one(commissionBatches, {
    fields: [commissionRecords.paymentBatchId],
    references: [commissionBatches.id],
  }),
}));


// --- TIPOS ---

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;
export type CommissionBatch = typeof commissionBatches.$inferSelect;
export type NewCommissionBatch = typeof commissionBatches.$inferInsert;
export type CommissionRecord = typeof commissionRecords.$inferSelect;
export type NewCommissionRecord = typeof commissionRecords.$inferInsert;