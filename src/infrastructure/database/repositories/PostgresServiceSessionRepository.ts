import type { PoolClient } from "pg";
import type { ServiceSessionRepository } from "../../../application/ports/ServiceSessionRepository.js";
import type { ServiceSession } from "../../../domain/ServiceSession.js";

export class PostgresServiceSessionRepository implements ServiceSessionRepository {
  constructor(private readonly client: PoolClient) {}

  async findActiveForSeating(): Promise<ServiceSession | null> {
    const { rows } = await this.client.query<ServiceSession>(
      "SELECT id, state FROM service_sessions WHERE state = 'ACTIVE' FOR SHARE",
    );
    return rows[0] ?? null;
  }
}
