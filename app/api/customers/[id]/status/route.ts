import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, customerServiceHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// POST /api/customers/[id]/status - Update customer status
export async function POST(
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
        currentStatus: customers.status,
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validationSchemas.customerStatusUpdate.parse(body);

    const { status, reason, mikrotikProfile } = validatedData;

    // Business rule validations
    if (status === "active" && customer.currentStatus !== "prospect") {
      // Check if customer has outstanding balance
      if (customer.outstandingBalance && Number(customer.outstandingBalance) > 0) {
        return NextResponse.json(
          { error: "Cannot activate customer with outstanding balance" },
          { status: 400 }
        );
      }
    }

    if (status === "isolated" && customer.currentStatus !== "active") {
      return NextResponse.json(
        { error: "Only active customers can be isolated" },
        { status: 400 }
      );
    }

    if (status === "suspended" && customer.currentStatus !== "active") {
      return NextResponse.json(
        { error: "Only active customers can be suspended" },
        { status: 400 }
      );
    }

    if (status === "terminated" && customer.currentStatus === "terminated") {
      return NextResponse.json(
        { error: "Customer is already terminated" },
        { status: 400 }
      );
    }

    // Update customer status
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Set activation date if activating customer
    if (status === "active" && customer.currentStatus === "prospect") {
      updateData.activationDate = new Date();
    }

    // Update MikroTik profile if provided
    if (mikrotikProfile) {
      updateData.mikrotikRouterId = mikrotikProfile;
    }

    const result = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    // Create service history entry
    await db.insert(customerServiceHistory).values({
      customerId: id,
      eventType: "status_changed",
      description: `Customer status changed from ${customer.currentStatus} to ${status}${reason ? ` - ${reason}` : ""}`,
      performedBy: session.user.id,
      oldValue: {
        previousStatus: customer.currentStatus,
      },
      newValue: {
        newStatus: status,
        reason,
        mikrotikProfile,
        changedBy: session.user.email,
        changedAt: new Date(),
      },
    });

    // TODO: Integrate with MikroTik API
    // This would be where you call the MikroTik service to:
    // - Create/update PPPoE secret when activating
    // - Change profile when isolating/suspending
    // - Remove secret when terminating

    return NextResponse.json({
      data: {
        id: result[0].id,
        previousStatus: customer.currentStatus,
        newStatus: status,
        reason,
        updatedAt: result[0].updatedAt,
      },
      message: `Customer status successfully changed to ${status}`,
    });

  } catch (error) {
    console.error("Error updating customer status:", error);

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