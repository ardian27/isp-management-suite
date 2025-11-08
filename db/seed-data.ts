import { db } from "./index";
import {
  servicePackages,
  systemConfiguration,
  externalIntegrations,
  scheduledJobs,
  knowledgeBaseArticles,
  cannedResponses,
  serviceLevelAgreements,
  invoiceTemplates,
  mikrotikRouters,
  suppliers
} from "./schema";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Seed Service Packages
    console.log("📦 Seeding service packages...");
    await seedServicePackages();

    // Seed System Configuration
    console.log("⚙️ Seeding system configuration...");
    await seedSystemConfiguration();

    // Seed External Integrations
    console.log("🔗 Seeding external integrations...");
    await seedExternalIntegrations();

    // Seed Scheduled Jobs
    console.log("⏰ Seeding scheduled jobs...");
    await seedScheduledJobs();

    // Seed Knowledge Base
    console.log("📚 Seeding knowledge base...");
    await seedKnowledgeBase();

    // Seed Canned Responses
    console.log("📝 Seeding canned responses...");
    await seedCannedResponses();

    // Seed Service Level Agreements
    console.log("📋 Seeding service level agreements...");
    await seedServiceLevelAgreements();

    // Seed Invoice Templates
    console.log("🧾 Seeding invoice templates...");
    await seedInvoiceTemplates();

    // Seed Suppliers
    console.log("🏢 Seeding suppliers...");
    await seedSuppliers();

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

async function seedServicePackages() {
  const packages = [
    {
      id: "pkg-home-basic",
      name: "Home Basic",
      description: "Package rumah tangga dengan kecepatan standar untuk browsing dan media sosial",
      downloadSpeed: 10,
      uploadSpeed: 5,
      monthlyPrice: "150000.00",
      installationFee: "250000.00",
      fupQuota: 50, // GB
      mikrotikProfile: "home-basic",
      contractPeriod: 12,
      isActive: true,
    },
    {
      id: "pkg-home-standard",
      name: "Home Standard",
      description: "Package rumah tangga dengan kecepatan yang lebih baik untuk streaming dan gaming",
      downloadSpeed: 25,
      uploadSpeed: 10,
      monthlyPrice: "299000.00",
      installationFee: "250000.00",
      fupQuota: 100, // GB
      mikrotikProfile: "home-standard",
      contractPeriod: 12,
      isActive: true,
    },
    {
      id: "pkg-home-premium",
      name: "Home Premium",
      description: "Package rumah tangga premium dengan kecepatan tinggi untuk penggunaan berat",
      downloadSpeed: 50,
      uploadSpeed: 25,
      monthlyPrice: "599000.00",
      installationFee: "350000.00",
      fupQuota: 200, // GB
      mikrotikProfile: "home-premium",
      contractPeriod: 12,
      isActive: true,
    },
    {
      id: "pkg-business-basic",
      name: "Business Basic",
      description: "Package bisnis kecil dengan kecepatan andal dan stabil",
      downloadSpeed: 25,
      uploadSpeed: 25,
      monthlyPrice: "450000.00",
      installationFee: "500000.00",
      fupQuota: 150, // GB
      mikrotikProfile: "business-basic",
      contractPeriod: 24,
      isActive: true,
    },
    {
      id: "pkg-business-standard",
      name: "Business Standard",
      description: "Package bisnis dengan performa tinggi dan dedicated bandwidth",
      downloadSpeed: 100,
      uploadSpeed: 100,
      monthlyPrice: "1500000.00",
      installationFee: "750000.00",
      mikrotikProfile: "business-standard",
      contractPeriod: 24,
      isActive: true,
    },
    {
      id: "pkg-enterprise",
      name: "Enterprise",
      description: "Package enterprise dengan dedicated fiber dan support 24/7",
      downloadSpeed: 500,
      uploadSpeed: 500,
      monthlyPrice: "7500000.00",
      installationFee: "2500000.00",
      mikrotikProfile: "enterprise",
      contractPeriod: 36,
      isActive: true,
    },
  ];

  await db.insert(servicePackages).values(packages).onConflictDoNothing();
}

