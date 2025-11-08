// Export all schemas for the ISP Management System

// Authentication schemas (existing)
export * from "./auth";

// Core business schemas
export * from "./customers";
export * from "./billing";
export * from "./support";
export * from "./inventory";
export * from "./system";

// Import all schema files to ensure they're loaded
import * as authSchema from "./auth";
import * as customersSchema from "./customers";
import * as billingSchema from "./billing";
import * as supportSchema from "./support";
import * as inventorySchema from "./inventory";
import * as systemSchema from "./system";

// Combine all schemas for Drizzle
export const schema = {
  ...authSchema,
  ...customersSchema,
  ...billingSchema,
  ...supportSchema,
  ...inventorySchema,
  ...systemSchema,
};

// Export schema groups for easier imports
export const authSchemas = authSchema;
export const customerSchemas = customersSchema;
export const billingSchemas = billingSchema;
export const supportSchemas = supportSchema;
export const inventorySchemas = inventorySchema;
export const systemSchemas = systemSchema;