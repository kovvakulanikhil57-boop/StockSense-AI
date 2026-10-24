# StockSense AI — University Stationery Store & Delivery Management System

**StockSense AI** is a university e-commerce and hand-delivery management platform built specifically for university academic departments. It dynamically isolates and presents stationery products based on the student's verified academic branch, enforces transactional inventory locks with zero overselling, provides cryptographically secured 6-digit delivery OTP verification, tracks delivery duration against a 30-minute SLA threshold with formal administrative warning workflows, and provides executive analytics with Recharts.

---

## 1. System Architecture & Tech Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Single-page application, custom design system, fast HMR |
| **Styling** | Tailwind CSS | Deep navy palette (`#0f294a`), accessible contrast, micro-animations |
| **Charts** | Recharts | Sales volume, branch distribution bar charts, best-sellers |
| **Backend** | Node.js + Express | RESTful APIs, JWT bearer authorization, rate-limiting |
| **Real-Time** | Socket.IO | Instant order alerts and branch room event dispatching |
| **Database** | MySQL / MariaDB | 14 normalized tables, foreign keys, row-level locks (`FOR UPDATE`) |
| **Security** | Argon2id / bcryptjs | Cryptographic password hashing, SHA-256 hashed OTPs, AES encrypted student retrieval |

---

## 2. University Branches Configuration

The platform natively supports three configurable branches:

1. **CSE** — Computer Science & Engineering (Branch Code: `05`)
   - Department Block: *CSE Block - Ground Floor*
   - Demo Delivery Agent: `demo.agent05@example.test`
   - Email format: `YY071A05xx@example.test` / `YY075A05xx@example.test`
2. **CSM** — Artificial Intelligence & Machine Learning (Branch Code: `66`)
   - Department Block: *CSM Block - 1st Floor*
   - Demo Delivery Agent: `demo.agent66@example.test`
   - Email format: `YY071A66xx@example.test` / `YY075A66xx@example.test`
3. **CSD** — Computer Science & Engineering – Data Science (Branch Code: `67`)
   - Department Block: *CSD Block - 2nd Floor*
   - Demo Delivery Agent: `demo.agent67@example.test`
   - Email format: `YY071A67xx@example.test` / `YY075A67xx@example.test`

---

## 3. Database Schema (14 Required Tables)

