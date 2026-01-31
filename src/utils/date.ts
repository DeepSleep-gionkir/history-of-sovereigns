import { DbDate } from "@/types/db";

export function parseDbDate(val: DbDate | undefined | null): Date {
  if (!val) return new Date(); // Fallback to now or handle appropriately
  if (val instanceof Date) return val;
  if (typeof val === "string") return new Date(val);
  if (typeof val === "object" && "seconds" in val) {
    return new Date(val.seconds * 1000);
  }
  return new Date();
}
