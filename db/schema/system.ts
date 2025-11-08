import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Enums for system management
export const systemConfigCategoryEnum = pgEnum("system_config_category", [
  "general",
  "mikrotik",
  "payment_gateway",
  "notifications",
  "email",
  "security",
  "backup",
  "integration"
]);

export const logLevelEnum = pgEnum("log_level", [
  "debug",
  "info",
  "warn",
  "error",
  "critical"
]);

export const logCategoryEnum = pgEnum("log_category", [
  "auth",
  "api",
  "database",
  "payment",
  "mikrotik",
  "notification",
  "system",
  "security",
  "performance"
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "view",
  "export",
  "import",
  "approve",
  "reject",
  "assign",
  "escalate",
  "configure",
  "backup",
  "restore"
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled"
]);

export const scheduleFrequencyEnum = pgEnum("schedule_frequency", [
  "once",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom"
]);

export const integrationTypeEnum = pgEnum("integration_type", [
  "mikrotik",
  "payment_gateway",
  "sms_gateway",
  "email_provider",
  "whatsapp_api",
  "telegram_bot",
  "google_maps",
  "backup_service"
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "email",
  "sms",
  "whatsapp",
  "telegram",
  "push",
  "webhook",
  "in_app"
]);

export const notificationCategoryEnum = pgEnum("notification_category", [
  "billing",
  "support",
  "system",
  "marketing",
  "security",
  "operational"
]);

// System Configuration
export const systemConfiguration = pgTable("system_configuration", {
  id: text("id").primaryKey(),
  category: systemConfigCategoryEnum("category").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  description: text("description"),

  // Value validation
  valueType: text("value_type").notNull(), // string, number, boolean, json, secret
  validationRules: jsonb("validation_rules"), // JSON schema for validation
  defaultValue: text("default_value"),

  // Access control
  isPublic: boolean("is_public").notNull().default(false),
  isRequired: boolean("is_required").notNull().default(false),
  requiresRestart: boolean("requires_restart").notNull().default(false),

  // Metadata
  tags: jsonb("tags").notNull().default([]),
  lastModifiedBy: text("last_modified_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  categoryKeyIdx: index("idx_system_config_category_key").on(table.category, table.key),
  keyIdx: index("idx_system_config_key").on(table.key),
  publicIdx: index("idx_system_config_public").on(table.isPublic),
}));

// MikroTik Routers
export const mikrotikRouters = pgTable("mikrotik_routers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),

  // Connection details
  ipAddress: text("ip_address").notNull(),
  port: integer("port").notNull().default(8728),
  username: text("username").notNull(),
  password: text("password").notNull(), // Encrypted
  apiPath: text("api_path").notNull().default("/rest"),

  // SSL/TLS
  useSSL: boolean("use_ssl").notNull().default(false),
  verifyCertificate: boolean("verify_certificate").notNull().default(true),

  // Router information
  routerBoard: text("router_board"),
  firmwareVersion: text("firmware_version"),
  architecture: text("architecture"),
  cpuFrequency: text("cpu_frequency"),
  totalMemory: integer("total_memory"), // MB
  freeMemory: integer("free_memory"), // MB

  // Status
  isActive: boolean("is_active").notNull().default(true),
  connectionStatus: text("connection_status").notNull().default("unknown"), // online, offline, error, unknown
  lastConnectionTest: timestamp("last_connection_test"),
  lastSuccessfulConnection: timestamp("last_successful_connection"),
  connectionError: text("connection_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),

  // Features
  supportsUserManager: boolean("supports_user_manager").notNull().default(true),
  supportsQueues: boolean("supports_queues").notNull().default(true),
  supportsFirewall: boolean("supports_firewall").notNull().default(true),

  // Monitoring
  cpuLoad: integer("cpu_load"), // Percentage
  uptime: integer("uptime"), // Seconds
  temperature: integer("temperature"), // Celsius
  lastMetricsUpdate: timestamp("last_metrics_update"),

  // Location
  physicalLocation: text("physical_location"),
  rackPosition: text("rack_position"),
  datacenter: text("datacenter"),

  // Metadata
  notes: text("notes"),
  tags: jsonb("tags").notNull().default([]),
  managedBy: text("managed_by").references(() => user.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_mikrotik_routers_name").on(table.name),
  ipAddressIdx: index("idx_mikrotik_routers_ip").on(table.ipAddress),
  statusIdx: index("idx_mikrotik_routers_status").on(table.connectionStatus),
  activeIdx: index("idx_mikrotik_routers_active").on(table.isActive),
  managedByIdx: index("idx_mikrotik_routers_managed").on(table.managedBy),
}));

