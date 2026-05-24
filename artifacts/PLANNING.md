# Salary Management Service — Planning Document

> **Status:** Living document — updated as implementation reveals new constraints or better approaches.
> **Last updated:** 2026-05-24
> **Audience:** Engineers reviewing architecture before the first feature commit.

---

## 1. Data Model

### Employee Entity

| Field | Type | Constraints | HR Manager justification |
|---|---|---|---|
| `id` | `String` (UUID) | Primary key, auto-generated | Stable identifier for referencing an employee in updates, deletes, and audit trails. |
| `fullName` | `String` | Required, max 200 chars | How HR identifies a person in lists, search results, and detail views. |
| `email` | `String` | Required, unique, max 254 chars | Primary business identifier — used for lookups and must not duplicate across the org. |
| `jobTitle` | `String` | Required, max 100 chars | Defines role for compensation benchmarking by title. |
| `department` | `String` | Required, max 100 chars | Groups employees for org-wide department salary comparisons. |
| `country` | `String` | Required, max 100 chars | Geographic anchor for country-level salary and headcount analytics. |
| `salaryCents` | `Int` | Required, ≥ 0 | Precise annual compensation stored without floating-point drift; exposed as USD dollars in the API. |
| `employmentType` | `EmploymentType` enum | Required — `FULL_TIME`, `PART_TIME`, `CONTRACT` | Distinguishes workforce categories that may have different compensation norms. |
| `startDate` | `DateTime` | Required, date-only semantics (stored as UTC midnight) | Tenure context for HR records and future reporting extensions. |
| `createdAt` | `DateTime` | Required, set on insert | Audit trail — when the record entered the system. |
| `updatedAt` | `DateTime` | Required, updated on every change | Audit trail — when the record was last modified. |

### Prisma Schema

```prisma
enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
}

model Employee {
  id              String          @id @default(uuid())
  fullName        String
  email           String          @unique
  jobTitle        String
  department      String
  country         String
  salaryCents     Int
  employmentType  EmploymentType
  startDate       DateTime
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([country])
  @@index([department])
  @@index([jobTitle])
  @@index([employmentType])
}
```

**Index rationale:** Insight queries filter and aggregate on `country`, `department`, and `jobTitle`. Employee list filters use the same columns. At 10,000 rows SQLite sequential scans are acceptable, but indexes keep aggregation queries under ~5 ms on typical dev hardware and leave headroom if the dataset grows.

---

## 2. API Design

**Base path:** `/api`

