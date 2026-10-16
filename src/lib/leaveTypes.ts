// src/lib/leaveTypes.ts
import type { LeaveType } from "../types";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Vacation leave",
  sick: "Sick leave",
  emergency: "Emergency leave",
  unpaid: "Unpaid leave",
  compensatory: "Compensatory leave",
  service_incentive: "Service Incentive Leave",
  maternity: "Maternity leave",
  paternity: "Paternity leave",
  solo_parent: "Solo parent leave",
  vawc: "VAWC leave",
  special_women: "Special leave for women",
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  annual: "bg-blue-100 text-blue-700",
  sick: "bg-red-100 text-red-700",
  emergency: "bg-orange-100 text-orange-700",
  unpaid: "bg-gray-100 text-gray-600",
  compensatory: "bg-purple-100 text-purple-700",
  service_incentive: "bg-emerald-100 text-emerald-700",
  maternity: "bg-pink-100 text-pink-700",
  paternity: "bg-indigo-100 text-indigo-700",
  solo_parent: "bg-teal-100 text-teal-700",
  vawc: "bg-rose-100 text-rose-700",
  special_women: "bg-fuchsia-100 text-fuchsia-700",
};

// Mga type na tinatanggap ng backend sa pag-file.
// (Wala ang "compensatory" dahil hindi ito tinatanggap ng validator.)
export const LEAVE_TYPE_OPTIONS: LeaveType[] = [
  "annual",
  "sick",
  "emergency",
  "unpaid",
  "service_incentive",
  "maternity",
  "paternity",
  "solo_parent",
  "vawc",
  "special_women",
];

export function leaveLabel(type: string): string {
  return LEAVE_TYPE_LABELS[type as LeaveType] ?? type.replace("_", " ");
}