// backend/src/validators/businessValidator.js
// Zod v4 schemas para sa employees, attendance, biometric, mfa, shifts, timesheets

import { z } from "zod";

// ============================================================
// SHARED
// ============================================================
const uuidSchema = z.string().uuid("Invalid ID format.");
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD).");
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email format.")
  .max(255, "Email too long.");

// ============================================================
// EMPLOYEES
// ============================================================
export const createEmployeeSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required.").max(100),
  last_name: z.string().trim().min(1, "Last name is required.").max(100),
  email: emailSchema,
  phone: z.string().trim().max(30).optional().nullable(),
  job_title: z.string().trim().max(100).optional().nullable(),
  department_id: uuidSchema.optional().nullable(),
  employment_type: z
    .enum(["full_time", "part_time", "contract", "intern"])
    .optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  // 🔒 REQUIRED na ngayon — hindi na optional
  hire_date: isoDateSchema,
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const updateSelfEmployeeSchema = z.object({
  phone: z.string().trim().max(30).optional().nullable(),
  email: emailSchema.optional(),
});

// ============================================================
// ATTENDANCE
// ============================================================
export const checkInSchema = z.object({
  method: z.enum(["biometric", "manual", "web"]).optional(),
});

export const attendanceQuerySchema = z.object({
  date: isoDateSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

// ============================================================
// BIOMETRIC
// ============================================================
export const createBiometricSchema = z.object({
  employee_id: uuidSchema,
  device_type: z.enum(["fingerprint", "face_id", "pin", "card"]),
  device_name: z.string().trim().max(100).optional().nullable(),
  photo_data: z.string().max(5_000_000).optional().nullable(),
  face_descriptor: z.array(z.number()).min(64).max(512).optional().nullable(),
  credential_id: z.string().trim().max(50).optional().nullable(),
});

export const updateBiometricSchema = z.object({
  device_name: z.string().trim().max(100).optional().nullable(),
  photo_data: z.string().max(5_000_000).optional().nullable(),
  face_descriptor: z.array(z.number()).min(64).max(512).optional().nullable(),
  credential_id: z.string().trim().max(50).optional().nullable(),
  is_active: z.boolean().optional(),
});

// ============================================================
// MFA
// ============================================================
export const mfaTokenSchema = z.object({
  token: z.string().trim().min(6, "Invalid code.").max(10, "Invalid code."),
});

// ============================================================
// SHIFTS
// ============================================================
export const createShiftSchema = z.object({
  type: z.string().trim().min(1, "Type is required.").max(50),
  name: z.string().trim().min(1, "Name is required.").max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format.")
    .optional(),
});

export const assignShiftSchema = z.object({
  employee_id: uuidSchema,
  shift_id: uuidSchema,
  date: isoDateSchema,
});

export const shiftRangeSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

// ============================================================
// TIMESHEETS
// ============================================================
export const generateTimesheetSchema = z.object({
  employee_id: uuidSchema,
  period_start: isoDateSchema,
  period_end: isoDateSchema,
});

export const updateTimesheetStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

// ============================================================
// REPORTS
// ============================================================
export const reportMonthSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Invalid month format (YYYY-MM).")
    .optional(),
});

// ============================================================
// DEPARTMENTS
// ============================================================
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  code: z.string().trim().min(1, "Code is required.").max(20),
  manager: z.string().trim().max(100).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format.")
    .optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ============================================================
// LEAVE REQUESTS
// ============================================================
const LEAVE_TYPES = ["annual", "sick", "emergency", "unpaid", "maternity", "paternity"];

export const createLeaveRequestSchema = z.object({
  leave_type: z.enum(LEAVE_TYPES, { message: "Invalid leave type." }),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)."),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)."),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const adminCreateLeaveRequestSchema = createLeaveRequestSchema.extend({
  employee_id: z.string().uuid("Invalid employee ID."),
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum(["approved", "rejected"], { message: "Invalid status." }),
});

// ============================================================
// SETTINGS
// ============================================================
export const updateSettingsSchema = z.object({
  updates: z
    .array(
      z.object({
        key: z.string().trim().min(1, "Key is required.").max(100),
        value: z.any(),
      })
    )
    .min(1, "At least one update is required."),
});

// ============================================================
// PARTNER ATTENDANCE
// ============================================================
export const partnerAttendanceQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid from date (YYYY-MM-DD).")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid to date (YYYY-MM-DD).")
    .optional(),
});