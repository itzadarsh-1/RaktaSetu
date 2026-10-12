# RaktaSetu: Real-email password reset setup

Added to your existing project (all donor/requester/admin functionality retained):

- Public `/forgot-password` form; POST sends a one-time link to an already registered email.
- Public `/reset-password?token=...` form; sets a new BCrypt-hashed password.
- `password_reset_tokens` table is created by Hibernate (`ddl-auto=update`). Only SHA-256 hashes of reset tokens are stored, never raw reset links.
- Reset links expire after **15 minutes**, can be used **once**, and each account is limited to one reset email per minute.
- Public form gives the same confirmation whether an email exists or not.

## 1. Before running

Use a real Gmail inbox as your **sender**. Enable Google account 2-Step Verification, then (if App Passwords are available for your account) create a Gmail **App Password**. Normal Gmail account passwords are not SMTP app passwords. Do **not** paste any passwords into GitHub or `application.properties`.

Set environment variables in the **same PowerShell window** where you run Maven:

```powershell
$env:DB_USER = 'root'
$env:DB_PASSWORD = Read-Host 'MySQL password'
$env:SMTP_USERNAME = 'YOUR_SENDER@gmail.com'
$env:SMTP_PASSWORD = Read-Host 'Gmail App Password'
$env:MAIL_FROM = $env:SMTP_USERNAME
$env:APP_BASE_URL = 'http://localhost:8080'
mvn clean package
mvn spring-boot:run
```

Replace `YOUR_SENDER@gmail.com` with the email that sends reset links. `$env:SMTP_PASSWORD` is your Gmail **App Password** (not normal Google password). These PowerShell variables apply only to the current terminal. For deployed usage, configure secure environment secrets and a public HTTPS `APP_BASE_URL`.

**Important:** The recipient must already have a real accessible email registered in the RaktaSetu `users` table. Demo addresses such as `admin@raktasetu.local` are not real inboxes. To use password reset for admin, make the admin's stored email a real address that only you control, via an authorized admin account-management flow or a carefully controlled one-time database migration. Changing `RAKTASETU_ADMIN_EMAIL` after seeding does **not** rename an existing admin user.

## 2. Demo in your browser

1. Visit `http://localhost:8080/login`.
2. Click **Forgot Password?**
3. Enter an **already-registered real email**; submit.
4. Open the email in your inbox (check spam) and click the link within 15 minutes.
5. Choose a new password at least 12 characters long and confirm it.
6. Return to `/login`; sign in with the **new** password.
7. Confirm the old password no longer works and the same reset link cannot be used again.

## 3. Important limitations

- SMTP connection needs internet. Gmail may require an App Password or a different configured provider.
- A `localhost` link works on the same machine where the server runs; if the email is read on a phone, open it on the development machine or deploy the app with a publicly accessible HTTPS address and update `APP_BASE_URL`.
- The one-minute email throttle is per account; for internet deployment add IP/email global rate limits, abuse detection, audit logs, authenticated password change, and robust outgoing mail handling.
- This code has not been run against your Windows/MySQL system in this environment. Verify with `mvn clean package`, `mvn spring-boot:run`, and the end-to-end test above.
