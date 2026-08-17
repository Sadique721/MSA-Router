# Google Account Access Appeal Package

This document contains the recovery details and appeal package prepared for Google Account recovery services.

---

## 1. Account & Restriction Metadata
- **Target Account**: `entitykart@gmail.com`
- **Restricted Service**: Gmail
- **Google-Stated Reason**: Possible unwanted/spam content detection
- **Previous Review Status**: Completed (access remained restricted on 2026-08-03)

---

## 2. Technical Investigation Summary
An audit of local software, microservice repositories, configurations, and active environments was performed to identify the cause of the spam signal:

1. **Automation Identified**: We identified that our local e-commerce development environment (`entitykart-enterprise-ecommerce-microservices`) was configured to send transactional notifications (order receipts, welcome messages, returns, payment confirmations) using the personal account `entitykart@gmail.com` via SMTP (`smtp.gmail.com:587`) using a Google App Password.
2. **Root Cause**: The local development and database seeding workflows did not include a mail sandbox or rate-limiting filters. When tests were run or databases were seeded, the application used Spring Boot's `@Async` executors to send multiple identical HTML templates to simulated/dummy customer email addresses concurrently. Google's anti-abuse filters flagged this high-frequency automated sending from a personal Gmail account as spam.
3. **No Compromise Detected**: No malicious logins, unknown active OAuth applications, or device compromises were detected in the local repository or active developer environment configurations.

---

## 3. Completed Remediation & Safety Implementation
To ensure permanent compliance and prevent recurrence, the following engineering steps have been completed:

1. **SMTP Configuration Revoked**: All SMTP authentication properties using `entitykart@gmail.com` have been completely removed from our local environments and configurations. The project has been migrated to use sandboxed test addresses.
2. **Development Sandbox Mode**: An `app.mail.sandbox-mode=true` parameter has been implemented. In development and testing profiles, all outgoing SMTP sends are intercepted and logged locally to text files rather than being dispatched to the internet.
3. **SMTP Error Tracking**: Code logic has been updated to capture SMTP transport exceptions and mark database notification records as `FAILED` rather than assuming successful transmission.
4. **Rate Limiting**: Throttling controls have been implemented to ensure that should any future transactional emails be sent, they are sent sequentially with rate caps.

---

## 4. Request for Account Restoration
We truthfully request Google's account security team to perform a manual re-review of `entitykart@gmail.com`. All local automated triggers have been decoupled and purged from this personal account. The account is now used solely for manual administrator sign-ins, and all microservice automation has been sandboxed and migrated.
