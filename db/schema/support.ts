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
import { customers } from "./customers";

// Enums for support system
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "pending_customer",
  "pending_technician",
  "resolved",
  "closed",
  "reopened"
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
  "critical"
]);

export const ticketCategoryEnum = pgEnum("ticket_category", [
  "connection_issue",
  "billing_issue",
  "package_change",
  "technical_support",
  "installation_appointment",
  "service_complaint",
  "account_management",
  "equipment_issue",
  "network_outage",
  "general_inquiry"
]);

export const ticketSourceEnum = pgEnum("ticket_source", [
  "customer_portal",
  "phone",
  "email",
  "whatsapp",
  "telegram",
  "walk_in",
  "social_media",
  "internal"
]);

export const knowledgeBaseCategoryEnum = pgEnum("kb_category", [
  "connection_troubleshooting",
  "billing_faqs",
  "setup_guides",
  "equipment_support",
  "policies_procedures",
  "technical_documentation",
  "customer_guides"
]);

export const knowledgeBaseDifficultyEnum = pgEnum("kb_difficulty", [
  "beginner",
  "intermediate",
  "advanced"
]);

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),

  // Customer information
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(), // For guests or quick reference
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),

  // Ticket details
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: ticketCategoryEnum("category").notNull(),
  priority: ticketPriorityEnum("priority").notNull().default("normal"),
  source: ticketSourceEnum("source").notNull().default("customer_portal"),

  // Status and assignment
  status: ticketStatusEnum("status").notNull().default("open"),
  assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
  assignedTeam: text("assigned_team"), // support, technical, billing, etc.

  // Escalation
  escalated: boolean("escalated").notNull().default(false),
  escalatedTo: text("escalated_to").references(() => user.id, { onDelete: "set null" }),
  escalatedAt: timestamp("escalated_at"),
  escalationReason: text("escalation_reason"),

  // Location for technical visits
  serviceAddress: text("service_address"),
  coordinates: jsonb("coordinates"), // {lat, lng}

  // Resolution
  resolution: text("resolution"),
  resolutionCategory: text("resolution_category"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),

  // Customer feedback
  satisfactionRating: integer("satisfaction_rating"), // 1-5 stars
  satisfactionComment: text("satisfaction_comment"),
  feedbackReceivedAt: timestamp("feedback_received_at"),

  // Timestamps
  firstResponseAt: timestamp("first_response_at"),
  lastResponseAt: timestamp("last_response_at"),
  closedAt: timestamp("closed_at"),
  closedBy: text("closed_by").references(() => user.id, { onDelete: "set null" }),

  // Service Level Agreement (SLA)
  slaDueDate: timestamp("sla_due_date"),
  slaBreached: boolean("sla_breached").notNull().default(false),

  // Metadata
  tags: jsonb("tags").notNull().default([]),
  internalNotes: text("internal_notes"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  ticketNumberIdx: index("idx_tickets_number").on(table.ticketNumber),
  customerIdx: index("idx_tickets_customer").on(table.customerId),
  statusIdx: index("idx_tickets_status").on(table.status),
  categoryIdx: index("idx_tickets_category").on(table.category),
  priorityIdx: index("idx_tickets_priority").on(table.priority),
  assignedToIdx: index("idx_tickets_assigned").on(table.assignedTo),
  createdIdx: index("idx_tickets_created").on(table.createdAt),
  slaDueIdx: index("idx_tickets_sla_due").on(table.slaDueDate),
}));

// Ticket Messages/Responses
export const ticketMessages = pgTable("ticket_messages", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),

  // Message content
  message: text("message").notNull(),
  messageType: text("message_type").notNull(), // customer_response, staff_response, system_note, internal_note
  isInternal: boolean("is_internal").notNull().default(false),

  // Sender information
  senderType: text("sender_type").notNull(), // customer, staff, system
  senderId: text("sender_id"), // User ID or customer ID
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email"),

  // Attachments
  attachments: jsonb("attachments").notNull().default([]), // Array of file info

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
  editedBy: text("edited_by").references(() => user.id, { onDelete: "set null" }),
}, (table) => ({
  ticketIdx: index("idx_ticket_messages_ticket").on(table.ticketId),
  messageTypeIdx: index("idx_ticket_messages_type").on(table.messageType),
  senderTypeIdx: index("idx_ticket_messages_sender_type").on(table.senderType),
  createdIdx: index("idx_ticket_messages_created").on(table.createdAt),
}));