**Error envelope (all endpoints):**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable detail" } }
```

| HTTP Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body, query params, or business rule violation |
| 404 | `NOT_FOUND` | Employee ID does not exist |
| 409 | `CONFLICT` | Duplicate email on create or update |
| 500 | `INTERNAL_SERVER_ERROR` | Unhandled exception (masked message) |

**Salary convention:** Request bodies accept `salary` as a number in **USD dollars** (e.g. `85000`). Responses expose `salary` as dollars. The service converts to/from `salaryCents` (`salary * 100`, rounded to nearest cent) at the controller boundary.

---

### Employee CRUD

#### `POST /api/employees` — Create employee

**Request body:**

```json
{
  "fullName": "Jane Doe",
  "email": "jane.doe@company.com",
  "jobTitle": "Software Engineer",
  "department": "Engineering",
  "country": "United States",
  "salary": 120000,
  "employmentType": "FULL_TIME",
  "startDate": "2024-03-15"
}
```

**Success:** `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "fullName": "Jane Doe",
    "email": "jane.doe@company.com",
    "jobTitle": "Software Engineer",
    "department": "Engineering",
    "country": "United States",
    "salary": 120000,
    "employmentType": "FULL_TIME",
    "startDate": "2024-03-15",
    "createdAt": "2026-05-24T10:00:00.000Z",
    "updatedAt": "2026-05-24T10:00:00.000Z"
  }
}
```

**Errors:** `400` (validation), `409` (duplicate email)

---

#### `GET /api/employees/:id` — Get employee by ID

**Success:** `200 OK` — `{ "data": { ...employee } }`

**Errors:** `404` (not found)

---

#### `PUT /api/employees/:id` — Replace employee

Full replacement semantics — all mutable fields required in body (same shape as create).

**Success:** `200 OK` — `{ "data": { ...employee } }`

**Errors:** `400`, `404`, `409` (email taken by another employee)

---

#### `DELETE /api/employees/:id` — Delete employee

**Success:** `204 No Content` (empty body)

**Errors:** `404`

---

#### `GET /api/employees` — Paginated list with filters and sorting

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | Page number (1-indexed) |
| `limit` | integer 1–100 | `20` | Items per page |
| `sortBy` | enum | `fullName` | Sort field — `fullName`, `email`, `jobTitle`, `department`, `country`, `salary`, `startDate`, `createdAt` |
| `sortOrder` | enum | `asc` | Sort direction — `asc` or `desc` |
| `country` | string | — | Exact match filter |
| `department` | string | — | Exact match filter |
| `jobTitle` | string | — | Exact match filter |
| `employmentType` | enum | — | `FULL_TIME`, `PART_TIME`, or `CONTRACT` |
| `search` | string | — | Case-insensitive substring match on `fullName` or `email` |

Filters are combined with **AND** logic. Omitting a filter means no constraint on that field. Sorting applies after filtering, before pagination.

**Success:** `200 OK`

```json
{
  "data": [
    { "id": "uuid", "fullName": "...", "email": "...", "...": "..." }
  ],
  "total": 9847,
  "page": 1,
  "limit": 20
}
```

**Errors:** `400` (invalid `page`, `limit`, `sortBy`, `sortOrder`, or `employmentType`)

---

### Salary Insight Endpoints

#### `GET /api/insights/salary/country` — Min / max / avg salary by country

**Query parameters:** `country` (required, string)

**Success:** `200 OK`

```json
{
  "data": {
    "country": "United States",
    "min": 45000,
    "max": 250000,
    "average": 98500
  }
}
```

**Empty result:** `200 OK` — no employees match the country; return a meaningful message instead of `404`:

```json
{
  "data": null,
  "message": "No employees found in United States"
}
```

**Errors:** `400` (missing or empty `country`)

---

#### `GET /api/insights/salary/job-title` — Avg salary for a job title in a country

**Query parameters:** `country` (required), `jobTitle` (required)

**Success:** `200 OK`

```json
{
  "data": {
    "country": "United States",
    "jobTitle": "Software Engineer",
    "average": 135000
  }
}
```

**Empty result:** `200 OK`

```json
{
  "data": null,
  "message": "No employees found with job title 'Software Engineer' in United States"
}
```

**Errors:** `400` (missing params)

---

#### `GET /api/insights/salary/department` — Avg salary per department (org-wide)

No required query params. Returns all departments.

**Success:** `200 OK`

```json
{
  "data": [
    { "department": "Engineering", "average": 128000 },
    { "department": "Sales", "average": 95000 }
  ]
}
```

**Empty result:** `200 OK` with `"data": []`

---

#### `GET /api/insights/headcount/country` — Headcount per country

No required query params. Returns all countries sorted by headcount descending.

**Success:** `200 OK`

```json
{
  "data": [
    { "country": "United States", "headcount": 3200 },
    { "country": "India", "headcount": 2800 }
  ]
}
```

---

## 3. Salary Insights

### 3.1 Country salary range (min / max / average)

| | |
|---|---|
| **HR question** | "What is the compensation spread in a given country?" |
| **Calculation** | `SELECT MIN(salaryCents), MAX(salaryCents), AVG(salaryCents), COUNT(*) FROM Employee WHERE country = :country` — convert cents to dollars in the service layer before responding |
| **Endpoint** | `GET /api/insights/salary/country?country=X` |

### 3.2 Average salary by job title in a country

| | |
|---|---|
| **HR question** | "Are we paying Software Engineers in Germany competitively relative to our own data?" |
| **Calculation** | `SELECT AVG(salaryCents), COUNT(*) FROM Employee WHERE country = :country AND jobTitle = :jobTitle` |
| **Endpoint** | `GET /api/insights/salary/job-title?country=X&jobTitle=Y` |

### 3.3 Average salary per department (org-wide)

| | |
|---|---|
| **HR question** | "How does average compensation differ across departments?" |
| **Calculation** | `SELECT department, AVG(salaryCents), COUNT(*) FROM Employee GROUP BY department ORDER BY department ASC` |
| **Endpoint** | `GET /api/insights/salary/department` |

### 3.4 Headcount per country

| | |
|---|---|
| **HR question** | "Where is our workforce distributed geographically?" |
| **Calculation** | `SELECT country, COUNT(*) FROM Employee GROUP BY country ORDER BY COUNT(*) DESC` |
| **Endpoint** | `GET /api/insights/headcount/country` |

**Implementation note:** Aggregations live in `InsightsRepository` (`src/repositories/insights.repository.ts`), separate from `EmployeeRepository` to keep each class focused on a single concern. The repository rounds average cent values to the nearest integer cent (`Math.round`) before returning them, so the service layer receives whole-cent values and divides by 100 to produce dollar amounts without fractional cent drift. When a filtered insight query matches zero rows, the service returns `{ data: null, message: "..." }` with `200 OK` so the portal can display a human-readable empty state without treating it as an error.

---

## 4. Pagination Strategy

### Query parameters

- `page` — 1-indexed page number. Values < 1 return `400`.
- `limit` — page size, capped at **100** to prevent accidental full-table scans from the UI. Default **20**.

### Response envelope

Every paginated endpoint returns:

```json
{ "data": [...], "total": <matching row count>, "page": <current page>, "limit": <page size> }
```

`total` reflects the count **after filters, before pagination** — so the portal can render "Page 2 of 493" without a second request.

### Sort parameters

- `sortBy` — field to sort on. Allowed values: `fullName`, `email`, `jobTitle`, `department`, `country`, `salary`, `startDate`, `createdAt`. Invalid values return `400`.
- `sortOrder` — `asc` or `desc`. Default `asc`.
- When `sortBy=salary`, the repository sorts on `salaryCents` internally.

Default sort is `fullName ASC` when `sortBy` is omitted — predictable, HR-friendly browsing.

### Filter composition

1. Repository builds a Prisma `where` clause from provided filters (AND-combined).
2. `count` and `findMany` execute **in parallel** via `Promise.all` — both queries share the same `where` clause but neither blocks the other:

```typescript
const [data, total] = await Promise.all([
  prisma.employee.findMany({ where, skip, take, orderBy }),
  prisma.employee.count({ where }),
]);
```

Running them concurrently halves the round-trip overhead of a sequential approach (two queries back-to-back).

### Edge cases

| Scenario | Behaviour |
|---|---|
| `page` beyond last page | `200` with `"data": []`, `total` unchanged |
| No filters | Returns all employees, paginated |
| All filters match zero rows | `200` with `"data": []`, `"total": 0` |

---

## 5. Seed Strategy

### Name files

- `prisma/first_names.txt` — 196 common first names, one per line, UTF-8.
- `prisma/last_names.txt` — 293 common last names, one per line, UTF-8.
- 196 × 293 ≈ 57,000 possible full-name combinations — sufficient variety for 10,000 employees without obvious repetition.

### Name and email generation

1. Read both name files at script startup.
2. For each of 10,000 employees, pick `(firstName, lastName)` via `(index * prime1 + index * prime2) mod nameListLength` — deterministic given index, varied across combinations without storing RNG state.
3. Set `fullName = "${firstName} ${lastName}"`.
4. Build a realistic corporate email:
   - Normalize: lowercase, strip non-alphanumeric from names → `jane.doe@company.com`
   - Track used emails in an in-memory `Set` during generation.
   - On collision (same name pair reused), append an incrementing suffix before `@` → `jane.doe2@company.com`, `jane.doe3@company.com` — mirrors how real organizations disambiguate duplicate names.

Other fields are drawn from fixed in-script pools (departments, countries, job titles, employment types) using the same deterministic index-based selection so the dataset is reproducible across runs.

Salary is generated per role/country tier (e.g. base range per job title) and stored as `salaryCents`.

### Why `createMany` over individual `create`

| Approach | 10,000 inserts (estimated) |
|---|---|
| 10,000 × `prisma.employee.create()` | ~8–15 s — one round-trip + fsync per row |
| 20 × `createMany` batches of 500 | ~0.5–1.5 s — one transaction per batch |

`createMany` sends a single SQL `INSERT` with multiple value tuples per batch. SQLite writes one journal entry per transaction instead of per row, which is the dominant cost at this scale.

**Batch size:** 500 rows per `createMany` call — below SQLite's default variable limit (999) with headroom for column count.

### Idempotency — chosen approach: truncate + bulk insert

The seed script runs inside a single Prisma transaction:

1. `DELETE FROM Employee` (truncate all rows).
2. Insert 10,000 rows in batches via `createMany`.

Running the script twice produces an identical dataset — no duplicate-key errors, no partial state. This is appropriate for **local development and CI** where the seed resets demo data. It is **not** safe for production with real HR data; production deployments will not run this script.

### Alternative considered: non-destructive seed

A non-destructive approach avoids deleting existing rows:

```
createMany({ data: employees, skipDuplicates: true })
```

where emails are deterministically generated so the second run skips all 10,000 rows via the unique email constraint.

| | Truncate + insert (chosen) | Non-destructive (`skipDuplicates`) |
|---|---|---|
| **Second run result** | Identical 10,000 rows | No change — skips all duplicates |
| **Manual CRUD during dev** | Wiped on re-seed | Preserved alongside seed data |
| **Pool definition changes** | Clean slate reflects new pools | Stale seed rows remain; count drifts above 10,000 |
| **Use case** | Dev/CI reset to known baseline | Shared staging DB with mixed real + seed data |

Non-destructive seed is better when the database contains data that must survive a re-seed (e.g. manually created test employees alongside seeded ones). We chose truncate because this project uses a dedicated local SQLite file with no production seed path — a clean reset is simpler and guarantees the dataset matches the current pool definitions.

### Expected performance

| Phase | Expected duration |
|---|---|
| Read name files | < 10 ms |
| Generate 10,000 in-memory records | < 50 ms |
| 20 × `createMany(500)` in one transaction | 500 ms – 1.5 s |
| **Total** | **< 2 s** on typical dev hardware |

---

## 6. Architecture Decisions

### SQLite for 10,000 employees

**Decision:** Single-file SQLite via `better-sqlite3` adapter.

**Why this is sufficient:**
- 10,000 rows × ~200 bytes/row ≈ 2 MB — fits entirely in SQLite's page cache after first query.
- All insight queries are simple aggregates with indexes — sub-10 ms on local disk.
- Zero infrastructure: no Docker, no connection pool tuning, no separate DB server for development or demo deployment.

**Trade-off accepted:** Write concurrency is limited (one writer at a time). Acceptable because the HR portal is read-heavy and writes are single-record CRUD, not bulk ingestion at runtime. Bulk load is offline via the seed script.

**When to revisit:** Multi-tenant SaaS, concurrent write load, or horizontal scaling → PostgreSQL.

---

### Salary stored in cents (`salaryCents: Int`)

**Decision:** Persist integer cents; convert at the API boundary.

**Why:**
- `AVG(salaryCents)` over integers is exact. `AVG(85000.50)` in floating point can produce `98500.49999997`, which requires rounding hacks in every insight response.
- USD has two decimal places — cents are the natural atomic unit.

**Trade-off accepted:** API consumers send/receive dollars; conversion logic must be tested once in the controller/mapper layer.

---

### Constructor injection for repositories

**Decision:** Services receive repository instances via constructor parameters. Route wiring in a composition root (e.g. `src/routes/index.ts` or factory) instantiates real repos; tests pass plain-object mocks.

**Why:**
- Service unit tests mock `{ findById: jest.fn(), ... }` — no Prisma client, no in-memory DB, tests run in < 5 ms each.
- Aligns with the project's 100% coverage gate: every service branch is reachable without integration test overhead.

**Trade-off accepted:** Slightly more boilerplate in route setup vs. a DI framework. At this project size, manual wiring is clearer than introducing Inversify/TSyringe.

---

### Layered architecture with strict boundaries

**Decision:** Router → Controller → Service → Repository → Prisma. No layer skipping.

**Why:**
- Controllers stay thin (parse, call, respond) — easy to test with mocked services if needed.
- Business rules (email uniqueness checks, salary validation, empty insight handling) live exclusively in services.
- Repositories can be swapped (e.g. for integration tests against a real DB) without touching business logic.

---

### `PUT` for updates (full replacement)

**Decision:** `PUT /api/employees/:id` requires the full resource body.

**Why chosen over `PATCH`:** The portal edit flow loads a complete form — every field is always available. `PUT` gives a single validation path (all fields required, all rules applied uniformly) with no merge logic for "which fields were sent."

See [PUT vs PATCH trade-offs](#put-vs-patch-trade-offs) below for the full comparison.

**Trade-off accepted:** Client must send all fields on update. Acceptable for a form-based UI.

---

### PUT vs PATCH trade-offs

| | `PUT` (chosen) | `PATCH` |
|---|---|---|
| **Semantics** | Full replacement — missing field = error | Partial update — only sent fields change |
| **Validation** | One schema, all fields required | Must define behaviour per field for optional presence |
| **Portal fit** | Natural match for edit forms that always show all fields | Better for inline single-field edits (e.g. click-to-edit salary) |
| **Idempotency** | Repeated identical `PUT` yields same state | Repeated `PATCH` with same body yields same state, but partial sends do not |
| **Risk** | Client accidentally omits a field → rejected by validation | Client accidentally omits a field → silently preserved; client sends null → must define null vs absent semantics |
| **Implementation cost** | Lower — same DTO as create | Higher — merge logic, partial validation, undefined vs null handling |

---

### Deterministic seed vs. random seed

**Decision:** Index-based deterministic selection, not `Math.random()`.

**Why:** Reproducible test fixtures — integration tests can assert exact headcount per country after seed. Debugging a flaky salary distribution caused by randomness is wasted time.

---

### Insight empty-result handling

**Decision:** Filtered insight endpoints (country, job-title) return `200 OK` with `{ data: null, message: "..." }` when no rows match. Org-wide aggregate endpoints return `200 OK` with `"data": []`.

**Why:** An empty country or title filter is a valid query — not a missing resource. A meaningful `message` lets the portal show "No employees found in X" without error-state UI. Reserve `404` for employee CRUD where a specific ID does not exist.

---

## 7. Architecture Overview

### System Context

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  salary-management-portal  (React 19 + Vite, :5173)           │ │
│  │                                                                │ │
│  │  EmployeeList ───────────────────── InsightsDashboard         │ │
│  │       │                                    │                  │ │
│  │  useEmployees                        useInsights              │ │
│  │       │                                    │                  │ │
│  │  employeeService                  insightsService             │ │
│  │       └──────────────────┬───────────────────┘               │ │
│  │                       apiClient                               │ │
│  └────────────────────────────┬───────────────────────────────── ┘ │
└───────────────────────────────┼──────────────────────────────────── ┘
                                │  HTTP /api/*
                                │  (Vite proxy in dev → localhost:3000)
                                │  (VITE_API_URL env var in production)
                                ▼
             ┌──────────────────────────────────────┐
             │  salary-management-service           │
             │  (Express 5 + TypeScript, :3000)     │
             │                                      │
             │  Routes → Controllers → Services     │
             │              → Repositories          │
             └──────────────────┬───────────────────┘
                                │  Prisma 7 + better-sqlite3 adapter
                                ▼
                     ┌──────────────────┐
                     │     SQLite       │
                     │    (dev.db)      │
                     └──────────────────┘
```

