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

// Enums for inventory management
export const inventoryCategoryEnum = pgEnum("inventory_category", [
  "consumable",
  "non_consumable",
  "equipment",
  "tools",
  "materials"
]);

export const inventoryTypeEnum = pgEnum("inventory_type", [
  "fiber_cable",
  "connectors",
  "splices",
  "router",
  "ont_onu",
  "switch",
  "patch_panel",
  "testing_equipment",
  "tools",
  "cable_ties",
  "labeling_materials",
  "protection_tube",
  "other"
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "in",
  "out",
  "adjustment",
  "transfer",
  "return",
  "damage",
  "lost"
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "in_stock",
  "installed",
  "removed",
  "replaced",
  "damaged",
  "maintenance",
  "retired",
  "lost"
]);

// Inventory Items
export const inventoryItems = pgTable("inventory_items", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),

  // Classification
  category: inventoryCategoryEnum("category").notNull(),
  type: inventoryTypeEnum("type").notNull(),
  brand: text("brand"),
  model: text("model"),
  partNumber: text("part_number"),

  // Physical properties
  unit: text("unit").notNull(), // pieces, meters, boxes, kg, etc.
  weight: decimal("weight", { precision: 8, scale: 3 }), // kg
  dimensions: jsonb("dimensions"), // {length, width, height} in cm

  // Stock levels
  currentStock: integer("current_stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  maximumStock: integer("maximum_stock").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(0),
  reorderQuantity: integer("reorder_quantity").notNull().default(0),

  // Financial
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("IDR"),

  // Supplier information
  primarySupplier: text("primary_supplier"),
  alternateSuppliers: jsonb("alternate_suppliers").notNull().default([]), // Array of supplier objects
  supplierSku: text("supplier_sku"),
  leadTimeDays: integer("lead_time_days").notNull().default(7),

  // Location and storage
  location: text("location").notNull(), // Warehouse, shelf, bin, etc.
  storageRequirements: jsonb("storage_requirements"), // temperature, humidity, etc.

  // Status and lifecycle
  isActive: boolean("is_active").notNull().default(true),
  discontinued: boolean("discontinued").notNull().default(false),
  discontinuedAt: timestamp("discontinued_at"),

  // Metadata
  notes: text("notes"),
  tags: jsonb("tags").notNull().default([]),
  barcode: text("barcode"),
  qrCode: text("qr_code"),

  // Timestamps
  lastRestocked: timestamp("last_restocked"),
  lowStockAlertSent: timestamp("low_stock_alert_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  skuIdx: index("idx_inventory_sku").on(table.sku),
  nameIdx: index("idx_inventory_name").on(table.name),
  categoryIdx: index("idx_inventory_category").on(table.category),
  typeIdx: index("idx_inventory_type").on(table.type),
  activeIdx: index("idx_inventory_active").on(table.isActive),
  locationIdx: index("idx_inventory_location").on(table.location),
  supplierIdx: index("idx_inventory_supplier").on(table.primarySupplier),
}));

// Stock Movements
export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => inventoryItems.id, { onDelete: "restrict" }),

  // Movement details
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(), // Positive for in, negative for out
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }), // Cost at time of movement
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),

  // Reference and context
  referenceType: text("reference_type"), // invoice, ticket, purchase_order, etc.
  referenceId: text("reference_id"),
  referenceNumber: text("reference_number"),
  reason: text("reason").notNull(),

  // Location tracking
  fromLocation: text("from_location"),
  toLocation: text("to_location"),
  finalLocation: text("final_location"),

  // Personnel
  performedBy: text("performed_by").references(() => user.id, { onDelete: "set null" }),
  approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),

  // Additional details
  notes: text("notes"),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),
  serialNumbers: jsonb("serial_numbers").notNull().default([]), // For items with serial tracking

  // Timestamps
  movementDate: timestamp("movement_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  itemIdx: index("idx_stock_movements_item").on(table.itemId),
  typeIdx: index("idx_stock_movements_type").on(table.type),
  movementDateIdx: index("idx_stock_movements_date").on(table.movementDate),
  referenceIdx: index("idx_stock_movements_reference").on(table.referenceType, table.referenceId),
  performedByIdx: index("idx_stock_movements_performed").on(table.performedBy),
}));

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),

  // Supplier information
  supplierId: text("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierContact: text("supplier_contact"),
  supplierEmail: text("supplier_email"),
  supplierPhone: text("supplier_phone"),
  supplierAddress: text("supplier_address"),

  // Order details
  orderDate: timestamp("order_date").notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),

  // Financial
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0.00"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("IDR"),

  // Status
  status: text("status").notNull().default("draft"), // draft, sent, confirmed, partially_received, received, cancelled
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent

  // Delivery information
  shippingAddress: text("shipping_address"),
  shippingMethod: text("shipping_method"),
  trackingNumber: text("tracking_number"),

  // Notes and terms
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  paymentTerms: text("payment_terms"),
  deliveryTerms: text("delivery_terms"),

  // Personnel
  requestedBy: text("requested_by").references(() => user.id, { onDelete: "set null" }),
  approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orderNumberIdx: index("idx_purchase_orders_number").on(table.orderNumber),
  supplierIdx: index("idx_purchase_orders_supplier").on(table.supplierId),
  statusIdx: index("idx_purchase_orders_status").on(table.status),
  orderDateIdx: index("idx_purchase_orders_date").on(table.orderDate),
  requestedByIdx: index("idx_purchase_orders_requested").on(table.requestedBy),
}));

