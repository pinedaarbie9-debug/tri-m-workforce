-- ============================================================
-- Workforce Management System — MySQL Schema
-- I-import ito sa phpMyAdmin: piliin ang database mo -> SQL tab -> i-paste ito -> Go
-- ============================================================

CREATE DATABASE IF NOT EXISTS workforce_db;
USE workforce_db;

-- ---------- Departments ----------
CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  manager VARCHAR(150),
  color VARCHAR(20) DEFAULT '#7c3aed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Employees ----------
CREATE TABLE IF NOT EXISTS employees (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  job_title VARCHAR(150),
  department_id CHAR(36),
  employment_type ENUM('full_time','part_time','contract','intern') DEFAULT 'full_time',
  status ENUM('active','inactive','on_leave','terminated') DEFAULT 'active',
  hire_date DATE,
  avatar_url VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- ---------- Users (system login accounts) ----------
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','hr_manager','supervisor','employee') DEFAULT 'employee',
  employee_id CHAR(36) NULL,
  status ENUM('active','inactive','suspended') DEFAULT 'active',
  last_login DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- ---------- Attendance ----------
CREATE TABLE IF NOT EXISTS attendance (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  status ENUM('present','absent','late','half_day','on_leave','holiday') NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  work_hours DECIMAL(4,2) NULL,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_emp_date (employee_id, date)
);

-- ---------- Attendance Logs (check-in/out event log for Recent Activity) ----------
CREATE TABLE IF NOT EXISTS attendance_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id CHAR(36) NOT NULL,
  type ENUM('check_in','check_out') NOT NULL,
  method VARCHAR(50) DEFAULT 'biometric',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ---------- Leave Requests ----------
CREATE TABLE IF NOT EXISTS leave_requests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id CHAR(36) NOT NULL,
  leave_type ENUM('annual','sick','maternity','paternity','unpaid','emergency','compensatory') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INT NOT NULL,
  reason TEXT,
  status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ---------- Biometric Credentials ----------
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id CHAR(36) NOT NULL,
  device_type ENUM('fingerprint','face_id','card','pin') NOT NULL,
  device_name VARCHAR(150),
  is_active BOOLEAN DEFAULT TRUE,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ---------- Audit Logs ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NULL,
  action ENUM('create','update','delete','login','logout','export','import') NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_id CHAR(36) NULL,
  ip_address VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- Shifts ----------
CREATE TABLE IF NOT EXISTS shifts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  type ENUM('day','evening','night','rotating') NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS employee_shifts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id CHAR(36) NOT NULL,
  shift_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

-- ============================================================
-- Seed data (para may makita kang laman agad sa dashboard)
-- ============================================================

INSERT INTO departments (id, name, code, manager, color) VALUES
  (UUID(), 'Engineering', 'ENG', 'Alice Johnson', '#7c3aed'),
  (UUID(), 'Sales', 'SLS', 'Bob Martinez', '#06b6d4'),
  (UUID(), 'Human Resources', 'HR', 'Emma Davis', '#ec4899');

-- Default admin user — WALANG password_hash muna dito dahil kailangan mo munang
-- buuin ito gamit ang: node backend/scripts/hash-password.js "yourpassword"
-- Pagkatapos, patakbuhin ang UPDATE statement sa ibaba (o palitan bago i-run ang INSERT):
INSERT INTO users (id, full_name, email, password_hash, role) VALUES
  (UUID(), 'Sophia Mitchell', 'admin@workforce.io', 'REPLACE_ME', 'admin');

-- Halimbawa (pagkatapos mong makuha ang hash mula sa script):
-- UPDATE users SET password_hash = '$2b$10$....' WHERE email = 'admin@workforce.io';