### Service Request Flow

```
HTTP Request
     │
     ▼
Express Router  (employee.routes.ts / insights.routes.ts)
     │
     ▼
Controller
├── Parses & validates input via employee.mapper.ts
│   (query params, body fields, dollars → cents conversion)
├── Calls service with typed parameters
└── Sends JSON response with envelope { data, ... }
     │
     ▼
Service
├── Enforces business rules
│   ├── Required field validation (employee.service.ts)
│   ├── Email uniqueness (search before create / update)
│   ├── Not-found / conflict detection → throws AppError subclass
│   └── Empty-state messages for filtered insight queries (insights.service.ts)
└── Converts salaryCents ↔ salary dollars at service boundary
     │
     ▼
Repository
├── Builds Prisma where / orderBy / skip / take from typed params
├── employee.repository.ts  →  findMany, count, findById, create, update, delete
└── insights.repository.ts  →  aggregate (min/max/avg), groupBy (dept/country)
     │
     ▼
Prisma Client  (PrismaBetterSqlite3 adapter, singleton in src/config/prisma.ts)
     │
     ▼
SQLite file  (path from DATABASE_URL env var)
```

### Error Propagation

```
Service throws AppError subclass
(NotFoundError 404 / ValidationError 400 / ConflictError 409)
     │
     ▼
Express error middleware  (errorHandler.ts)
├── AppError  →  { error: { code, message } }  +  matching HTTP status
└── Unknown   →  { error: { code: "INTERNAL_SERVER_ERROR",
                             message: "Internal server error" } }  +  500
```

