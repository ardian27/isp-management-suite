import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, servicePackages, payments } from "@/db/schema";
import { eq, like, and, desc, asc, or, sql, count, sum } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// GET /api/invoices - List invoices with pagination and filtering
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
      customerId: searchParams.get("customerId"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    };

    // Validate query parameters
    const validatedQuery = validationSchemas.invoiceList.parse(queryParams);
    const { page, limit, search, status, customerId, sortBy, sortOrder, startDate, endDate } = validatedQuery;

    // Build the base query
    const baseQuery = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        status: invoices.status,
        periodStartDate: invoices.periodStartDate,
        periodEndDate: invoices.periodEndDate,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        dueDate: invoices.dueDate,
        issuedAt: invoices.issuedAt,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          status ? eq(invoices.status, status) : undefined,
          customerId ? eq(invoices.customerId, customerId) : undefined,
          search ? or(
            like(invoices.invoiceNumber, `%${search}%`),
            like(customers.name, `%${search}%`),
            like(customers.email, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${invoices.createdAt} >= ${startDate} AND ${invoices.createdAt} <= ${endDate}` : undefined
        )
      );

    // Add sorting
    const orderByColumn = sortBy === "invoiceNumber" ? invoices.invoiceNumber :
                         sortBy === "customerName" ? customers.name :
                         sortBy === "status" ? invoices.status :
                         sortBy === "total" ? invoices.total :
                         sortBy === "dueDate" ? invoices.dueDate :
                         sortBy === "issuedAt" ? invoices.issuedAt :
                         invoices.createdAt;

    const sortedQuery = baseQuery.orderBy(
      sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn)
    );

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          status ? eq(invoices.status, status) : undefined,
          customerId ? eq(invoices.customerId, customerId) : undefined,
          search ? or(
            like(invoices.invoiceNumber, `%${search}%`),
            like(customers.name, `%${search}%`),
            like(customers.email, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${invoices.createdAt} >= ${startDate} AND ${invoices.createdAt} <= ${endDate}` : undefined
        )
      );

    const totalCount = totalCountResult[0]?.count || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const result = await sortedQuery.limit(limit).offset(offset);

    // Get summary statistics
    const summaryResult = await db
      .select({
        totalInvoices: count(invoices.id),
        totalAmount: sum(invoices.total).mapWith(Number),
        paidInvoices: count(sql`${invoices.status} = 'paid'`),
        unpaidInvoices: count(sql`${invoices.status} != 'paid'`),
      })
      .from(invoices)
      .where(
        and(
          startDate && endDate ? sql`${invoices.createdAt} >= ${startDate} AND ${invoices.createdAt} <= ${endDate}` : undefined
        )
      );

    const summary = summaryResult[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      paidInvoices: 0,
      unpaidInvoices: 0,
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
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create a new invoice
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
    const validatedData = validationSchemas.invoiceCreate.parse(body);

    const { customerId, items, ...invoiceData } = validatedData;

    // Check if customer exists and is active
    const customer = await db
      .select({
        id: customers.id,
        name: customers.name,
        status: customers.status,
      })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (customer.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    if (customer[0].status !== "active") {
      return NextResponse.json(
        { error: "Cannot create invoice for inactive customer" },
        { status: 400 }
      );
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");

    const countResult = await db
      .select({ count: count() })
      .from(invoices)
      .where(sql`EXTRACT(YEAR FROM ${invoices.createdAt}) = ${year} AND EXTRACT(MONTH FROM ${invoices.createdAt}) = ${month}`);

    const count = countResult[0]?.count || 0;
    const invoiceNumber = `INV${year}${month}${String(count + 1).padStart(4, "0")}`;

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.quantity * Number(item.unitPrice);
      const itemDiscount = Number(item.discountAmount) || 0;
      const itemSubtotal = itemTotal - itemDiscount;
      const itemTax = itemSubtotal * Number(item.taxRate);

      subtotal += itemSubtotal;
      taxAmount += itemTax;

      return {
        ...item,
        total: itemSubtotal,
      };
    });

    const total = subtotal + taxAmount;

    // Create invoice with items
    const invoiceResult = await db.transaction(async (tx) => {
      // Insert invoice
      const newInvoice = await tx.insert(invoices).values({
        invoiceNumber,
        customerId,
        periodStartDate: invoiceData.periodStartDate,
        periodEndDate: invoiceData.periodEndDate,
        items: processedItems,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        dueDate: invoiceData.dueDate,
        status: "draft",
        notes: invoiceData.notes,
        internalNotes: invoiceData.internalNotes,
        createdBy: session.user.id,
      }).returning();

      // Insert invoice items
      const invoiceItemsData = processedItems.map(item => ({
        invoiceId: newInvoice[0].id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || "0.00",
        taxRate: item.taxRate,
        total: item.total.toString(),
        servicePackageId: item.servicePackageId,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
      }));

      await tx.insert(invoiceItems).values(invoiceItemsData);

      return newInvoice[0];
    });

    // Return created invoice with customer data
    const createdInvoice = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        status: invoices.status,
        periodStartDate: invoices.periodStartDate,
        periodEndDate: invoices.periodEndDate,
        items: invoices.items,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, invoiceResult.id))
      .limit(1);

    return NextResponse.json({
      data: createdInvoice[0],
      message: "Invoice created successfully",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating invoice:", error);

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