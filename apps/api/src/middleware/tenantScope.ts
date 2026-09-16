import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/httpError";
import { prisma } from "../lib/prisma";

/*
 * Tenant isolation (Build Guide §3, BRD R-4).
 *
 * withTenant(schoolId) returns a Prisma client that can only see and change one school's data:
 *   - every read, update and delete on a school-owned model gets `schoolId` ANDed into its
 *     where clause, so an id guessed from another school behaves exactly like a missing record;
 *   - every create is stamped with `schoolId`, and a write naming a different school is refused.
 *
 * Services must still check what this cannot see (DECISIONS.md F-22, F-24):
 *   - ids inside `data` (e.g. the studentId on a new Score) must first be looked up through
 *     this client, to prove they belong to the school;
 *   - nested writes (`connect`, nested `create`) and raw SQL are not rewritten.
 *
 * Use the plain `prisma` client only for auth lookups and SUPER_ADMIN endpoints.
 */

/** Every model with a schoolId column, read from the Prisma schema so new models are covered automatically. */
export const TENANT_MODELS: ReadonlySet<string> = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === "schoolId"))
    .map((model) => model.name),
);

const FILTERED_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);
const CREATE_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn"]);
const UPDATE_OPERATIONS = new Set(["update", "updateMany", "updateManyAndReturn"]);

export class TenantViolationError extends HttpError {
  /** Logged server-side; the client only sees a generic 403. */
  readonly detail: string;

  constructor(detail: string) {
    super(403, "You don't have permission to do that.");
    this.detail = detail;
  }
}

type Row = Record<string, unknown>;
type QueryArgs = { where?: Row; data?: Row | Row[]; create?: Row; update?: Row };

// ANDed rather than merged, so a caller's own schoolId or id filter can narrow the result but never widen it.
function restrictWhere(where: Row | undefined, scope: Row): Row {
  const existing = where?.AND === undefined ? [] : Array.isArray(where.AND) ? where.AND : [where.AND];
  return { ...where, AND: [...existing, scope] };
}

function stampSchoolId(model: string, row: Row | undefined, schoolId: string): Row {
  const data = row ?? {};
  if ("school" in data) throw new TenantViolationError(`${model}: set schoolId, not the school relation`);
  if (data.schoolId !== undefined && data.schoolId !== schoolId) {
    throw new TenantViolationError(`${model}: create targets another school`);
  }
  return { ...data, schoolId };
}

function rejectSchoolChange(model: string, data: Row | undefined, schoolId: string): void {
  if (data && ("school" in data || (data.schoolId !== undefined && data.schoolId !== schoolId))) {
    throw new TenantViolationError(`${model}: cannot move a record to another school`);
  }
}

export function withTenant(schoolId: string) {
  return prisma.$extends({
    name: "tenantScope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scoped = (args ?? {}) as QueryArgs;

          if (model === "School") {
            if (!FILTERED_OPERATIONS.has(operation) || operation === "upsert" || operation.startsWith("delete")) {
              throw new TenantViolationError(`School.${operation} is not allowed for a school-scoped client`);
            }
            scoped.where = restrictWhere(scoped.where, { id: schoolId });
            return query(scoped as typeof args);
          }

          if (!TENANT_MODELS.has(model)) return query(args);

          if (FILTERED_OPERATIONS.has(operation)) {
            scoped.where = restrictWhere(scoped.where, { schoolId });
          } else if (CREATE_OPERATIONS.has(operation)) {
            scoped.data = Array.isArray(scoped.data)
              ? scoped.data.map((row) => stampSchoolId(model, row, schoolId))
              : stampSchoolId(model, scoped.data, schoolId);
          } else {
            throw new TenantViolationError(`${model}.${operation} is not supported by the tenant scope`);
          }

          if (UPDATE_OPERATIONS.has(operation)) rejectSchoolChange(model, scoped.data as Row | undefined, schoolId);
          if (operation === "upsert") {
            scoped.create = stampSchoolId(model, scoped.create, schoolId);
            rejectSchoolChange(model, scoped.update, schoolId);
          }
          return query(scoped as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof withTenant>;
