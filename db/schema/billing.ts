import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  pgEnum,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { customers } from "./customers";

// Enums for billing
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "overdue",
  "cancelled",
  "void"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "success",
  "failed",
  "cancelled",
  "refunded"
]);

export const paymentGatewayEnum = pgEnum("payment_gateway", [
  "xendit",
  "midtrans",
  "manual"
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "virtual_account_bca",
  "virtual_account_bni",
  "virtual_account_bri",
  "virtual_account_mandiri",
  "gopay",
  "ovo",
  "dana",
  "shopeepay",
  "credit_card",
  "retail_alfamart",
  "retail_indomaret",
  "qris",
  "bank_transfer",
  "cash"
]);

export const collectionStageEnum = pgEnum("collection_stage", [
  "reminder",
  "warning",
  "isolation",
  "legal"
]);

// Invoices Table
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),

  // Billing period
  periodStartDate: timestamp("period_start_date").notNull(),
  periodEndDate: timestamp("period_end_date").notNull(),

  // Invoice items as JSON for flexibility
  items: jsonb("items").notNull(), // Array of line items

  // Financial amounts
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),

  // Status and dates
  status: invoiceStatusEnum("status").notNull().default("draft"),
  dueDate: timestamp("due_date").notNull(),
  issuedAt: timestamp("issued_at"),
  paidAt: timestamp("paid_at"),
  cancelledAt: timestamp("cancelled_at"),

  // Payment methods accepted
  acceptedPaymentMethods: jsonb("accepted_payment_methods").notNull().default([]),

  // Metadata
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  invoiceNumberIdx: index("idx_invoices_number").on(table.invoiceNumber),
  customerIdx: index("idx_invoices_customer").on(table.customerId),
  statusIdx: index("idx_invoices_status").on(table.status),
  dueDateIdx: index("idx_invoices_due_date").on(table.dueDate),
  periodIdx: index("idx_invoices_period").on(table.periodStartDate, table.periodEndDate),
  createdIdx: index("idx_invoices_created").on(table.createdAt),
}));

// Invoice Items (Alternative normalized approach)
export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),

  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.1100"), // 11% VAT
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),

  // Reference to related entities
  servicePackageId: text("service_package_id").references(() => customers.id, { onDelete: "set null" }),
  referenceType: text("reference_type"), // service, installation, equipment, penalty, etc.
  referenceId: text("reference_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  invoiceIdx: index("idx_invoice_items_invoice").on(table.invoiceId),
  descriptionIdx: index("idx_invoice_items_description").on(table.description),
}));

// Payments Table
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "restrict" }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),

  // Payment details
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  gateway: paymentGatewayEnum("gateway").notNull(),

  // Gateway integration
  gatewayReference: text("gateway_reference"),
  gatewayTransactionId: text("gateway_transaction_id"),
  gatewayFee: decimal("gateway_fee", { precision: 12, scale: 2 }).notNull().default("0.00"),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(),

  // Status and timestamps
  status: paymentStatusEnum("status").notNull().default("pending"),
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
  failedAt: timestamp("failed_at"),
  expiredAt: timestamp("expired_at"),

  // Additional details
  payerName: text("payer_name"),
  bankName: text("bank_name"),
  vaNumber: text("va_number"), // For virtual accounts
  qrCode: text("qr_code"), // Base64 or URL

  // Metadata
  notes: text("notes"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  invoiceIdx: index("idx_payments_invoice").on(table.invoiceId),
  customerIdx: index("idx_payments_customer").on(table.customerId),
  statusIdx: index("idx_payments_status").on(table.status),
  gatewayRefIdx: index("idx_payments_gateway_ref").on(table.gatewayReference),
  methodIdx: index("idx_payments_method").on(table.method),
  createdIdx: index("idx_payments_created").on(table.createdAt),
}));