// MikroTik API Activity Log
export const mikrotikApiLogs = pgTable("mikrotik_api_logs", {
  id: text("id").primaryKey(),
  routerId: text("router_id").notNull().references(() => mikrotikRouters.id, { onDelete: "cascade" }),

  // Request details
  action: text("action").notNull(), // create, update, delete, read
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(), // GET, POST, PUT, DELETE
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),

  // Performance
  requestDuration: integer("request_duration"), // milliseconds
  responseSize: integer("response_size"), // bytes

  // Status
  status: text("status").notNull(), // success, error, timeout
  httpStatus: integer("http_status"),
  errorMessage: text("error_message"),
  errorCode: text("error_code"),

  // Context
  customerId: text("customer_id"), // If operation relates to a customer
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Timestamps
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  routerIdx: index("idx_mikrotik_logs_router").on(table.routerId),
  actionIdx: index("idx_mikrotik_logs_action").on(table.action),
  endpointIdx: index("idx_mikrotik_logs_endpoint").on(table.endpoint),
  statusIdx: index("idx_mikrotik_logs_status").on(table.status),
  timestampIdx: index("idx_mikrotik_logs_timestamp").on(table.timestamp),
  customerIdx: index("idx_mikrotik_logs_customer").on(table.customerId),
  userIdx: index("idx_mikrotik_logs_user").on(table.userId),
}));

// System Logs
export const systemLogs = pgTable("system_logs", {
  id: text("id").primaryKey(),
  level: logLevelEnum("level").notNull(),
  category: logCategoryEnum("category").notNull(),
  message: text("message").notNull(),

  // Context
  context: jsonb("context").notNull().default({}),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  requestId: text("request_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Source information
  source: text("source").notNull(), // api, web, cli, cron, background_job
  component: text("component"), // authentication, database, payment, etc.
  action: text("action"),

  // Error details
  errorType: text("error_type"),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),

  // Performance
  duration: integer("duration"), // milliseconds
  memoryUsage: integer("memory_usage"), // MB

  // Metadata
  tags: jsonb("tags").notNull().default([]),
  correlationId: text("correlation_id"),

  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  levelIdx: index("idx_system_logs_level").on(table.level),
  categoryIdx: index("idx_system_logs_category").on(table.category),
  timestampIdx: index("idx_system_logs_timestamp").on(table.timestamp),
  sourceIdx: index("idx_system_logs_source").on(table.source),
  userIdx: index("idx_system_logs_user").on(table.userId),
  correlationIdIdx: index("idx_system_logs_correlation").on(table.correlationId),
}));

// Audit Log
export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  action: auditActionEnum("action").notNull(),
  resourceType: text("resource_type").notNull(), // customer, invoice, ticket, etc.
  resourceId: text("resource_id").notNull(),
  resourceName: text("resource_name"),

  // User information
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  userRole: text("user_role"),
  userSessionId: text("user_session_id"),

  // Change details
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changedFields: jsonb("changed_fields").notNull().default([]), // Array of field names

  // Request context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestId: text("request_id"),
  endpoint: text("endpoint"),
  httpMethod: text("http_method"),

  // Additional context
  description: text("description"),
  reason: text("reason"),
  additionalData: jsonb("additional_data").notNull().default({}),

  // Risk assessment
  riskLevel: text("risk_level"), // low, medium, high, critical
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),

  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  actionIdx: index("idx_audit_log_action").on(table.action),
  resourceTypeIdx: index("idx_audit_log_resource_type").on(table.resourceType),
  resourceIdIdx: index("idx_audit_log_resource_id").on(table.resourceId),
  userIdx: index("idx_audit_log_user").on(table.userId),
  timestampIdx: index("idx_audit_log_timestamp").on(table.timestamp),
  riskLevelIdx: index("idx_audit_log_risk").on(table.riskLevel),
  endpointIdx: index("idx_audit_log_endpoint").on(table.endpoint),
}));

