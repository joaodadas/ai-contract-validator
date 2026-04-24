import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum("user_role", ["admin", "auditor"]);

// ============================================
// AUTHENTICATION TABLES
// ============================================

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  name: varchar({ length: 255 }),
  role: userRoleEnum("role").notNull().default("auditor"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

// ============================================
// CONTRACT VALIDATION ENGINE TABLES
// ============================================

// Enums
export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "approved",
  "divergent",
  "confirmed",
]);

export const auditStatusEnum = pgEnum("audit_status", [
  "approved",
  "divergent",
  "error",
]);

export const ruleTypeEnum = pgEnum("rule_type", [
  "financial",
  "documents",
  "score",
  "enterprise_override",
]);

export const ruleScopeEnum = pgEnum("rule_scope", ["global", "enterprise"]);

export const logLevelEnum = pgEnum("log_level", ["info", "warning", "error"]);

// 1️⃣ Reservations Table
export const reservationsTable = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: varchar("external_id", { length: 255 }).notNull().unique(),
    enterprise: varchar({ length: 255 }).notNull(),
    titularNome: varchar("titular_nome", { length: 255 }),
    cvcrmSnapshot: jsonb("cvcrm_snapshot"),
    cvcrmSituacao: varchar("cvcrm_situacao", { length: 255 }),
    status: reservationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    externalIdIdx: index("reservations_external_id_idx").on(table.externalId),
    enterpriseIdx: index("reservations_enterprise_idx").on(table.enterprise),
    statusIdx: index("reservations_status_idx").on(table.status),
  })
);

// 2️⃣ Reservation Audits Table
export const reservationAuditsTable = pgTable(
  "reservation_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservationsTable.id, { onDelete: "cascade" }),
    ruleVersion: integer("rule_version").notNull(),
    promptVersion: varchar("prompt_version", { length: 100 }).notNull(),
    status: auditStatusEnum("status").notNull(),
    score: integer("score"),
    resultJson: jsonb("result_json").notNull(),
    aiRawOutput: jsonb("ai_raw_output"),
    executionTimeMs: integer("execution_time_ms").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    reservationIdIdx: index("reservation_audits_reservation_id_idx").on(
      table.reservationId
    ),
    statusIdx: index("reservation_audits_status_idx").on(table.status),
    createdAtIdx: index("reservation_audits_created_at_idx").on(
      table.createdAt
    ),
  })
);

// 3️⃣ Rule Configs Table
export const ruleConfigsTable = pgTable(
  "rule_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: ruleTypeEnum("type").notNull(),
    scope: ruleScopeEnum("scope").notNull(),
    enterprise: varchar({ length: 255 }),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    config: jsonb("config").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("rule_configs_type_idx").on(table.type),
    scopeIdx: index("rule_configs_scope_idx").on(table.scope),
    enterpriseIdx: index("rule_configs_enterprise_idx").on(table.enterprise),
    activeRulesIdx: index("rule_configs_active_idx").on(
      table.type,
      table.scope,
      table.enterprise,
      table.isActive
    ),
  })
);

// 4️⃣ Prompt Configs Table
export const promptConfigsTable = pgTable(
  "prompt_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agent: varchar("agent", { length: 64 }).notNull(),
    version: integer("version").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    content: text("content").notNull(),
    notes: text("notes"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    activatedBy: integer("activated_by").references(() => usersTable.id, {
      onDelete: "restrict",
    }),
    activatedAt: timestamp("activated_at", { mode: "date" }),
    deactivatedAt: timestamp("deactivated_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    agentIdx: index("prompt_configs_agent_idx").on(table.agent),
  })
);

// 5️⃣ Audit Logs Table
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationAuditId: uuid("reservation_audit_id")
      .notNull()
      .references(() => reservationAuditsTable.id, { onDelete: "cascade" }),
    level: logLevelEnum("level").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    auditIdIdx: index("audit_logs_reservation_audit_id_idx").on(
      table.reservationAuditId
    ),
    levelIdx: index("audit_logs_level_idx").on(table.level),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

// ============================================
// RELATIONS
// ============================================

export const reservationsRelations = relations(
  reservationsTable,
  ({ many }) => ({
    audits: many(reservationAuditsTable),
  })
);

export const reservationAuditsRelations = relations(
  reservationAuditsTable,
  ({ one, many }) => ({
    reservation: one(reservationsTable, {
      fields: [reservationAuditsTable.reservationId],
      references: [reservationsTable.id],
    }),
    logs: many(auditLogsTable),
  })
);

export const auditLogsRelations = relations(auditLogsTable, ({ one }) => ({
  reservationAudit: one(reservationAuditsTable, {
    fields: [auditLogsTable.reservationAuditId],
    references: [reservationAuditsTable.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

// Auth types
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;

// Contract validation types
export type Reservation = typeof reservationsTable.$inferSelect;
export type NewReservation = typeof reservationsTable.$inferInsert;

export type ReservationAudit = typeof reservationAuditsTable.$inferSelect;
export type NewReservationAudit = typeof reservationAuditsTable.$inferInsert;

export type RuleConfig = typeof ruleConfigsTable.$inferSelect;
export type NewRuleConfig = typeof ruleConfigsTable.$inferInsert;

export type AuditLog = typeof auditLogsTable.$inferSelect;
export type NewAuditLog = typeof auditLogsTable.$inferInsert;

export type PromptConfig = typeof promptConfigsTable.$inferSelect;
export type NewPromptConfig = typeof promptConfigsTable.$inferInsert;
