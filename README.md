# AUSVMS — Aditya University Visitor Management System

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/MongoDB-6%2B-green?logo=mongodb" alt="MongoDB">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

> A comprehensive, web-based visitor management system built for Aditya University. AUVMS streamlines the entire visitor lifecycle — from pre-registration and check-in to check-out, appointment booking, and security monitoring — while providing rich analytics and audit capabilities for administrators.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Demo Credentials](#demo-credentials)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)
- [Authors](#authors)
- [Support](#support)

---

## Project Overview

AUVMS (Aditya University Visitor Management System) is a full-stack web application that replaces paper-based visitor logs with a secure, efficient, and transparent digital workflow. It enables university staff and security personnel to:

- Pre-register visitors and generate digital passes
- Manage appointments between visitors and faculty/staff
- Track active visitors on campus in real time
- Enforce role-based access for different user types
- Send automated email and SMS notifications with OTP verification
- Export reports and visualise visitor trends through dashboards

---

## Features

### 🏷️ Visitor Management

- **Pre-registration** — Visitors can register in advance with their details and purpose of visit
- **Check-in / Check-out** — Guards log arrivals and departures; timestamps are recorded automatically
- **Digital visitor passes** — Auto-generated passes with QR codes or unique IDs
- **Walk-in handling** — Support for unregistered, on-the-spot visitors

### 📅 Appointment Booking

- Online appointment scheduling linked to staff/faculty calendars
- Approval workflow for hosts to accept, reschedule, or decline requests
- Automated reminders sent to both visitor and host before the meeting

### 🔐 Role-Based Access Control (RBAC)

| Role                | Capabilities                                                |
| ------------------- | ----------------------------------------------------------- |
| **Admin**           | Full system access, user management, reports, configuration |
| **Staff / Faculty** | Manage own appointments, view visitor history               |
| **Guard**           | Check-in/check-out visitors, view active visitor list       |
| **Visitor**         | Pre-register, book appointments, view own pass              |

### 📬 Notifications

- Email notifications via **Nodemailer** (appointment confirmations, reminders, pass details)
- SMS notifications for time-sensitive alerts
- **OTP verification** for visitor identity confirmation at check-in

### 📊 Analytics & Reporting

- Real-time dashboard with visitor counts, peak hours, and department-wise breakdowns
- Historical trend charts (daily, weekly, monthly)
- Exportable reports in **CSV** format
- **Scheduled reports** sent automatically to administrators

### 🗂️ Audit Logging

- Every check-in, check-out, appointment change, and administrative action is logged
- Tamper-evident log entries with timestamps and user IDs
- Queryable audit trail for compliance and investigation purposes

### 🏛️ University-Specific Features

- **Holiday management** — Define university holidays to block/adjust appointment slots
- **Department management** — Organise staff and visitor data by department
- Campus-wide visitor statistics per department or building

---

## Tech Stack

### Backend

| Technology      | Purpose                                       |
| --------------- | --------------------------------------------- |
| **Node.js 18+** | Server runtime                                |
| **Express.js**  | REST API framework                            |
| **MongoDB 6+**  | Primary database (via Mongoose ODM)           |
| **Redis**       | Session caching and rate limiting             |
| **JWT**         | Stateless authentication tokens               |
| **Nodemailer**  | Transactional email delivery                  |
| **node-cron**   | Scheduled jobs (automated reports, reminders) |
| **bcrypt**      | Password hashing                              |

### Frontend

| Technology       | Purpose                             |
| ---------------- | ----------------------------------- |
| **React 18**     | UI component library                |
| **TypeScript 5** | Type-safe JavaScript                |
| **Vite**         | Fast development server and bundler |
| **Tailwind CSS** | Utility-first styling               |
| **React Query**  | Server-state management and caching |
| **React Router** | Client-side routing                 |
| **Recharts**     | Analytics charts and dashboards     |

### DevOps & Tooling

| Technology                  | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| **Docker / Docker Compose** | Containerised local and production environments |
| **ESLint + Prettier**       | Code quality and formatting                     |

---

## Project Structure

```
AUSVMS/
├── AUVMS Backend/              # Express.js REST API
│   ├── config/                 # Database and environment config
│   ├── controllers/            # Route handler logic
│   ├── middleware/             # Auth, error handling, rate limiting
│   ├── models/                 # Mongoose schemas (User, Visitor, Appointment…)
│   ├── routes/                 # API route definitions
│   ├── services/               # Business logic (notifications, OTP, reports)
│   ├── jobs/                   # Background jobs and workers
│   ├── utils/                  # Helpers (logger, validators, schedulers)
│   ├── scripts/                # Database seeding and utility scripts
│   ├── tests/                  # Backend tests and test utilities
│   ├── uploads/                # File upload directory
│   ├── server.js               # Express app entry point
│   ├── package.json
│   └── vercel.json
│
├── AUVMS Frontend/             # React + TypeScript SPA
│   ├── src/
│   │   ├── api/                # Axios API client and endpoint hooks
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page-level components (Dashboard, Visitors…)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # Global state (auth context, etc.)
│   │   ├── types/              # Shared TypeScript type definitions
│   │   └── main.tsx            # Application entry point
│   ├── public/                 # Static assets
│   ├── package.json
│   ├── vite.config.ts          # Vite configuration
│   └── tsconfig.json
│
├── README.md
└── readme.md
```

---

## Installation & Setup

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [npm 9+](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- [MongoDB 6+](https://www.mongodb.com/) (local instance or Atlas connection string)
- [Redis 7+](https://redis.io/) (local instance or cloud URL)
- [Docker & Docker Compose](https://www.docker.com/) _(optional, for containerised setup)_

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Narayaaana11/AUSVMS.git
cd AUSVMS

# 2. Copy and configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Edit both .env files with your values (see Environment Variables section)

# 4. Start all services
docker-compose up --build
```

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`

---

### Option B — Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Narayaaana11/AUSVMS.git
cd AUSVMS

# ── Backend ──────────────────────────────────────────────
cd backend
cp .env.example .env          # then edit .env with your values
npm install
npm run dev                   # starts on http://localhost:5000

# ── Frontend (new terminal) ───────────────────────────────
cd frontend
cp .env.example .env          # then edit .env
npm install
npm run dev                   # starts on http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb://localhost:27017/auvms

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_strong_jwt_secret_here
JWT_EXPIRES_IN=7d

# Email (Nodemailer / SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# SMS Gateway (optional)
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=AUVMS

# OTP
OTP_EXPIRY_MINUTES=10

# Scheduled Reports
REPORT_CRON_SCHEDULE="0 8 * * 1"   # Every Monday at 08:00
REPORT_RECIPIENT_EMAIL=admin@aditya.edu.in
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

> ⚠️ **Never commit real credentials or secrets to version control.** The `.env.example` files serve as templates only.

---

## Running the Application

### Development

```bash
# Backend (with hot-reload via nodemon)
cd backend && npm run dev

# Frontend (with Vite HMR)
cd frontend && npm run dev
```

### Production Build

```bash
# Build the frontend
cd frontend && npm run build

# Start the backend in production mode
cd backend && npm start
```

### Useful Scripts

| Directory  | Command           | Description                      |
| ---------- | ----------------- | -------------------------------- |
| `backend`  | `npm run dev`     | Start API server with hot-reload |
| `backend`  | `npm start`       | Start API server (production)    |
| `backend`  | `npm test`        | Run backend unit tests           |
| `backend`  | `npm run lint`    | Lint backend source files        |
| `frontend` | `npm run dev`     | Start Vite dev server            |
| `frontend` | `npm run build`   | Build production bundle          |
| `frontend` | `npm run preview` | Preview production build locally |
| `frontend` | `npm run lint`    | Lint frontend source files       |

---

## Demo Credentials

Use these credentials to test the system locally or on deployed instances. All demo accounts are seeded by running the backend seed scripts.

### Test User Accounts

| Role   | Username   | Password    | Access Level                                        |
| ------ | ---------- | ----------- | --------------------------------------------------- |
| Admin  | `admin`    | `Aditya@123` | Full system access, user management, reports, config |
| Staff  | `narayana` | `Aditya@123` | Manage appointments, view visitor history            |
| Guard  | `guard`    | `Aditya@123` | Check-in/check-out visitors, manage gates            |

### Testing the Application

1. **Start the Application**
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

2. **Login as Different Roles**
   - Visit `http://localhost:3000/login`
   - Use any of the demo credentials above to test different features

3. **Quick Test Flows**
   - **Admin**: Navigate to Admin Panel → Manage Users, Departments, Reports
   - **Staff**: Book appointments, view visitor history
   - **Guard**: Use Guard Portal to check-in/check-out visitors

> ⚠️ **Security Note**: These are demo credentials for testing only. In production, use strong, unique passwords and never hardcode credentials in the codebase.

---

## API Documentation

All API routes are prefixed with `/api`. Authentication is required for protected routes (pass a valid JWT in the `Authorization: Bearer <token>` header).

### Authentication

| Method | Endpoint               | Description                    |
| ------ | ---------------------- | ------------------------------ |
| `POST` | `/api/auth/register`   | Register a new user account    |
| `POST` | `/api/auth/login`      | Login and receive a JWT token  |
| `POST` | `/api/auth/logout`     | Invalidate the current session |
| `POST` | `/api/auth/refresh`    | Refresh an expiring JWT token  |
| `POST` | `/api/auth/verify-otp` | Verify an OTP code             |

### Visitors

| Method | Endpoint                     | Description                    |
| ------ | ---------------------------- | ------------------------------ |
| `GET`  | `/api/visitors`              | List all visitors (paginated)  |
| `POST` | `/api/visitors`              | Pre-register a new visitor     |
| `GET`  | `/api/visitors/:id`          | Get visitor details            |
| `PUT`  | `/api/visitors/:id`          | Update visitor information     |
| `POST` | `/api/visitors/:id/checkin`  | Record check-in for a visitor  |
| `POST` | `/api/visitors/:id/checkout` | Record check-out for a visitor |

### Appointments

| Method   | Endpoint                        | Description                     |
| -------- | ------------------------------- | ------------------------------- |
| `GET`    | `/api/appointments`             | List appointments (filterable)  |
| `POST`   | `/api/appointments`             | Book a new appointment          |
| `GET`    | `/api/appointments/:id`         | Get appointment details         |
| `PUT`    | `/api/appointments/:id`         | Update / reschedule appointment |
| `DELETE` | `/api/appointments/:id`         | Cancel an appointment           |
| `PATCH`  | `/api/appointments/:id/approve` | Approve a pending appointment   |

### Users & Roles

| Method   | Endpoint         | Description                    |
| -------- | ---------------- | ------------------------------ |
| `GET`    | `/api/users`     | List all users (Admin only)    |
| `POST`   | `/api/users`     | Create a new user (Admin only) |
| `PUT`    | `/api/users/:id` | Update user details or role    |
| `DELETE` | `/api/users/:id` | Delete a user (Admin only)     |

### Departments

| Method   | Endpoint               | Description                 |
| -------- | ---------------------- | --------------------------- |
| `GET`    | `/api/departments`     | List all departments        |
| `POST`   | `/api/departments`     | Create a department (Admin) |
| `PUT`    | `/api/departments/:id` | Update a department (Admin) |
| `DELETE` | `/api/departments/:id` | Delete a department (Admin) |

### Holidays

| Method   | Endpoint            | Description              |
| -------- | ------------------- | ------------------------ |
| `GET`    | `/api/holidays`     | List university holidays |
| `POST`   | `/api/holidays`     | Add a holiday (Admin)    |
| `DELETE` | `/api/holidays/:id` | Remove a holiday (Admin) |

### Reports & Analytics

| Method | Endpoint                 | Description                            |
| ------ | ------------------------ | -------------------------------------- |
| `GET`  | `/api/reports/dashboard` | Real-time dashboard statistics         |
| `GET`  | `/api/reports/visitors`  | Visitor trend report (with date range) |
| `GET`  | `/api/reports/export`    | Download visitor data as CSV           |

### Audit Logs

| Method | Endpoint          | Description                          |
| ------ | ----------------- | ------------------------------------ |
| `GET`  | `/api/audit-logs` | Query audit log entries (Admin only) |

> 📘 For a complete, interactive API reference, import the provided Postman collection (`docs/AUSVMS.postman_collection.json`) once the server is running.

---

## Contributing

Contributions are welcome! Please follow the workflow below:

1. **Fork** the repository and create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and ensure:
   - All existing tests pass (`npm test` in both `backend/` and `frontend/`)
   - New code includes appropriate tests and follows existing code style
   - The linter passes (`npm run lint`)

3. **Commit** using clear, descriptive messages:

   ```bash
   git commit -m "feat: add visitor badge PDF export"
   ```

4. **Push** your branch and open a **Pull Request** against `main`:

   ```bash
   git push origin feature/your-feature-name
   ```

5. Fill in the PR template, describing what changed and why.

### Code Style

- Follow the **ESLint + Prettier** configuration in each sub-project
- Use **TypeScript** for all new frontend files
- Write **JSDoc** comments for public backend functions

---

## License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for full details.

---

## Authors

| Name         | Role           | GitHub                                           |
| ------------ | -------------- | ------------------------------------------------ |
| **Narayana** | Lead Developer | [@Narayaaana11](https://github.com/Narayaaana11) |

---

## Support

If you encounter a bug or have a feature request, please open an issue on GitHub:

- 🐛 **Bug Reports**: [Open an issue](https://github.com/Narayaaana11/AUSVMS/issues/new?template=bug_report.md)
- 💡 **Feature Requests**: [Open an issue](https://github.com/Narayaaana11/AUSVMS/issues/new?template=feature_request.md)
- 📧 **Direct Contact**: Reach out via the university's IT support portal or email the development team at `dev-support@aditya.edu.in`

---

<p align="center">Made with ❤️ for Aditya University</p>
