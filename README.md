# Salary Management Service

Backend REST API for the Salary Management System, built with Express, TypeScript, Prisma, and SQLite.

## Tech Stack

- **Express** — HTTP framework
- **TypeScript** — strict mode enabled
- **Prisma 7** — ORM with SQLite
- **Jest** — test runner
- **Supertest** — HTTP integration testing

## Prerequisites

- Node.js v20+

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Service runs on http://localhost:3000.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run build` | Compile TypeScript |

## Project Structure

src/
├── config/         Environment config and Prisma singleton
├── controllers/    Request handlers — parse input, call service, send response
├── errors/         Domain error classes
├── middleware/     Express middleware (error handler, auth, etc.)
├── repositories/   Data access layer — all Prisma queries live here
├── routes/         Route definitions
├── services/       Business logic
├── app.ts          Express app factory
└── index.ts        Server entry point
tests/          Integration tests
prisma/
└── schema.prisma   Database schema

## Architecture

Request → Router → Controller → Service → Repository → Prisma → SQLite

Each layer has a single responsibility. Dependencies are injected via constructors, making every layer unit-testable in isolation.

## Development Approach

This project follows strict TDD — every change follows Red → Green → Refactor. See `.cursor/rules/` for the full guidelines.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite database file path | `file:./dev.db` |
| `PORT` | Port the server listens on | `3000` |
| `NODE_ENV` | Environment | `development` |