import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads, servicePackages, user, customers, customerServiceHistory } from "@/db/schema";
import { eq, like, and, desc, asc, or, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// GET /api/leads - List leads with pagination and filtering
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
      source: searchParams.get("source"),
      assignedTo: searchParams.get("assignedTo"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    };

    // Apply validation
    const validatedQuery = {
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      search: queryParams.search,
      status: queryParams.status,
      source: queryParams.source,
      assignedTo: queryParams.assignedTo,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder || "desc",
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
    };

    const { page, limit, search, status, source, assignedTo, sortBy, sortOrder, startDate, endDate } = validatedQuery;

    // Build the base query
    const baseQuery = db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        address: leads.address,
        status: leads.status,
        source: leads.source,
        preferredPackageId: leads.preferredPackageId,
        preferredPackageName: servicePackages.name,
        assignedTo: leads.assignedTo,
        surveyDate: leads.surveyDate,
        installationDate: leads.installationDate,
        convertedToCustomerId: leads.convertedToCustomerId,
        conversionDate: leads.conversionDate,
        lostReason: leads.lostReason,
        lastContactDate: leads.lastContactDate,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        // Assigned user info
        assignedUserName: user.name,
        // Customer info if converted
        convertedCustomerName: customers.name,
      })
      .from(leads)
      .leftJoin(servicePackages, eq(leads.preferredPackageId, servicePackages.id))
      .leftJoin(user, eq(leads.assignedTo, user.id))
      .leftJoin(customers, eq(leads.convertedToCustomerId, customers.id))
      .where(
        and(
          status ? eq(leads.status, status) : undefined,
          source ? eq(leads.source, source) : undefined,
          assignedTo ? eq(leads.assignedTo, assignedTo) : undefined,
          search ? or(
            like(leads.name, `%${search}%`),
            like(leads.email, `%${search}%`),
            like(leads.phone, `%${search}%`),
            like(leads.address, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${leads.createdAt} >= ${startDate} AND ${leads.createdAt} <= ${endDate}` : undefined
        )
      );

    // Add sorting
    const orderByColumn = sortBy === "name" ? leads.name :
                         sortBy === "status" ? leads.status :
                         sortBy === "source" ? leads.source :
                         sortBy === "assignedUserName" ? user.name :
                         sortBy === "surveyDate" ? leads.surveyDate :
                         sortBy === "installationDate" ? leads.installationDate :
                         sortBy === "conversionDate" ? leads.conversionDate :
                         leads.createdAt;

    const sortedQuery = baseQuery.orderBy(
      sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn)
    );

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(leads)
      .leftJoin(servicePackages, eq(leads.preferredPackageId, servicePackages.id))
      .leftJoin(user, eq(leads.assignedTo, user.id))
      .leftJoin(customers, eq(leads.convertedToCustomerId, customers.id))
      .where(
        and(
          status ? eq(leads.status, status) : undefined,
          source ? eq(leads.source, source) : undefined,
          assignedTo ? eq(leads.assignedTo, assignedTo) : undefined,
          search ? or(
            like(leads.name, `%${search}%`),
            like(leads.email, `%${search}%`),
            like(leads.phone, `%${search}%`),
            like(leads.address, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${leads.createdAt} >= ${startDate} AND ${leads.createdAt} <= ${endDate}` : undefined
        )
      );

    const totalCount = totalCountResult[0]?.count || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const result = await sortedQuery.limit(limit).offset(offset);

    // Get summary statistics
    const summaryResult = await db
      .select({
        totalLeads: count(leads.id),
        newLeads: count(sql`${leads.status} = 'new'`),
        convertedLeads: count(sql`${leads.status} = 'converted'`),
        lostLeads: count(sql`${leads.status} = 'lost'`),
        conversionRate: sql`ROUND((COUNT(CASE WHEN ${leads.status} = 'converted' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2)`.mapWith(Number),
        averageConversionTime: sql`AVG(CASE WHEN ${leads.status} = 'converted' THEN EXTRACT(EPOCH FROM (${leads.conversionDate} - ${leads.createdAt})) / 86400 END)`.mapWith(Number),
      })
      .from(leads)
      .where(
        and(
          startDate && endDate ? sql`${leads.createdAt} >= ${startDate} AND ${leads.createdAt} <= ${endDate}` : undefined
        )
      );

    const summary = summaryResult[0] || {
      totalLeads: 0,
      newLeads: 0,
      convertedLeads: 0,
      lostLeads: 0,
      conversionRate: 0,
      averageConversionTime: 0,
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
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new lead
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
    const validatedData = validationSchemas.leadCreate.parse(body);

    const { preferredPackageId, ...leadData } = validatedData;

    // Validate preferred package if provided
    if (preferredPackageId) {
      const packageExists = await db
        .select({ id: servicePackages.id })
        .from(servicePackages)
        .where(and(
          eq(servicePackages.id, preferredPackageId),
          eq(servicePackages.isActive, true)
        ))
        .limit(1);

      if (packageExists.length === 0) {
        return NextResponse.json(
          { error: "Preferred package not found or inactive" },
          { status: 404 }
        );
      }
    }

    // Check for duplicate leads by email or phone
    const existingLead = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(
        or(
          leadData.email ? eq(leads.email, leadData.email) : undefined,
          eq(leads.phone, leadData.phone)
        ),
        eq(leads.status, "new") // Only check for new leads
      ))
      .limit(1);

    if (existingLead.length > 0) {
      return NextResponse.json(
        { error: "Lead with this email or phone already exists" },
        { status: 409 }
      );
    }

    // Create lead
    const leadResult = await db.insert(leads).values({
      ...leadData,
      preferredPackageId,
      status: "new",
      createdBy: session.user.id,
    }).returning();

    // Return created lead with related data
    const createdLead = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        address: leads.address,
        status: leads.status,
        source: leads.source,
        preferredPackageId: leads.preferredPackageId,
        preferredPackageName: servicePackages.name,
        assignedTo: leads.assignedTo,
        createdAt: leads.createdAt,
        assignedUserName: user.name,
      })
      .from(leads)
      .leftJoin(servicePackages, eq(leads.preferredPackageId, servicePackages.id))
      .leftJoin(user, eq(leads.assignedTo, user.id))
      .where(eq(leads.id, leadResult[0].id))
      .limit(1);

    return NextResponse.json({
      data: createdLead[0],
      message: "Lead created successfully",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating lead:", error);

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