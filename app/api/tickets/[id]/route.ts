import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supportTickets, customers, user, ticketMessages, ticketActivities, serviceLevelAgreements } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// GET /api/tickets/[id] - Get ticket by ID with full details
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

    // Get ticket with related data
    const ticket = await db
      .select({
        // Ticket basic info
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        customerId: supportTickets.customerId,
        customerName: supportTickets.customerName,
        customerEmail: supportTickets.customerEmail,
        customerPhone: supportTickets.customerPhone,
        subject: supportTickets.subject,
        description: supportTickets.description,
        category: supportTickets.category,
        priority: supportTickets.priority,
        status: supportTickets.status,
        source: supportTickets.source,
        serviceAddress: supportTickets.serviceAddress,
        coordinates: supportTickets.coordinates,

        // Assignment and escalation
        assignedTo: supportTickets.assignedTo,
        assignedTeam: supportTickets.assignedTeam,
        escalated: supportTickets.escalated,
        escalatedTo: supportTickets.escalatedTo,
        escalatedAt: supportTickets.escalatedAt,
        escalationReason: supportTickets.escalationReason,

        // Resolution
        resolution: supportTickets.resolution,
        resolutionCategory: supportTickets.resolutionCategory,
        resolvedAt: supportTickets.resolvedAt,
        resolvedBy: supportTickets.resolvedBy,
        satisfactionRating: supportTickets.satisfactionRating,
        satisfactionComment: supportTickets.satisfactionComment,

        // Timing
        createdAt: supportTickets.createdAt,
        firstResponseAt: supportTickets.firstResponseAt,
        lastResponseAt: supportTickets.lastResponseAt,
        closedAt: supportTickets.closedAt,
        closedBy: supportTickets.closedBy,

        // SLA
        slaDueDate: supportTickets.slaDueDate,
        slaBreached: supportTickets.slaBreached,

        // Additional info
        tags: supportTickets.tags,
        notes: supportTickets.notes,
        internalNotes: supportTickets.internalNotes,

        // Related data
        assignedUserName: user.name,
        assignedUserEmail: user.email,
        escalatedToUserName: escalatedToUser.name,
        linkedCustomerName: customers.name,
        linkedCustomerEmail: customers.email,
      })
      .from(supportTickets)
      .leftJoin(user, eq(supportTickets.assignedTo, user.id))
      .leftJoin(user.as("escalatedToUser"), eq(supportTickets.escalatedTo, user.id))
      .leftJoin(customers, eq(supportTickets.customerId, customers.id))
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (ticket.length === 0) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Get ticket messages
    const messages = await db
      .select({
        id: ticketMessages.id,
        message: ticketMessages.message,
        messageType: ticketMessages.messageType,
        isInternal: ticketMessages.isInternal,
        senderType: ticketMessages.senderType,
        senderId: ticketMessages.senderId,
        senderName: ticketMessages.senderName,
        attachments: ticketMessages.attachments,
        createdAt: ticketMessages.createdAt,
        editedAt: ticketMessages.editedAt,
      })
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(ticketMessages.createdAt);

    // Get activity history
    const activities = await db
      .select({
        id: ticketActivities.id,
        activityType: ticketActivities.activityType,
        activityDescription: ticketActivities.activityDescription,
        performedBy: ticketActivities.performedBy,
        performedByType: ticketActivities.performedByType,
        oldValue: ticketActivities.oldValue,
        newValue: ticketActivities.newValue,
        createdAt: ticketActivities.createdAt,
      })
      .from(ticketActivities)
      .where(eq(ticketActivities.ticketId, id))
      .orderBy(ticketActivities.createdAt);

    // Calculate response times and metrics
    const ticketData = ticket[0];
    const metrics = {
      firstResponseTime: ticketData.firstResponseAt
        ? Math.floor((new Date(ticketData.firstResponseAt).getTime() - new Date(ticketData.createdAt).getTime()) / (1000 * 60)) // minutes
        : null,
      resolutionTime: ticketData.resolvedAt
        ? Math.floor((new Date(ticketData.resolvedAt).getTime() - new Date(ticketData.createdAt).getTime()) / (1000 * 60 * 60)) // hours
        : null,
      isOverdue: ticketData.slaDueDate && new Date() > new Date(ticketData.slaDueDate) && !["resolved", "closed"].includes(ticketData.status),
      responseCount: messages.filter(m => m.senderType === "staff").length,
      customerResponseCount: messages.filter(m => m.senderType === "customer").length,
    };

    return NextResponse.json({
      data: {
        ...ticketData,
        messages,
        activities,
        metrics,
      },
    });

  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update ticket
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

    // Check if ticket exists
    const existingTicket = await db
      .select({
        id: supportTickets.id,
        currentStatus: supportTickets.status,
        currentAssignedTo: supportTickets.assignedTo,
        escalated: supportTickets.escalated,
        currentPriority: supportTickets.priority,
      })
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (existingTicket.length === 0) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = existingTicket[0];

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validationSchemas.ticketUpdate.parse(body);

    const updateData: any = { ...validatedData };

    // Handle status changes
    if (validatedData.status && validatedData.status !== ticket.currentStatus) {
      const newStatus = validatedData.status;

      // Set timestamps based on status
      if (newStatus === "in_progress" && ticket.currentStatus === "open") {
        updateData.firstResponseAt = new Date();
      }

      if (newStatus === "resolved") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = session.user.id;
      }

      if (newStatus === "closed") {
        updateData.closedAt = new Date();
        updateData.closedBy = session.user.id;
      }

      // Update last response time for any status change
      updateData.lastResponseAt = new Date();
    }

    // Handle priority changes
    if (validatedData.priority && validatedData.priority !== ticket.currentPriority) {
      // Recalculate SLA due date if priority changed
      const sla = await db
        .select({ initialResponseTime: serviceLevelAgreements.initialResponseTime })
        .from(serviceLevelAgreements)
        .where(and(
          eq(serviceLevelAgreements.ticketCategory, ticket.category),
          eq(serviceLevelAgreements.priority, validatedData.priority),
          eq(serviceLevelAgreements.isActive, true)
        ))
        .limit(1);

      if (sla.length > 0) {
        const responseTime = sla[0].initialResponseTime;
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + responseTime);
        updateData.slaDueDate = dueDate;
      }
    }

    // Handle escalation
    if (validatedData.escalated !== undefined && validatedData.escalated !== ticket.escalated) {
      if (validatedData.escalated) {
        updateData.escalatedAt = new Date();
        updateData.escalatedTo = validatedData.escalatedTo;
        updateData.escalationReason = validatedData.escalationReason;
      } else {
        updateData.escalatedAt = null;
        updateData.escalatedTo = null;
        updateData.escalationReason = null;
      }
    }

    // Update ticket
    const result = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning();

    // Create activity log for significant changes
    const significantFields = [
      "status", "assignedTo", "priority", "escalated", "resolvedBy", "resolution"
    ];

    const changedFields = Object.keys(updateData).filter(
      key => significantFields.includes(key)
    );

    if (changedFields.length > 0) {
      await db.insert(ticketActivities).values({
        ticketId: id,
        activityType: "updated",
        activityDescription: `Ticket updated: ${changedFields.join(", ")}`,
        performedBy: session.user.id,
        performedByType: "staff",
        oldValue: {
          previousStatus: ticket.currentStatus,
          previousAssignedTo: ticket.currentAssignedTo,
          previousPriority: ticket.currentPriority,
        },
        newValue: updateData,
      });
    }

    // Return updated ticket with related data
    const updatedTicket = await db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        subject: supportTickets.subject,
        status: supportTickets.status,
        priority: supportTickets.priority,
        assignedTo: supportTickets.assignedTo,
        assignedTeam: supportTickets.assignedTeam,
        updatedAt: supportTickets.updatedAt,
        assignedUserName: user.name,
      })
      .from(supportTickets)
      .leftJoin(user, eq(supportTickets.assignedTo, user.id))
      .where(eq(supportTickets.id, id))
      .limit(1);

    return NextResponse.json({
      data: updatedTicket[0],
      message: "Ticket updated successfully",
    });

  } catch (error) {
    console.error("Error updating ticket:", error);

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

// DELETE /api/tickets/[id] - Delete ticket (soft delete - just close it)
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

    // Check if ticket exists
    const existingTicket = await db
      .select({
        id: supportTickets.id,
        ticketNumber: supportTickets.ticketNumber,
        status: supportTickets.status,
      })
      .from(supportTickets)
      .where(eq(supportTickets.id, id))
      .limit(1);

    if (existingTicket.length === 0) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = existingTicket[0];

    // Only allow deletion of tickets that are not resolved/closed
    if (["resolved", "closed"].includes(ticket.status)) {
      return NextResponse.json(
        { error: "Cannot delete resolved or closed tickets" },
        { status: 400 }
      );
    }

    // Soft delete by closing the ticket
    await db
      .update(supportTickets)
      .set({
        status: "closed",
        closedAt: new Date(),
        closedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id));

    // Create activity log
    await db.insert(ticketActivities).values({
      ticketId: id,
      activityType: "deleted",
      activityDescription: `Ticket ${ticket.ticketNumber} was deleted/closed by ${session.user.email}`,
      performedBy: session.user.id,
      performedByType: "staff",
      newValue: {
        status: "closed",
        closedBy: session.user.email,
        closedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: `Ticket ${ticket.ticketNumber} deleted successfully`,
    });

  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}