The database `stocksense_db` is normalized and configured in [database/schema.sql](file:///database/schema.sql):

1. **`Branches`**: Stores branch code (`05`, `66`, `67`), name, and department block.
2. **`Users`**: Stores credentials, bcrypt password hashes, roles (`STUDENT`, `DELIVERY_AGENT`, `ADMIN`), verified branch ID, phone, and vehicle number.
3. **`Categories`**: Product categories (Lab Records, Paper, Writing, Drafting, Tech).
4. **`Products`**: SKU, price, real-time stock quantity, reorder level alert threshold, status.
5. **`Product_Branches`**: Many-to-many relationship defining branch visibility (common items linked to all 3 branches; branch items linked only to their specific branch).
6. **`Suppliers`**: University depot and regional vendor directory.
7. **`Purchases`**: Purchase order headers for incoming stock shipments.
8. **`Purchase_Items`**: Line items for incoming stock batches with cost prices.
9. **`Orders`**: Order header, student ID, branch ID, delivery location, order status, total amount.
10. **`Order_Items`**: Historical price and quantity snapshot for each item purchased.
11. **`Deliveries`**: Order delivery tracking, assigned agent, timestamps (`accepted_at`, `dispatched_at`, `delivered_at`), SHA-256 OTP hash, encrypted student OTP payload, failed attempt counter, delay flags.
12. **`Agent_Warnings`**: Formal disciplinary warnings issued after admin review for delayed deliveries or declined orders.
13. **`Stock_Transactions`**: Complete audit log tracking every inventory movement (`PURCHASE`, `SALE`, `CANCELLATION_RESTOCK`, `ADJUSTMENT`) with previous and new stock balances.
14. **`Notifications`**: Real-time in-app alerts for students, agents, and administrators.

---

## 4. Prerequisites & Installation

### Prerequisites
- Node.js (v18.0.0 or higher, tested on Node.js v24.20.0 LTS)
- MySQL Server 8.0+ or MariaDB 10.5+ running on port `3306`

### Database Setup
1. Log in to your MySQL / MariaDB command line:
   ```bash
   mysql -u root -p
   ```
2. Execute the schema, cart isolation migration, and seed scripts:
   ```bash
   mysql -u root < database/schema.sql
   mysql -u root < database/migration_cart.sql
   mysql -u root < database/seed.sql
   ```
   **Warning:** `database/seed.sql` truncates the application's tables before loading demo data. Run it only against a disposable local/demo database, never a production database.
   *(Optional)* Review analytical reporting queries in [database/reports.sql](file:///database/reports.sql).

### Environment Configuration
Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```
Ensure credentials match your local database:
```ini
PORT=5000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=stocksense_db
JWT_SECRET=<generate-a-unique-random-secret>
JWT_EXPIRES_IN=24h
INSTITUTION_EMAIL_DOMAIN=example.test
DELIVERY_THRESHOLD_MINUTES=30
OTP_EXPIRY_MINUTES=15
MAX_OTP_ATTEMPTS=5
CLIENT_ORIGIN=http://localhost:5173
```
For a real deployment, set `INSTITUTION_EMAIL_DOMAIN` to your institution's email domain in `backend/.env`, and set the same value as `VITE_INSTITUTION_EMAIL_DOMAIN` in `frontend/.env`. The `.test` domain is reserved for non-routable demo accounts. Configure the frontend Supabase variables only when using Supabase.

---

## 5. Running the Application & Administrator Bootstrap

### 1. One-Time Initial Administrator CLI Bootstrap
To securely provision the initial store administrator without exposing public registration:
```bash
# Set a unique password and bootstrap the demo administrator
ADMIN_PASSWORD="<set-a-unique-password>" npm run bootstrap:admin

# Or provide all administrator details explicitly
ADMIN_NAME="Demo Store Administrator" ADMIN_EMAIL="admin@example.test" ADMIN_PASSWORD="<set-a-unique-password>" node backend/src/scripts/bootstrapAdmin.js
```
*Note: The bootstrap script safely detects if an administrator already exists and aborts to prevent duplicate accounts.*

### 2. Start the Backend API Server
```bash
cd backend
npm install
node src/server.js
```
*Backend will start on `http://localhost:5000` and confirm connection to `stocksense_db`.*

### 3. Configure and Start the Frontend Application
```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Set `VITE_INSTITUTION_EMAIL_DOMAIN` in `frontend/.env` to match the backend. For a real institution, replace the demo default in both environment files with the verified institutional domain.
*Frontend will launch on `http://127.0.0.1:5173/`.*

---

## 6. Pre-Configured Test Accounts (Seed Credentials)

The bundled seed accounts use synthetic demo-only credentials. Never use them outside a local/demo environment.

| Role | Non-routable Demo Email | Demo-only Password | Assigned Branch / Scope |
| :--- | :--- | :--- | :--- |
| **Store Admin** | `admin@example.test` | `Demo-Admin-Only-2026!` | Overall Store Management |
| **CSE Agent** | `demo.agent05@example.test` | `Demo-Agent-Only-2026!` | CSE Block (`05`) |
| **CSM Agent** | `demo.agent66@example.test` | `Demo-Agent-Only-2026!` | CSM Block (`66`) |
| **CSD Agent** | `demo.agent67@example.test` | `Demo-Agent-Only-2026!` | CSD Block (`67`) |
| **CSE Student** | `99071A0501@example.test` | `Demo-Student-Only-2026!` | CSE Core (Regular Entry) |
| **CSM Student** | `99071A6605@example.test` | `Demo-Student-Only-2026!` | CSM AIML (Regular Entry) |
| **CSD Student** | `99075A6709@example.test` | `Demo-Student-Only-2026!` | CSD Data Science (Lateral Entry) |

---

## 7. Key Business Workflows & Security Fixes

### 1. Database-Backed Isolated Student Carts
- Carts are backed by `Carts` and `Cart_Items` tables in MySQL, tied strictly to authenticated `Users.user_id`.
- Read, write, and delete operations use server-verified JWT claims (`req.user.userId`).
- Zero shared client storage (`localStorage` cart eliminated).
- On logout or switching accounts in the same browser, frontend cart state is instantly cleared.
- Cart contents persist across page refreshes for the authenticated student.
- Branch eligibility and stock quantities are re-validated on the server upon adding items and at final checkout.
- On order completion, only the purchasing student's database cart is cleared; other students' carts are completely unaffected.

### 2. Clean, Professional Text-Focused Product Cards
- Broken image icons and placeholder images have been completely removed from storefront and cart.
- Product cards prioritize typography and academic metadata:
  - Product Name (bold header)
  - Category pill and SKU code
  - Branch availability badge (CSE 05, CSM 66, CSD 67, or Common University Supply)
  - Readable product description with consistent line clamping
  - Stock Status badge (`In Stock (qty)`, `Low Stock (qty)`, `Out of Stock`)
  - Price in ₹
  - Quantity stepper (`[-] [qty] [+]`) and `Add to Cart` button aligned consistently at the card footer.

### 3. Student Registration with Confirm Password & Branch Auto-Detection
- Requires Full Name, Institutional Email, Password, Confirm Password, and optional Phone.
- Validates password complexity: >=8 chars, uppercase, lowercase, digit, and special character.
- Automatically rejects mismatched passwords.
- Validates institutional email pattern for regular (`YY071A[05|66|67]xx`) and lateral (`YY075A[05|66|67]xx`) students using the configured `INSTITUTION_EMAIL_DOMAIN`.
- Branch is determined automatically on backend; students cannot tamper with their role or branch.

### 4. Administrative Delivery Agent Management
- Delivery Agent registration is restricted from public sign-up.
- Admin Dashboard includes a dedicated **Delivery Agent Management** tab.
- Authorized administrators provision delivery agents with Name, Email, Password, Assigned Branch, Phone, and Vehicle Number.
- Enforces the **one active agent per branch** policy (rejects activating a second active agent for the same branch).
- Administrators can activate or deactivate delivery agents dynamically.

### 5. Secondary Administrator Creation & Restricted Public Admin Register
- Initial admin is provisioned via backend CLI script `npm run bootstrap:admin`.
- Additional administrators are provisioned by logged-in administrators in the Executive Hub (`/admin/create-admin`).
- Public admin registration is blocked.

### 6. Transactional Checkout & Overselling Prevention
- Uses MySQL transactions with pessimistic row locks (`SELECT ... FOR UPDATE`).
- Re-verifies branch eligibility and live stock quantities on server.
- Atomically decrements stock and logs inventory movement in `Stock_Transactions`.

### 7. Cryptographic Delivery OTP Verification
- 6-digit cryptographically secure OTP generated when agent marks order as dispatched.
- Stored as SHA-256 hash in DB; student views plaintext in order tracking.
- Rate-limited to max 5 failed attempts; constant-time hash verification.

---

## 8. REST API Documentation Summary

### Cart Endpoints (`/api/cart` — Student Only)
- `GET /api/cart` — Retrieve authenticated student's isolated cart.
- `POST /api/cart/items` — Add product to cart with branch & stock re-validation.
- `PUT /api/cart/items/:productId` — Update item quantity in student's cart.
- `DELETE /api/cart/items/:productId` — Remove product from student's cart.
- `DELETE /api/cart` — Clear student's cart.

### Admin Agent & User Endpoints (`/api/admin` — Admin Only)
- `GET /api/admin/agents` — List delivery agents with assigned branches and status.
- `POST /api/admin/agents` — Provision delivery agent account.
- `PUT /api/admin/agents/:id/toggle-status` — Toggle active status with 1-agent-per-branch rule.
- `POST /api/admin/create-admin` — Provision secondary administrator account.

---

## 9. Automated Testing Suites

### 1. Cart Isolation & Role Access Test Suite (16/16 Passed)
```bash
node backend/test_all_isolated_cart_and_auth.js
```
Verifies:
1. Rejection of mismatched password confirmation
2. Rejection of weak passwords
3. Rejection of non-institutional email formats
4. Role tamper prevention on student registration
5. Multi-branch student registration (CSE 05 & CSM 66)
6. Duplicate registration prevention
7. Student A isolated cart addition
8. Cart isolation: Student B cart is completely empty
9. Student B independent cart addition
10. Cart isolation: Student A cart preserved unaffected
11. Branch restriction: Student A (CSE) denied CSM-specific product
12. Checkout: Student A cart cleared, Student B cart intact
13. Admin login & delivery agent management
14. One-active-agent-per-branch constraint enforcement
15. Secondary administrator provisioning and login
16. Strict backend RBAC (403 Forbidden for students accessing admin/agent routes)

### 2. Comprehensive System Workflow Test Suite (15/15 Passed)
```bash
node backend/test_all_workflows.js
```
Verifies health, branch dynamic catalogue, transactional oversell protection, stock audit log, delivery agent branch isolation, OTP generation, incorrect OTP attempt counter, successful OTP verification, order cancellation stock restoration, supplier purchase restocking, and delayed delivery warnings.

---

## 10. Security Notes & Best Practices

- Passwords are never stored in plaintext or logged to console.
- Database access uses parameterized queries (`mysql2`) to eliminate SQL injection vulnerabilities.
- Delivery OTPs are hashed using SHA-256 before storing in the database.
- Database credentials and secrets are kept in `.env` and excluded from version control.
