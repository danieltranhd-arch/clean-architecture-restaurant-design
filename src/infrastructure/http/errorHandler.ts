import type { ErrorRequestHandler } from "express";
import { ApplicationError } from "../../application/ApplicationError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof ApplicationError) {
    const status = error.code === "INVALID_INPUT" ? 400 : error.code === "TABLE_NOT_FOUND" ? 404 : 409;
    response.status(status).json({ code: error.code, message: error.message, details: error.details });
    return;
  }
  if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
    response.status(error.type === "entity.too.large" ? 413 : 400)
      .json({ code: "INVALID_INPUT", message: "Provide a valid JSON request body within the size limit." });
    return;
  }
  console.error(error);
  response.status(500).json({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." });
};