### Dependency Injection and Test Seams

`createApp()` in `app.ts` accepts optional service overrides, giving three distinct test seams:

```
─────────────────────────────────────────────────────────────────────────────
PRODUCTION                ROUTE TESTS               SERVICE UNIT TESTS
app.ts                    (integration)             (unit)
─────────────────────────────────────────────────────────────────────────────
                          mockService = {
                            createEmployee: jest.fn(),
                            listEmployees:  jest.fn(), …
                          }
                               │
createApp()                createApp({               mockRepo = {
  │                          employeeService:           create:   jest.fn(),
  │                            mockService              findAll:  jest.fn(), …
  │                        })                         }
  │                               │                       │
  EmployeeRepository(prisma)      │ (skipped)     new EmployeeService(mockRepo)
        │                         │
  EmployeeService(repo)      EmployeeController(mockService)
        │                         │
  EmployeeController(svc)    router.post('/', controller.create)
        │
  router.post('/', controller.create)

REPOSITORY TESTS
new EmployeeRepository(testPrismaClient)  ← real Prisma, test.db SQLite file
─────────────────────────────────────────────────────────────────────────────
```

Each test level isolates exactly the layer under test. Route tests never touch the database; service unit tests never touch HTTP; repository tests never test business logic.

---

## 8. Performance Considerations

