# Remediation Actions & Safe Automation Design Gate

This document outlines the remediation branches and the architectural safety gate that must be enforced before any future email automation is re-enabled.

---

## 1. Remediation Branches

### 1.1 Branch A — Local Environment Cleanup & Account Separation
1. **Remove Restricted Credentials**: Remove all references to `entitykart@gmail.com` and its App Password from local environment files, configs, and history.
2. **Transition Active Sender**: Keep the active email sender configured to `mdsadiqueamin721721@gmail.com` (or a dedicated custom domain SMTP service like `mail.entitykart.com`) in the shell environment.
3. **Change passwords**: Change the password and rotate Google App Passwords for all accounts associated with local development.

### 1.2 Branch C — Unsafe Automation Architectural Fixes
We will implement the following changes in the `entitykart-enterprise-ecommerce-microservices` project:

1. **Development Sandbox/Test Mode**:
   - Introduce an `app.mail.sandbox-mode` property in `application.yml` (defaulting to `true` in local profiles).
   - When sandbox mode is enabled, `EmailService.java` will skip `mailSender.send()` calls, writing the email HTML body to log files or a local mock directory instead of contacting real Google SMTP servers.
2. **SMTP Failure Database Logging**:
   - Update `EmailService.java` to accept the `NotificationEntity` ID.
   - On SMTP failure (catch `MessagingException`), perform a database write to update the `NotificationEntity` status from `SENT` to `FAILED` and record the exact exception message.
3. **Throttling and Rate Control**:
   - Replace the unconstrained `@Async` pool with a bounded queue and thread rate limiter (e.g. Bucket4j or standard Spring task scheduler throttle) to prevent rapid-fire parallel SMTP requests.

---

## 2. Safe Automation Design Gate Checklist

Before re-enabling any email automation, the development team must verify and sign off on the following:

- [ ] **Legitimate Recipient Source**: All recipient addresses must belong to registered customers who opted in or triggered the action. No scraped lists may be used.
- [ ] **Sandbox Mode Enforcement**: Testing and seeding environments must run with `app.mail.sandbox-mode=true` to block real SMTP connections.
- [ ] **No Deceptive Identities**: From-name and headers must represent `support@entitykart.com` rather than masking personal Gmail addresses.
- [ ] **Rate Limiting**: Bounded rate limit rules must restrict the SMTP dispatch rate to a maximum of 5 emails/minute for personal accounts, or use professional services (SendGrid, Mailgun) for production.
- [ ] **Failed-State Capture**: SMTP transmission failures must update the database notification record to `FAILED`.
- [ ] **Emergency Stop Switch**: A global configuration flag (`app.mail.enabled=false`) must exist to instantly pause all outgoing mail processing in case of a mailing loop or breach.
- [ ] **No Infinite Retries**: Re-queueing failed jobs must have an exponential backoff and a hard retry cap of 3 attempts before moving to a dead-letter queue.