// Payment Webhook Events
export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: text("id").primaryKey(),
  gateway: paymentGatewayEnum("gateway").notNull(),
  eventType: text("event_type").notNull(),
  eventId: text("event_id").notNull(), // Unique ID from gateway

  // Request details
  requestBody: jsonb("request_body").notNull(),
  headers: jsonb("headers").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),

  // Processing details
  processed: boolean("processed").notNull().default(false),
  processedAt: timestamp("processed_at"),
  processingError: text("processing_error"),

  // Related entities
  paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
  invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "set null" }),

  // Verification
  signature: text("signature"),
  signatureValid: boolean("signature_valid"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  gatewayIdx: index("idx_webhook_gateway").on(table.gateway),
  eventTypeIdx: index("idx_webhook_event_type").on(table.eventType),
  eventIdIdx: index("idx_webhook_event_id").on(table.eventId),
  processedIdx: index("idx_webhook_processed").on(table.processed),
  receivedIdx: index("idx_webhook_received").on(table.receivedAt),
}));

// Collections Management
export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),

  // Financial summary
  totalOverdue: decimal("total_overdue", { precision: 12, scale: 2 }).notNull().default("0.00"),
  overdueInvoices: jsonb("overdue_invoices").notNull().default([]), // Array of invoice IDs

  // Collection workflow
  stage: collectionStageEnum("stage").notNull().default("reminder"),
  escalationLevel: integer("escalation_level").notNull().default(1), // 1, 2, 3...

  // Contact tracking
  lastActionDate: timestamp("last_action_date"),
  nextActionDate: timestamp("next_action_date"),
  contactAttempts: integer("contact_attempts").notNull().default(0),
  lastContactMethod: text("last_contact_method"), // email, sms, whatsapp, phone

  // Assignment
  assignedCollector: text("assigned_collector").references(() => user.id, { onDelete: "set null" }),

  // Resolution
  resolvedAt: timestamp("resolved_at"),
  resolutionMethod: text("resolution_method"), // paid, settlement, write_off, etc.
  writeOffAmount: decimal("write_off_amount", { precision: 12, scale: 2 }),

  // Notes
  notes: text("notes"),
  internalNotes: text("internal_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("idx_collections_customer").on(table.customerId),
  stageIdx: index("idx_collections_stage").on(table.stage),
  collectorIdx: index("idx_collections_collector").on(table.assignedCollector),
  nextActionIdx: index("idx_collections_next_action").on(table.nextActionDate),
}));

// Collection Actions
export const collectionActions = pgTable("collection_actions", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),

  actionType: text("action_type").notNull(), // call, email, sms, whatsapp, letter, visit
  actionOutcome: text("action_outcome"), // contacted, no_answer, promised_payment, refused, etc.

  scheduledFor: timestamp("scheduled_for"),
  performedAt: timestamp("performed_at"),
  performedBy: text("performed_by").references(() => user.id, { onDelete: "set null" }),

  details: text("details"),
  nextAction: text("next_action"),
  followUpDate: timestamp("follow_up_date"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  collectionIdx: index("idx_collection_actions_collection").on(table.collectionId),
  actionTypeIdx: index("idx_collection_actions_type").on(table.actionType),
  performedIdx: index("idx_collection_actions_performed").on(table.performedAt),
}));

// Payment Reminders
export const paymentReminders = pgTable("payment_reminders", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),

  reminderType: text("reminder_type").notNull(), // due_soon, due_today, overdue_3days, overdue_7days, etc.
  scheduledFor: timestamp("scheduled_for").notNull(),

  // Status
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  sendMethod: text("send_method"), // email, sms, whatsapp

  // Delivery tracking
  deliveryStatus: text("delivery_status"), // delivered, failed, bounced, etc.
  deliveryError: text("delivery_error"),
  externalId: text("external_id"), // Gateway message ID

  // Content
  subject: text("subject"),
  message: text("message"),
  template: text("template"),

  // Metadata
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  invoiceIdx: index("idx_payment_reminders_invoice").on(table.invoiceId),
  customerIdx: index("idx_payment_reminders_customer").on(table.customerId),
  typeIdx: index("idx_payment_reminders_type").on(table.reminderType),
  scheduledIdx: index("idx_payment_reminders_scheduled").on(table.scheduledFor),
  sentIdx: index("idx_payment_reminders_sent").on(table.sent),
}));

