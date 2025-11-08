import { z } from "zod";

// Common validation patterns
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Customer Management Validations
export const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  idNumber: z.string().min(16, "ID number must be at least 16 characters"),
  birthDate: z.string().datetime().optional(),

  serviceAddress: z.string().min(1, "Service address is required"),
  serviceCoordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  odpPreference: z.string().optional(),

  billingAddress: z.string().optional(),
  billingAddressSameAsService: z.boolean().default(true),

  packageId: z.string().uuid("Invalid package ID"),
  pppoeUsername: z.string().min(3, "PPPoE username must be at least 3 characters"),
  pppoePassword: z.string().min(6, "PPPoE password must be at least 6 characters"),
  mikrotikRouterId: z.string().uuid().optional(),

  outstandingBalance: z.number().min(0).default(0),
  creditLimit: z.number().positive().optional(),
  preferredPaymentMethod: z.enum([
    "virtual_account_bca", "virtual_account_bni", "virtual_account_bri", "virtual_account_mandiri",
    "gopay", "ovo", "dana", "shopeepay", "credit_card", "retail_alfamart", "retail_indomaret", "qris", "transfer"
  ]).optional(),

  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const customerStatusUpdateSchema = z.object({
  status: z.enum(["active", "isolated", "suspended", "terminated"]),
  reason: z.string().optional(),
  mikrotikProfile: z.string().optional(),
});

// Service Package Validations
export const servicePackageCreateSchema = z.object({
  name: z.string().min(1, "Package name is required").max(100),
  description: z.string().max(500).optional(),
  downloadSpeed: z.number().positive("Download speed must be positive"),
  uploadSpeed: z.number().positive("Upload speed must be positive"),
  monthlyPrice: z.number().positive("Monthly price must be positive"),
  installationFee: z.number().nonnegative("Installation fee must be non-negative"),
  fupQuota: z.number().positive("FUP quota must be positive").optional(),
  mikrotikProfile: z.string().min(1, "MikroTik profile is required"),
  contractPeriod: z.number().int().positive("Contract period must be positive").default(12),
  isActive: z.boolean().default(true),
});

export const servicePackageUpdateSchema = servicePackageCreateSchema.partial().extend({
  id: z.string().uuid(),
});

// Lead Management Validations
export const leadCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(1, "Address is required"),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  source: z.enum(["website", "phone", "referral", "walk_in", "social_media", "advertisement"]),
  preferredPackageId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  assignedTo: z.string().uuid().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["new", "survey_required", "survey_scheduled", "survey_complete", "pending_payment", "ready_for_installation", "installation_scheduled", "converted", "lost"]).optional(),
  surveyDate: z.string().datetime().optional(),
  installationDate: z.string().datetime().optional(),
  convertedToCustomerId: z.string().uuid().optional(),
  lostReason: z.string().optional(),
});

export const leadConversionSchema = z.object({
  leadId: z.string().uuid(),
  packageId: z.string().uuid(),
  installationDate: z.string().datetime(),
  notes: z.string().optional(),
});

// Billing & Invoice Validations
export const invoiceCreateSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  periodStartDate: z.string().datetime(),
  periodEndDate: z.string().datetime(),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().int().positive("Quantity must be positive"),
    unitPrice: z.number().positive("Unit price must be positive"),
    discountAmount: z.number().nonnegative().default(0),
    taxRate: z.number().min(0).max(1).default(0.11),
    servicePackageId: z.string().uuid().optional(),
    referenceType: z.string().optional(),
    referenceId: z.string().optional(),
  })).min(1, "At least one invoice item is required"),
  dueDate: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["draft", "issued", "paid", "overdue", "cancelled", "void"]).optional(),
});

export const paymentCreateSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum([
    "virtual_account_bca", "virtual_account_bni", "virtual_account_bri", "virtual_account_mandiri",
    "gopay", "ovo", "dana", "shopeepay", "credit_card", "retail_alfamart", "retail_indomaret", "qris", "bank_transfer", "cash"
  ]),
  gateway: z.enum(["xendit", "midtrans", "manual"]).default("manual"),
  payerName: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Support Ticket Validations
export const ticketCreateSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(1, "Customer name is required").max(100),
  customerEmail: z.string().email("Invalid email address").optional(),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits").optional(),

  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  category: z.enum([
    "connection_issue", "billing_issue", "package_change", "technical_support",
    "installation_appointment", "service_complaint", "account_management",
    "equipment_issue", "network_outage", "general_inquiry"
  ]),
  priority: z.enum(["low", "normal", "high", "urgent", "critical"]).default("normal"),
  source: z.enum(["customer_portal", "phone", "email", "whatsapp", "telegram", "walk_in", "social_media", "internal"]).default("customer_portal"),

  serviceAddress: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),

  assignedTo: z.string().uuid().optional(),
  assignedTeam: z.string().optional(),
});