// Scheduled Jobs
export const scheduledJobs = pgTable("scheduled_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  jobType: text("job_type").notNull(), // invoice_generation, payment_reconciliation, backup, etc.

  // Schedule configuration
  frequency: scheduleFrequencyEnum("frequency").notNull(),
  cronExpression: text("cron_expression"), // For custom schedules
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),

  // Execution settings
  maxRetries: integer("max_retries").notNull().default(3),
  retryDelay: integer("retry_delay").notNull().default(300), // seconds
  timeoutSeconds: integer("timeout_seconds").notNull().default(3600), // 1 hour

  // Configuration
  configuration: jsonb("configuration").notNull().default({}),
  parameters: jsonb("parameters").notNull().default({}),

  // Status
  isActive: boolean("is_active").notNull().default(true),
  status: scheduleStatusEnum("status").notNull().default("pending"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastFailureAt: timestamp("last_failure_at"),

  // Statistics
  totalRuns: integer("total_runs").notNull().default(0),
  successfulRuns: integer("successful_runs").notNull().default(0),
  failedRuns: integer("failed_runs").notNull().default(0),
  averageDuration: integer("average_duration"), // milliseconds

  // Dependencies
  dependencies: jsonb("dependencies").notNull().default([]), // Array of job IDs that must complete first

  // Notifications
  notifyOnSuccess: boolean("notify_on_success").notNull().default(false),
  notifyOnFailure: boolean("notify_on_failure").notNull().default(true),
  notificationRecipients: jsonb("notification_recipients").notNull().default([]),

  // Metadata
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_scheduled_jobs_name").on(table.name),
  jobTypeIdx: index("idx_scheduled_jobs_type").on(table.jobType),
  statusIdx: index("idx_scheduled_jobs_status").on(table.status),
  activeIdx: index("idx_scheduled_jobs_active").on(table.isActive),
  nextRunIdx: index("idx_scheduled_jobs_next_run").on(table.nextRunAt),
  createdByIdx: index("idx_scheduled_jobs_created").on(table.createdBy),
}));

// Job Execution History
export const jobExecutionHistory = pgTable("job_execution_history", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => scheduledJobs.id, { onDelete: "cascade" }),

  // Execution details
  executionId: text("execution_id").notNull().unique(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds

  // Status
  status: scheduleStatusEnum("status").notNull().default("running"),
  exitCode: integer("exit_code"),
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),

  // Resources
  memoryUsed: integer("memory_used"), // MB
  cpuUsed: integer("cpu_used"), // percentage

  // Results
  result: jsonb("result"), // Job-specific result data
  processedRecords: integer("processed_records").notNull().default(0),
  successRecords: integer("success_records").notNull().default(0),
  errorRecords: integer("error_records").notNull().default(0),

  // Context
  triggeredBy: text("triggered_by"), // schedule, manual, webhook
  triggeredByUser: text("triggered_by_user").references(() => user.id, { onDelete: "set null" }),
  serverInstance: text("server_instance"),
  processId: integer("process_id"),

  // Notifications sent
  notificationsSent: jsonb("notifications_sent").notNull().default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  jobIdx: index("idx_job_history_job").on(table.jobId),
  executionIdIdx: index("idx_job_history_execution").on(table.executionId),
  statusIdx: index("idx_job_history_status").on(table.status),
  startedAtIdx: index("idx_job_history_started").on(table.startedAt),
  triggeredByIdx: index("idx_job_history_triggered_by").on(table.triggeredBy),
}));

