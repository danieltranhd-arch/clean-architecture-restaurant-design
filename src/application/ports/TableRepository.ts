import type { Table } from "../../domain/Table.js";

export interface TableRepository {
  listAvailable(): Promise<Table[]>;
  lockByIds(ids: readonly number[]): Promise<Table[]>;
  save(table: Table): Promise<void>;
}
