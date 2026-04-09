import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "API_ERROR", details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, init);
}

export function jsonError(
  status: number,
  message: string,
  code = "API_ERROR",
  details?: unknown
) {
  return NextResponse.json({ ok: false as const, error: { code, message, details } }, { status });
}

export function handleRouteError(err: unknown) {
  if (err instanceof ApiError) {
    return jsonError(err.status, err.message, err.code, err.details);
  }

  if (err instanceof ZodError) {
    return jsonError(400, "Invalid request", "VALIDATION_ERROR", err.flatten());
  }

  // Prisma errors (best-effort without importing Prisma types into edge bundles)
  const prismaCode = (err as { code?: unknown } | null)?.code;
  if (typeof prismaCode === "string" && prismaCode.startsWith("P")) {
    return jsonError(400, "Database error", "DB_ERROR", { code: prismaCode });
  }

  console.error(err);
  return jsonError(500, "Internal server error", "INTERNAL_ERROR");
}
