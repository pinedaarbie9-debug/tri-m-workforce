export type UserRole = "admin" | "hr_manager" | "supervisor" | "employee";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  department_id?: string;
  employee_id?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  manager_id?: string;
  parent_id?: string;
  head_count: number;
  created_at: string;
  updated_at: string;
}

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type EmployeeStatus = "active" | "inactive" | "on_leave" | "terminated";

export interface Employee {
  id: string;
  employee_code: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  department_id: string;
  department?: Department;
  job_title: string;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  hire_date: string;
  termination_date?: string;
  manager_id?: string;
  manager?: Pick<Employee, "id" | "full_name" | "email">;
  salary?: number;
  hourly_rate?: number;
  timezone: string;
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "on_leave"
  | "holiday";

export interface Attendance {
  id: string;
  employee_id: string;
  employee?: Pick<Employee, "id" | "full_name" | "employee_code" | "avatar_url">;
  date: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  work_hours?: number;
  overtime_hours?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  timestamp: string;
  type: "check_in" | "check_out";
  method: "manual" | "biometric" | "mobile" | "web";
  location?: string;
  ip_address?: string;
  device_id?: string;
}

export interface BiometricCredential {
  id: string;
  employee_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name?: string;
  device_type: "fingerprint" | "face_id" | "pin" | "card";
  registered_at: string;
  last_used_at?: string;
  is_active: boolean;
}

export type ShiftType = "day" | "evening" | "night" | "rotating";

export interface Shift {
  id: string;
  name: string;
  code: string;
  type: ShiftType;
  start_time: string;
  end_time: string;
  break_duration: number;
  days_of_week: number[];
  department_id?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AssignmentStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface EmployeeShift {
  id: string;
  employee_id: string;
  employee?: Pick<Employee, "id" | "full_name" | "employee_code" | "avatar_url">;
  shift_id: string;
  shift?: Shift;
  date: string;
  status: AssignmentStatus;
  notes?: string;
  created_at: string;
}

export type LeaveType =
  | "annual"
  | "sick"
  | "maternity"
  | "paternity"
  | "unpaid"
  | "emergency"
  | "compensatory";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: Pick<Employee, "id" | "full_name" | "employee_code" | "avatar_url" | "department">;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: LeaveStatus;
  approver_id?: string;
  approver?: Pick<Employee, "id" | "full_name">;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export interface TimesheetEntry {
  date: string;
  regular_hours: number;
  overtime_hours: number;
  notes?: string;
}

export interface Timesheet {
  id: string;
  employee_id: string;
  employee?: Pick<Employee, "id" | "full_name" | "employee_code">;
  period_start: string;
  period_end: string;
  status: TimesheetStatus;
  total_regular_hours: number;
  total_overtime_hours: number;
  entries: TimesheetEntry[];
  submitted_at?: string;
  approved_at?: string;
  approver_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "shift_assigned"
  | "timesheet_due"
  | "attendance_alert"
  | "system"
  | "announcement";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  code: UserRole;
  description?: string;
  permissions: Permission[];
  created_at: string;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "export"
  | "import";

export interface AuditLog {
  id: string;
  user_id: string;
  user?: Pick<User, "id" | "full_name" | "email">;
  action: AuditAction;
  module: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type ReportType =
  | "attendance_summary"
  | "leave_summary"
  | "timesheet_summary"
  | "headcount"
  | "overtime"
  | "department_summary";

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  filters: Record<string, unknown>;
  generated_by: string;
  generated_at: string;
  file_url?: string;
  status: "generating" | "ready" | "failed";
}

export interface Settings {
  id: string;
  key: string;
  value: unknown;
  category: "general" | "attendance" | "leave" | "payroll" | "notification" | "security";
  label: string;
  description?: string;
  updated_at: string;
}

export interface DashboardStats {
  total_employees: number;
  present_today: number;
  on_leave_today: number;
  new_hires_month: number;
  avg_work_hours: number;
  pending_leaves: number;
  overtime_hours: number;
  attendance_rate: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface FilterParams {
  search?: string;
  department_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  [key: string]: string | undefined;
}
