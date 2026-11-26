# MVP use cases

Three mutating workflows are in scope. Supporting reads provide table selection/suggestions without reserving anything. Staff have no role-specific authorization in this MVP.

See [entities.md](entities.md) for states and fields and [architecture.md](architecture.md) for technical boundaries and transactions.

## 1. SeatWalkInGuest

### Name and goal

Seat a walk-in party at one or more tables and create one ACTIVE dining session for the whole party.

### Who executes it

A staff member.

### How it starts

Guests arrive without a reservation and request seating. Staff considers preferences when choosing tables; preferences need no separate stored field.

### Preconditions

- A service session is ACTIVE; the system selects it automatically.
- Areas, tables, and configured seat counts exist.

Staff may start searching even when no suitable seating option exists.

### Information required

| Information | Source |
| --- | --- |
| partySize | Staff; positive integer |
| tableIds | Staff; one or more distinct IDs, required before confirmation |
| capacityOverrideConfirmed | Explicit staff confirmation for insufficient capacity; false by default |
| Active service session, generated session ID/code, arrival time | System |

No customer profile, reservation, order, or payment is required.

### Main steps

1. Staff enters the party size.
2. The system shows available/enabled tables and capacities, suggesting suitable seating. Staff may select multiple tables directly; automatic combination optimization is unnecessary.
3. Staff selects tables. They need not be adjacent, physically joined, or in the same area.
4. Display party size and combined configured capacity. If capacity is insufficient, warn and request explicit confirmation to proceed, for example after staff physically adds chairs.
5. Staff confirms seating and the capacity override if needed.
6. In one transaction, recheck the active service session and reload/lock selected tables. Verify the selection is non-empty and distinct, every table exists and is ENABLED/AVAILABLE, and no table has an ACTIVE dining session.
7. Recalculate capacity. If insufficient without explicit override, return a warning and make no changes.
8. Create one ACTIVE session with service session, party size, system arrival time, empty leaving time, and links to all selected tables.
9. Mark every selected table OCCUPIED and save session, associations, and table changes together.
10. After commit, return the created session and table states.

Suggestions do not hold tables. Overrides do not alter configured seats or bypass availability rules.

### Other situations

| Situation | Behavior |
| --- | --- |
| Invalid party size, empty selection, invalid IDs, or duplicate IDs | Request corrected input; no changes |
| No ACTIVE service session | Refuse seating |
| No option has enough configured seats | Warn; let staff select available tables and explicitly override capacity |
| No available/enabled tables at all | Refuse seating; at least one eligible table is required |
| A selected table is missing or disabled | Refuse; request another selection |
| A selected table is OCCUPIED, NEEDS_CLEANING, UNAVAILABLE, or has an ACTIVE session | Refuse that selection; refresh availability |
| Combined capacity insufficient without confirmation | Return warning with party size/capacity; allow confirmation and resubmission |
| Another request occupies a selected table first | Reject the whole operation; no partial allocation |
| Guests' requests cannot be met | Staff discusses alternatives; no automatic seating |
| Staff cancels before submission | No changes |
| Saving fails | Roll back session, associations, and table updates |

### Final result

Success: one ACTIVE dining session belongs to the active service session and all selected tables; each selected table is OCCUPIED. Arrival time is recorded, leaving time is empty.

Failure/cancellation: this operation creates no session/associations and changes no table states. Other concurrent operations may independently change data.

## 2. CloseDiningSession

### Name and goal

End the whole party's visit, close its dining session, and mark all associated tables NEEDS_CLEANING.

### Who executes it

A staff member.

### How it starts

The whole party has left and staff records the end of service.

### Preconditions

- The dining session is ACTIVE and linked to one or more occupied tables.
- Its associated service session is ACTIVE.
- All guests have left; staff confirms service is complete.

Ordering and payment are outside the system.

### Information required

| Information | Source |
| --- | --- |
| diningSessionId | Staff selects the session, optionally identified through an occupied table |
| Confirmation guests have left and service is complete | Staff; submitting the action represents confirmation |
| Associated tables and service session | System |
| Leaving time | System |

Selecting one table identifies the shared session; closure affects all its tables.

### Main steps

1. Staff selects the session, optionally through an occupied table.
2. Display the session, party size, arrival time, and all associated tables.
3. Staff chooses Close dining session and confirms the entire party has left and service is complete.
4. In one transaction, reload/lock the session and associated tables. Check the session is still ACTIVE, its associated service session is ACTIVE, and all tables are OCCUPIED by it.
5. Change the session to CLOSED and record system leaving time.
6. Change all associated tables to NEEDS_CLEANING.
7. Save all changes together, retaining historical table associations.
8. After commit, return the closed session and table states.

### Other situations

| Situation | Behavior |
| --- | --- |
| Invalid session ID | Request corrected input |
| Session not found | Report not found; no changes |
| Session already CLOSED | Report already closed; preserve original leaving time and current table states |
| Associated service session is not ACTIVE | Refuse; preserve session and tables |
| Table states or occupancy conflict with the session | Report inconsistent state; no partial changes |
| Some guests remain | Staff does not confirm; session stays ACTIVE |
| Staff cancels confirmation | No changes |
| Saving fails | Roll back session and all table updates |

### Final result

Success: the session is CLOSED with leaving time, all associated tables are NEEDS_CLEANING, and history is retained. Tables are not yet eligible for new seating.

Failure/cancellation: this operation changes no session, timestamp, associations, or table states. Partial table release and reopening are outside scope.

## 3. MarkTableReady

### Name and goal

Confirm a cleaned/prepared table is ready: NEEDS_CLEANING -> AVAILABLE.

### Who executes it

A staff member.

### How it starts

Staff finishes physically cleaning and preparing a table.

### Preconditions

- A service session is ACTIVE; the system selects it automatically.
- The table is ENABLED and NEEDS_CLEANING.
- No ACTIVE dining session uses it.
- Staff confirms it is physically ready.

### Information required

| Information | Source |
| --- | --- |
| tableId | Staff selects the table |
| Confirmation preparation is complete | Staff; selecting Mark table ready serves as confirmation |
| Active service session, table state, active occupancy | System |

### Main steps

1. Staff selects a table needing cleaning and views its current information.
2. Staff selects Mark table ready; no separate confirmation dialog is required.
3. In one transaction, check a service session is ACTIVE and reload/lock the table.
4. Verify the table is ENABLED, still NEEDS_CLEANING, and has no ACTIVE dining session.
5. Change it to AVAILABLE and save.
6. After commit, return the updated table; it becomes eligible for seating suggestions.

Mark tables ready independently, even when their previous session used multiple tables. Physical readiness is based on staff confirmation.

### Other situations

| Situation | Behavior |
| --- | --- |
| Invalid table ID | Request corrected input |
| Table not found | Report not found; no changes |
| No ACTIVE service session | Refuse |
| Already AVAILABLE and ENABLED with no ACTIVE session | Report already ready; no further changes |
| OCCUPIED or associated with an ACTIVE session | Refuse |
| UNAVAILABLE | Refuse; cleaning cannot restore an unusable table |
| DISABLED | Refuse |
| Still dirty or unprepared | Staff does not confirm; leave NEEDS_CLEANING |
| State changes before completion | Recheck; refuse if no longer eligible rather than overwriting newer state |
| Saving fails | Roll back update |

### Final result

Success: the table is AVAILABLE and eligible for new seating. Previous sessions/history remain unchanged. No session is created or reopened.

Failure/cancellation: this operation changes no table or dining session.
