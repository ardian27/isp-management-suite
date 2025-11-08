# ISP Management Suite - Backend Structure Document

This document outlines the backend architecture, database design, APIs, hosting, infrastructure, security, and maintenance strategies for the Integrated ISP Management System. It’s written in everyday language so stakeholders and team members can understand how everything works together.

## 1. Backend Architecture

### Overall Design
- The backend is built on Next.js API Routes. These are server-side functions that respond to HTTP requests, acting as the core integration layer.
- We use a **service layer pattern**: all external calls (MikroTik router, payment gateway, notifications) are encapsulated in separate service modules. This keeps the code clean and easy to extend.
- **Drizzle ORM** is our tool for talking to the database in a type-safe way. It prevents common errors by matching your code to your database tables.
- **Better Auth** handles user sign-up, sign-in, sessions, and role-based access control (RBAC).

### Scalability, Maintainability, Performance
- **Scalability**: Serverless functions on Vercel scale automatically based on traffic. Docker Compose ensures consistent development environments.
- **Maintainability**: Clear separation between API routes, service modules, and database schemas makes the codebase easy to navigate and modify.
- **Performance**: Next.js server-side rendering and edge caching deliver fast responses. Drizzle ORM queries are optimized and type-checked at compile time.

## 2. Database Management

### Technologies
- Type: Relational (SQL)
- System: PostgreSQL
- ORM: Drizzle ORM (type-safe, schema-driven)

### Data Structure and Access
- Data is organized into tables representing users, roles, customers, service packages, invoices, support tickets, leads, and audit logs.
- Drizzle ORM maps these tables to TypeScript models, ensuring queries and updates match the intended schema.
- Environment variables securely store the database connection string (`DATABASE_URL`).
- Database migrations keep the schema in sync across development and production.

## 3. Database Schema
Below is a human-readable overview of the main tables, followed by sample SQL definitions.

### Main Tables (Human-Readable)
- **users**: Stores user accounts with email, password hash, and linked role.
- **roles**: Defines roles such as Admin, Finance, Technician, Sales.
- **customers**: Records customer details (name, address, contact information).
- **service_packages**: Lists available ISP packages (speed, price).
- **invoices**: Tracks billing records, amounts, due dates, payment status.
- **support_tickets**: Logs customer support requests and their status.
- **leads**: Captures potential customer inquiries for sales follow-up.
- **audit_logs**: Records critical actions (invoice creation, service suspension) with timestamps and user IDs.

### Sample SQL Schema (PostgreSQL)
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  pppoe_username TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE service_packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  download_speed INTEGER,
  upload_speed INTEGER,
  price NUMERIC(10,2) NOT NULL
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  package_id INTEGER REFERENCES service_packages(id),
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending','paid','overdue')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('open','in_progress','closed')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  name TEXT,
  contact TEXT,
  source TEXT,    -- e.g., website, referral
  status TEXT CHECK (status IN ('new','contacted','converted')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```  

## 4. API Design and Endpoints

### Design Approach
- We follow a RESTful pattern using Next.js API Routes.
- Each route hands off business logic to a service module.
- Input validation with Zod ensures only well-formed data reaches the database or external APIs.

### Key Endpoints
- **Authentication**
  - `POST /api/auth/signup`: Create a new user.
  - `POST /api/auth/signin`: Log in.
  - `GET /api/auth/session`: Check current session.

- **Customers**
  - `GET /api/customers`: List all customers.
  - `POST /api/customers`: Create a customer.
  - `PUT /api/customers/[id]`: Update customer details.
  - `DELETE /api/customers/[id]`: Remove a customer.

- **Invoices & Billing**
  - `GET /api/billing/invoices`: Fetch invoices.
  - `POST /api/billing/invoices`: Generate a new invoice.
  - `POST /api/billing/check-due-invoices`: (Cron job) Identify and process overdue invoices.

- **MikroTik Integration**
  - `POST /api/mikrotik/provision`: Add or update a PPPoE secret.
  - `POST /api/mikrotik/isolate`: Change a customer’s profile to isolated.

- **Payment Webhooks**
  - `POST /api/payment/webhook`: Receive payment status updates from the gateway.

- **Support Tickets**
  - `GET /api/tickets`: List tickets.
  - `POST /api/tickets`: Create a new ticket.
  - `PUT /api/tickets/[id]`: Update ticket status or details.

- **Notifications**
  - Invoked internally by services; not exposed publicly. Sends WhatsApp or Telegram updates.

## 5. Hosting Solutions

### Production Environment
- **Vercel** (serverless functions)
  - Automatic scaling based on demand.
  - Built-in cron jobs to schedule tasks like invoice checks.
  - Global CDN for fast static asset delivery.

### Development Environment
- **Docker & Docker Compose**
  - Spin up the Next.js app and PostgreSQL locally.
  - Ensures every developer works in an identical setup.

### Benefits
- **Reliability**: Vercel’s SLA and automatic rollbacks.
- **Cost-effectiveness**: Pay-per-use model for serverless functions.
- **Speed**: Instant deployments from Git pushes.

## 6. Infrastructure Components

- **Load Balancer & Edge Network**: Implicitly handled by Vercel’s global edge network.
- **Caching**
  - Edge caching for static content and SSR pages.
  - In-memory caching (optional) in service modules for repeated external calls.
- **Content Delivery Network (CDN)**
  - Vercel’s built-in CDN speeds up asset delivery to end users worldwide.
- **Cron Jobs**
  - Vercel Cron feature to trigger scheduled endpoints (e.g., billing checks).

## 7. Security Measures

- **Authentication & Authorization**
  - Better Auth with session cookies and JSON Web Tokens (JWT).
  - Role-Based Access Control (Admin, Finance, Technician, Sales).
- **Data Encryption**
  - TLS for all data in transit.
  - Database credentials and API secrets stored in environment variables.
- **Input Validation**
  - Zod schemas validate every incoming request before processing.
- **Audit Logging**
  - All critical actions recorded in `audit_logs` for traceability.
- **Secure Secrets Management**
  - Environment variables managed by Vercel and `.env` files locally (excluded from source control).

## 8. Monitoring and Maintenance

- **Error Tracking**
  - Sentry or Logtail integrated into API routes and service modules.
- **Performance Monitoring**
  - Vercel analytics for function latency and throughput.
  - Database monitoring (e.g., pgAdmin, Datadog) for query performance.
- **Logging**
  - Centralized logs for serverless functions.
  - Structured logs (JSON) for easier searching and alerting.
- **Maintenance Practices**
  - Regular dependency updates and security patching.
  - Scheduled backups of PostgreSQL.
  - Automated migration scripts ensure the schema evolves safely.

## 9. Conclusion and Overall Backend Summary

The backend of the ISP Management Suite is a robust, scalable, and secure foundation for managing customers, billing, network provisioning, and support. By combining Next.js API Routes, Drizzle ORM, Better Auth, and PostgreSQL, we achieve a maintainable codebase that can grow with your business. Vercel hosting and Docker-based development ensure reliable deployments and a consistent developer experience. The clear separation of concerns—API routes, services, and database schemas—makes future enhancements straightforward, helping you deliver a full-featured ISP management system quickly and safely.