import { z } from "zod";

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function toFieldErrors<T extends string>(
  issues: z.ZodIssue[],
): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path?.[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out as FieldErrors<T>;
}

export function inputClass(base: string, hasError?: boolean) {
  return `${base}${hasError ? " mq-input-error" : ""}`;
}

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const signUpIndividualSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80, "Name is too long"),
  email,
  password,
});

export const signUpEnterpriseSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required")
    .max(80, "Organization name is too long"),
  name: z.string().trim().min(2, "Your name is required").max(80, "Name is too long"),
  email,
  password,
});

export const createTaskSchema = z.object({
  name: z.string().trim().min(2, "Task title is required").max(120, "Title is too long"),
  description: z.string().trim().max(1200, "Description is too long").optional(),
  priorityQuadrant: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  timeEstimate: z.number().int().min(1).max(10),
  complexity: z.number().int().min(1).max(10),
  difficulty: z.number().int().min(1).max(10),
  phase: z.string().trim().min(1, "Phase is required").max(40),
  leadUserId: z.string().optional().nullable(),
  associatedUserIds: z.array(z.string()).optional(),
  dueDateTime: z
    .string()
    .optional()
    .refine(
      (v) => !v || !Number.isNaN(new Date(v).getTime()),
      "Enter a valid due date/time",
    ),
});

export const editTaskNameSchema = z.object({
  name: z.string().trim().min(2, "Task title is required").max(120, "Title is too long"),
});

export const addNoteSchema = z.object({
  body: z.string().trim().min(1, "Note cannot be empty").max(2000, "Note is too long"),
});

export const addDocumentSchema = z.object({
  fileName: z.string().trim().min(1, "Document label is required").max(120, "Label is too long"),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Enter a valid URL (include https://)"),
});