async function seedSystemConfiguration() {
  const configs = [
    // General settings
    {
      id: "general-company-name",
      category: "general",
      key: "company_name",
      value: "ISP Management System",
      description: "Nama perusahaan ISP",
      valueType: "string",
      isPublic: true,
      isRequired: true,
    },
    {
      id: "general-company-address",
      category: "general",
      key: "company_address",
      value: "Jakarta, Indonesia",
      description: "Alamat perusahaan",
      valueType: "string",
      isPublic: true,
    },
    {
      id: "general-company-phone",
      category: "general",
      key: "company_phone",
      value: "+6221-1234-5678",
      description: "Nomor telepon perusahaan",
      valueType: "string",
      isPublic: true,
    },
    {
      id: "general-company-email",
      category: "general",
      key: "company_email",
      value: "support@yourisp.com",
      description: "Email perusahaan",
      valueType: "string",
      isPublic: true,
    },

    // MikroTik settings
    {
      id: "mikrotik-default-profiles",
      category: "mikrotik",
      key: "default_profiles",
      value: JSON.stringify({
        active: "active-customers",
        isolated: "isolated-customers",
        suspended: "suspended-customers",
      }),
      description: "Default MikroTik profile names",
      valueType: "json",
    },
    {
      id: "mikrotik-connection-timeout",
      category: "mikrotik",
      key: "connection_timeout",
      value: "30",
      description: "MikroTik API connection timeout in seconds",
      valueType: "number",
    },

    // Payment settings
    {
      id: "payment-invoice-generation-day",
      category: "payment_gateway",
      key: "invoice_generation_day",
      value: "20",
      description: "Day of month to generate invoices (1-31)",
      valueType: "number",
      isRequired: true,
    },
    {
      id: "payment-due-days",
      category: "payment_gateway",
      key: "payment_due_days",
      value: "7",
      description: "Number of days until payment is due",
      valueType: "number",
      isRequired: true,
    },
    {
      id: "payment-isolation-days",
      category: "payment_gateway",
      key: "isolation_grace_days",
      value: "3",
      description: "Grace period days before isolation",
      valueType: "number",
      isRequired: true,
    },
    {
      id: "payment-tax-rate",
      category: "payment_gateway",
      key: "tax_rate",
      value: "0.11",
      description: "Tax rate (0.11 for 11% VAT)",
      valueType: "number",
      isRequired: true,
    },

    // Email settings
    {
      id: "email-from-address",
      category: "email",
      key: "from_address",
      value: "noreply@yourisp.com",
      description: "Default from email address",
      valueType: "string",
      isRequired: true,
    },
    {
      id: "email-from-name",
      category: "email",
      key: "from_name",
      value: "ISP Management System",
      description: "Default from email name",
      valueType: "string",
      isRequired: true,
    },

    // Security settings
    {
      id: "security-session-timeout",
      category: "security",
      key: "session_timeout_minutes",
      value: "480",
      description: "User session timeout in minutes (8 hours)",
      valueType: "number",
    },
    {
      id: "security-password-min-length",
      category: "security",
      key: "password_min_length",
      value: "8",
      description: "Minimum password length",
      valueType: "number",
      isRequired: true,
    },
  ];

  await db.insert(systemConfiguration).values(configs).onConflictDoNothing();
}