export const ticketUpdateSchema = ticketCreateSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "pending_customer", "pending_technician", "resolved", "closed", "reopened"]).optional(),
  assignedTo: z.string().uuid().optional(),
  escalated: z.boolean().optional(),
  escalatedTo: z.string().uuid().optional(),
  escalationReason: z.string().optional(),
  resolution: z.string().optional(),
  resolutionCategory: z.string().optional(),
  satisfactionRating: z.number().int().min(1).max(5).optional(),
  satisfactionComment: z.string().max(1000).optional(),
});

export const ticketMessageCreateSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  message: z.string().min(1, "Message is required").max(5000),
  messageType: z.enum(["customer_response", "staff_response", "system_note", "internal_note"]).default("staff_response"),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.object({
    filename: z.string(),
    originalFilename: z.string(),
    mimeType: z.string(),
    fileSize: z.number().int().positive(),
    url: z.string().url().optional(),
  })).optional(),
});

// Inventory Management Validations
export const inventoryItemCreateSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(["consumable", "non_consumable", "equipment", "tools", "materials"]),
  type: z.enum([
    "fiber_cable", "connectors", "splices", "router", "ont_onu", "switch",
    "patch_panel", "testing_equipment", "tools", "cable_ties",
    "labeling_materials", "protection_tube", "other"
  ]),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  partNumber: z.string().max(100).optional(),
  unit: z.string().min(1, "Unit is required"),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  currentStock: z.number().int().nonnegative().default(0),
  minimumStock: z.number().int().nonnegative().default(0),
  maximumStock: z.number().int().positive().default(100),
  reorderPoint: z.number().int().nonnegative().default(10),
  reorderQuantity: z.number().int().positive().default(50),
  unitCost: z.number().positive("Unit cost must be positive"),
  sellingPrice: z.number().positive().optional(),
  primarySupplier: z.string().max(200).optional(),
  leadTimeDays: z.number().int().positive().default(7),
  location: z.string().min(1, "Location is required"),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).default([]),
});

export const inventoryItemUpdateSchema = inventoryItemCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const stockMovementCreateSchema = z.object({
  itemId: z.string().uuid("Invalid item ID"),
  type: z.enum(["in", "out", "adjustment", "transfer", "return", "damage", "lost"]),
  quantity: z.number().int("Quantity must be integer"),
  unitCost: z.number().positive().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  referenceNumber: z.string().optional(),
  reason: z.string().min(1, "Reason is required").max(500),
  fromLocation: z.string().optional(),
  toLocation: z.string().optional(),
  notes: z.string().max(1000).optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  serialNumbers: z.array(z.string()).default([]),
});

export const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID"),
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierContact: z.string().optional(),
  supplierEmail: z.string().email("Invalid email address").optional(),
  supplierPhone: z.string().optional(),
  supplierAddress: z.string().optional(),
  orderDate: z.string().datetime(),
  expectedDeliveryDate: z.string().datetime(),
  items: z.array(z.object({
    itemDescription: z.string().min(1, "Item description is required"),
    sku: z.string().optional(),
    supplierSku: z.string().optional(),
    quantityOrdered: z.number().int().positive("Quantity must be positive"),
    unitPrice: z.number().positive("Unit price must be positive"),
    notes: z.string().optional(),
  })).min(1, "At least one item is required"),
  shippingAddress: z.string().optional(),
  shippingMethod: z.string().optional(),
  notes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
});

