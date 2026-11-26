# MVP entities

These definitions replace the earlier reservation/order/payment model. All three workflows require an ACTIVE service session. Staff authentication and roles are outside scope.

Use generated positive integer IDs. Codes are non-empty and unique within their entity type. Use camelCase in TypeScript and snake_case in PostgreSQL. Store timestamps as TIMESTAMPTZ, record actual event times on the server, and return ISO 8601 values with a timezone.

## 1. Table

A physical table serving at most one party at a time.

| Field | Meaning |
| --- | --- |
| id | Generated ID |
| code | Required, unique code |
| seats | Configured capacity; positive integer |
| areaId | Required reference to Area |
| state | AVAILABLE, OCCUPIED, NEEDS_CLEANING, or UNAVAILABLE |
| configurationState | ENABLED or DISABLED; initially seeded as ENABLED |

### States and behavior

| State | Meaning |
| --- | --- |
| AVAILABLE | Prepared and ready for seating |
| OCCUPIED | Serving an ACTIVE dining session |
| NEEDS_CLEANING | Previous visit ended; cleaning/preparation needed |
| UNAVAILABLE | Unusable, for example because it is broken |

```text
AVAILABLE --occupy--> OCCUPIED
OCCUPIED --finish visit--> NEEDS_CLEANING
NEEDS_CLEANING --mark ready--> AVAILABLE
```

- Only ENABLED, AVAILABLE tables can receive guests.
- A table may serve many sessions over time, but at most one ACTIVE session at a time.
- MarkTableReady cannot restore an UNAVAILABLE table or release an OCCUPIED table.
- Configured seats support suggestions and warnings. Explicit staff confirmation may override insufficient combined capacity for a visit without changing configured seats.
- Repairs, seat-count changes, and enabling/disabling management are outside these workflows.
- RESERVED is outside the MVP.

Entities protect their own transitions; use cases/repositories check cross-entity occupancy and concurrency.

## 2. DiningSession

One party's visit using one or more tables.

| Field | Meaning |
| --- | --- |
| id | Generated ID |
| code | Required, unique, system-generated code |
| serviceSessionId | Required service session reference |
| tableIds | One or more distinct table IDs, persisted through an association table |
| partySize | Positive integer number of guests |
| arrivalTime | Actual seating/start time recorded by the system |
| leavingTime | Empty while ACTIVE; recorded when CLOSED |
| state | ACTIVE or CLOSED |

### Rules and behavior

- Create as ACTIVE with at least one table and no leaving time.
- Close only from ACTIVE; set CLOSED and leaving time together. Leaving time cannot precede arrival time.
- Closure requires this session's associated ServiceSession to remain ACTIVE.
- All associated tables close together and become NEEDS_CLEANING atomically.
- Tables may be anywhere, including different areas; adjacency and physical joining are not required.
- Combined capacity is the sum of configured seats for distinct selected tables. A shortfall requires explicit staff confirmation, not automatic rejection.
- Capacity override never permits disabled, occupied, dirty, or unavailable tables.
- Retain session-to-table links as history after closure; historical links do not imply active occupancy.
- Repeated closure must not overwrite leaving time or change table states again.

Reservation, order, payment, and customer references are not needed. Moving tables, changing party size after seating, partial table release, and reopening sessions are outside scope.

## 3. ServiceSession

A period of restaurant service grouping dining sessions.

| Field | Meaning |
| --- | --- |
| id | Generated ID |
| code | Required, unique code |
| businessDate | Restaurant business date |
| state | ACTIVE or CLOSED |
| openTime | Actual start time |
| closeTime | Empty while ACTIVE; actual end time when CLOSED |

### Rules

- At most one service session may be ACTIVE; the system selects it automatically.
- SeatWalkInGuest and MarkTableReady require an ACTIVE service session.
- CloseDiningSession requires its own associated service session to be ACTIVE, not merely some other active session.
- Actual close time cannot precede open time. Actual event timestamps need not be in the future.
- Seed one ACTIVE session for the MVP. Service-session management endpoints, staffing, reservation quotas, and capacity settings are outside scope.

## 4. Area

A named location containing physical tables.

| Field | Meaning |
| --- | --- |
| id | Generated ID |
| name | Required, non-empty name |
| tableCount | Number of tables assigned to the area |

### Rules

- Each table belongs to one existing area. An area can contain zero or more tables.
- tableCount counts all assigned tables, regardless of occupancy/configuration state.
- Derive tableCount from table records instead of storing a duplicate counter. It is read-only.
- Areas do not restrict which tables may share a dining session.
- Area management is outside scope; use seed data.

## Relationships and persistence

```text
Area 1 ---- many Table
ServiceSession 1 ---- many DiningSession
DiningSession many ---- many Table (across visits)
```

Use `dining_session_tables(dining_session_id, table_id)` with unique pairs and foreign keys. A dining session has no single tableId or areaId because its tables can span areas. Validate at least one associated table during the creation transaction.

See [architecture.md](architecture.md) for persistence boundaries and [usecase.md](usecase.md) for workflows.