async function seedExternalIntegrations() {
  const integrations = [
    {
      id: "integration-xendit",
      name: "Xendit Payment Gateway",
      type: "payment_gateway",
      provider: "xendit",
      description: "Payment gateway integration for Indonesia",
      configuration: {
        environment: "sandbox",
        supported_methods: ["va", "ewallet", "retail", "qris", "cc"],
        va_banks: ["bca", "bni", "bri", "mandiri"],
        ewallets: ["gopay", "ovo", "dana", "shopeepay"],
        retail_outlets: ["alfamart", "indomaret"],
      },
      settings: {
        auto_reconciliation: true,
        webhook_timeout: 30,
        retry_attempts: 3,
      },
      isActive: false, // Disabled until configured
      status: "disconnected",
    },
    {
      id: "integration-midtrans",
      name: "Midtrans Payment Gateway",
      type: "payment_gateway",
      provider: "midtrans",
      description: "Alternative payment gateway for Indonesia",
      configuration: {
        environment: "sandbox",
        supported_methods: ["va", "ewallet", "retail", "qris", "cc"],
        va_banks: ["bca", "bni", "bri", "mandiri", "cimb", "permata"],
        ewallets: ["gopay", "ovo", "dana", "shopeepay", "akulaku"],
        retail_outlets: ["alfamart", "indomaret"],
      },
      settings: {
        auto_reconciliation: true,
        webhook_timeout: 30,
        retry_attempts: 3,
      },
      isActive: false,
      status: "disconnected",
    },
    {
      id: "integration-whatsapp",
      name: "WhatsApp Business API",
      type: "whatsapp_api",
      provider: "twilio", // or other provider
      description: "WhatsApp notifications for customers and staff",
      configuration: {
        phone_number_id: "",
        access_token: "",
        webhook_url: "",
        template_approval_required: true,
      },
      settings: {
        rate_limit_per_hour: 1000,
        auto_retry_failed_messages: true,
        max_retry_attempts: 3,
      },
      isActive: false,
      status: "disconnected",
    },
    {
      id: "integration-telegram",
      name: "Telegram Bot",
      type: "telegram_bot",
      provider: "telegram",
      description: "Telegram notifications for staff and system alerts",
      configuration: {
        bot_token: "",
        webhook_url: "",
        allowed_chat_ids: [],
      },
      settings: {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        enable_notifications: true,
      },
      isActive: false,
      status: "disconnected",
    },
    {
      id: "integration-google-maps",
      name: "Google Maps API",
      type: "google_maps",
      provider: "google",
      description: "Maps integration for coverage and location services",
      configuration: {
        api_key: "",
        maps_javascript_api: true,
        geocoding_api: true,
        places_api: true,
      },
      settings: {
        default_center: "-6.2088,106.8456", // Jakarta
        default_zoom: 12,
        enable_geolocation: true,
      },
      isActive: false,
      status: "disconnected",
    },
  ];

  await db.insert(externalIntegrations).values(integrations).onConflictDoNothing();
}

async function seedScheduledJobs() {
  const jobs = [
    {
      id: "job-invoice-generation",
      name: "Monthly Invoice Generation",
      description: "Generate invoices for all active customers",
      jobType: "invoice_generation",
      frequency: "monthly",
      cronExpression: "0 2 20 * *", // 2 AM on 20th of each month
      timezone: "Asia/Jakarta",
      startDate: new Date(),
      maxRetries: 3,
      retryDelay: 900, // 15 minutes
      timeoutSeconds: 3600, // 1 hour
      configuration: {
        generate_immediately: true,
        send_email_notifications: true,
        create_payment_links: true,
      },
      isActive: true,
      status: "pending",
      notifyOnFailure: true,
      notificationRecipients: ["admin", "finance"],
    },
    {
      id: "job-payment-reconciliation",
      name: "Payment Reconciliation",
      description: "Process payment notifications and update invoice status",
      jobType: "payment_reconciliation",
      frequency: "daily",
      cronExpression: "*/15 6-22 * * *", // Every 15 minutes from 6 AM to 10 PM
      timezone: "Asia/Jakarta",
      startDate: new Date(),
      maxRetries: 3,
      retryDelay: 300, // 5 minutes
      timeoutSeconds: 1800, // 30 minutes
      configuration: {
        auto_process_payments: true,
        activate_customers: true,
        send_confirmations: true,
      },
      isActive: true,
      status: "pending",
      notifyOnFailure: true,
      notificationRecipients: ["admin", "finance"],
    },
    {
      id: "job-service-isolation",
      name: "Service Isolation Check",
      description: "Isolate customers with overdue payments",
      jobType: "service_isolation",
      frequency: "daily",
      cronExpression: "0 21 * * *", // 9 PM daily
      timezone: "Asia/Jakarta",
      startDate: new Date(),
      maxRetries: 3,
      retryDelay: 600, // 10 minutes
      timeoutSeconds: 3600, // 1 hour
      configuration: {
        check_overdue_invoices: true,
        send_reminders: true,
        auto_isolate: true,
        grace_period_days: 3,
      },
      isActive: true,
      status: "pending",
      notifyOnFailure: true,
      notificationRecipients: ["admin", "finance", "technical"],
    },
    {
      id: "job-backup-database",
      name: "Database Backup",
      description: "Backup the main database",
      jobType: "backup",
      frequency: "daily",
      cronExpression: "0 3 * * *", // 3 AM daily
      timezone: "Asia/Jakarta",
      startDate: new Date(),
      maxRetries: 2,
      retryDelay: 1800, // 30 minutes
      timeoutSeconds: 7200, // 2 hours
      configuration: {
        backup_type: "full",
        retention_days: 30,
        compression: true,
        upload_to_cloud: false,
      },
      isActive: true,
      status: "pending",
      notifyOnFailure: true,
      notificationRecipients: ["admin"],
    },
    {
      id: "job-revenue-reports",
      name: "Monthly Revenue Reports",
      description: "Generate monthly revenue and performance reports",
      jobType: "report_generation",
      frequency: "monthly",
      cronExpression: "0 6 1 * *", // 6 AM on 1st of each month
      timezone: "Asia/Jakarta",
      startDate: new Date(),
      maxRetries: 2,
      retryDelay: 900, // 15 minutes
      timeoutSeconds: 1800, // 30 minutes
      configuration: {
        include_charts: true,
        send_email: true,
        recipients: ["admin", "finance", "management"],
      },
      isActive: true,
      status: "pending",
      notifyOnFailure: true,
      notificationRecipients: ["admin"],
    },
  ];

  await db.insert(scheduledJobs).values(jobs).onConflictDoNothing();
}

