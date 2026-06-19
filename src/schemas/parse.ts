import { z } from "zod";

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
    .join("; ");
}

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  value: unknown,
  context: string
): T | null {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  console.warn(`Rejected invalid ${context}: ${formatZodIssues(result.error)}`);
  return null;
}

export function parseArrayWithSchema<T>(
  schema: z.ZodType<T>,
  value: unknown,
  context: string
): T[] {
  if (!Array.isArray(value)) {
    console.warn(`Rejected invalid ${context}: value is not an array`);
    return [];
  }

  return value.reduce<T[]>((items, item, index) => {
    const parsed = parseWithSchema(schema, item, `${context}[${index}]`);
    if (parsed) {
      items.push(parsed);
    }
    return items;
  }, []);
}

export function parseWithFallback<T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallback: T,
  context: string
): T {
  return parseWithSchema(schema, value, context) ?? fallback;
}
