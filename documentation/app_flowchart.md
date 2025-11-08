flowchart TD
    A[User Access] --> B[Authentication]
    B --> C[Dashboard]
    C --> D[Customer Management]
    C --> E[Billing and Invoices]
    C --> F[Support Tickets]
    C --> G[CRM and Leads]
    C --> H[Inventory]
    C --> I[Settings]

    subgraph Billing Automation
        J[Cron Job Check Due Invoices] --> K[MikroTik API Isolate Customer]
        K --> L[Notification Service]
    end
    E --> J

    subgraph Payment Integration
        M[Payment Webhook] --> N[Payment Service]
        N --> O{Payment Status}
        O -- Paid --> P[MikroTik API Restore Profile]
        O -- Failed --> Q[Log and Notify]
    end
    M --> E