// Revenue Reports (Pre-calculated for performance)
export const revenueReports = pgTable("revenue_reports", {
  id: text("id").primaryKey(),

  // Report period
  reportType: text("report_type").notNull(), // daily, weekly, monthly, yearly
  reportDate: timestamp("report_date").notNull(),
  periodStartDate: timestamp("period_start_date").notNull(),
  periodEndDate: timestamp("period_end_date").notNull(),

  // Revenue metrics
  grossRevenue: decimal("gross_revenue", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),

  // Customer metrics
  newCustomers: integer("new_customers").notNull().default(0),
  churnedCustomers: integer("churned_customers").notNull().default(0),
  activeCustomers: integer("active_customers").notNull().default(0),

  // Collection metrics
  totalInvoices: integer("total_invoices").notNull().default(0),
  paidInvoices: integer("paid_invoices").notNull().default(0),
  overdueInvoices: integer("overdue_invoices").notNull().default(0),
  collectionRate: decimal("collection_rate", { precision: 5, scale: 4 }), // Percentage

  // Package breakdown (JSON)
  revenueByPackage: jsonb("revenue_by_package").notNull().default({}),

  // Geographic breakdown (JSON)
  revenueByRegion: jsonb("revenue_by_region").notNull().default({}),

  generatedAt: timestamp("generated_at").defaultNow().notNull(),
}, (table) => ({
  reportTypeDateIdx: index("idx_revenue_reports_type_date").on(table.reportType, table.reportDate),
  periodIdx: index("idx_revenue_reports_period").on(table.periodStartDate, table.periodEndDate),
}));

// Invoice Templates
export const invoiceTemplates = pgTable("invoice_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),

  // Template content
  htmlTemplate: text("html_template").notNull(),
  textTemplate: text("text_template"),
  cssStyles: text("css_styles"),

  // Template variables
  variables: jsonb("variables").notNull().default([]), // Array of available variables

  // Usage
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),

  // Metadata
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_invoice_templates_name").on(table.name),
  activeIdx: index("idx_invoice_templates_active").on(table.isActive),
  defaultIdx: index("idx_invoice_templates_default").on(table.isDefault),
}));

// Relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
  reminders: many(paymentReminders),
  createdByUser: one(user, {
    fields: [invoices.createdBy],
    references: [user.id],
  }),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  webhookEvents: many(paymentWebhookEvents),
  createdByUser: one(user, {
    fields: [payments.createdBy],
    references: [user.id],
  }),
}));

export const paymentWebhookEventsRelations = relations(paymentWebhookEvents, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentWebhookEvents.paymentId],
    references: [payments.id],
  }),
  invoice: one(invoices, {
    fields: [paymentWebhookEvents.invoiceId],
    references: [invoices.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  customer: one(customers, {
    fields: [collections.customerId],
    references: [customers.id],
  }),
  assignedCollector: one(user, {
    fields: [collections.assignedCollector],
    references: [user.id],
  }),
  actions: many(collectionActions),
}));

export const collectionActionsRelations = relations(collectionActions, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionActions.collectionId],
    references: [collections.id],
  }),
  performedByUser: one(user, {
    fields: [collectionActions.performedBy],
    references: [user.id],
  }),
}));

export const paymentRemindersRelations = relations(paymentReminders, ({ one }) => ({
  invoice: one(invoices, {
    fields: [paymentReminders.invoiceId],
    references: [invoices.id],
  }),
  customer: one(customers, {
    fields: [paymentReminders.customerId],
    references: [customers.id],
  }),
  createdByUser: one(user, {
    fields: [paymentReminders.createdBy],
    references: [user.id],
  }),
}));

export const invoiceTemplatesRelations = relations(invoiceTemplates, ({ one }) => ({
  createdByUser: one(user, {
    fields: [invoiceTemplates.createdBy],
    references: [user.id],
  }),
}));