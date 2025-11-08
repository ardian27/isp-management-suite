# Tech Stack Document for isp-management-suite

This document explains the technology choices behind the **isp-management-suite**, a full-stack starter template designed for building an Integrated ISP Management System. It’s written in everyday language so everyone—from business stakeholders to non-technical team members—can understand why these tools were chosen and how they work together.

## 1. Frontend Technologies

Our frontend is responsible for everything users see and interact with. We picked tools that make the interface fast, flexible, and easy to maintain.

- **Next.js (App Router)**
  - Provides server-side rendering (SSR) and Server Components for fast page loads and efficient data fetching.
  - Simplifies routing and code splitting, so users only download what they need.
- **React**
  - Powers our interactive UI components—forms, tables, charts, and more.
- **TypeScript**
  - Adds type safety to catch errors early, reducing bugs in complex features like billing and provisioning.
- **Tailwind CSS**
  - A utility-first styling framework that lets us build responsive, consistent layouts without writing custom CSS from scratch.
- **shadcn/ui**
  - A library of accessible, copy-and-paste React components (buttons, dialogs, tables) that can be customized to match our brand.
- **State Management (Zustand or Jotai)**
  - Recommended for complex client-side state (e.g., real-time technician dashboard, map controls) without unnecessary re-renders.

How these choices enhance UX:
- Fast initial load and smooth navigation via SSR.
- Consistent look and feel with minimal styling overhead.
- Easily extendable components that non-designers can customize.

## 2. Backend Technologies

The backend powers our data storage, business logic, and integrations with external systems.

- **Next.js API Routes**
  - Serverless endpoints built into Next.js for handling requests (e.g., provisioning, billing webhooks, notifications).
- **Better Auth**
  - A flexible library for user authentication and role-based access control (RBAC), supporting roles like Admin, Finance, Technician, and Sales.
- **Drizzle ORM**
  - A modern, type-safe Object-Relational Mapper for PostgreSQL that makes database schema definitions and queries intuitive and reliable.
- **PostgreSQL**
  - A robust relational database to store customers, service packages, invoices, tickets, audit logs, and more.
- **Zod**
  - Used to validate all incoming data (forms, webhooks) to prevent bad data and enhance security.
- **Service Modules (`/lib/services`)**
  - Encapsulate external integration logic (MikroTik, payment gateways, notifications) to keep API routes clean and business logic reusable.

These components work together by:
1. Receiving requests through API Routes.
2. Validating inputs with Zod.
3. Applying business rules (authentication, data relationships).
4. Reading/writing data via Drizzle ORM and PostgreSQL.
5. Calling external services through dedicated service modules.

## 3. Infrastructure and Deployment

Our infrastructure choices ensure the app is reliable, scalable, and easy to deploy.

- **Vercel**
  - Hosts the Next.js app with zero-configuration deployment.
  - Offers built-in Cron Jobs for scheduled tasks (automatic invoice generation, isolation checks).
- **Docker & Docker Compose**
  - Provide a consistent local environment for developers (app server + PostgreSQL) so “it works on my machine” becomes a thing of the past.
- **Git & GitHub**
  - Version control and collaboration platform for code reviews, branching, and pull requests.
- **CI/CD Pipeline**
  - Vercel automatically builds and deploys every push to main or production branches.
- **Environment Variables**
  - Securely manage sensitive credentials (`DATABASE_URL`, `MIKROTIK_API_USER`, `PAYMENT_GATEWAY_SECRET`) in `.env` files and Vercel’s dashboard.

These choices give us:
- **Reliability**: Automatic deployments, health checks, and rollbacks on Vercel.
- **Scalability**: Serverless functions scale with traffic.
- **Consistency**: Docker ensures all environments match exactly.

## 4. Third-Party Integrations

To support core ISP operations, we integrate with several external services:

- **MikroTik ROS 7 API**
  - Automates PPPoE provisioning and profile changes (e.g., isolating or restoring customers).
- **Payment Gateways (Xendit, Midtrans)**
  - Handle payment collection, virtual account creation, and webhook notifications for invoice status.
- **Messaging Platforms (WhatsApp, Telegram)**
  - Send payment reminders and status updates directly to customers’ phones.

All integration logic lives in `/lib/services`, ensuring:
- Clean, reusable code that’s easy to test and maintain.
- Clear separation between business rules and external API details.

## 5. Security and Performance Considerations

We’ve built security and performance measures into every layer:

Security:
- **Authentication & RBAC** with Better Auth to protect API routes and UI pages.
- **Input Validation** using Zod on all incoming data.
- **Environment Variables** for secrets—never hard-coded.
- **Secure Webhooks**: Verify payment gateway signatures before processing.

Performance:
- **Server Components & SSR** in Next.js for fast, SEO-friendly pages.
- **Tailwind CSS**’s small runtime footprint and efficient styles.
- **Drizzle ORM**’s optimized queries and type safety to reduce runtime errors.
- **Vercel Cron Jobs** offload scheduled tasks from main request path.

Monitoring & Logging (Recommended):
- **Sentry or Logtail** for centralized error tracking.
- **Audit Logs** table to record critical actions (invoice creation, profile changes).

Testing (Recommended):
- **Unit Tests** with Vitest or Jest for business logic.
- **Integration Tests** against the database.
- **End-to-End Tests** with Playwright or Cypress to simulate key user flows.

## 6. Conclusion and Overall Tech Stack Summary

Our tech stack is carefully chosen to meet the goals of the Integrated ISP Management System:

- **Rapid Development**: Next.js, Tailwind CSS, shadcn/ui, and Drizzle ORM accelerate building core features.
- **Type Safety & Reliability**: TypeScript, Zod, and Drizzle ORM prevent bugs in critical billing and provisioning logic.
- **Scalability & Maintenance**: Vercel’s serverless functions, Docker-based environments, and clean service modules make the app easy to grow and manage.
- **Security & Compliance**: Better Auth, secure webhooks, and environment variables keep customer data and operations safe.

Unique Aspects:
- **Modular Service Layer**: Keeps external API logic isolated, promoting testability and reusability.
- **Copy-and-Paste UI Components**: shadcn/ui lets non-designers customize the look and feel without heavy frontend work.
- **Server-Side Cron Jobs**: Built-in scheduling via Vercel ensures critical background tasks run reliably.

With this foundation, your team can focus on extending the starter template—adding modules for CRM, billing automation, support ticketing, and more—while trusting that the core architecture is solid, secure, and designed for growth.