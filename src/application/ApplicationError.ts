type ErrorCode = "INVALID_INPUT" | "TABLE_NOT_FOUND" | "NO_ACTIVE_SERVICE_SESSION"
  | "TABLE_NOT_AVAILABLE" | "CAPACITY_CONFIRMATION_REQUIRED";

export class ApplicationError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, number>,
  ) {
    super(message);
  }
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
}
