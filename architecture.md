# MVP architecture

## Scope and stack

TypeScript, Express, and PostgreSQL implement three workflows: SeatWalkInGuest, CloseDiningSession, and MarkTableReady.

See [entities.md](entities.md) for domain rules and [usecase.md](usecase.md) for workflow details.

The MVP is an HTTP API. Seed data supplies areas, tables, and one ACTIVE service session. Management endpoints, reservations, orders, payments, staff accounts/roles, a frontend, and reports are outside scope.

## Structure

```text
src/
├── domain/
│   ├── Table.ts
│   ├── DiningSession.ts
│   ├── ServiceSession.ts
│   └── Area.ts
├── application/
│   ├── usecases/
│   │   ├── SeatWalkInGuest.ts
│   │   ├── CloseDiningSession.ts
│   │   └── MarkTableReady.ts
│   ├── queries/
│   │   └── ListSeatingCandidates.ts
│   └── ports/
│       ├── TableRepository.ts
│       ├── DiningSessionRepository.ts
│       ├── ServiceSessionRepository.ts
│       └── TransactionManager.ts
├── infrastructure/
│   ├── http/
│   │   ├── controllers/
│   │   ├── routes.ts
│   │   └── errorHandler.ts
│   └── database/
│       ├── pool.ts
│       ├── repositories/
│       ├── migrations/
│       ├── seed.ts
│       └── PostgresTransactionManager.ts
└── index.ts
```

## Responsibilities

| Component | Responsibility |
| --- | --- |
| Domain entities | State, invariants, valid business transitions |
| Application use cases | Coordinate domain behavior, repository calls, atomic operations |
| Application ports | Persistence and transaction contracts without database-specific types |
| Express controllers | Parse requests, validate request shape, invoke use cases, return responses |
| PostgreSQL repositories | Map records to domain data and implement persistence contracts |
| Transaction implementation | Supply repositories sharing one PostgreSQL transaction/client |
| index.ts | Construct dependencies and start Express |

Source dependencies point inward: infrastructure depends on application/domain; application depends on domain. Domain and application must not import Express, PostgreSQL drivers, or HTTP status codes.

Runtime: HTTP request -> controller -> use case -> entities/repository ports -> PostgreSQL adapters -> use case result -> HTTP response.

Controllers format responses for now; separate presenters are deferred. Repository interfaces are also called gateways; no second abstraction is needed.

## Persistence contracts

Use `areas`, `restaurant_tables`, `service_sessions`, `dining_sessions`, and `dining_session_tables`. The association table supports multiple tables per visit and preserves history. A session has no single table_id or area_id because its tables may span areas.

- ServiceSessionRepository: find the active session; find a session by ID.
- TableRepository: list seating candidates; load selected tables for update; save state changes.
- DiningSessionRepository: load a session for update; check active occupancy by table IDs; create a session with associations; save closure.
- TransactionManager: execute a callback using repositories bound to one transaction, committing or rolling back as a unit.

Area counts can be included in read queries. No AreaRepository is needed until a workflow uses one.

## Consistency and concurrency

- Every mutating use case runs in one transaction using the same database client for all repositories.
- Recheck the required service session is ACTIVE within the transaction.
- Lock affected table rows before checking occupancy or changing state; lock multiple tables in ascending ID order.
- CloseDiningSession also locks its session before deciding whether it can close.
- Every writer follows the same locking protocol. Two requests must not seat different parties at the same table.
- Coordinate service-session checks with updates to that service session so it cannot close midway through a successful operation.
- Roll back all writes on failure; return success only after commit.

Database constraints: unique codes, positive seat counts/party sizes, allowed states, foreign keys, unique session-table pairs, and a partial unique index allowing at most one ACTIVE service session. This index does not guarantee that an active session exists.

## HTTP surface

| Method and path | Purpose |
| --- | --- |
| GET /tables?partySize=... | Read available/enabled tables with capacity information for suggestions |
| POST /dining-sessions | SeatWalkInGuest |
| POST /dining-sessions/:id/close | CloseDiningSession |
| POST /tables/:id/ready | MarkTableReady |

The MVP defines three business use cases. The seating candidates query supports table selection within SeatWalkInGuest and lives in `application/queries/`. Suggestions never hold tables. Return individual candidates ordered by capacity; staff can select multiple tables.

Seating input: `partySize`, `tableIds`, optional `capacityOverrideConfirmed` (false by default). Close and ready use the URL ID; submission represents staff confirmation.

Suggested response mapping: 201 for seating, 200 for close/ready, 400 for invalid input, 404 for missing resources, 409 for state conflicts/no active session/unconfirmed capacity override, and 500 for unexpected failures. Capacity warnings include selected capacity and party size for confirmation and resubmission. Application errors contain no HTTP-specific types. Do not expose SQL errors.

## Running the seating API locally

Create a local PostgreSQL database named `restaurant`, copy `.env.example` to `.env`, and set `DATABASE_URL` to your local database connection. With Node.js 24, run:

```powershell
npm install
npm run build
npm run db:setup
npm start
```

`db:setup` applies the initial schema and adds sample areas, tables, and one active service session. Repeating setup preserves existing seating data.

Use `GET /tables?partySize=5` to get table IDs, then submit the selected IDs and party size to `POST /dining-sessions`. A capacity conflict returns `CAPACITY_CONFIRMATION_REQUIRED` with the configured capacity. Staff confirmation allows the client to retry with `capacityOverrideConfirmed: true`.

## Implementation and verification

Implement entities, application ports/use cases, PostgreSQL schema/repositories/transactions, then Express adapters and dependency wiring.

Verify successful workflows, capacity override, invalid transitions, no active service session, multi-table rollback, and competing seating requests. PostgreSQL integration checks are required to verify transaction and locking behavior.