// External Integrations
export const externalIntegrations = pgTable("external_integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: integrationTypeEnum("type").notNull(),
  provider: text("provider").notNull(), // xendit, midtrans, twilio, etc.
  description: text("description"),

  // Configuration
  configuration: jsonb("configuration").notNull().default({}),
  credentials: jsonb("credentials").notNull().default({}), // Encrypted credentials
  settings: jsonb("settings").notNull().default({}),

  // Status
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("unknown"), // connected, disconnected, error, unknown
  lastConnectionTest: timestamp("last_connection_test"),
  lastSuccessfulConnection: timestamp("last_successful_connection"),
  connectionError: text("connection_error"),

  // Usage statistics
  totalRequests: integer("total_requests").notNull().default(0),
  successfulRequests: integer("successful_requests").notNull().default(0),
  failedRequests: integer("failed_requests").notNull().default(0),
  lastRequestAt: timestamp("last_request_at"),

  // Rate limiting
  rateLimitPerHour: integer("rate_limit_per_hour"),
  currentUsage: integer("current_usage").notNull().default(0),
  rateLimitResetAt: timestamp("rate_limit_reset_at"),

  // Metadata
  version: text("version"),
  documentation: text("documentation"),
  tags: jsonb("tags").notNull().default([]),
  notes: text("notes"),

  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_integrations_name").on(table.name),
  typeIdx: index("idx_integrations_type").on(table.type),
  providerIdx: index("idx_integrations_provider").on(table.provider),
  statusIdx: index("idx_integrations_status").on(table.status),
  activeIdx: index("idx_integrations_active").on(table.isActive),
  createdByIdx: index("idx_integrations_created").on(table.createdBy),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  type: notificationTypeEnum("type").notNull(),
  category: notificationCategoryEnum("category").notNull(),

  // Recipients
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  customerId: text("customer_id"), // If customer notification
  emailAddress: text("email_address"),
  phoneNumber: text("phone_number"),
  webhookUrl: text("webhook_url"),

  // Content
  subject: text("subject"),
  message: text("message").notNull(),
  htmlMessage: text("html_message"),
  template: text("template"),
  templateData: jsonb("template_data").notNull().default({}),

  // Delivery status
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed, cancelled
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),

  // Provider details
  provider: text("provider"), // email_service, sms_gateway, etc.
  externalId: text("external_id"), // Provider message ID
  providerResponse: jsonb("provider_response"),

  // Scheduling
  scheduledFor: timestamp("scheduled_for"),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent

  // Context
  context: jsonb("context").notNull().default({}),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  correlationId: text("correlation_id"),

  // Error handling
  errorMessage: text("error_message"),
  errorCode: text("error_code"),
  lastRetryAt: timestamp("last_retry_at"),
  nextRetryAt: timestamp("next_retry_at"),

  // Tracking
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  lastOpenedAt: timestamp("last_opened_at"),
  lastClickedAt: timestamp("last_clicked_at"),

  // Metadata
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("idx_notifications_type").on(table.type),
  categoryIdx: index("idx_notifications_category").on(table.category),
  statusIdx: index("idx_notifications_status").on(table.status),
  userIdx: index("idx_notifications_user").on(table.userId),
  customerIdx: index("idx_notifications_customer").on(table.customerId),
  scheduledForIdx: index("idx_notifications_scheduled").on(table.scheduledFor),
  correlationIdIdx: index("idx_notifications_correlation").on(table.correlationId),
  createdByIdx: index("idx_notifications_created").on(table.createdBy),
}));

// System Metrics
export const systemMetrics = pgTable("system_metrics", {
  id: text("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  metricType: text("metric_type").notNull(), // counter, gauge, histogram, timer

  // Value
  value: text("value").notNull(),
  numericValue: text("numeric_value"), // For numeric metrics
  unit: text("unit"),

  // Dimensions/Tags
  dimensions: jsonb("dimensions").notNull().default({}),

  // Timestamp
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  interval: integer("interval"), // seconds, for rate metrics

  // Source
  source: text("source").notNull(), // application, database, mikrotik, etc.
  host: text("host"),
  service: text("service"),
  version: text("version"),
}, (table) => ({
  metricNameIdx: index("idx_system_metrics_name").on(table.metricName),
  metricTypeIdx: index("idx_system_metrics_type").on(table.metricType),
  timestampIdx: index("idx_system_metrics_timestamp").on(table.timestamp),
  sourceIdx: index("idx_system_metrics_source").on(table.source),
  serviceIdx: index("idx_system_metrics_service").on(table.service),
}));

// Relations
export const mikrotikRoutersRelations = relations(mikrotikRouters, ({ one, many }) => ({
  managedByUser: one(user, {
    fields: [mikrotikRouters.managedBy],
    references: [user.id],
  }),
  apiLogs: many(mikrotikApiLogs),
}));

export const mikrotikApiLogsRelations = relations(mikrotikApiLogs, ({ one }) => ({
  router: one(mikrotikRouters, {
    fields: [mikrotikApiLogs.routerId],
    references: [mikrotikRouters.id],
  }),
  user: one(user, {
    fields: [mikrotikApiLogs.userId],
    references: [user.id],
  }),
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  user: one(user, {
    fields: [systemLogs.userId],
    references: [user.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
  approvedByUser: one(user, {
    fields: [auditLog.approvedBy],
    references: [user.id],
  }),
}));

export const scheduledJobsRelations = relations(scheduledJobs, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [scheduledJobs.createdBy],
    references: [user.id],
  }),
  executions: many(jobExecutionHistory),
}));

export const jobExecutionHistoryRelations = relations(jobExecutionHistory, ({ one }) => ({
  job: one(scheduledJobs, {
    fields: [jobExecutionHistory.jobId],
    references: [scheduledJobs.id],
  }),
  triggeredByUser: one(user, {
    fields: [jobExecutionHistory.triggeredByUser],
    references: [user.id],
  }),
}));

export const externalIntegrationsRelations = relations(externalIntegrations, ({ one }) => ({
  createdByUser: one(user, {
    fields: [externalIntegrations.createdBy],
    references: [user.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
  createdByUser: one(user, {
    fields: [notifications.createdBy],
    references: [user.id],
  }),
}));