// Purchase Order Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: text("id").primaryKey(),
  purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  itemId: text("item_id").references(() => inventoryItems.id, { onDelete: "set null" }),

  // Item details at time of order
  itemDescription: text("item_description").notNull(),
  sku: text("sku"),
  supplierSku: text("supplier_sku"),

  // Quantity and pricing
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").notNull().default(0),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),

  // Status
  status: text("status").notNull().default("pending"), // pending, partially_received, received, cancelled

  // Additional details
  notes: text("notes"),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  purchaseOrderIdx: index("idx_po_items_order").on(table.purchaseOrderId),
  itemIdx: index("idx_po_items_item").on(table.itemId),
  skuIdx: index("idx_po_items_sku").on(table.sku),
  statusIdx: index("idx_po_items_status").on(table.status),
}));

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),

  // Contact information
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  website: text("website"),

  // Address
  address: text("address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  country: text("country").notNull().default("Indonesia"),

  // Business details
  taxId: text("tax_id"), // NPWP
  businessLicense: text("business_license"),
  paymentTerms: text("payment_terms"),
  deliveryTerms: text("delivery_terms"),

  // Performance
  rating: integer("rating"), // 1-5
  totalOrders: integer("total_orders").notNull().default(0),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull().default("0.00"),
  averageDeliveryTime: integer("average_delivery_time"), // days

  // Status
  isActive: boolean("is_active").notNull().default(true),
  isPreferred: boolean("is_preferred").notNull().default(false),

  // Banking
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankAccountName: text("bank_account_name"),

  // Notes
  notes: text("notes"),
  tags: jsonb("tags").notNull().default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_suppliers_name").on(table.name),
  codeIdx: index("idx_suppliers_code").on(table.code),
  activeIdx: index("idx_suppliers_active").on(table.isActive),
  preferredIdx: index("idx_suppliers_preferred").on(table.isPreferred),
  ratingIdx: index("idx_suppliers_rating").on(table.rating),
}));

// Asset Registry (for high-value items with serial numbers)
export const assetRegistry = pgTable("asset_registry", {
  id: text("id").primaryKey(),
  assetTag: text("asset_tag").notNull().unique(),
  serialNumber: text("serial_number").notNull().unique(),

  // Asset identification
  itemId: text("item_id").notNull().references(() => inventoryItems.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),

  // Financial information
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 12, scale: 2 }),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }),
  depreciationMethod: text("depreciation_method"),
  usefulLifeYears: integer("useful_life_years"),

  // Warranty and maintenance
  warrantyExpiry: timestamp("warranty_expiry"),
  warrantyProvider: text("warranty_provider"),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  maintenanceIntervalDays: integer("maintenance_interval_days"),

  // Current status
  status: assetStatusEnum("status").notNull().default("in_stock"),
  location: text("location"),
  assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),
  customerId: text("customer_id"), // If assigned to customer

  // Physical condition
  condition: text("condition"), // excellent, good, fair, poor
  conditionNotes: text("condition_notes"),
  images: jsonb("images").notNull().default([]), // Array of image URLs

  // History
  purchaseOrderId: text("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "set null" }),
  invoiceNumber: text("invoice_number"),

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  assetTagIdx: index("idx_assets_tag").on(table.assetTag),
  serialNumberIdx: index("idx_assets_serial").on(table.serialNumber),
  itemIdx: index("idx_assets_item").on(table.itemId),
  statusIdx: index("idx_assets_status").on(table.status),
  locationIdx: index("idx_assets_location").on(table.location),
  assignedToIdx: index("idx_assets_assigned").on(table.assignedTo),
  warrantyExpiryIdx: index("idx_assets_warranty").on(table.warrantyExpiry),
}));