async function seedKnowledgeBase() {
  const articles = [
    {
      id: "kb-troubleshooting-no-internet",
      title: "Tidak Ada Koneksi Internet - Panduan Pemecahan Masalah",
      slug: "troubleshooting-no-internet",
      content: `# Tidak Ada Koneksi Internet

## Langkah 1: Periksa Koneksi Fisik
- Pastikan kabel LAN terhubung dengan baik
- Periksa lampu indikator pada router/ONT
- Restart perangkat router/ONT

## Langkah 2: Periksa Konfigurasi Perangkat
- Buka pengaturan jaringan pada perangkat
- Periksa apakah DHCP aktif
- Coba ganti DNS ke 8.8.8.8 atau 1.1.1.1

## Langkah 3: Test Koneksi
- Buka command prompt dan ping ke 8.8.8.8
- Coba akses website lain
- Periksa status PPPoE

## Kapan Harus Menghubungi Support
- Setelah mencoba semua langkah di atas
- Jika masalah terjadi pada beberapa perangkat
- Jika lampu indikator router mati/berkedip merah`,
      excerpt: "Panduan lengkap untuk mengatasi masalah koneksi internet yang tidak berfungsi",
      category: "connection_troubleshooting",
      tags: ["koneksi", "internet", "troubleshooting", "router"],
      difficulty: "beginner",
      isPublished: true,
      featured: true,
      author: "admin",
    },
    {
      id: "kb-setup-router-mikrotik",
      title: "Panduan Setup Router MikroTik untuk Pelanggan",
      slug: "setup-router-mikrotik",
      content: `# Setup Router MikroTik

## Persiapan
- Username dan password PPPoE dari ISP
- Kabel LAN dan kabel power
- Laptop/PC untuk konfigurasi awal

## Langkah Setup
1. Hubungkan laptop ke router via kabel LAN
2. Buka WinBox atau WebFig
3. Login dengan default credentials (admin/blank)
4. Buka menu PPP > Secrets
5. Klik tombol + untuk menambah PPPoE secret baru
6. Isi:
   - Name: [Username PPPoE]
   - Password: [Password PPPoE]
   - Service: pppoe
   - Profile: [Profile yang diberikan ISP]
7. Klik OK

## Pengaturan WiFi (jika router mendukung)
1. Buka menu Wireless
2. Klik double pada interface wireless
3. Konfigurasi:
   - Mode: ap bridge
   - SSID: [Nama WiFi yang diinginkan]
   - Security: WPA2-PSK
   - WPA2 Pre-Shared Key: [Password WiFi]
4. Klik OK

## Test Koneksi
Hubungkan perangkat ke WiFi dan buka browser untuk test koneksi.`,
      excerpt: "Panduan lengkap setup router MikroTik untuk koneksi internet ISP",
      category: "setup_guides",
      tags: ["mikrotik", "router", "setup", "pppoe", "wifi"],
      difficulty: "intermediate",
      isPublished: true,
      author: "admin",
    },
    {
      id: "kb-payment-methods",
      title: "Metode Pembayaran yang Tersedia",
      slug: "payment-methods",
      content: `# Metode Pembayaran

## Virtual Account
- **BCA Virtual Account**: Transfer melalui ATM, mobile banking, atau internet banking BCA
- **BNI Virtual Account**: Transfer melalui layanan BNI
- **BRI Virtual Account**: Transfer melalui layanan BRI
- **Mandiri Virtual Account**: Transfer melalui layanan Mandiri

## E-Wallet
- **GoPay**: Pembayaran melalui aplikasi GoJek
- **OVO**: Pembayaran melalui aplikasi OVO
- **DANA**: Pembayaran melalui aplikasi DANA
- **ShopeePay**: Pembayaran melalui aplikasi Shopee

## Retail Outlet
- **Alfamart**: Pembayaran tunai di gerai Alfamart terdekat
- **Indomaret**: Pembayaran tunai di gerai Indomaret terdekat

## QRIS
- Scan QRIS menggunakan aplikasi pembayaran yang mendukung QRIS

## Transfer Bank
- Transfer langsung ke rekening perusahaan
- Konfirmasi pembayaran ke customer service

## Panduan Pembayaran
1. Pilih metode pembayaran yang diinginkan
2. Ikuti instruksi yang diberikan
3. Simpan bukti pembayaran
4. Konfirmasi jika diperlukan`,
      excerpt: "Informasi lengkap metode pembayaran yang tersedia untuk pelanggan",
      category: "billing_faqs",
      tags: ["pembayaran", "payment", "va", "ewallet", "qris"],
      difficulty: "beginner",
      isPublished: true,
      author: "admin",
    },
  ];

  await db.insert(knowledgeBaseArticles).values(articles).onConflictDoNothing();
}

