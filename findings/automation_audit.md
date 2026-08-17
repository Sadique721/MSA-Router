# Local Project & Automation Audit

This document details the audit of local source code, microservice configurations, and automated workflows related to the restricted email account `entitykart@gmail.com`.

---

## 1. Project Audit: entitykart-enterprise-ecommerce-microservices

The following table summarizes the email configuration and automation characteristics discovered inside the microservices repository:

| Parameter | Configuration Detail |
| :--- | :--- |
| **PROJECT** | `entitykart-enterprise-ecommerce-microservices` |
| **EMAIL_CAPABILITY** | Spring Boot Starter Mail (`JavaMailSender`) hosting 13 custom HTML templates (welcome, password reset, order updates, returns, payment alerts, and admin reports). |
| **AUTOMATION_PRESENT** | Yes, Kafka-driven async consumers (`KafkaNotificationListener.java`) in the `common-services` project. |
| **AUTH_METHOD** | SMTP Authentication using a Google App Password (`spring.mail.password` populated via `MAIL_PASSWORD` environment variable). |
| **RECIPIENT_SOURCE** | Customer email fields parsed directly from Kafka event payloads (e.g. `OrderPlacedEvent`). |
| **SCHEDULE** | Event-driven (triggered instantly on Kafka topic events). |
| **MESSAGE_PATTERN** | Fully structured HTML templates styled with CSS gradients. |
| **RATE_LIMIT** | **None.** Outgoing calls use `@Async` threads which execute concurrently on the Java Executor pool without delay, throttling, or daily sending volume checks. |
| **CONSENT_MODEL** | Transactional/implicit (assumes recipient has triggered the order, registration, or return). No marketing or opt-out unsubscribe headers are attached. |
| **FAILURE_HANDLING** | Logging only. SMTP exceptions (`MessagingException`) are caught and logged to standard error, but do not update the DB state (which remains as `SENT`). |
| **CURRENT_STATUS** | Partially active. The active SMTP sending account has been changed to `mdsadiqueamin721721@gmail.com` in the environment variables to bypass the restricted `entitykart@gmail.com` account. |
| **RISK** | **Medium-High.** Running database seeders or load tests in local development triggers Kafka events that generate real emails to test addresses. The lack of rate limiting or a sandbox flag can result in Google detecting high-volume, rapid-fire SMTP connections from dynamic IPs, triggering anti-abuse blocks. |

---

## 2. Technical Code Flow Analysis

The email sending workflow in `common-services` is structured as follows:

```text
Kafka Event (order-events)
  ↓
KafkaNotificationListener.onOrderEvent(event)
  ↓
NotificationService.handleOrderPlaced(...)
  ↓
NotificationService.sendAndSave(...)
  ├─► Inserts NotificationEntity with status = SENT (Optimistic write)
  └─► Calls EmailService.sendHtmlEmail(...) [@Async fire-and-forget]
        ↓
      JavaMailSender.send(MimeMessage) via smtp.gmail.com:587
        ├─► Success: Logs "✅ Email sent"
        └─► Failure: Logs "❌ Failed to send email" (DB status remains SENT)
```

### Risk Observations:
1. **Optimistic Database Status**: Because the database is updated with `SENT` before SMTP dispatch occurs in a background thread, the application has no visibility into delivery failures. A user querying the admin panel sees all notifications as "Sent", hiding underlying SMTP connection blocks or account restrictions.
2. **Bulk Seeding Triggers**: The `DatabaseSeeder.java` seeds the admin user `mdsadiqueamin721721@gmail.com` and creates default records. If developer-testing scripts generate mock orders in a loop to test transactional flows, the `@Async` executor fires dozens of emails to simulated or unverified customer addresses in seconds, triggering Google's rate-limiting/spam protection on `smtp.gmail.com`.
