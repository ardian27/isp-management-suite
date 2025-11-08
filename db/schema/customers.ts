import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  pgEnum,
  jsonb,
  primaryKey,
  index,
  sql
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Enums for customer management
export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "isolated",
  "suspended",
  "terminated",
  "prospect"
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
  "transfer"
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "survey_required",
  "survey_scheduled",
  "survey_complete",
  "pending_payment",
  "ready_for_installation",
  "installation_scheduled",
  "converted",
  "lost"
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "website",
  "phone",
  "referral",
  "walk_in",
  "social_media",
  "advertisement"
]);

// Service Packages Table
export const servicePackages = pgTable("service_packages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  downloadSpeed: integer("download_speed").notNull(), // Mbps
  uploadSpeed: integer("upload_speed").notNull(), // Mbps
  monthlyPrice: decimal("monthly_price", { precision: 12, scale: 2 }).notNull(),
  installationFee: decimal("installation_fee", { precision: 12, scale: 2 }).notNull(),
  fupQuota: integer("fup_quota"), // GB, null for unlimited
  mikrotikProfile: text("mikrotik_profile").notNull(),
  contractPeriod: integer("contract_period").notNull().default(12), // months
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_service_packages_name").on(table.name),
  activeIdx: index("idx_service_packages_active").on(table.isActive),
}));

// Customers Table
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  customerNumber: text("customer_number").notNull().unique(),

  // Personal Information
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  idNumber: text("id_number").notNull(), // KTP/NIK
  birthDate: timestamp("birth_date"),

  // Service Address
  serviceAddress: text("service_address").notNull(),
  serviceCoordinates: jsonb("service_coordinates"), // {lat, lng}
  odpPreference: text("odp_preference"),

  // Billing Address
  billingAddress: text("billing_address"),
  billingAddressSameAsService: boolean("billing_address_same_as_service").notNull().default(true),

  // Service Information
  packageId: text("package_id").references(() => servicePackages.id, { onDelete: "restrict" }),
  activationDate: timestamp("activation_date"),
  pppoeUsername: text("pppoe_username").unique(),
  pppoePassword: text("pppoe_password"),
  mikrotikRouterId: text("mikrotik_router_id"),
  status: customerStatusEnum("status").notNull().default("prospect"),

  // Financial Information
  outstandingBalance: decimal("outstanding_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
  preferredPaymentMethod: paymentMethodEnum("preferred_payment_method"),

  // Metadata
  assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerNumberIdx: index("idx_customers_customer_number").on(table.customerNumber),
  emailIdx: index("idx_customers_email").on(table.email),
  phoneIdx: index("idx_customers_phone").on(table.phone),
  statusIdx: index("idx_customers_status").on(table.status),
  packageIdx: index("idx_customers_package").on(table.packageId),
  pppoeIdx: index("idx_customers_pppoe").on(table.pppoeUsername),
}));

// Customer Service History
export const customerServiceHistory = pgTable("customer_service_history", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),

  eventType: text("event_type").notNull(), // package_change, suspension, reactivation, payment, etc.
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  description: text("description").notNull(),

  performedBy: text("performed_by").references(() => user.id, { onDelete: "set null" }),
  performedAt: timestamp("performed_at").defaultNow().notNull(),

  // References to related records
  invoiceId: text("invoice_id"),
  ticketId: text("ticket_id"),
  paymentId: text("payment_id"),
}, (table) => ({
  customerIdx: index("idx_service_history_customer").on(table.customerId),
  eventIdx: index("idx_service_history_event").on(table.eventType),
  performedAtIdx: index("idx_service_history_performed_at").on(table.performedAt),
}));