// Ticket Attachments
export const ticketAttachments = pgTable("ticket_attachments", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  messageId: text("message_id").references(() => ticketMessages.id, { onDelete: "set null" }),

  // File information
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  filePath: text("file_path").notNull(), // Storage path

  // Metadata
  description: text("description"),
  uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ticketIdx: index("idx_ticket_attachments_ticket").on(table.ticketId),
  messageIdx: index("idx_ticket_attachments_message").on(table.messageId),
  filenameIdx: index("idx_ticket_attachments_filename").on(table.filename),
}));

// Ticket Activities (Audit trail)
export const ticketActivities = pgTable("ticket_activities", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),

  // Activity details
  activityType: text("activity_type").notNull(), // created, assigned, status_changed, priority_changed, etc.
  activityDescription: text("activity_description").notNull(),

  // Change tracking
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  fieldName: text("field_name"),

  // User information
  performedBy: text("performed_by").references(() => user.id, { onDelete: "set null" }),
  performedByType: text("performed_by_type").notNull(), // staff, customer, system

  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ticketIdx: index("idx_ticket_activities_ticket").on(table.ticketId),
  activityTypeIdx: index("idx_ticket_activities_type").on(table.activityType),
  performedByIdx: index("idx_ticket_activities_performed").on(table.performedBy),
  createdIdx: index("idx_ticket_activities_created").on(table.createdAt),
}));

// Knowledge Base Articles
export const knowledgeBaseArticles = pgTable("knowledge_base_articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),

  // Content
  content: text("content").notNull(),
  excerpt: text("excerpt"),

  // Organization
  category: knowledgeBaseCategoryEnum("category").notNull(),
  tags: jsonb("tags").notNull().default([]),
  difficulty: knowledgeBaseDifficultyEnum("difficulty").notNull().default("beginner"),

  // SEO and visibility
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  isPublished: boolean("is_published").notNull().default(false),
  featured: boolean("featured").notNull().default(false),

  // Relationships
  relatedArticles: jsonb("related_articles").notNull().default([]), // Array of article IDs

  // Analytics
  viewCount: integer("view_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  notHelpfulCount: integer("not_helpful_count").notNull().default(0),

  // Metadata
  author: text("author").references(() => user.id, { onDelete: "set null" }),
  reviewer: text("reviewer").references(() => user.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),

  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  titleIdx: index("idx_kb_articles_title").on(table.title),
  slugIdx: index("idx_kb_articles_slug").on(table.slug),
  categoryIdx: index("idx_kb_articles_category").on(table.category),
  publishedIdx: index("idx_kb_articles_published").on(table.isPublished),
  featuredIdx: index("idx_kb_articles_featured").on(table.featured),
  difficultyIdx: index("idx_kb_articles_difficulty").on(table.difficulty),
}));

// Knowledge Base Article Views
export const knowledgeBaseViews = pgTable("knowledge_base_views", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),

  // Viewer information
  viewerType: text("viewer_type").notNull(), // customer, staff, public
  viewerId: text("viewer_id"), // User ID or customer ID
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  // Referrer
  referrer: text("referrer"),
  referrerType: text("referrer_type"), // search, direct, internal, external

  // Timestamp
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
}, (table) => ({
  articleIdx: index("idx_kb_views_article").on(table.articleId),
  viewerIdx: index("idx_kb_views_viewer").on(table.viewerId),
  viewedAtIdx: index("idx_kb_views_viewed").on(table.viewedAt),
}));

// Knowledge Base Feedback
export const knowledgeBaseFeedback = pgTable("knowledge_base_feedback", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),

  // Feedback details
  helpful: boolean("helpful").notNull(),
  rating: integer("rating"), // 1-5 stars
  comment: text("comment"),

  // Feedback provider
  feedbackType: text("feedback_type").notNull(), // customer, staff
  feedbackById: text("feedback_by_id"), // User ID or customer ID
  feedbackByName: text("feedback_by_name"),

  // Context
  solvedProblem: boolean("solved_problem"),
  wouldRecommend: boolean("would_recommend"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  articleIdx: index("idx_kb_feedback_article").on(table.articleId),
  helpfulIdx: index("idx_kb_feedback_helpful").on(table.helpful),
  feedbackByIdIdx: index("idx_kb_feedback_by").on(table.feedbackById),
}));

