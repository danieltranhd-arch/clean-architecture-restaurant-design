import type { ServiceSession } from "../../domain/ServiceSession.js";

export interface ServiceSessionRepository {
  findActiveForSeating(): Promise<ServiceSession | null>;
}
