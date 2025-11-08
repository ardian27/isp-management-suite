import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, servicePackages, customerServiceHistory } from "@/db/schema";
import { eq, like, and, desc, asc, or, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas, CustomerListRequest, CustomerCreateInput, CustomerUpdateInput } from "@/lib/validations/schemas";

// GET /api/customers - List customers with pagination and filtering
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
      packageId: searchParams.get("packageId"),
      assignedTo: searchParams.get("assignedTo"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    };

    // Validate query parameters
    const validatedQuery = validationSchemas.customerList.parse(queryParams);
    const { page, limit, search, status, packageId, assignedTo, sortBy, sortOrder, startDate, endDate } = validatedQuery;

    // Build the base query
    const baseQuery = db
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
        assignedTo: customers.assignedTo,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .leftJoin(servicePackages, eq(customers.packageId, servicePackages.id))
      .where(
        and(
          status ? eq(customers.status, status) : undefined,
          packageId ? eq(customers.packageId, packageId) : undefined,
          assignedTo ? eq(customers.assignedTo, assignedTo) : undefined,
          search ? or(
            like(customers.name, `%${search}%`),
            like(customers.email, `%${search}%`),
            like(customers.phone, `%${search}%`),
            like(customers.customerNumber, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${customers.createdAt} >= ${startDate} AND ${customers.createdAt} <= ${endDate}` : undefined
        )
      );

    // Add sorting
    const orderByColumn = sortBy === "name" ? customers.name :
                         sortBy === "email" ? customers.email :
                         sortBy === "customerNumber" ? customers.customerNumber :
                         sortBy === "status" ? customers.status :
                         sortBy === "outstandingBalance" ? customers.outstandingBalance :
                         sortBy === "activationDate" ? customers.activationDate :
                         customers.createdAt;

    const sortedQuery = baseQuery.orderBy(
      sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn)
    );

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(customers)
      .where(
        and(
          status ? eq(customers.status, status) : undefined,
          packageId ? eq(customers.packageId, packageId) : undefined,
          assignedTo ? eq(customers.assignedTo, assignedTo) : undefined,
          search ? or(
            like(customers.name, `%${search}%`),
            like(customers.email, `%${search}%`),
            like(customers.phone, `%${search}%`),
            like(customers.customerNumber, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${customers.createdAt} >= ${startDate} AND ${customers.createdAt} <= ${endDate}` : undefined
        )
      );

    const totalCount = totalCountResult[0]?.count || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const result = await sortedQuery.limit(limit).offset(offset);

    // Generate customer number for new customers
    const generateCustomerNumber = async () => {
      const year = new Date().getFullYear();
      const countResult = await db
        .select({ count: count() })
        .from(customers)
        .where(sql`EXTRACT(YEAR FROM ${customers.createdAt}) = ${year}`);

      const count = countResult[0]?.count || 0;
      return `CUST${year}${String(count + 1).padStart(4, "0")}`;
    };

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      meta: {
        customerNumberTemplate: await generateCustomerNumber(),
      }
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
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
    const validatedData = validationSchemas.customerCreate.parse(body);

    // Check if email already exists
    const existingCustomer = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.email, validatedData.email))
      .limit(1);

    if (existingCustomer.length > 0) {
      return NextResponse.json(
        { error: "Customer with this email already exists" },
        { status: 409 }
      );
    }

    // Check if PPPoE username already exists
    const existingPPPoE = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.pppoeUsername, validatedData.pppoeUsername))
      .limit(1);

    if (existingPPPoE.length > 0) {
      return NextResponse.json(
        { error: "PPPoE username already exists" },
        { status: 409 }
      );
    }

    // Generate customer number
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: count() })
      .from(customers)
      .where(sql`EXTRACT(YEAR FROM ${customers.createdAt}) = ${year}`);

    const count = countResult[0]?.count || 0;
    const customerNumber = `CUST${year}${String(count + 1).padStart(4, "0")}`;

    // Set default values
    const customerData = {
      ...validatedData,
      customerNumber,
      status: validatedData.activationDate ? "active" : "prospect",
      billingAddress: validatedData.billingAddressSameAsService
        ? validatedData.serviceAddress
        : validatedData.billingAddress,
    };

    // Insert customer
    const result = await db.insert(customers).values(customerData).returning();

    // Create service history entry
    await db.insert(customerServiceHistory).values({
      customerId: result[0].id,
      eventType: "customer_created",
      description: `Customer ${validatedData.name} was created with package ${validatedData.packageId}`,
      performedBy: session.user.id,
      newValue: {
        customerData,
        createdBy: session.user.email,
      },
    });

    // Return created customer with related data
    const customerWithDetails = await db
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
        createdAt: customers.createdAt,
      })
      .from(customers)
      .leftJoin(servicePackages, eq(customers.packageId, servicePackages.id))
      .where(eq(customers.id, result[0].id))
      .limit(1);

    return NextResponse.json({
      data: customerWithDetails[0],
      message: "Customer created successfully",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating customer:", error);

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