-- ============ TABLES ============
CREATE TABLE departments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  manager_id VARCHAR(36),
  parent_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
  manager VARCHAR(150),
  color VARCHAR(20) DEFAULT '#7c3aed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  user_id VARCHAR(36),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  department_id VARCHAR(36) REFERENCES departments(id),
  job_title VARCHAR(255),
  employment_type VARCHAR(20) NOT NULL DEFAULT 'regular'
    CHECK (employment_type IN ('regular','part_time','contract','probationary')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','suspended','on_leave','terminated')),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  termination_date DATE,
  manager_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
  salary NUMERIC(12,2),
  hourly_rate NUMERIC(8,2),
  timezone VARCHAR(100) DEFAULT 'Asia/Manila',
  address TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_dept ON employees(department_id);

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('admin','hr_manager','supervisor','employee')),
  department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
  employee_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active',
  last_login TIMESTAMPTZ,
  last_notifications_read_at TIMESTAMPTZ,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  current_session_id VARCHAR(128),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret TEXT,
  mfa_backup_codes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attendance (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('present','absent','late','half_day','on_leave','holiday')),
  work_hours NUMERIC(5,2),
  overtime_hours NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_emp_date UNIQUE (employee_id, date)
);
CREATE INDEX idx_attendance_date ON attendance(date);

CREATE TABLE attendance_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('check_in','check_out')),
  method VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (method IN ('manual','biometric','mobile','web')),
  location VARCHAR(255),
  ip_address VARCHAR(255),
  device_id VARCHAR(255)
);
CREATE INDEX idx_attlogs_emp ON attendance_logs(employee_id);

CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_id VARCHAR(36),
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(255),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

CREATE TABLE biometric_credentials (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL DEFAULT '',
  public_key TEXT NOT NULL DEFAULT '',
  counter INT DEFAULT 0,
  device_name VARCHAR(255),
  photo_data TEXT,
  face_descriptor TEXT,
  fingerprint_template TEXT,
  device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('fingerprint','face_id')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_bio_emp ON biometric_credentials(employee_id);

CREATE TABLE shifts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL DEFAULT '',
  type VARCHAR(20) NOT NULL CHECK (type IN ('day','evening','night','rotating')),
  start_time TIME NOT NULL DEFAULT '00:00',
  end_time TIME NOT NULL DEFAULT '00:00',
  break_duration INT DEFAULT 60,
  days_of_week TEXT,
  department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
  color VARCHAR(20) DEFAULT '#7c3aed',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employee_shifts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id VARCHAR(36) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','active','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_empshift_date ON employee_shifts(date);

CREATE TABLE leave_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(20) NOT NULL
    CHECK (leave_type IN ('annual','sick','maternity','paternity','unpaid','emergency','compensatory')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INT NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approver_id VARCHAR(36),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  attachment_data TEXT,
  attachment_name VARCHAR(255),
  attachment_type VARCHAR(100),
  attachment_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leave_status ON leave_requests(status);

CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url VARCHAR(500),
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON notifications(user_id);

CREATE TABLE settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key" VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('general','attendance','leave','payroll','notification','security')),
  label VARCHAR(255) NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE timesheets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected')),
  total_regular_hours NUMERIC(6,2) DEFAULT 0,
  total_overtime_hours NUMERIC(6,2) DEFAULT 0,
  entries TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approver_id VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ SEED (admin + default settings) ============
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
('b23e4e86-7e15-11f1-949c-4439c43b0d39', 'admin@workforce.io',
 '$2a$10$u3qgJ2pUKRqqIiLtR.UhueMF8Dwzm0uBeurZQyEoieNlHnyuhFd5.', 'Administrator', 'admin', 'active');

INSERT INTO settings ("key", value, category, label, description) VALUES
('company_name','""','general','Company Name','The name displayed throughout the system'),
('timezone','"UTC-5 (EST)"','general','Timezone','Default timezone for attendance and scheduling'),
('date_format','"MM/DD/YYYY"','general','Date Format','How dates are displayed across the system'),
('work_week_start','"Monday"','general','Work Week Start','First day of the work week'),
('employee_id_prefix','"EMP-"','general','Employee ID Prefix','Prefix for auto-generated employee codes'),
('work_hours_per_day','8','attendance','Work Hours per Day','Standard daily work hours'),
('late_threshold_minutes','15','attendance','Late Threshold (minutes)','Minutes after shift start to flag as late'),
('early_checkin_window_minutes','30','attendance','Early Check-in Window (minutes)','How early employees can check in'),
('overtime_threshold_hours','8','attendance','Overtime Threshold (hours)','Daily hours before overtime kicks in'),
('biometric_required','true','attendance','Biometric Required','Require biometric verification for check-in'),
('geofencing','false','attendance','Geofencing','Restrict check-in to approved locations'),
('annual_leave_days','21','leave','Annual Leave Days','Default annual leave entitlement per employee'),
('sick_leave_days','12','leave','Sick Leave Days','Default sick leave entitlement per employee'),
('carry_forward_cap','5','leave','Carry Forward Cap','Max leave days that can be carried to next year'),
('advance_notice_days','2','leave','Advance Notice (days)','Minimum days notice required for leave requests'),
('auto_approve_long_absence','true','leave','Auto-approve Long Absence','Flag requests exceeding 14 days for HR review'),
('leave_request_alerts','true','notification','Leave Request Alerts','Notify managers of new leave requests'),
('late_arrival_alerts','true','notification','Late Arrival Alerts','Notify supervisors of late arrivals'),
('timesheet_reminders','true','notification','Timesheet Reminders','Send weekly submission reminders to employees'),
('shift_change_alerts','true','notification','Shift Change Alerts','Notify employees of shift changes'),
('email_notifications','true','notification','Email Notifications','Send notifications via email'),
('push_notifications','false','notification','Push Notifications','Browser push notifications'),
('session_timeout_minutes','30','security','Session Timeout (minutes)','Idle time before automatic logout'),
('password_expiry_days','90','security','Password Expiry (days)','Force password reset after this many days'),
('two_factor_auth','true','security','Two-Factor Authentication','Require 2FA for admin accounts'),
('biometric_login','true','security','Biometric Login','Allow WebAuthn/biometric system access'),
('audit_all_actions','true','security','Audit All Actions','Log every system action for compliance'),
('ip_whitelist','false','security','IP Whitelist','Restrict system access to approved IP ranges');