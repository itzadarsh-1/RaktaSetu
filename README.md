# RaktaSetu: Blood Donation & Emergency Donor Finder

A Java Spring Boot + MySQL full-stack college prototype built from the supplied UI reference and synopsis.

## Pages
Home, Register, Login, Donor Dashboard, Requester Dashboard, Admin Dashboard, Donor Map, Profile and Blood Requests.

## Requirements
- Windows 10/11, VS Code with **Extension Pack for Java** and **Spring Boot Extension Pack**
- **JDK 21** (`java -version`)
- **Maven 3.9+** (`mvn -version`) or use VS Code Maven extension; Maven is **not bundled** with this ZIP
- **MySQL Server 8+** (MySQL Workbench is optional, server is required)

## Setup for Windows / VS Code

1. Install JDK 21 and open a NEW terminal. Run `java -version` and `javac -version`.
2. Install Maven and add its `bin` to Windows PATH. Open a NEW terminal and run `mvn -version`.
3. Install MySQL Community Server. Remember the `root` password. Start the Windows service (often `MySQL80`).
4. Open **MySQL Workbench** and run `database.sql` or use: `mysql -u root -p < database.sql`.
5. Extract this ZIP. VS Code → **File → Open Folder → RaktaSetu**.
6. Open **PowerShell terminal** in that folder and configure your MySQL password for that terminal:

```powershell
$env:DB_USER="root"
$env:DB_PASSWORD="YOUR_MYSQL_PASSWORD"
```

7. Optionally create an administrator (only during first start, user is created if absent):

```powershell
$env:RAKTASETU_ADMIN_EMAIL="admin@raktasetu.local"
$env:RAKTASETU_ADMIN_PASSWORD="CHANGE_THIS_TO_A_STRONG_12_CHAR_PASSWORD"
```

8. Build and start:

```powershell
mvn clean package
mvn spring-boot:run
```

9. Visit **http://localhost:8080** in your browser.
10. Create a **Donor** account. Create a **Requester** account with a different email. Use the optional admin login set in step 7.
11. In the donor dashboard, update availability (enabled by default). To display donor pins on the map, click **Share My Map Location** and grant browser location access.
12. In requester dashboard, search blood group / city, raise a request or request an individual donor. Log in as donor to accept/reject the request. Admin can mark accepted requests complete.

### Verify installations

```powershell
java -version
javac -version
mvn -version
Get-Service *mysql*
```

If `mvn` is not recognized, install Apache Maven and add its `bin` to `PATH` (not just the archive). If `javac` is not recognized, add the JDK `bin` to PATH and restart VS Code. If MySQL connection fails, check the service, port 3306, username and password.

## Architecture

Browser UI (HTML/CSS/JS) → Spring Boot REST API → Spring Data JPA / Hibernate → MySQL.
Spring Security handles sessions, encrypted BCrypt passwords, CSRF and admin/donor/requester role access.

## API overview

| Method | Endpoint | Role |
|---|---|---|
| POST | `/api/auth/register` | Public |
| GET | `/api/public/donors?bloodGroup=B%2B&city=Dehradun` | Public |
| GET/PUT | `/api/me` | Logged-in |
| GET | `/api/donor/requests` | Donor |
| POST | `/api/donor/requests/{id}/respond?decision=ACCEPTED` | Donor |
| GET/POST | `/api/requester/requests` | Requester |
| GET | `/api/admin/stats` | Admin |
| GET | `/api/admin/users` | Admin |
| PUT | `/api/admin/users/{id}/toggle` | Admin |
| GET | `/api/admin/requests` | Admin |
| PUT | `/api/admin/requests/{id}/complete` | Admin |

## Notes and limitations
- **Prototype only**: no donor identity checks, blood compatibility verification, medical eligibility or emergency dispatch. The site intentionally uses **exact blood-group matching**, not medical compatibility prediction. Hospitals must verify eligibility and compatibility.
- No email/SMS/WhatsApp push integration or third-party Google/Facebook login. Requests show when users refresh/revisit their dashboard.
- OpenStreetMap tile and Leaflet CDN require internet; only donor-shared coordinates appear on the map. No location is invented.
- `spring.jpa.hibernate.ddl-auto=update` is suitable for a college demo, not for production migrations. Credentials belong in environment variables, not source control.
- Do not use real patient details or rely on this prototype during emergencies.
- CSS follows the supplied red/white multi-dashboard visual direction, but is not a pixel-perfect duplication of the reference image.