### Query Performance

| Query type | Mechanism | Expected latency (10 k rows) |
|---|---|---|
| Paginated list (no filters) | `findMany` + `count` with `skip/take` | < 5 ms |
| List with filters | `WHERE country = ? AND department = ?` hitting indexes | < 5 ms |
| Full-text search on name/email | `LIKE '%term%'` — no index, full scan | 5–20 ms |
| Salary min/max/avg by country | `aggregate` on indexed `country` column | < 5 ms |
| Average salary by job title | `aggregate` with `country` + `jobTitle` index | < 5 ms |
| Dept salary groupBy | `groupBy department` across all rows | < 10 ms |
| Headcount by country | `groupBy country` across all rows | < 5 ms |

Index rationale: `country`, `department`, `jobTitle`, and `employmentType` are indexed (see schema). The `search` param uses `LIKE '%term%'` which cannot use a B-tree index — acceptable at 10 k rows (full scan < 20 ms on local SSD); an FTS5 virtual table would be needed for sub-ms search at 100 k+ rows.

**Average salary rounding:** SQLite's `AVG()` returns a floating-point value in cents (e.g. `98750.333...`). The repository rounds this to the nearest integer cent with `Math.round` before returning, so the service always divides a whole number by 100. This prevents values like `$987.5033...` from reaching API responses; the result is an exact two-decimal dollar amount (e.g. `$987.50`).

