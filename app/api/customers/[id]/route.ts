import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, servicePackages, customerServiceHistory, customerAssets } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// GET /api/customers/[id] - Get customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get customer with related data
    const customer = await db
      .select({
        // Customer basic info
        id: customers.id,
        customerNumber: customers.customerNumber,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        idNumber: customers.idNumber,
        birthDate: customers.birthDate,

        // Address info
        serviceAddress: customers.serviceAddress,
        serviceCoordinates: customers.serviceCoordinates,
        odpPreference: customers.odpPreference,
        billingAddress: customers.billingAddress,
        billingAddressSameAsService: customers.billingAddressSameAsService,

        // Service info
        packageId: customers.packageId,
        packageName: servicePackages.name,
        packageDescription: servicePackages.description,
        downloadSpeed: servicePackages.downloadSpeed,
        uploadSpeed: servicePackages.uploadSpeed,
        monthlyPrice: servicePackages.monthlyPrice,
        activationDate: customers.activationDate,
        pppoeUsername: customers.pppoeUsername,
        mikrotikRouterId: customers.mikrotikRouterId,
        status: customers.status,

        // Financial info
        outstandingBalance: customers.outstandingBalance,
        creditLimit: customers.creditLimit,
        preferredPaymentMethod: customers.preferredPaymentMethod,

        // Metadata
        assignedTo: customers.assignedTo,
        notes: customers.notes,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .leftJoin(servicePackages, eq(customers.packageId, servicePackages.id))
      .where(eq(customers.id, id))
      .limit(1);

    if (customer.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get customer assets
    const assets = await db
      .select({
        id: customerAssets.id,
        assetType: customerAssets.assetType,
        serialNumber: customerAssets.serialNumber,
        brand: customerAssets.brand,
        model: customerAssets.model,
        status: customerAssets.status,
        installationDate: customerAssets.installationDate,
        monthlyRentalFee: customerAssets.monthlyRentalFee,
      })
      .from(customerAssets)
      .where(and(
        eq(customerAssets.customerId, id),
        isNull(customerAssets.removedAt) // Only active assets
      ));

    // Get recent service history (last 10 entries)
    const serviceHistory = await db
      .select({
        id: customerServiceHistory.id,
        eventType: customerServiceHistory.eventType,
        description: customerServiceHistory.description,
        performedBy: customerServiceHistory.performedBy,
        performedAt: customerServiceHistory.performedAt,
        newValue: customerServiceHistory.newValue,
      })
      .from(customerServiceHistory)
      .where(eq(customerServiceHistory.customerId, id))
      .orderBy(customerServiceHistory.performedAt)
      .limit(10);

    return NextResponse.json({
      data: {
        ...customer[0],
        assets,
        recentServiceHistory: serviceHistory,
      },
    });

  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if customer exists
    const existingCustomer = await db
      .select({
        id: customers.id,
        email: customers.email,
        pppoeUsername: customers.pppoeUsername,
      })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (existingCustomer.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validationSchemas.customerUpdate.parse(body);

    // Check if email is being changed and if new email already exists
    if (validatedData.email && validatedData.email !== existingCustomer[0].email) {
      const emailExists = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(
          eq(customers.email, validatedData.email),
          // Exclude current customer from check
          sql`${customers.id} != ${id}`
        ))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 }
        );
      }
    }

    // Check if PPPoE username is being changed and if new username already exists
    if (validatedData.pppoeUsername && validatedData.pppoeUsername !== existingCustomer[0].pppoeUsername) {
      const usernameExists = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(
          eq(customers.pppoeUsername, validatedData.pppoeUsername),
          sql`${customers.id} != ${id}`
        ))
        .limit(1);

      if (usernameExists.length > 0) {
        return NextResponse.json(
          { error: "PPPoE username already exists" },
          { status: 409 }
        );
      }
    }

    // Handle billing address
    let updateData = { ...validatedData };
    if (validatedData.billingAddressSameAsService !== undefined) {
      if (validatedData.billingAddressSameAsService) {
        updateData.billingAddress = validatedData.serviceAddress;
      } else if (!validatedData.billingAddress) {
        // If switching to different billing address but no new address provided, keep existing
        delete updateData.billingAddress;
      }
    }

    // Update customer
    const result = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    // Create service history entry for significant changes
    const significantFields = [
      "packageId", "status", "outstandingBalance", "pppoeUsername", "assignedTo"
    ];

    const changedFields = Object.keys(updateData).filter(
      key => significantFields.includes(key)
    );

    if (changedFields.length > 0) {
      await db.insert(customerServiceHistory).values({
        customerId: id,
        eventType: "customer_updated",
        description: `Customer updated: ${changedFields.join(", ")}`,
        performedBy: session.user.id,
        newValue: updateData,
        oldValue: existingCustomer[0],
      });
    }

    // Return updated customer with related data
    const updatedCustomer = await db
      .select({
        id: customers.id,
        customerNumber: customers.customerNumber,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        status: customers.status,
        packageId: customers.packageId,
        packageName: servicePackages.name,
        activationDate: customers.activationDate,
        outstandingBalance: customers.outstandingBalance,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .leftJoin(servicePackages, eq(customers.packageId, servicePackages.id))
      .where(eq(customers.id, id))
      .limit(1);

    return NextResponse.json({
      data: updatedCustomer[0],
      message: "Customer updated successfully",
    });

  } catch (error) {
    console.error("Error updating customer:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete customer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if customer exists
    const existingCustomer = await db
      .select({
        id: customers.id,
        name: customers.name,
        status: customers.status,
        outstandingBalance: customers.outstandingBalance,
      })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (existingCustomer.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = existingCustomer[0];

    // Business rules: cannot delete customer with outstanding balance or active status
    if (customer.outstandingBalance && Number(customer.outstandingBalance) > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with outstanding balance" },
        { status: 400 }
      );
    }

    if (customer.status === "active") {
      return NextResponse.json(
        { error: "Cannot delete active customer. Please terminate service first." },
        { status: 400 }
      );
    }

    // Soft delete by updating status to terminated
    await db
      .update(customers)
      .set({
        status: "terminated",
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    // Create service history entry
    await db.insert(customerServiceHistory).values({
      customerId: id,
      eventType: "customer_deleted",
      description: `Customer ${customer.name} was terminated`,
      performedBy: session.user.id,
      newValue: {
        status: "terminated",
        terminatedBy: session.user.email,
        terminatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Customer terminated successfully",
    });

  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}