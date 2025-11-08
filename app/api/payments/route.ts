import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, invoices, customers, paymentWebhookEvents } from "@/db/schema";
import { eq, and, desc, like, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// GET /api/payments - List payments with pagination and filtering
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      method: searchParams.get("method"),
      gateway: searchParams.get("gateway"),
      customerId: searchParams.get("customerId"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    };

    // Apply basic validation (using pagination schema as base)
    const validatedQuery = {
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      search: queryParams.search,
      status: queryParams.status,
      method: queryParams.method,
      gateway: queryParams.gateway,
      customerId: queryParams.customerId,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder || "desc",
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
    };

    const { page, limit, search, status, method, gateway, customerId, sortBy, sortOrder, startDate, endDate } = validatedQuery;

    // Build the base query
    const baseQuery = db
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        customerId: payments.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        amount: payments.amount,
        method: payments.method,
        gateway: payments.gateway,
        status: payments.status,
        initiatedAt: payments.initiatedAt,
        confirmedAt: payments.confirmedAt,
        gatewayReference: payments.gatewayReference,
        gatewayFee: payments.gatewayFee,
        netAmount: payments.netAmount,
        notes: payments.notes,
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .where(
        and(
          status ? eq(payments.status, status) : undefined,
          method ? eq(payments.method, method) : undefined,
          gateway ? eq(payments.gateway, gateway) : undefined,
          customerId ? eq(payments.customerId, customerId) : undefined,
          search ? or(
            like(payments.gatewayReference, `%${search}%`),
            like(invoices.invoiceNumber, `%${search}%`),
            like(customers.name, `%${search}%`),
            like(customers.email, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${payments.initiatedAt} >= ${startDate} AND ${payments.initiatedAt} <= ${endDate}` : undefined
        )
      );

    // Add sorting
    const orderByColumn = sortBy === "amount" ? payments.amount :
                         sortBy === "status" ? payments.status :
                         sortBy === "method" ? payments.method :
                         sortBy === "invoiceNumber" ? invoices.invoiceNumber :
                         sortBy === "customerName" ? customers.name :
                         sortBy === "confirmedAt" ? payments.confirmedAt :
                         payments.initiatedAt;

    const sortedQuery = baseQuery.orderBy(
      sortOrder === "asc" ? sql`${orderByColumn} ASC` : sql`${orderByColumn} DESC`
    );

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .where(
        and(
          status ? eq(payments.status, status) : undefined,
          method ? eq(payments.method, method) : undefined,
          gateway ? eq(payments.gateway, gateway) : undefined,
          customerId ? eq(payments.customerId, customerId) : undefined,
          search ? or(
            like(payments.gatewayReference, `%${search}%`),
            like(invoices.invoiceNumber, `%${search}%`),
            like(customers.name, `%${search}%`),
            like(customers.email, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${payments.initiatedAt} >= ${startDate} AND ${payments.initiatedAt} <= ${endDate}` : undefined
        )
      );

    const totalCount = totalCountResult[0]?.count || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const result = await sortedQuery.limit(limit).offset(offset);

    // Get summary statistics
    const summaryResult = await db
      .select({
        totalPayments: count(payments.id),
        totalAmount: sql`SUM(CASE WHEN ${payments.status} = 'success' THEN ${payments.amount} ELSE 0 END)`.mapWith(Number),
        successPayments: count(sql`${payments.status} = 'success'`),
        pendingPayments: count(sql`${payments.status} = 'pending'`),
        failedPayments: count(sql`${payments.status} = 'failed'`),
      })
      .from(payments)
      .where(
        and(
          startDate && endDate ? sql`${payments.initiatedAt} >= ${startDate} AND ${payments.initiatedAt} <= ${endDate}` : undefined
        )
      );

    const summary = summaryResult[0] || {
      totalPayments: 0,
      totalAmount: 0,
      successPayments: 0,
      pendingPayments: 0,
      failedPayments: 0,
    };

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      summary,
    });

  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create a new payment
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validationSchemas.paymentCreate.parse(body);

    const { invoiceId, amount, method, gateway, ...paymentData } = validatedData;

    // Check if invoice exists and is payable
    const invoice = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        status: invoices.status,
        total: invoices.total,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (invoice.length === 0) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const invoiceData = invoice[0];

    if (invoiceData.status === "paid") {
      return NextResponse.json(
        { error: "Invoice is already paid" },
        { status: 400 }
      );
    }

    if (invoiceData.status !== "issued") {
      return NextResponse.json(
        { error: "Invoice must be issued before payment can be made" },
        { status: 400 }
      );
    }

    // Check payment amount
    if (Number(amount) > Number(invoiceData.total)) {
      return NextResponse.json(
        { error: "Payment amount exceeds invoice total" },
        { status: 400 }
      );
    }

    // Check for existing pending payments
    const existingPendingPayment = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(
        eq(payments.invoiceId, invoiceId),
        eq(payments.status, "pending")
      ))
      .limit(1);

    if (existingPendingPayment.length > 0) {
      return NextResponse.json(
        { error: "There is already a pending payment for this invoice" },
        { status: 400 }
      );
    }

    // Create payment
    const paymentResult = await db.insert(payments).values({
      invoiceId,
      customerId: invoiceData.customerId,
      amount,
      method,
      gateway,
      status: gateway === "manual" ? "success" : "pending",
      initiatedAt: new Date(),
      confirmedAt: gateway === "manual" ? new Date() : undefined,
      gatewayFee: "0.00", // Would be calculated based on gateway
      netAmount: amount,
      ...paymentData,
      createdBy: session.user.id,
    }).returning();

    // If manual payment, update invoice status if fully paid
    if (gateway === "manual") {
      // Check if invoice is fully paid
      const totalPaidResult = await db
        .select({ total: sql`SUM(${payments.amount})`.mapWith(Number) })
        .from(payments)
        .where(and(
          eq(payments.invoiceId, invoiceId),
          eq(payments.status, "success")
        ));

      const totalPaid = totalPaidResult[0]?.total || 0;

      if (totalPaid >= Number(invoiceData.total)) {
        await db
          .update(invoices)
          .set({
            status: "paid",
            paidAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId));
      }
    }

    // TODO: Integrate with payment gateway
    // This would be where you call the payment gateway service to:
    // - Create virtual accounts, QR codes, etc.
    // - Set up webhooks for payment notifications
    // - Handle payment processing workflows

    // Return created payment
    const createdPayment = await db
      .select({
        id: payments.id,
        invoiceId: payments.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        customerId: payments.customerId,
        customerName: customers.name,
        amount: payments.amount,
        method: payments.method,
        gateway: payments.gateway,
        status: payments.status,
        initiatedAt: payments.initiatedAt,
        confirmedAt: payments.confirmedAt,
        gatewayReference: payments.gatewayReference,
        netAmount: payments.netAmount,
      })
      .from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .where(eq(payments.id, paymentResult[0].id))
      .limit(1);

    return NextResponse.json({
      data: createdPayment[0],
      message: gateway === "manual" ? "Payment recorded successfully" : "Payment initiated successfully",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating payment:", error);

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