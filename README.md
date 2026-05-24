# Salary Management Service

Backend REST API for the Salary Management System. HR teams use it to manage employee records and run salary and headcount insights. Built with Express, TypeScript, Prisma, and SQLite.

## Tech Stack

- **Express 5** — HTTP framework
- **TypeScript** — strict mode enabled
- **Prisma 7** — ORM with SQLite (`better-sqlite3` adapter)
- **Jest** — test runner
- **Supertest** — HTTP integration testing
- **Husky** — pre-commit hooks (lint + 100% coverage gate)

## Features

- **Employee CRUD** — create, read, update, and delete employee records
- **Employee list** — pagination, sorting, and filtering by country, department, employment type, and name search
- **Salary insights**
  - Min / max / average salary by country
  - Average salary by job title within a country
  - Average salary by department
- **Headcount insights** — employee count grouped by country
- **Seed script** — generates 10,000 deterministic employee records for local development

## Prerequisites

- Node.js v20+
- Git (required for Husky pre-commit hooks)

## Getting Started

```bash
# Install dependencies (also auto-generates the Prisma client via postinstall)
npm install

# Copy environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed the database (optional — 10,000 employees)
npm run db:seed

# Start development server
npm run dev
```

The service runs at http://localhost:3000.

To use the UI, start the [salary-management-portal](../salary-management-portal) in a separate terminal.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage report (100% threshold) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run db:generate` | Generate Prisma client (runs automatically on `npm install`) |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with 10,000 employees |
| `npm run db:studio` | Open Prisma Studio |

## API Reference

All endpoints are prefixed with `/api`. Responses use a consistent envelope: `{ data, total?, page?, limit?, message? }` or `{ error: { code, message } }`.

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |

### Employees — `/api/employees`

| Method | Path | Description |
|---|---|---|
| `POST` | `/` | Create an employee |
| `GET` | `/` | List employees (paginated, sortable, filterable) |
| `GET` | `/:id` | Get employee by ID |
| `PUT` | `/:id` | Update an employee |
| `DELETE` | `/:id` | Delete an employee |

**List query parameters:** `page`, `limit`, `sortBy`, `sortOrder`, `search`, `country`, `department`, `employmentType`, `jobTitle`

**Sort fields:** `fullName`, `email`, `jobTitle`, `department`, `country`, `salary`, `startDate`, `createdAt`

### Insights — `/api/insights`

| Method | Path | Description |
|---|---|---|
| `GET` | `/salary/country?country={country}` | Min, max, and average salary in a country |
| `GET` | `/salary/job-title?country={country}&jobTitle={title}` | Average salary for a job title in a country |
| `GET` | `/salary/department` | Average salary per department |
| `GET` | `/headcount/country` | Employee headcount per country |

## Project Structure

```
src/
├── config/         Environment config and Prisma client
├── controllers/    Request handlers — parse input, call service, send response
├── errors/         Domain error classes
├── middleware/     Express middleware (error handler)
├── repositories/   Data access layer — all Prisma queries live here
├── routes/         Route definitions
├── services/       Business logic
├── app.ts          Express app factory
└── index.ts        Server entry point
__tests__/          Unit and integration tests (mirrors src/)
prisma/
├── schema.prisma   Database schema
├── seed.ts         Seed script
└── migrations/     Migration history
```

## Architecture

```
Request → Router → Controller → Service → Repository → Prisma → SQLite
```

Each layer has a single responsibility. Dependencies are injected via constructors, making every layer unit-testable in isolation.

## Data Model

The `Employee` model stores:

| Field | Type | Notes |
|---|---|---|
| `fullName` | string | Employee display name |
| `email` | string | Unique |
| `jobTitle` | string | Indexed for insight queries |
| `department` | string | Indexed |
| `country` | string | Indexed |
| `salaryCents` | int | Salary stored in cents |
| `employmentType` | enum | `FULL_TIME`, `PART_TIME`, `CONTRACT` |
| `startDate` | datetime | Employment start date |

## Development Approach

This project follows strict TDD — every change follows Red → Green → Refactor. Pre-commit hooks run the full test suite with a 100% coverage gate. See `.cursor/` for guidelines.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite database file path | `file:./dev.db` |
| `PORT` | Port the server listens on | `3000` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed origin for CORS (leave unset in local dev to allow all origins) | — |
