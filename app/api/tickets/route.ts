import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supportTickets, customers, user, serviceLevelAgreements, ticketActivities } from "@/db/schema";
import { eq, like, and, desc, asc, or, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// GET /api/tickets - List support tickets with pagination and filtering
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
      category: searchParams.get("category"),
      priority: searchParams.get("priority"),
      assignedTo: searchParams.get("assignedTo"),
      customerId: searchParams.get("customerId"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    };

    // Validate query parameters
    const validatedQuery = validationSchemas.ticketList.parse(queryParams);
    const { page, limit, search, status, category, priority, assignedTo, customerId, sortBy, sortOrder, startDate, endDate } = validatedQuery;

    // Build the base query
    const baseQuery = db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        customerId: supportTickets.customerId,
        customerName: supportTickets.customerName,
        customerEmail: supportTickets.customerEmail,
        subject: supportTickets.subject,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        source: supportTickets.source,
        assignedTo: supportTickets.assignedTo,
        assignedTeam: supportTickets.assignedTeam,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        lastResponseAt: supportTickets.lastResponseAt,
        resolvedAt: supportTickets.resolvedAt,
        satisfactionRating: supportTickets.satisfactionRating,
        slaDueDate: supportTickets.slaDueDate,
        slaBreached: supportTickets.slaBreached,
        // Assigned user info
        assignedUserName: user.name,
        // Customer info if linked
        linkedCustomerName: customers.name,
      })
      .from(supportTickets)
      .leftJoin(user, eq(supportTickets.assignedTo, user.id))
      .leftJoin(customers, eq(supportTickets.customerId, customers.id))
      .where(
        and(
          status ? eq(supportTickets.status, status) : undefined,
          category ? eq(supportTickets.category, category) : undefined,
          priority ? eq(supportTickets.priority, priority) : undefined,
          assignedTo ? eq(supportTickets.assignedTo, assignedTo) : undefined,
          customerId ? eq(supportTickets.customerId, customerId) : undefined,
          search ? or(
            like(supportTickets.ticketNumber, `%${search}%`),
            like(supportTickets.subject, `%${search}%`),
            like(supportTickets.customerName, `%${search}%`),
            like(supportTickets.customerEmail, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${supportTickets.createdAt} >= ${startDate} AND ${supportTickets.createdAt} <= ${endDate}` : undefined
        )
      );

    // Add sorting
    const orderByColumn = sortBy === "ticketNumber" ? supportTickets.ticketNumber :
                         sortBy === "subject" ? supportTickets.subject :
                         sortBy === "priority" ? supportTickets.priority :
                         sortBy === "status" ? supportTickets.status :
                         sortBy === "customerName" ? supportTickets.customerName :
                         sortBy === "assignedUserName" ? user.name :
                         sortBy === "slaDueDate" ? supportTickets.slaDueDate :
                         supportTickets.createdAt;

    const sortedQuery = baseQuery.orderBy(
      sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn)
    );

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(supportTickets)
      .leftJoin(user, eq(supportTickets.assignedTo, user.id))
      .leftJoin(customers, eq(supportTickets.customerId, customers.id))
      .where(
        and(
          status ? eq(supportTickets.status, status) : undefined,
          category ? eq(supportTickets.category, category) : undefined,
          priority ? eq(supportTickets.priority, priority) : undefined,
          assignedTo ? eq(supportTickets.assignedTo, assignedTo) : undefined,
          customerId ? eq(supportTickets.customerId, customerId) : undefined,
          search ? or(
            like(supportTickets.ticketNumber, `%${search}%`),
            like(supportTickets.subject, `%${search}%`),
            like(supportTickets.customerName, `%${search}%`),
            like(supportTickets.customerEmail, `%${search}%`)
          ) : undefined,
          startDate && endDate ? sql`${supportTickets.createdAt} >= ${startDate} AND ${supportTickets.createdAt} <= ${endDate}` : undefined
        )
      );

    const totalCount = totalCountResult[0]?.count || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const result = await sortedQuery.limit(limit).offset(offset);

    // Get summary statistics
    const summaryResult = await db
      .select({
        totalTickets: count(supportTickets.id),
        openTickets: count(sql`${supportTickets.status} = 'open'`),
        inProgressTickets: count(sql`${supportTickets.status} = 'in_progress'`),
        resolvedTickets: count(sql`${supportTickets.status} = 'resolved'`),
        overdueTickets: count(sql`${supportTickets.slaDueDate} < NOW() AND ${supportTickets.status} NOT IN ('resolved', 'closed')`),
        highPriorityTickets: count(sql`${supportTickets.priority} IN ('high', 'urgent', 'critical')`),
        averageSatisfaction: sql`AVG(${supportTickets.satisfactionRating})`.mapWith(Number),
      })
      .from(supportTickets)
      .where(
        and(
          startDate && endDate ? sql`${supportTickets.createdAt} >= ${startDate} AND ${supportTickets.createdAt} <= ${endDate}` : undefined
        )
      );

    const summary = summaryResult[0] || {
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      resolvedTickets: 0,
      overdueTickets: 0,
      highPriorityTickets: 0,
      averageSatisfaction: 0,
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
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new support ticket
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
    const validatedData = validationSchemas.ticketCreate.parse(body);

    const { customerId, category, priority, ...ticketData } = validatedData;

    // Validate customer if provided
    let customerInfo = null;
    if (customerId) {
      const customer = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          serviceAddress: customers.serviceAddress,
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

      customerInfo = customer[0];
    }

    // Generate ticket number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");

    const countResult = await db
      .select({ count: count() })
      .from(supportTickets)
      .where(sql`DATE(${supportTickets.createdAt}) = CURRENT_DATE`);

    const count = countResult[0]?.count || 0;
    const ticketNumber = `TK-${year}${month}${day}-${String(count + 1).padStart(4, "0")}`;

    // Auto-assignment logic based on category and priority
    let assignedTo = ticketData.assignedTo;
    let assignedTeam = ticketData.assignedTeam;

    if (!assignedTo) {
      // Simple auto-assignment based on category
      // In a real system, this would be more sophisticated, considering workload, skills, etc.
      const assignmentRules = {
        "connection_issue": { team: "technical", priority: ["urgent", "critical", "high"] },
        "billing_issue": { team: "finance", priority: ["urgent", "critical", "high"] },
        "package_change": { team: "sales", priority: ["critical"] },
        "technical_support": { team: "technical", priority: ["urgent", "critical", "high", "normal"] },
        "installation_appointment": { team: "technical", priority: ["urgent", "critical"] },
        "service_complaint": { team: "support", priority: ["urgent", "critical", "high"] },
        "account_management": { team: "support", priority: ["critical", "high"] },
        "equipment_issue": { team: "technical", priority: ["urgent", "critical", "high"] },
        "network_outage": { team: "technical", priority: ["urgent", "critical"] },
        "general_inquiry": { team: "support", priority: ["critical", "high"] },
      };

      const rule = assignmentRules[category as keyof typeof assignmentRules];
      if (rule && rule.priority.includes(priority)) {
        assignedTeam = rule.team;
        // TODO: Find actual available staff member based on team and workload
        // This is simplified - in production you'd query actual user assignments
      }
    }

    // Calculate SLA due date based on SLA rules
    let slaDueDate = null;
    if (category && priority) {
      const sla = await db
        .select({
          initialResponseTime: serviceLevelAgreements.initialResponseTime,
          businessHoursOnly: serviceLevelAgreements.businessHoursOnly,
        })
        .from(serviceLevelAgreements)
        .where(and(
          eq(serviceLevelAgreements.ticketCategory, category),
          eq(serviceLevelAgreements.priority, priority),
          eq(serviceLevelAgreements.isActive, true)
        ))
        .limit(1);

      if (sla.length > 0) {
        const responseTime = sla[0].initialResponseTime; // hours
        const dueDate = new Date();

        if (sla[0].businessHoursOnly) {
          // Simple business hours calculation (9 AM - 5 PM, weekdays)
          // In production, this would be more sophisticated considering holidays
          dueDate.setHours(dueDate.getHours() + responseTime);
          // Skip weekends - this is simplified
          if (dueDate.getDay() === 0) { // Sunday
            dueDate.setDate(dueDate.getDate() + 1);
          } else if (dueDate.getDay() === 6) { // Saturday
            dueDate.setDate(dueDate.getDate() + 2);
          }
        } else {
          dueDate.setHours(dueDate.getHours() + responseTime);
        }

        slaDueDate = dueDate;
      }
    }

    // Create ticket
    const ticketResult = await db.insert(supportTickets).values({
      ticketNumber,
      customerId,
      customerName: customerInfo?.name || ticketData.customerName,
      customerEmail: customerInfo?.email || ticketData.customerEmail,
      customerPhone: customerInfo?.phone || ticketData.customerPhone,
      serviceAddress: customerInfo?.serviceAddress || ticketData.serviceAddress,
      subject: ticketData.subject,
      description: ticketData.description,
      category,
      priority,
      source: ticketData.source,
      assignedTo,
      assignedTeam,
      coordinates: ticketData.coordinates,
      escalated: false,
      satisfactionRating: null,
      createdBy: session.user.id,
      slaDueDate,
    }).returning();

    // Create activity log
    await db.insert(ticketActivities).values({
      ticketId: ticketResult[0].id,
      activityType: "created",
      activityDescription: `Ticket created by ${session.user.email}`,
      performedBy: session.user.id,
      performedByType: "staff",
      newValue: {
        ticketData,
        createdBy: session.user.email,
      },
    });

    // Return created ticket with related data
    const createdTicket = await db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        customerId: supportTickets.customerId,
        customerName: supportTickets.customerName,
        subject: supportTickets.subject,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        source: supportTickets.source,
        assignedTo: supportTickets.assignedTo,
        assignedTeam: supportTickets.assignedTeam,
        createdAt: supportTickets.createdAt,
        slaDueDate: supportTickets.slaDueDate,
        assignedUserName: user.name,
      })
      .from(supportTickets)
      .leftJoin(user, eq(supportTickets.assignedTo, user.id))
      .where(eq(supportTickets.id, ticketResult[0].id))
      .limit(1);

    return NextResponse.json({
      data: createdTicket[0],
      message: "Support ticket created successfully",
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating support ticket:", error);

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