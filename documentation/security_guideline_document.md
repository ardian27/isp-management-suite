# ISP Management Suite Security Guidelines

This document outlines security best practices and guidelines tailored for the **isp-management-suite** starter template. Adhering to these practices will help ensure the system you build is robust, resilient, and maintains the confidentiality, integrity, and availability of customer and operational data.

---

## 1. Security-by-Design & Threat Modeling

- **Embed security early**: Incorporate threat modeling in the design phase. Identify high-value assets (customer PII, billing data, MikroTik credentials) and potential attackers (malicious admins, external attackers).
- **Least Privilege**: Grant each service, user, and API only the permissions required for its role. Avoid broad database or router credentials.
- **Defense in Depth**: Layered controls—from network ACLs to application-level authorization checks—so that a failure at one layer does not compromise the whole system.

## 2. Authentication & Authorization

- **Better Auth Configuration**:
  - Enforce strong password policies (minimum length ≥ 12, mixed character classes, rotation reminders).
  - Hash passwords with Argon2 or bcrypt and a unique per-user salt.
  - Implement account lockout or CAPTCHA after repeated failed login attempts.
- **Session Management**:
  - Use secure, unpredictable session IDs stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
  - Enforce both idle (e.g., 30m) and absolute (e.g., 24h) session timeouts.
  - Invalidate sessions on logout or password change to mitigate session fixation.
- **Role-Based Access Control (RBAC)**:
  - Define explicit roles (Admin, Finance, Technician, Sales) and map them to granular permissions.
  - Enforce server-side checks on every protected API route and page before executing business logic.
- **Multi-Factor Authentication (MFA)** (optional but recommended for Admin and Finance roles).

## 3. Input Validation & Output Encoding

- **Server-Side Validation** with Zod:
  - Validate all Next.js API route inputs (JSON bodies, query parameters, path params).
  - Whitelist acceptable values (e.g., package tiers, status codes) to prevent forced enumeration.
- **Prevent Injection**:
  - Use Drizzle ORM’s parameterized queries—never interpolate raw values into SQL.
  - Sanitize any data used in shell commands or external requests.
- **XSS & Template Injection**:
  - Escape or encode user‐supplied data before rendering in React or server‐side templates.
  - Employ a strict Content Security Policy (CSP).

## 4. API & Service Security

- **Transport Security**:
  - Enforce HTTPS (TLS 1.2+) for all frontend, API, and MikroTik connections.
- **CORS Policy**:
  - Restrict origins to your application domain and trusted subdomains.
- **Authentication for Webhooks**:
  - Validate payment gateway signatures or secrets on incoming webhooks.
  - Rate-limit webhook endpoints to mitigate flood attacks.
- **Rate Limiting & Throttling**:
  - Apply per-IP and per-user rate limiting on sensitive API routes (login, provisioning).
- **API Versioning**:
  - Prefix routes (e.g., `/api/v1/customers`) to manage future changes securely.

## 5. Integration Security

- **MikroTik API**:
  - Store credentials in secrets manager or environment variables—not in code.
  - Use a dedicated limited-privilege router account for provisioning tasks.
  - Isolate the management network or VPN exposing the ROS API.
- **Payment Gateway**:
  - Keep gateway secrets in environment variables protected by your deployment platform.
  - Verify IP allow-lists for webhook source addresses if supported.
- **Notification Channels**:
  - Rate-limit outgoing notifications to prevent API abuse.
  - Avoid logging full PII in external messages.

## 6. Data Protection & Privacy

- **Encryption**:
  - TLS for in-transit data.
  - Encrypt backups and database volumes at rest (AES-256).
- **PII Handling**:
  - Store only the necessary PII fields; mask or redact in logs and error messages.
  - Comply with local data protection (GDPR/CCPA) regarding data retention and deletion.
- **Secrets Management**:
  - Use Vercel Environment Variables, AWS Secrets Manager, or HashiCorp Vault—never commit secrets to Git.

## 7. Web Application Security Hygiene

- **Secure HTTP Headers**:
  - `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- **CSRF Protection**:
  - Use synchronizer tokens or double-submit cookies on all state-changing requests.
- **Cookie Hardening**:
  - Set `HttpOnly`, `Secure`, `SameSite=Strict` for session and refresh tokens.
- **Subresource Integrity (SRI)**:
  - Apply `integrity` attributes when loading any external scripts.

## 8. Infrastructure & Deployment

- **Docker Hardening**:
  - Use minimal official Node.js and PostgreSQL images.
  - Drop unnecessary Linux capabilities; run as non‐root user.
- **Vercel Best Practices**:
  - Enforce HTTPS-only traffic.
  - Protect Cron Job routes with a secret header or token.
  - Disable unused endpoints and features in production.
- **Server Configuration**:
  - Regularly patch OS, Docker Engine, and runtime dependencies.
  - Close unused ports; enable host-level firewalls.

## 9. Dependency Management & Testing

- **Secure Dependencies**:
  - Maintain `package-lock.json`; audit with `npm audit` or SCA tools.
  - Remove unused packages to shrink the attack surface.
- **Continuous Integration**:
  - Integrate static analysis (ESLint, TypeScript strict mode).
  - Run security linters (e.g., DependaBot, Snyk) on PRs.
- **Testing**:
  - Unit tests for business logic (invoice calculations, provisioning flows).
  - Integration tests for API–database interactions.
  - End-to-end tests (Playwright/Cypress) covering: user signup, payment flow, automated isolation/restoration.

## 10. Logging, Monitoring & Incident Response

- **Centralized Logging**:
  - Use Sentry, Logtail, or similar—avoid logging sensitive PII.
- **Audit Trail**:
  - Record critical operations (user role changes, invoice generation, PPPoE commands) to an `audit_logs` table.
- **Alerts & Incident Handling**:
  - Define SLAs for security alerts.
  - Prepare playbooks for credential compromise, data breach, or service outage.

---

Maintaining a secure system is an ongoing effort. Regularly review these guidelines, keep dependencies up to date, perform periodic security assessments, and train your team on emerging threats and best practices.