// PPPoE Status Tracking
export const pppoeStatus = pgTable("pppoe_status", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().unique().references(() => customers.id, { onDelete: "cascade" }),

  online: boolean("online").notNull().default(false),
  ipAddress: text("ip_address"),
  uptime: integer("uptime"), // seconds
  lastSeen: timestamp("last_seen"),

  // Data Usage
  sessionDownloadBytes: integer("session_download_bytes").default(0),
  sessionUploadBytes: integer("session_upload_bytes").default(0),
  monthlyDownloadBytes: integer("monthly_download_bytes").default(0),
  monthlyUploadBytes: integer("monthly_upload_bytes").default(0),

  // Quality metrics
  connectionQuality: text("connection_quality"), // excellent, good, fair, poor
  signalStrength: integer("signal_strength"), // dBm

  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("idx_pppoe_customer").on(table.customerId),
  onlineIdx: index("idx_pppoe_online").on(table.online),
  lastUpdatedIdx: index("idx_pppoe_last_updated").on(table.lastUpdated),
}));

// Quota Management
export const quotaManagement = pgTable("quota_management", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().unique().references(() => customers.id, { onDelete: "cascade" }),

  packageQuota: integer("package_quota"), // GB per month, null for unlimited
  usedQuota: integer("used_quota").notNull().default(0), // GB in current cycle
  resetDay: integer("reset_day").notNull().default(1), // Day of month (1-31)

  // Speed reduction settings
  speedReductionEnabled: boolean("speed_reduction_enabled").notNull().default(true),
  reducedSpeed: integer("reduced_speed"), // Mbps after quota exceeded

  // Warning settings
  warning80Percent: boolean("warning_80_percent").notNull().default(true),
  warning90Percent: boolean("warning_90_percent").notNull().default(true),
  warning100Percent: boolean("warning_100_percent").notNull().default(true),

  lastReset: timestamp("last_reset").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("idx_quota_customer").on(table.customerId),
  resetDayIdx: index("idx_quota_reset_day").on(table.resetDay),
}));

// CRM Leads Table
export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  coordinates: jsonb("coordinates"), // {lat, lng}

  status: leadStatusEnum("status").notNull().default("new"),
  source: leadSourceEnum("source").notNull(),

  // Assignment and scheduling
  assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
  surveyDate: timestamp("survey_date"),
  installationDate: timestamp("installation_date"),

  // Package preferences
  preferredPackageId: text("preferred_package_id").references(() => servicePackages.id, { onDelete: "set null" }),

  // Communication and notes
  notes: text("notes"),
  lastContactDate: timestamp("last_contact_date"),

  // Conversion tracking
  convertedToCustomerId: text("converted_to_customer_id").references(() => customers.id, { onDelete: "set null" }),
  conversionDate: timestamp("conversion_date"),
  lostReason: text("lost_reason"),

  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("idx_leads_status").on(table.status),
  assignedToIdx: index("idx_leads_assigned_to").on(table.assignedTo),
  sourceIdx: index("idx_leads_source").on(table.source),
  emailIdx: index("idx_leads_email").on(table.email),
  phoneIdx: index("idx_leads_phone").on(table.phone),
  conversionIdx: index("idx_leads_conversion").on(table.convertedToCustomerId),
}));

// ODP (Optical Distribution Point) Management
export const odps = pgTable("odps", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  coordinates: jsonb("coordinates").notNull(), // {lat, lng}
  address: text("address").notNull(),

  // Port information
  totalPorts: integer("total_ports").notNull(),
  usedPorts: integer("used_ports").notNull().default(0),
  availablePorts: integer("available_ports").generatedAlwaysAs(
    () => sql`total_ports - used_ports`
  ),

  status: text("status").notNull().default("active"), // active, maintenance, full, decommissioned
  installationDate: timestamp("installation_date").notNull(),
  technician: text("technician").references(() => user.id, { onDelete: "set null" }),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_odps_name").on(table.name),
  statusIdx: index("idx_odps_status").on(table.status),
  locationIdx: index("idx_odps_location").on(table.coordinates),
}));