async function seedCannedResponses() {
  const responses = [
    {
      id: "response-welcome-greeting",
      name: "Salam Pembuka",
      title: "Terima kasih telah menghubungi kami",
      subject: "Terima kasih telah menghubungi ISP Support",
      message: `Halo [Nama Pelanggan],

Terima kasih telah menghubungi layanan support kami. Saya [Nama Staff] akan membantu menyelesaikan masalah Anda.

Untuk mempermudah proses penanganan, mohon berikan informasi berikut:
- Nomor pelanggan/ID pelanggan
- Detail masalah yang dialami
- Waktu terakhir koneksi normal
- Sudahkah melakukan restart router?

Mohon ditunggu, saya akan segera membantu Anda.

Salam,
[Nama Staff]
ISP Support Team`,
      category: "greetings",
      tags: ["salam", "pembuka", "welcome"],
      isActive: true,
      createdBy: "admin",
    },
    {
      id: "response-password-reset",
      name: "Reset Password PPPoE",
      title: "Reset password PPPoE pelanggan",
      subject: "Reset Password PPPoE - [Nomor Tiket]",
      message: `Halo [Nama Pelanggan],

Berdasarkan permintaan Anda melalui tiket #[Nomor Tiket], kami telah melakukan reset password PPPoE untuk akun Anda.

**Informasi Akun Baru:**
- Username: [Username PPPoE]
- Password: [Password Baru]
- Profil: [Nama Profil]

**Panduan Setup Ulang:**
1. Buka pengaturan jaringan pada perangkat
2. Pilih PPPoE/DSL connection
3. Masukkan username dan password baru
4. Klik Connect/Dial

Password sementara ini berlaku selama 24 jam. Untuk keamanan, Anda dapat mengubah password melalui portal pelanggan.

Jika mengalami kesulitan, silakan hubungi kami kembali.

Terima kasih,
[Nama Staff]
ISP Support Team`,
      category: "account_management",
      tags: ["password", "pppoe", "reset", "akun"],
      isActive: true,
      createdBy: "admin",
    },
    {
      id: "response-schedule-visit",
      name: "Penjadwalan Kunjungan Teknisi",
      title: "Konfirmasi jadwal kunjungan teknisi",
      subject: "Jadwal Kunjungan Teknisi - [Nomor Tiket]",
      message: `Halo [Nama Pelanggan],

Berdasarkan laporan Anda melalui tiket #[Nomor Tiket], kami telah menjadwalkan kunjungan teknisi untuk membantu menyelesaikan masalah Anda.

**Detail Kunjungan:**
- Tanggal: [Tanggal Kunjungan]
- Waktu: [Waktu Kunjungan]
- Nama Teknisi: [Nama Teknisi]
- Kontak Teknisi: [Nomor HP Teknisi]

**Persiapan:**
1. Pastikan ada orang di lokasi pada waktu yang ditentukan
2. Siapkan akses ke perangkat router/ONT
3. Siapkan informasi akun jika diperlukan
4. Pastikan alamat lengkap dan patokan jelas

**Biaya:**
- Kunjungan rumah: Rp [Biaya Kunjungan]
- Jika ada penggantian perangkat akan dikenakan biaya tambahan

Teknisi kami akan menghubungi Anda 1 jam sebelum kedatangan.

Jika perlu mengubah jadwal, mohon informasikan paling lambat 2 jam sebelum waktu yang ditentukan.

Terima kasih,
[Nama Staff]
ISP Support Team`,
      category: "technical_support",
      tags: ["teknisi", "kunjungan", "jadwal", "onsite"],
      isActive: true,
      createdBy: "admin",
    },
  ];

  await db.insert(cannedResponses).values(responses).onConflictDoNothing();
}

