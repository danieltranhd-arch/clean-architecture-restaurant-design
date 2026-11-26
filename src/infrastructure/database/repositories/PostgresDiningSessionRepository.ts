import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { DiningSessionRepository } from "../../../application/ports/DiningSessionRepository.js";
import type { DiningSession } from "../../../domain/DiningSession.js";

export class PostgresDiningSessionRepository implements DiningSessionRepository {
  constructor(private readonly client: PoolClient) {}

  async hasActiveOccupancy(ids: readonly number[]): Promise<boolean> {
    const { rows } = await this.client.query<{ occupied: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM dining_session_tables link
        JOIN dining_sessions session ON session.id = link.dining_session_id
        WHERE link.table_id = ANY($1::integer[]) AND session.state = 'ACTIVE'
      ) AS occupied
    `, [ids]);
    return rows[0].occupied;
  }

  async create(session: DiningSession): Promise<{ id: number; code: string }> {
    const { rows: [identity] } = await this.client.query<{ id: number; code: string }>(`
      INSERT INTO dining_sessions (code, service_session_id, party_size, arrival_time, state)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, code
    `, [randomUUID(), session.serviceSessionId, session.partySize, session.arrivalTime, session.state]);
    await this.client.query(`
      INSERT INTO dining_session_tables (dining_session_id, table_id)
      SELECT $1, table_id FROM unnest($2::integer[]) AS selected(table_id)
    `, [identity.id, session.tableIds]);
    return identity;
  }
}
