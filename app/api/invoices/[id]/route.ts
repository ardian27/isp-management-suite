import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, servicePackages, payments } from "@/db/schema";
import { eq, and, sum } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// GET /api/invoices/[id] - Get invoice by ID
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

    // Get invoice with related data
    const invoice = await db
      .select({
        // Invoice basic info
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        status: invoices.status,
        periodStartDate: invoices.periodStartDate,
        periodEndDate: invoices.periodEndDate,
        items: invoices.items,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        discountAmount: invoices.discountAmount,
        total: invoices.total,
        dueDate: invoices.dueDate,
        issuedAt: invoices.issuedAt,
        paidAt: invoices.paidAt,
        cancelledAt: invoices.cancelledAt,
        notes: invoices.notes,
        internalNotes: invoices.internalNotes,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,

        // Customer info
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        customerAddress: customers.serviceAddress,
        customerNumber: customers.customerNumber,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (invoice.length === 0) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Get invoice items with service package details
    const itemsWithDetails = await db
      .select({
        id: invoiceItems.id,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        discountAmount: invoiceItems.discountAmount,
        taxRate: invoiceItems.taxRate,
        total: invoiceItems.total,
        servicePackageId: invoiceItems.servicePackageId,
        serviceName: servicePackages.name,
        serviceDescription: servicePackages.description,
        referenceType: invoiceItems.referenceType,
        referenceId: invoiceItems.referenceId,
      })
      .from(invoiceItems)
      .leftJoin(servicePackages, eq(invoiceItems.servicePackageId, servicePackages.id))
      .where(eq(invoiceItems.invoiceId, id));

    // Get payment history
    const paymentHistory = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        method: payments.method,
        gateway: payments.gateway,
        status: payments.status,
        initiatedAt: payments.initiatedAt,
        confirmedAt: payments.confirmedAt,
        gatewayReference: payments.gatewayReference,
        notes: payments.notes,
      })
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(payments.initiatedAt);

    // Calculate total paid amount
    const totalPaidResult = await db
      .select({ total: sum(payments.amount).mapWith(Number) })
      .from(payments)
      .where(and(
        eq(payments.invoiceId, id),
        eq(payments.status, "success")
      ));

    const totalPaid = totalPaidResult[0]?.total || 0;
    const totalDue = Number(invoice[0].total) - totalPaid;

    return NextResponse.json({
      data: {
        ...invoice[0],
        items: itemsWithDetails,
        paymentHistory,
        totalPaid,
        totalDue,
        isOverdue: new Date() > new Date(invoice[0].dueDate) && invoice[0].status !== "paid",
      },
    });

  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update invoice
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

    // Check if invoice exists
    const existingInvoice = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        issuedAt: invoices.issuedAt,
      })
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (existingInvoice.length === 0) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const invoice = existingInvoice[0];

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validationSchemas.invoiceUpdate.parse(body);

    // Business rules: cannot update issued or paid invoices
    if (invoice.status === "issued" && !validatedData.status) {
      return NextResponse.json(
        { error: "Cannot update issued invoice. Only status changes are allowed." },
        { status: 400 }
      );
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot update paid invoice" },
        { status: 400 }
      );
    }

    // Handle status changes
    if (validatedData.status) {
      const { status } = validatedData;

      if (status === "issued") {
        validatedData.issuedAt = new Date();
      } else if (status === "paid") {
        validatedData.paidAt = new Date();
      } else if (status === "cancelled") {
        validatedData.cancelledAt = new Date();
      }
    }

    // Update invoice
    const result = await db
      .update(invoices)
      .set(validatedData)
      .where(eq(invoices.id, id))
      .returning();

    // Return updated invoice
    const updatedInvoice = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: customers.name,
        status: invoices.status,
        total: invoices.total,
        dueDate: invoices.dueDate,
        issuedAt: invoices.issuedAt,
        paidAt: invoices.paidAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, id))
      .limit(1);

    return NextResponse.json({
      data: updatedInvoice[0],
      message: "Invoice updated successfully",
    });

  } catch (error) {
    console.error("Error updating invoice:", error);

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

// DELETE /api/invoices/[id] - Delete invoice
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

    // Check if invoice exists
    const existingInvoice = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (existingInvoice.length === 0) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const invoice = existingInvoice[0];

    // Business rules: cannot delete issued or paid invoices
    if (invoice.status === "issued") {
      return NextResponse.json(
        { error: "Cannot delete issued invoice. Please cancel it first." },
        { status: 400 }
      );
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot delete paid invoice" },
        { status: 400 }
      );
    }

    // Check if there are any payments
    const paymentCount = await db
      .select({ count: sql`count(*)` })
      .from(payments)
      .where(eq(payments.invoiceId, id));

    if (Number(paymentCount[0]?.count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete invoice with existing payments" },
        { status: 400 }
      );
    }

    // Delete invoice items first
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    // Delete invoice
    await db.delete(invoices).where(eq(invoices.id, id));

    return NextResponse.json({
      message: `Invoice ${invoice.invoiceNumber} deleted successfully`,
    });

  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}