async function seedServiceLevelAgreements() {
  const slas = [
    {
      id: "sla-critical-issues",
      name: "Critical Issues - Network Outage",
      description: "SLA untuk masalah kritis yang mengganggu layanan",
      ticketCategory: "network_outage",
      priority: "critical",
      initialResponseTime: 1, // 1 hour
      resolutionTime: 4, // 4 hours
      businessHoursOnly: false, // 24/7
      businessDaysOnly: false,
      escalationRules: [
        {
          level: 1,
          time: 2, // hours
          escalate_to: "network_manager",
          action: "notify_management"
        },
        {
          level: 2,
          time: 4, // hours
          escalate_to: "cto",
          action: "urgent_escalation"
        }
      ],
      isActive: true,
      createdBy: "admin",
    },
    {
      id: "sla-high-priority",
      name: "High Priority Issues",
      description: "SLA untuk masalah prioritas tinggi",
      ticketCategory: "connection_issue",
      priority: "high",
      initialResponseTime: 2, // 2 hours
      resolutionTime: 8, // 8 hours
      businessHoursOnly: true,
      businessDaysOnly: true,
      businessHoursStart: "08:00",
      businessHoursEnd: "20:00",
      escalationRules: [
        {
          level: 1,
          time: 4, // hours
          escalate_to: "team_lead",
          action: "review_and_assist"
        },
        {
          level: 2,
          time: 8, // hours
          escalate_to: "manager",
          action: "management_review"
        }
      ],
      isActive: true,
      createdBy: "admin",
    },
    {
      id: "sla-normal-priority",
      name: "Normal Priority Issues",
      description: "SLA untuk masalah prioritas normal",
      ticketCategory: "connection_issue",
      priority: "normal",
      initialResponseTime: 8, // 8 hours
      resolutionTime: 48, // 48 hours
      businessHoursOnly: true,
      businessDaysOnly: true,
      businessHoursStart: "08:00",
      businessHoursEnd: "20:00",
      escalationRules: [
        {
          level: 1,
          time: 24, // hours
          escalate_to: "team_lead",
          action: "review_progress"
        }
      ],
      isActive: true,
      createdBy: "admin",
    },
    {
      id: "sla-billing-issues",
      name: "Billing and Payment Issues",
      description: "SLA untuk masalah penagihan dan pembayaran",
      ticketCategory: "billing_issue",
      priority: "high",
      initialResponseTime: 4, // 4 hours
      resolutionTime: 24, // 24 hours
      businessHoursOnly: true,
      businessDaysOnly: true,
      businessHoursStart: "08:00",
      businessHoursEnd: "17:00",
      escalationRules: [
        {
          level: 1,
          time: 8, // hours
          escalate_to: "finance_manager",
          action: "review_billing_issue"
        }
      ],
      isActive: true,
      createdBy: "admin",
    },
  ];

  await db.insert(serviceLevelAgreements).values(slas).onConflictDoNothing();
}

