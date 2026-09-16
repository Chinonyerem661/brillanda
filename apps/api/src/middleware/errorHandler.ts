import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import type { ValidationErrorBody } from "@brillanda/shared-types";
import { HttpError } from "../lib/httpError";
import { TenantViolationError } from "./tenantScope";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

// Validation failures always use the ValidationErrorBody shape: the score grid maps
// `fields` onto individual cells (Build Guide §5).
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const body: ValidationErrorBody = { error: "Validation failed", fields: err.flatten().fieldErrors };
    res.status(400).json(body);
    return;
  }
  if (err instanceof TenantViolationError) {
    console.warn(`Blocked cross-school access: ${err.detail}`);
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.fields && { fields: err.fields }) });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ error: "That already exists." });
      return;
    }
  }
  // Client errors raised by Express itself, e.g. a malformed JSON body.
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.expose ? err.message : "Bad request" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
};
