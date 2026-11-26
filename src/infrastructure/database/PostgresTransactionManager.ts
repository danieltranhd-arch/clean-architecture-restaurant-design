import type { Pool } from "pg";
import type { SeatingRepositories, TransactionManager } from "../../application/ports/TransactionManager.js";
import { PostgresDiningSessionRepository } from "./repositories/PostgresDiningSessionRepository.js";
import { PostgresServiceSessionRepository } from "./repositories/PostgresServiceSessionRepository.js";
import { PostgresTableRepository } from "./repositories/PostgresTableRepository.js";

export class PostgresTransactionManager implements TransactionManager {
  constructor(private readonly pool: Pool) {}

  async run<T>(operation: (repositories: SeatingRepositories) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let releaseError: Error | undefined;
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const result = await operation({
        tables: new PostgresTableRepository(client),
        diningSessions: new PostgresDiningSessionRepository(client),
        serviceSessions: new PostgresServiceSessionRepository(client),
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        releaseError = new Error("PostgreSQL rollback failed.");
      }
      throw error;
    } finally {
      client.release(releaseError);
    }
  }
}
