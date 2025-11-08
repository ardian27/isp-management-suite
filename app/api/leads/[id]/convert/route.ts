import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads, customers, servicePackages, customerServiceHistory, invoices, invoiceItems } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { validationSchemas } from "@/lib/validations/schemas";

// POST /api/leads/[id]/convert - Convert lead to customer
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

    // Check if lead exists and is convertible
    const lead = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        address: leads.address,
        coordinates: leads.coordinates,
        preferredPackageId: leads.preferredPackageId,
        status: leads.status,
        assignedTo: leads.assignedTo,
        notes: leads.notes,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (lead.length === 0) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    const leadData = lead[0];

    if (leadData.status === "converted") {
      return NextResponse.json(
        { error: "Lead has already been converted" },
        { status: 400 }
      );
    }

    if (leadData.status === "lost") {
      return NextResponse.json(
        { error: "Cannot convert lost lead" },
        { status: 400 }
      );
    }

    // Parse and validate conversion data
    const body = await request.json();
    const validatedData = validationSchemas.leadConversion.parse(body);

    const { packageId, installationDate, notes: conversionNotes } = validatedData;

    // Validate package
    const packageData = await db
      .select({
        id: servicePackages.id,
        name: servicePackages.name,
        downloadSpeed: servicePackages.downloadSpeed,
        uploadSpeed: servicePackages.uploadSpeed,
        monthlyPrice: servicePackages.monthlyPrice,
        installationFee: servicePackages.installationFee,
        mikrotikProfile: servicePackages.mikrotikProfile,
      })
      .from(servicePackages)
      .where(and(
        eq(servicePackages.id, packageId),
        eq(servicePackages.isActive, true)
      ))
      .limit(1);

    if (packageData.length === 0) {
      return NextResponse.json(
        { error: "Package not found or inactive" },
        { status: 404 }
      );
    }

    const selectedPackage = packageData[0];

    // Generate customer number
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(customers)
      .where(sql`EXTRACT(YEAR FROM ${customers.createdAt}) = ${year}`);

    const count = countResult[0]?.count || 0;
    const customerNumber = `CUST${year}${String(count + 1).padStart(4, "0")}`;

    // Generate PPPoE credentials
    const generatePPPoECredentials = (name: string, phone: string) => {
      // Extract name part and use phone for uniqueness
      const namePart = name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 6);
      const phonePart = phone.slice(-4);
      const username = `${namePart}${phonePart}`;
      const password = Math.random().toString(36).slice(-8);
      return { username, password };
    };

    const { username: pppoeUsername, password: pppoePassword } = generatePPPoECredentials(
      leadData.name,
      leadData.phone
    );

    // Start database transaction
    const result = await db.transaction(async (tx) => {
      // Create customer
      const newCustomer = await tx.insert(customers).values({
        customerNumber,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        serviceAddress: leadData.address,
        serviceCoordinates: leadData.coordinates,
        billingAddress: leadData.address,
        billingAddressSameAsService: true,
        packageId,
        activationDate: installationDate, // Set activation date to installation date
        pppoeUsername,
        pppoePassword,
        status: "active", // Start as active since they're converting
        outstandingBalance: selectedPackage.installationFee, // Initial balance for installation
        assignedTo: leadData.assignedTo,
        notes: conversionNotes || leadData.notes,
      }).returning();

      const customerId = newCustomer[0].id;

      // Create initial invoice for installation fee and first month
      const invoiceYear = new Date().getFullYear();
      const invoiceMonth = String(new Date().getMonth() + 1).padStart(2, "0");

      const invoiceCountResult = await tx
        .select({ count: sql`count(*)` })
        .from(invoices)
        .where(sql`EXTRACT(YEAR FROM ${invoices.createdAt}) = ${invoiceYear} AND EXTRACT(MONTH FROM ${invoices.createdAt}) = ${invoiceMonth}`);

      const invoiceCount = invoiceCountResult[0]?.count || 0;
      const invoiceNumber = `INV${invoiceYear}${invoiceMonth}${String(invoiceCount + 1).padStart(4, "0")}`;

      // Calculate invoice amounts
      const monthlyFee = selectedPackage.monthlyPrice;
      const installationFee = selectedPackage.installationFee;
      const taxRate = 0.11; // 11% VAT
      const subtotal = Number(monthlyFee) + Number(installationFee);
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Create invoice items
      const invoiceItemsData = [
        {
          description: `Installation Fee - ${selectedPackage.name}`,
          quantity: 1,
          unitPrice: installationFee,
          discountAmount: "0.00",
          taxRate: taxRate.toString(),
          total: installationFee,
          referenceType: "installation",
        },
        {
          description: `Monthly Service Fee - ${selectedPackage.name} (${selectedPackage.downloadSpeed} Mbps/${selectedPackage.uploadSpeed} Mbps)`,
          quantity: 1,
          unitPrice: monthlyFee,
          discountAmount: "0.00",
          taxRate: taxRate.toString(),
          total: monthlyFee,
          referenceType: "service",
          servicePackageId: packageId,
        },
      ];

      // Calculate totals with tax
      const processedItems = invoiceItemsData.map(item => ({
        ...item,
        total: item.total,
      }));

      // Set due date to 7 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Create invoice
      const newInvoice = await tx.insert(invoices).values({
        invoiceNumber,
        customerId,
        periodStartDate: installationDate,
        periodEndDate: new Date(installationDate.getFullYear(), installationDate.getMonth() + 1, 0), // End of month
        items: processedItems,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        dueDate: dueDate.toISOString(),
        status: "issued",
        issuedAt: new Date(),
        notes: `Initial invoice for new customer conversion from lead #${leadData.id}`,
        createdBy: session.user.id,
      }).returning();

      // Insert invoice items
      await tx.insert(invoiceItems).values(
        processedItems.map(item => ({
          invoiceId: newInvoice[0].id,
          ...item,
        }))
      );

      // Create service history entries
      await tx.insert(customerServiceHistory).values([
        {
          customerId,
          eventType: "customer_created",
          description: `Customer created from lead conversion`,
          performedBy: session.user.id,
          newValue: {
            originalLeadId: leadData.id,
            originalLeadData: leadData,
            convertedBy: session.user.email,
            conversionDate: new Date(),
          },
        },
        {
          customerId,
          eventType: "package_assigned",
          description: `Package ${selectedPackage.name} assigned`,
          performedBy: session.user.id,
          newValue: {
            packageId,
            packageName: selectedPackage.name,
            installationDate,
          },
        },
        {
          customerId,
          eventType: "invoice_generated",
          description: `Initial invoice ${invoiceNumber} generated`,
          performedBy: session.user.id,
          newValue: {
            invoiceId: newInvoice[0].id,
            invoiceNumber,
            totalAmount: total,
            dueDate: dueDate.toISOString(),
          },
          invoiceId: newInvoice[0].id,
        },
      ]);

      // Update lead status to converted
      await tx
        .update(leads)
        .set({
          status: "converted",
          convertedToCustomerId: customerId,
          conversionDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, id));

      return {
        customer: newCustomer[0],
        invoice: newInvoice[0],
        package: selectedPackage,
      };
    });

    // TODO: Integrate with MikroTik API
    // This would be where you call the MikroTik service to:
    // - Create PPPoE secret with the generated credentials
    // - Assign the customer to the appropriate profile
    // - Test the connection

    // Return conversion result
    const conversionResult = await db
      .select({
        customer: {
          id: customers.id,
          customerNumber: customers.customerNumber,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          status: customers.status,
          activationDate: customers.activationDate,
          outstandingBalance: customers.outstandingBalance,
        },
        invoice: {
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          dueDate: invoices.dueDate,
          status: invoices.status,
        },
        package: {
          id: servicePackages.id,
          name: servicePackages.name,
          downloadSpeed: servicePackages.downloadSpeed,
          uploadSpeed: servicePackages.uploadSpeed,
          monthlyPrice: servicePackages.monthlyPrice,
        },
      })
      .from(customers)
      .leftJoin(invoices, eq(customers.id, invoices.customerId))
      .leftJoin(servicePackages, eq(customers.packageId, servicePackages.id))
      .where(eq(customers.id, result.customer.id))
      .limit(1);

    return NextResponse.json({
      data: {
        ...conversionResult[0],
        pppoeUsername,
        pppoePassword,
        conversionDetails: {
          originalLeadId: id,
          convertedBy: session.user.email,
          conversionDate: new Date(),
          installationDate,
        },
      },
      message: "Lead successfully converted to customer",
    }, { status: 201 });

  } catch (error) {
    console.error("Error converting lead:", error);

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