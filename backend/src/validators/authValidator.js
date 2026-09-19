// backend/src/validators/authValidator.js
// Zod v4-compatible schemas
// Last updated: 2026-09-19

import { z } from "zod";

// ============================================================
// LOGIN SCHEMA
// ============================================================
export const loginSchema = z.object({
  email: z
    .string({ message: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Invalid email format.")
    .max(255, "Email too long."),
  password: z
    .string({ message: "Password is required." })
    .min(1, "Password is required.")
    .max(128, "Password too long."),
});

// ============================================================
// FACE LOGIN SCHEMA
// ============================================================
export const faceLoginSchema = z.object({
  face_descriptor: z
    .array(z.number(), { message: "Face descriptor is required." })
    .min(64, "Invalid face descriptor (too short).")
    .max(512, "Invalid face descriptor (too long)."),
});

// ============================================================
// VERIFY MFA SCHEMA
// ============================================================
export const verifyMfaSchema = z.object({
  temp_token: z
    .string({ message: "Temp token is required." })
    .min(1, "Temp token is required."),
  token: z
    .string({ message: "Verification code is required." })
    .trim()
    .min(6, "Invalid verification code.")
    .max(10, "Invalid verification code."),
});