// Coverage Areas
export const coverageAreas = pgTable("coverage_areas", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  boundaries: jsonb("boundaries").notNull(), // Array of {lat, lng} coordinates forming polygon
  status: text("status").notNull().default("planned"), // covered, planned, uncovered

  estimatedCompletion: timestamp("estimated_completion"),
  projectManager: text("project_manager").references(() => user.id, { onDelete: "set null" }),

  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_coverage_areas_name").on(table.name),
  statusIdx: index("idx_coverage_areas_status").on(table.status),
}));

// Customer Assets
export const customerAssets = pgTable("customer_assets", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),

  assetType: text("asset_type").notNull(), // router, ont, cable, other
  serialNumber: text("serial_number").notNull(),
  brand: text("brand"),
  model: text("model"),

  purchaseDate: timestamp("purchase_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  installationDate: timestamp("installation_date"),

  status: text("status").notNull().default("installed"), // installed, removed, replaced, damaged

  // Financial
  purchaseCost: decimal("purchase_cost", { precision: 12, scale: 2 }),
  monthlyRentalFee: decimal("monthly_rental_fee", { precision: 12, scale: 2 }),

  notes: text("notes"),
  installedBy: text("installed_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerIdx: index("idx_assets_customer").on(table.customerId),
  serialIdx: index("idx_assets_serial").on(table.serialNumber),
  typeIdx: index("idx_assets_type").on(table.assetType),
  statusIdx: index("idx_assets_status").on(table.status),
}));

// Relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  servicePackage: one(servicePackages, {
    fields: [customers.packageId],
    references: [servicePackages.id],
  }),
  serviceHistory: many(customerServiceHistory),
  pppoeStatus: one(pppoeStatus, {
    fields: [customers.id],
    references: [pppoeStatus.customerId],
  }),
  quotaManagement: one(quotaManagement, {
    fields: [customers.id],
    references: [quotaManagement.customerId],
  }),
  assets: many(customerAssets),
  assignedUser: one(user, {
    fields: [customers.assignedTo],
    references: [user.id],
  }),
}));

export const servicePackagesRelations = relations(servicePackages, ({ many }) => ({
  customers: many(customers),
  leads: many(leads),
}));

export const customerServiceHistoryRelations = relations(customerServiceHistory, ({ one }) => ({
  customer: one(customers, {
    fields: [customerServiceHistory.customerId],
    references: [customers.id],
  }),
  performedByUser: one(user, {
    fields: [customerServiceHistory.performedBy],
    references: [user.id],
  }),
}));

export const pppoeStatusRelations = relations(pppoeStatus, ({ one }) => ({
  customer: one(customers, {
    fields: [pppoeStatus.customerId],
    references: [customers.id],
  }),
}));

export const quotaManagementRelations = relations(quotaManagement, ({ one }) => ({
  customer: one(customers, {
    fields: [quotaManagement.customerId],
    references: [customers.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  assignedUser: one(user, {
    fields: [leads.assignedTo],
    references: [user.id],
  }),
  preferredPackage: one(servicePackages, {
    fields: [leads.preferredPackageId],
    references: [servicePackages.id],
  }),
  convertedCustomer: one(customers, {
    fields: [leads.convertedToCustomerId],
    references: [customers.id],
  }),
  createdByUser: one(user, {
    fields: [leads.createdBy],
    references: [user.id],
  }),
}));

export const odpsRelations = relations(odps, ({ one }) => ({
  technician: one(user, {
    fields: [odps.technician],
    references: [user.id],
  }),
}));

export const coverageAreasRelations = relations(coverageAreas, ({ one }) => ({
  projectManager: one(user, {
    fields: [coverageAreas.projectManager],
    references: [user.id],
  }),
}));

export const customerAssetsRelations = relations(customerAssets, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAssets.customerId],
    references: [customers.id],
  }),
  installedByUser: one(user, {
    fields: [customerAssets.installedBy],
    references: [user.id],
  }),
}));