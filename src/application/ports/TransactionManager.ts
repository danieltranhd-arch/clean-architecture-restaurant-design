import type { DiningSessionRepository } from "./DiningSessionRepository.js";
import type { ServiceSessionRepository } from "./ServiceSessionRepository.js";
import type { TableRepository } from "./TableRepository.js";

export interface SeatingRepositories {
  tables: TableRepository;
  diningSessions: DiningSessionRepository;
  serviceSessions: ServiceSessionRepository;
}

export interface TransactionManager {
  run<T>(operation: (repositories: SeatingRepositories) => Promise<T>): Promise<T>;
}
