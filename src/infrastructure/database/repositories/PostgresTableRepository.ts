import type { Pool, PoolClient } from "pg";
import type { TableRepository } from "../../../application/ports/TableRepository.js";
import { Table, type ConfigurationState, type TableState } from "../../../domain/Table.js";

interface TableRow {
  id: number;
  code: string;
  seats: number;
  area_id: number;
  state: TableState;
  configuration_state: ConfigurationState;
}

function toTable(row: TableRow): Table {
  return new Table(row.id, row.code, row.seats, row.area_id, row.state, row.configuration_state);
}

export class PostgresTableRepository implements TableRepository {
  constructor(private readonly db: Pool | PoolClient) {}

  async listAvailable(): Promise<Table[]> {
    const { rows } = await this.db.query<TableRow>(`
      SELECT t.* FROM restaurant_tables t
      WHERE t.state = 'AVAILABLE' AND t.configuration_state = 'ENABLED'
        AND NOT EXISTS (
          SELECT 1 FROM dining_session_tables link
          JOIN dining_sessions session ON session.id = link.dining_session_id
          WHERE link.table_id = t.id AND session.state = 'ACTIVE'
        )
    `);
    return rows.map(toTable);
  }

  async lockByIds(ids: readonly number[]): Promise<Table[]> {
    const { rows } = await this.db.query<TableRow>(
      "SELECT * FROM restaurant_tables WHERE id = ANY($1::integer[]) ORDER BY id FOR UPDATE",
      [ids],
    );
    return rows.map(toTable);
  }

  async save(table: Table): Promise<void> {
    await this.db.query("UPDATE restaurant_tables SET state = $1 WHERE id = $2", [table.state, table.id]);
  }
}