// Asset Maintenance Records
export const assetMaintenanceRecords = pgTable("asset_maintenance_records", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assetRegistry.id, { onDelete: "cascade" }),

  // Maintenance details
  maintenanceType: text("maintenance_type").notNull(), // preventive, corrective, calibration, inspection
  description: text("description").notNull(),
  performedBy: text("performed_by").notNull(), // Internal technician or external provider

  // Dates
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),

  // Financial
  cost: decimal("cost", { precision: 12, scale: 2 }),
  partsUsed: jsonb("parts_used").notNull().default([]), // Array of {itemId, quantity, cost}

  // Results
  result: text("result"), // completed, failed, rescheduled
  findings: text("findings"),
  recommendations: text("recommendations"),
  images: jsonb("images").notNull().default([]),

  // Personnel
  technician: text("technician").references(() => user.id, { onDelete: "set null" }),
  approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  assetIdx: index("idx_asset_maintenance_asset").on(table.assetId),
  maintenanceTypeIdx: index("idx_asset_maintenance_type").on(table.maintenanceType),
  scheduledDateIdx: index("idx_asset_maintenance_scheduled").on(table.scheduledDate),
  completedDateIdx: index("idx_asset_maintenance_completed").on(table.completedDate),
  technicianIdx: index("idx_asset_maintenance_technician").on(table.technician),
}));

// Stock Alerts
export const stockAlerts = pgTable("stock_alerts", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),

  // Alert details
  alertType: text("alert_type").notNull(), // low_stock, out_of_stock, overstock, expired
  severity: text("severity").notNull(), // low, medium, high, critical
  message: text("message").notNull(),

  // Stock levels at time of alert
  currentStock: integer("current_stock").notNull(),
  minimumStock: integer("minimum_stock"),
  maximumStock: integer("maximum_stock"),

  // Status
  acknowledged: boolean("acknowledged").notNull().default(false),
  acknowledgedBy: text("acknowledged_by").references(() => user.id, { onDelete: "set null" }),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),

  // Auto-generated details
  automaticallyGenerated: boolean("automatically_generated").notNull().default(true),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),

  // Resolution
  resolutionAction: text("resolution_action"),
  resolutionNotes: text("resolution_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  itemIdx: index("idx_stock_alerts_item").on(table.itemId),
  alertTypeIdx: index("idx_stock_alerts_type").on(table.alertType),
  severityIdx: index("idx_stock_alerts_severity").on(table.severity),
  acknowledgedIdx: index("idx_stock_alerts_acknowledged").on(table.acknowledged),
  resolvedIdx: index("idx_stock_alerts_resolved").on(table.resolved),
  generatedIdx: index("idx_stock_alerts_generated").on(table.generatedAt),
}));

// Relations
export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  stockMovements: many(stockMovements),
  purchaseOrderItems: many(purchaseOrderItems),
  assets: many(assetRegistry),
  alerts: many(stockAlerts),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [stockMovements.itemId],
    references: [inventoryItems.id],
  }),
  performedByUser: one(user, {
    fields: [stockMovements.performedBy],
    references: [user.id],
  }),
  approvedByUser: one(user, {
    fields: [stockMovements.approvedBy],
    references: [user.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  items: many(purchaseOrderItems),
  requestedByUser: one(user, {
    fields: [purchaseOrders.requestedBy],
    references: [user.id],
  }),
  approvedByUser: one(user, {
    fields: [purchaseOrders.approvedBy],
    references: [user.id],
  }),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  item: one(inventoryItems, {
    fields: [purchaseOrderItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const assetRegistryRelations = relations(assetRegistry, ({ one, many }) => ({
  item: one(inventoryItems, {
    fields: [assetRegistry.itemId],
    references: [inventoryItems.id],
  }),
  assignedToUser: one(user, {
    fields: [assetRegistry.assignedTo],
    references: [user.id],
  }),
  maintenanceRecords: many(assetMaintenanceRecords),
}));

export const assetMaintenanceRecordsRelations = relations(assetMaintenanceRecords, ({ one }) => ({
  asset: one(assetRegistry, {
    fields: [assetMaintenanceRecords.assetId],
    references: [assetRegistry.id],
  }),
  technician: one(user, {
    fields: [assetMaintenanceRecords.technician],
    references: [user.id],
  }),
  approvedByUser: one(user, {
    fields: [assetMaintenanceRecords.approvedBy],
    references: [user.id],
  }),
}));

export const stockAlertsRelations = relations(stockAlerts, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [stockAlerts.itemId],
    references: [inventoryItems.id],
  }),
  acknowledgedByUser: one(user, {
    fields: [stockAlerts.acknowledgedBy],
    references: [user.id],
  }),
  resolvedByUser: one(user, {
    fields: [stockAlerts.resolvedBy],
    references: [user.id],
  }),
}));