// System Configuration Validations
export const systemConfigCreateSchema = z.object({
  category: z.enum(["general", "mikrotik", "payment_gateway", "notifications", "email", "security", "backup", "integration"]),
  key: z.string().min(1, "Key is required").max(100),
  value: z.string().min(1, "Value is required"),
  description: z.string().max(500).optional(),
  valueType: z.enum(["string", "number", "boolean", "json", "secret"]),
  validationRules: z.record(z.any()).optional(),
  defaultValue: z.string().optional(),
  isPublic: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  requiresRestart: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const systemConfigUpdateSchema = systemConfigCreateSchema.partial().extend({
  id: z.string().uuid(),
});

// MikroTik Router Validations
export const mikrotikRouterCreateSchema = z.object({
  name: z.string().min(1, "Router name is required").max(100),
  description: z.string().max(500).optional(),
  ipAddress: z.string().ip("Invalid IP address"),
  port: z.number().int().positive("Port must be positive").default(8728),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  apiPath: z.string().min(1, "API path is required").default("/rest"),
  useSSL: z.boolean().default(false),
  verifyCertificate: z.boolean().default(true),
  physicalLocation: z.string().optional(),
  rackPosition: z.string().optional(),
  datacenter: z.string().optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).default([]),
  managedBy: z.string().uuid().optional(),
});

export const mikrotikRouterUpdateSchema = mikrotikRouterCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const mikrotikRouterTestSchema = z.object({
  routerId: z.string().uuid("Invalid router ID"),
});

// Notification Validations
export const notificationCreateSchema = z.object({
  type: z.enum(["email", "sms", "whatsapp", "telegram", "push", "webhook", "in_app"]),
  category: z.enum(["billing", "support", "system", "marketing", "security", "operational"]),
  userId: z.string().uuid().optional(),
  customerId: z.string().optional(),
  emailAddress: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().optional(),
  webhookUrl: z.string().url("Invalid webhook URL").optional(),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required").max(10000),
  htmlMessage: z.string().optional(),
  template: z.string().optional(),
  templateData: z.record(z.any()).default({}),
  scheduledFor: z.string().datetime().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  context: z.record(z.any()).default({}),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
});

// API Request Types
export const customerListRequestSchema = paginationSchema.extend({
  status: z.enum(["active", "isolated", "suspended", "terminated", "prospect"]).optional(),
  packageId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
  ...dateRangeSchema.shape,
});

export const ticketListRequestSchema = paginationSchema.extend({
  status: z.enum(["open", "in_progress", "pending_customer", "pending_technician", "resolved", "closed", "reopened"]).optional(),
  category: z.enum([
    "connection_issue", "billing_issue", "package_change", "technical_support",
    "installation_appointment", "service_complaint", "account_management",
    "equipment_issue", "network_outage", "general_inquiry"
  ]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent", "critical"]).optional(),
  assignedTo: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  ...dateRangeSchema.shape,
});

export const invoiceListRequestSchema = paginationSchema.extend({
  status: z.enum(["draft", "issued", "paid", "overdue", "cancelled", "void"]).optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  ...dateRangeSchema.shape,
});

export const inventoryListRequestSchema = paginationSchema.extend({
  category: z.enum(["consumable", "non_consumable", "equipment", "tools", "materials"]).optional(),
  type: z.enum([
    "fiber_cable", "connectors", "splices", "router", "ont_onu", "switch",
    "patch_panel", "testing_equipment", "tools", "cable_ties",
    "labeling_materials", "protection_tube", "other"
  ]).optional(),
  location: z.string().optional(),
  lowStock: z.boolean().optional(),
  search: z.string().optional(),
});

// Export all schemas
export const validationSchemas = {
  // Pagination and common
  pagination: paginationSchema,
  dateRange: dateRangeSchema,

  // Customer management
  customerCreate: customerCreateSchema,
  customerUpdate: customerUpdateSchema,
  customerStatusUpdate: customerStatusUpdateSchema,
  customerList: customerListRequestSchema,

  // Service packages
  servicePackageCreate: servicePackageCreateSchema,
  servicePackageUpdate: servicePackageUpdateSchema,

  // Lead management
  leadCreate: leadCreateSchema,
  leadUpdate: leadUpdateSchema,
  leadConversion: leadConversionSchema,

  // Billing
  invoiceCreate: invoiceCreateSchema,
  invoiceUpdate: invoiceUpdateSchema,
  invoiceList: invoiceListRequestSchema,
  paymentCreate: paymentCreateSchema,

  // Support
  ticketCreate: ticketCreateSchema,
  ticketUpdate: ticketUpdateSchema,
  ticketMessageCreate: ticketMessageCreateSchema,
  ticketList: ticketListRequestSchema,

  // Inventory
  inventoryItemCreate: inventoryItemCreateSchema,
  inventoryItemUpdate: inventoryItemUpdateSchema,
  inventoryList: inventoryListRequestSchema,
  stockMovementCreate: stockMovementCreateSchema,
  purchaseOrderCreate: purchaseOrderCreateSchema,

  // System
  systemConfigCreate: systemConfigCreateSchema,
  systemConfigUpdate: systemConfigUpdateSchema,
  mikrotikRouterCreate: mikrotikRouterCreateSchema,
  mikrotikRouterUpdate: mikrotikRouterUpdateSchema,
  mikrotikRouterTest: mikrotikRouterTestSchema,
  notificationCreate: notificationCreateSchema,
};

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerListRequest = z.infer<typeof customerListRequestSchema>;
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type InventoryItemCreateInput = z.infer<typeof inventoryItemCreateSchema>;
export type NotificationCreateInput = z.infer<typeof notificationCreateInput>;