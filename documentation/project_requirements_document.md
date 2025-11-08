# Project Requirements Document (PRD)

## 1. Project Overview

The Integrated ISP Management System is a full-stack web application designed to streamline and automate your MikroTik-based ISP operations in Indonesia. Built on the `isp-management-suite` starter template, it brings together customer provisioning, billing, support, and reporting into a single, cohesive platform. By automating repetitive tasks—like PPPoE account creation, invoice generation, and customer isolation—it reduces manual overhead, minimizes errors, and speeds up daily operations.

This system is being built to give your team a unified view of business health and to enforce clear access controls across roles (Admin, Finance, Technician, Sales). Key success criteria include a secure, role-based authentication module; an interactive dashboard displaying real-time metrics; reliable integration with MikroTik RouterOS and local payment gateways; automated billing workflows; and a ticketing system for support. Meeting these objectives will boost operational efficiency, improve customer satisfaction, and scale your ISP business with confidence.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1)**

- User authentication, session management, and Role-Based Access Control (Admin, Finance, Technician, Sales).
- Protected Interactive Dashboard with charts, cards, and tables for KPIs (active customers, revenue, tickets).
- Customer Management: add, view, edit, delete customer records and assign service packages.
- PPPoE Provisioning: create and modify PPPoE secrets on MikroTik RouterOS via API.
- Billing & Invoicing: scheduled invoice generation, CRUD on invoices, payment status tracking.
- Payment Gateway Integration: receive and handle webhooks from Xendit or Midtrans.
- Notifications: send WhatsApp or Telegram messages for payment reminders and status updates.
- Support Ticketing: create, assign, and update customer tickets.
- CRM & Leads Database: capture and manage new sales leads.
- Scheduled Jobs: Vercel Cron Jobs for daily invoice runs and isolation automation.
- Audit Logging: record key actions (invoice creation, user changes, profile updates) in a dedicated log table.

**Out-of-Scope (Planned for Later Phases)**

- Coverage Map with interactive GIS integration.
- Advanced Inventory & Asset Management.
- Mobile app or native desktop client.
- Multi-language support beyond English/Indonesian.
- AI-driven chatbots or advanced analytics modules.
- PCI-level hosted payment pages.
- Offline or edge deployments.

## 3. User Flow

When a user lands on the app, they are greeted with a secure login screen powered by Better Auth. After signing in, they arrive at the Dashboard—an overview page with revenue charts, active vs. isolated customer cards, and a table of open support tickets. A left-hand navigation menu lists modules: Customers, Billing, Tickets, CRM, Settings. Clicking “Customers” brings up a searchable, sortable data table; the user can add or edit profiles, assign service packages, and see provisioning status at a glance.

A Finance role user navigates to “Billing,” where they trigger the daily invoice generation job or review existing invoices. When customers pay through the integrated gateway, webhooks update invoice statuses automatically, and the system triggers a WhatsApp reminder for late payments. The Technician role can view and resolve support tickets under “Tickets,” changing statuses and logging work notes. Behind the scenes, a scheduled Vercel Cron Job runs isolation checks: overdue accounts are automatically moved to an “Isolated” PPPoE profile on the MikroTik router, and a notification is sent to the customer.

## 4. Core Features

- **Authentication & RBAC**: Sign-up, sign-in, session handling; roles enforce module access.
- **Interactive Dashboard**: Revenue trend charts, key metric cards, data table of open items.
- **Customer Management**: CRUD operations; assign service packages; view provisioning status.
- **PPPoE Provisioning**: API calls to MikroTik ROS 7 for creating/updating secrets and profiles.
- **Billing & Invoicing**: Automatic invoice generation, manual invoice editing, status tracking.
- **Payment Webhooks**: Endpoints to receive payment notifications and update records.
- **Notifications**: WhatsApp/Telegram integration for payment reminders and alerts.
- **Support Ticketing**: Ticket creation, assignment, status updates, work logs.
- **CRM & Leads**: Lead capture form, lead list with filtering and status management.
- **Scheduled Jobs**: Daily invoice run and overdue-customer isolation via Vercel Cron.
- **Audit Logging**: Central table capturing all critical actions and changes.

## 5. Tech Stack & Tools

- **Frontend**: Next.js (App Router) + React + TypeScript, Tailwind CSS, shadcn/ui components.
- **Backend**: Next.js API Routes; Better Auth for authentication; Drizzle ORM + PostgreSQL for data.
- **Integrations**:
  - MikroTik RouterOS API (PPPoE provisioning)
  - Payment Gateway (Xendit/Midtrans) webhooks
  - WhatsApp/Telegram messaging API
- **Deployment & Dev**:
  - Vercel (hosting, serverless functions, Cron Jobs)
  - Docker & Docker Compose (local development parity)
- **Development Tools**:
  - VS Code with ESLint, Prettier, GitLens
  - Optional AI assistance: Cursor or Windsurf for code navigation and generation

## 6. Non-Functional Requirements

- Performance: Page loads under 2 seconds; API responses under 500 ms.
- Security: HTTPS everywhere; OWASP Top 10 mitigation; environment variables for secrets; RBAC enforcement.
- Compliance: Data privacy per Indonesian regulations; secure handling of payment data.
- Usability: Responsive design; accessible color contrast; intuitive navigation.
- Scalability & Availability: Support 10,000+ customers; 99.9% uptime SLA.
- Reliability: Idempotent webhooks; retry logic on external API calls.

## 7. Constraints & Assumptions

- Stable access to MikroTik RouterOS API with valid credentials.
- Payment gateway supports reliable, signed webhook delivery.
- Vercel Cron Jobs meet scheduling needs; no external job runner.
- PostgreSQL can handle the anticipated relational data volume.
- Environment variables managed securely (e.g., through Vercel or Docker `.env`).
- Team has Node.js and Docker experience.

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: Payment gateway or MikroTik API calls may be throttled. Mitigation: implement exponential backoff and queueing.
- **Network Reliability**: Router connectivity might drop. Mitigation: add health checks, fallback logging of failed commands.
- **Cron Job Drift**: Scheduled tasks may not run exactly on time due to serverless cold starts. Mitigation: build idempotent jobs and alert on missed runs.
- **Concurrent Data Writes**: High traffic could cause race conditions. Mitigation: use database transactions and optimistic locking where needed.
- **Notification Failures**: SMS/WhatsApp service outages. Mitigation: retry logic and alternative channels (email).
- **Schema Migrations**: Future changes to Drizzle ORM schemas must be versioned carefully. Mitigation: adopt a migration tool and review process.

---

This PRD captures the full scope, user journey, and technical foundation for the Integrated ISP Management System. It provides clear in-scope deliverables, a detailed feature list, and all necessary non-functional requirements, constraints, and known risks to guide the AI-driven generation of subsequent technical documents without ambiguity.