async function seedInvoiceTemplates() {
  const templates = [
    {
      id: "template-standard-invoice",
      name: "Standard Invoice Template",
      description: "Template invoice standar untuk bulanan",
      htmlTemplate: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #[Invoice Number]</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 20px; }
        .company-info { float: left; }
        .invoice-info { float: right; text-align: right; }
        .clear { clear: both; }
        .customer-info { margin: 20px 0; }
        .invoice-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .invoice-items th, .invoice-items td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .invoice-items th { background-color: #f8f9fa; }
        .total-section { text-align: right; margin: 20px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h2>{{company_name}}</h2>
            <p>{{company_address}}</p>
            <p>Phone: {{company_phone}}</p>
            <p>Email: {{company_email}}</p>
        </div>
        <div class="invoice-info">
            <h1>INVOICE</h1>
            <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
            <p><strong>Invoice Date:</strong> {{invoice_date}}</p>
            <p><strong>Due Date:</strong> {{due_date}}</p>
            <p><strong>Status:</strong> {{status}}</p>
        </div>
        <div class="clear"></div>
    </div>

    <div class="customer-info">
        <h3>Bill To:</h3>
        <p><strong>{{customer_name}}</strong></p>
        <p>{{customer_address}}</p>
        <p>Phone: {{customer_phone}}</p>
        <p>Email: {{customer_email}}</p>
        <p>Customer ID: {{customer_number}}</p>
    </div>

    <h3>Service Period: {{period_start}} to {{period_end}}</h3>

    <table class="invoice-items">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            {{#each items}}
            <tr>
                <td>{{description}}</td>
                <td>{{quantity}}</td>
                <td>Rp {{format_number unit_price}}</td>
                <td>Rp {{format_number total}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div class="total-section">
        <p><strong>Subtotal:</strong> Rp {{format_number subtotal}}</p>
        <p><strong>Tax (11%):</strong> Rp {{format_number tax_amount}}</p>
        <p><strong>Total:</strong> Rp {{format_number total}}</p>
    </div>

    <div class="footer">
        <p><strong>Payment Information:</strong></p>
        <p>Transfer Bank: {{bank_name}} - {{bank_account}}</p>
        <p>Virtual Account available upon request</p>
        <p>E-Wallet: GoPay, OVO, DANA, ShopeePay</p>
        <p>Retail: Alfamart, Indomaret</p>
        <hr>
        <p>This invoice is automatically generated. Please contact us if you have any questions.</p>
    </div>
</body>
</html>`,
      textTemplate: `INVOICE #[Invoice Number]

Company: {{company_name}}
Address: {{company_address}}
Phone: {{company_phone}}
Email: {{company_email}}

Bill To:
{{customer_name}}
{{customer_address}}
Phone: {{customer_phone}}
Email: {{customer_email}}
Customer ID: {{customer_number}}

Invoice Details:
Invoice Number: {{invoice_number}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Status: {{status}}
Service Period: {{period_start}} to {{period_end}}

Items:
{{#each items}}
- {{description}}: {{quantity}} x Rp {{format_number unit_price}} = Rp {{format_number total}}
{{/each}}

Subtotal: Rp {{format_number subtotal}}
Tax (11%): Rp {{format_number tax_amount}}
Total: Rp {{format_number total}}

Payment Methods:
- Transfer Bank: {{bank_name}} - {{bank_account}}
- Virtual Account available upon request
- E-Wallet: GoPay, OVO, DANA, ShopeePay
- Retail: Alfamart, Indomaret

Thank you for your business!`,
      variables: ["invoice_number", "invoice_date", "due_date", "status", "company_name", "company_address", "company_phone", "company_email", "customer_name", "customer_address", "customer_phone", "customer_email", "customer_number", "period_start", "period_end", "items", "subtotal", "tax_amount", "total", "bank_name", "bank_account"],
      isDefault: true,
      isActive: true,
      createdBy: "admin",
    },
  ];

  await db.insert(invoiceTemplates).values(templates).onConflictDoNothing();
}

async function seedSuppliers() {
  const suppliers = [
    {
      id: "supplier-telkom-indonesia",
      name: "PT Telkom Indonesia Tbk",
      code: "TELKOM",
      contactPerson: "Sales Division",
      email: "sales@telkom.co.id",
      phone: "021-5700800",
      website: "https://www.telkom.co.id",
      address: "Jl. Gatot Subroto Kav. 52, Jakarta Selatan 12710",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12710",
      country: "Indonesia",
      taxId: "01.742.054.1-069.000",
      businessLicense: "SIUP: 0834/03-11/PK/III/2014",
      paymentTerms: "Net 30",
      deliveryTerms: "FOB Jakarta",
      rating: 5,
      isActive: true,
      isPreferred: true,
      bankName: "BCA",
      bankAccount: "0123456789",
      bankAccountName: "PT Telkom Indonesia Tbk",
      tags: ["telekomunikasi", "jaringan", "infrastruktur"],
    },
    {
      id: "supplier-indosat-ooredoo",
      name: "PT Indosat Tbk",
      code: "INDOSAT",
      contactPerson: "B2B Sales",
      email: "enterprise@indosatooredoo.com",
      phone: "021-5747333",
      website: "https://www.indosatooredoo.com",
      address: "Jl. Medan Merdeka Barat No. 21, Jakarta Pusat 10110",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postalCode: "10110",
      country: "Indonesia",
      taxId: "01.744.059.0-054.000",
      businessLicense: "SIUP: 1021/11-18/PK/XI/2014",
      paymentTerms: "Net 30",
      deliveryTerms: "FOB Jakarta",
      rating: 4,
      isActive: true,
      isPreferred: false,
      bankName: "Mandiri",
      bankAccount: "1234567890",
      bankAccountName: "PT Indosat Tbk",
      tags: ["telekomunikasi", "internet", "mobile"],
    },
    {
      id: "supplier-mikrotik-indonesia",
      name: "PT Mikrotik Indonesia",
      code: "MIKROTIK",
      contactPerson: "Distributor Support",
      email: "sales@mikrotik.co.id",
      phone: "021-58909933",
      website: "https://mikrotik.co.id",
      address: "Ruko Golden Boulevard Blok D No. 12-13, BSD City, Tangerang 15339",
      city: "Tangerang",
      province: "Banten",
      postalCode: "15339",
      country: "Indonesia",
      taxId: "91.783.456.7-123.000",
      businessLicense: "SIUP: 4567/08-22/PK/VIII/2018",
      paymentTerms: "Net 14",
      deliveryTerms: "FOB Tangerang",
      rating: 5,
      isActive: true,
      isPreferred: true,
      bankName: "BCA",
      bankAccount: "9876543210",
      bankAccountName: "PT Mikrotik Indonesia",
      tags: ["router", "networking", "mikrotik", "perangkat"],
    },
    {
      id: "supplier-alcatel-lucent",
      name: "PT Alcatel-Lucent Indonesia",
      code: "ALCATEL",
      contactPerson: "Network Solutions",
      email: "sales.id@alcatel-lucent.com",
      phone: "021-5748511",
      website: "https://www.alcatel-lucent.com",
      address: "Wisma Mulia Lt. 7, Jl. Gatot Subroto No. 42, Jakarta Selatan 12710",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12710",
      country: "Indonesia",
      taxId: "01.234.567.8-091.000",
      businessLicense: "SIUP: 3456/04-15/PK/II/2016",
      paymentTerms: "Net 30",
      deliveryTerms: "FOB Jakarta",
      rating: 4,
      isActive: true,
      isPreferred: false,
      bankName: "HSBC",
      bankAccount: "2468135790",
      bankAccountName: "PT Alcatel-Lucent Indonesia",
      tags: ["ont", "fiber", "alcatel", "perangkat"],
    },
  ];

  await db.insert(suppliers).values(suppliers).onConflictDoNothing();
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("🎉 Seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}