### Pagination

- Default page size: **20 rows**. Max: **100** (enforced in service). Prevents accidental full-table HTTP responses.
- Two Prisma calls per list request: `count({ where })` then `findMany({ where, skip, take })`. At this scale both are fast enough that the extra round-trip is negligible vs. adding cursor-based pagination complexity.
- `total` is returned in every response so the portal can render page counts without a second request.

### Seed Performance

See [section 5](#5-seed-strategy) for a full breakdown. Summary:

| Phase | Duration |
|---|---|
| Generate 10,000 in-memory records | < 50 ms |
| 20 × `createMany(500)` in one transaction | 500 ms – 1.5 s |
| **Total** | **< 2 s** |

`createMany` in batches of 500 keeps SQLite well under its SQLITE_MAX_VARIABLE_NUMBER limit (default 999) while minimising fsync overhead.

### Test Performance

| Test type | Isolation | Typical duration |
|---|---|---|
| Unit (service, controller, mapper) | Mocked repositories — no I/O | < 5 ms each |
| Integration — routes | Mocked services via app factory | < 20 ms each |
| Integration — repositories | Real SQLite (`test.db` / `insights-test.db`) | 50–200 ms per suite |

Repository integration tests call `prisma migrate deploy` once before the suite. Separate DB files per test module prevent cross-suite state leakage without needing `beforeEach` truncation.

### Production (Railway Ephemeral SQLite)

- Container start: `prestart` runs migrate (near-instant on already-migrated DB) + seed (< 2 s) before Node process starts.
- After seed, SQLite's page cache is empty. The first insight query performs a cold read of the 2 MB database file into the page cache; subsequent queries are served from memory.
- Write concurrency: SQLite allows one writer at a time (WAL mode not enabled). For a single HR manager performing sequential CRUD operations this is not a bottleneck. For concurrent write traffic → PostgreSQL.

---

## Open Questions / Future Updates

- [x] Finalize seed data pools (countries, departments, job titles, salary tiers) — implemented in `prisma/seed.ts`; uses fixed pools for departments, countries, job titles, and employment types with deterministic index-based selection.
- [x] Portal API base URL configuration (`VITE_API_URL`) — `VITE_API_URL` env var in portal; defaults to `/api` (proxied to port 3000 in dev); set to full Railway URL for production.
- [ ] Extend insight responses with headcount or other fields if HR analytics requirements grow — currently out of scope; revisit if additional aggregations are needed.

---

*This document will be updated as decisions are validated or revised during TDD implementation.*