// Canned Responses/Templates
export const cannedResponses = pgTable("canned_responses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),

  // Content
  subject: text("subject"),
  message: text("message").notNull(),
  htmlMessage: text("html_message"),

  // Organization
  category: text("category").notNull(),
  tags: jsonb("tags").notNull().default([]),

  // Usage
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),

  // Access control
  restrictedTo: jsonb("restricted_to").notNull().default([]), // Array of role IDs

  // Metadata
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_canned_responses_name").on(table.name),
  categoryIdx: index("idx_canned_responses_category").on(table.category),
  activeIdx: index("idx_canned_responses_active").on(table.isActive),
}));

// Service Level Agreements (SLA)
export const serviceLevelAgreements = pgTable("service_level_agreements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),

  // SLA criteria
  ticketCategory: ticketCategoryEnum("ticket_category").notNull(),
  priority: ticketPriorityEnum("priority").notNull(),

  // Response time targets (in hours)
  initialResponseTime: integer("initial_response_time").notNull(), // First response
  resolutionTime: integer("resolution_time").notNull(), // Complete resolution

  // Business hours
  businessHoursOnly: boolean("business_hours_only").notNull().default(true),
  businessHoursStart: text("business_hours_start").notNull().default("09:00"), // HH:MM format
  businessHoursEnd: text("business_hours_end").notNull().default("17:00"), // HH:MM format
  businessDaysOnly: boolean("business_days_only").notNull().default(true),

  // Escalation rules
  escalationRules: jsonb("escalation_rules").notNull().default([]), // Array of escalation steps

  // Status
  isActive: boolean("is_active").notNull().default(true),

  // Metadata
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_sla_name").on(table.name),
  categoryPriorityIdx: index("idx_sla_category_priority").on(table.ticketCategory, table.priority),
  activeIdx: index("idx_sla_active").on(table.isActive),
}));

// Relations
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  customer: one(customers, {
    fields: [supportTickets.customerId],
    references: [customers.id],
  }),
  assignedUser: one(user, {
    fields: [supportTickets.assignedTo],
    references: [user.id],
  }),
  escalatedToUser: one(user, {
    fields: [supportTickets.escalatedTo],
    references: [user.id],
  }),
  resolvedByUser: one(user, {
    fields: [supportTickets.resolvedBy],
    references: [user.id],
  }),
  closedByUser: one(user, {
    fields: [supportTickets.closedBy],
    references: [user.id],
  }),
  createdByUser: one(user, {
    fields: [supportTickets.createdBy],
    references: [user.id],
  }),
  messages: many(ticketMessages),
  attachments: many(ticketAttachments),
  activities: many(ticketActivities),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one, many }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
  attachments: many(ticketAttachments),
  editedByUser: one(user, {
    fields: [ticketMessages.editedBy],
    references: [user.id],
  }),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketAttachments.ticketId],
    references: [supportTickets.id],
  }),
  message: one(ticketMessages, {
    fields: [ticketAttachments.messageId],
    references: [ticketMessages.id],
  }),
  uploadedByUser: one(user, {
    fields: [ticketAttachments.uploadedBy],
    references: [user.id],
  }),
}));

export const ticketActivitiesRelations = relations(ticketActivities, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketActivities.ticketId],
    references: [supportTickets.id],
  }),
  performedByUser: one(user, {
    fields: [ticketActivities.performedBy],
    references: [user.id],
  }),
}));

export const knowledgeBaseArticlesRelations = relations(knowledgeBaseArticles, ({ one, many }) => ({
  authorUser: one(user, {
    fields: [knowledgeBaseArticles.author],
    references: [user.id],
  }),
  reviewerUser: one(user, {
    fields: [knowledgeBaseArticles.reviewer],
    references: [user.id],
  }),
  views: many(knowledgeBaseViews),
  feedback: many(knowledgeBaseFeedback),
}));

export const knowledgeBaseViewsRelations = relations(knowledgeBaseViews, ({ one }) => ({
  article: one(knowledgeBaseArticles, {
    fields: [knowledgeBaseViews.articleId],
    references: [knowledgeBaseArticles.id],
  }),
}));

export const knowledgeBaseFeedbackRelations = relations(knowledgeBaseFeedback, ({ one }) => ({
  article: one(knowledgeBaseArticles, {
    fields: [knowledgeBaseFeedback.articleId],
    references: [knowledgeBaseArticles.id],
  }),
}));

export const cannedResponsesRelations = relations(cannedResponses, ({ one }) => ({
  createdByUser: one(user, {
    fields: [cannedResponses.createdBy],
    references: [user.id],
  }),
}));

export const serviceLevelAgreementsRelations = relations(serviceLevelAgreements, ({ one }) => ({
  createdByUser: one(user, {
    fields: [serviceLevelAgreements.createdBy],
    references: [user.id],
  }),
}));