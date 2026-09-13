-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 30, 2026 at 03:52 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `workforce_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `employee_id` char(36) NOT NULL,
  `date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `status` enum('present','absent','late','half_day','on_leave','holiday') NOT NULL,
  `work_hours` decimal(5,2) DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_logs`
--

CREATE TABLE `attendance_logs` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `employee_id` char(36) NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `type` enum('check_in','check_out') NOT NULL,
  `method` enum('manual','biometric','mobile','web') NOT NULL DEFAULT 'manual',
  `location` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) DEFAULT NULL,
  `action` enum('create','update','delete','login','logout','export','import') NOT NULL,
  `module` varchar(100) NOT NULL,
  `record_id` char(36) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `module`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`) VALUES
('02802a0d-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:56:06'),
('04573f3c-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:30:15'),
('054bb4eb-7e4b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:10:30'),
('08ccc76d-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:10:36'),
('097a0bf8-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:30:24'),
('0e11fb71-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:49:16'),
('0e887d45-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:11:08'),
('0fa0502b-7e2d-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:05:42'),
('110c66d9-7e40-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:05'),
('117eb954-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:16:18'),
('129dfb8a-7e2d-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:05:47'),
('132b7184-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:09'),
('1612e19b-7e2d-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:05:53'),
('162d903f-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'create', 'leave_requests', 'bdc1f93a-f3ea-4afa-8f9e-05997845efeb', NULL, NULL, '::1', NULL, '2026-07-28 08:18:08'),
('17fb3328-8b2d-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employee_shifts', '63c54092-2601-4de3-919a-90ab3ef6f33b', NULL, NULL, '::1', NULL, '2026-07-30 05:59:06'),
('18329fb0-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:16:29'),
('1851674b-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:11'),
('1a33c78b-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:14'),
('1a855600-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'users', '25b65752-73a8-4a09-abff-79a96650f95c', NULL, NULL, '::1', NULL, '2026-07-28 08:25:24'),
('1c7dc3a8-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', 'd31c6e78-6d1b-4e5d-8ae3-2625fe614dec', NULL, NULL, '::1', NULL, '2026-07-28 06:52:24'),
('1e70780d-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', 'bdc1f93a-f3ea-4afa-8f9e-05997845efeb', NULL, NULL, '::1', NULL, '2026-07-28 08:18:22'),
('1eaf2bde-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'users', '25b65752-73a8-4a09-abff-79a96650f95c', NULL, NULL, '::1', NULL, '2026-07-28 08:25:31'),
('1f8d94d1-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:29'),
('216f9b58-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:16:45'),
('2172edde-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:27'),
('25d28346-7e40-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:40'),
('2625d710-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:11:48'),
('2820c256-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:38'),
('2985dc7d-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:57:12'),
('29cba6a1-7e24-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 19:02:01'),
('2b946807-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '25244f66-006c-434c-957d-820ddcf10f53', NULL, NULL, '::1', NULL, '2026-07-28 08:25:53'),
('2e21c0a8-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:57:19'),
('2eac3e29-8b3d-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '4a29b0ea-456c-4e9e-b919-91eb90c1c2b9', NULL, NULL, '::1', NULL, '2026-07-30 07:54:16'),
('30315bbc-7e30-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:28:05'),
('30e01a7a-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:52'),
('3148f6f1-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:26:03'),
('34687c24-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:12:12'),
('349c784e-7e4d-11f1-a5bb-4439c43b0d39', '25244f66-006c-434c-957d-820ddcf10f53', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:26:08'),
('3568c40c-7e30-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:28:14'),
('3a0bffcc-7e40-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:53:14'),
('3adbb6d0-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:12:23'),
('3f2fe846-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:53:22'),
('4166b35e-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:17:39'),
('41d5b4ff-7e30-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', 'c8065271-066c-4e56-82ce-f5897ef5710d', NULL, NULL, '::1', NULL, '2026-07-12 20:28:35'),
('43ba3565-8b49-11f1-a361-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', '4b70d9e5-d27e-4afd-95fb-8ba7257258d6', NULL, NULL, '::1', NULL, '2026-07-30 09:20:45'),
('472cadf8-8b49-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '4b70d9e5-d27e-4afd-95fb-8ba7257258d6', NULL, NULL, '::1', NULL, '2026-07-30 09:20:51'),
('4b834341-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', '4292329f-2424-480c-8b7f-177ff4535b2c', NULL, NULL, '::1', NULL, '2026-07-28 07:50:59'),
('4fe8ad20-7e4d-11f1-a5bb-4439c43b0d39', '25244f66-006c-434c-957d-820ddcf10f53', 'create', 'users', 'e35d7eac-57bb-4263-9a83-2b073ceedd47', NULL, NULL, '::1', NULL, '2026-07-28 08:26:54'),
('51b3328a-7e4d-11f1-a5bb-4439c43b0d39', '25244f66-006c-434c-957d-820ddcf10f53', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:26:57'),
('53ff2885-7e4d-11f1-a5bb-4439c43b0d39', 'e35d7eac-57bb-4263-9a83-2b073ceedd47', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:27:01'),
('5b65fcbe-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:06:08'),
('5efa9c4a-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:32:47'),
('60ac3c3d-7e4d-11f1-a5bb-4439c43b0d39', 'e35d7eac-57bb-4263-9a83-2b073ceedd47', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:27:22'),
('64532192-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:32:56'),
('66011bb0-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', '267867e1-ec9f-4f16-89aa-7d20d428bf36', NULL, NULL, '::1', NULL, '2026-07-28 07:58:53'),
('698025de-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:58:59'),
('6e313d45-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:51:57'),
('6f253ec4-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:59:08'),
('718a2de7-8b35-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'settings', NULL, NULL, NULL, '::1', NULL, '2026-07-30 06:58:52'),
('73820b44-7e3a-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:11:53'),
('75ce2374-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:20:48'),
('777e0b25-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:19:09'),
('77b21579-7e42-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:09:16'),
('7b724d2d-8b42-11f1-a361-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', '6ecd859d-7dc8-4eb7-90a6-fa929929c235', NULL, NULL, '::1', NULL, '2026-07-30 08:32:12'),
('7b72b9c7-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:59:29'),
('7b92a749-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 17:59:52'),
('7be42f9d-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:07:02'),
('7e34b2a9-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:59:34'),
('86e87d4a-8b3e-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-30 08:03:53'),
('88dfab40-7e29-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'departments', 'b8e124e9-f45d-4532-8afc-2c7df02b4e59', NULL, NULL, '::1', NULL, '2026-07-12 19:40:28'),
('89ea1805-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:52:44'),
('8aa20f74-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '25b65752-73a8-4a09-abff-79a96650f95c', NULL, NULL, '::1', NULL, '2026-07-28 08:21:23'),
('8af46366-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', 'd3c6e6bf-560a-4499-b95f-8d6470fca78b', NULL, NULL, '::1', NULL, '2026-07-28 07:59:55'),
('8bf381ac-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:21:25'),
('8c6d338d-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'leave_requests', 'd641195b-e582-4970-aa61-810a8abcb9c4', NULL, NULL, '::1', NULL, '2026-07-30 08:54:09'),
('8d38aa97-8b3e-11f1-a361-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-30 08:04:04'),
('8db34bbd-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:23'),
('8f231e82-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '8315c722-9f5f-4034-8c99-7f3e08c831d1', NULL, NULL, '::1', NULL, '2026-07-28 06:19:49'),
('8f551f28-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:00:02'),
('90c90017-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', 'd641195b-e582-4970-aa61-810a8abcb9c4', NULL, NULL, '::1', NULL, '2026-07-30 08:54:17'),
('90e28e58-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:19:52'),
('90edc292-7e3a-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:12:42'),
('928fa880-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:31'),
('92aabdfb-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:00:08'),
('9476c29c-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:34'),
('94cf81e5-7e3b-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:19:58'),
('94d7a9e1-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:21:40'),
('968e144d-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:38'),
('9a68cff7-7e3a-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:12:58'),
('9b35f1b4-8b40-11f1-a361-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', '800c06a8-69e8-4c70-b671-f7d79bb25992', NULL, NULL, '::1', NULL, '2026-07-30 08:18:47'),
('9b62e721-7e31-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 05:08:34'),
('9c83dda5-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:48:49'),
('a0726f7a-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:53:22'),
('a986ad26-7e27-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', 'a7a18a24-6c5f-4316-b7c5-22223310062d', NULL, NULL, '::1', NULL, '2026-07-12 19:27:03'),
('abd179a9-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:15:09'),
('ae3f0bfa-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:27'),
('aed36a5c-7e29-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'shifts', '947115a5-ce16-45b9-93af-f1b63f017452', NULL, NULL, '::1', NULL, '2026-07-12 19:41:31'),
('b01b4d38-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:53:48'),
('b05bb432-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:15:17'),
('b174b368-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:49:25'),
('b2db6d83-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:35'),
('b3638e2d-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'leave_requests', '40a948c9-ff5b-4511-a810-c2138245be54', NULL, NULL, '::1', NULL, '2026-07-30 08:55:15'),
('b3871923-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'delete', 'employees', '4292329f-2424-480c-8b7f-177ff4535b2c', NULL, NULL, '::1', NULL, '2026-07-28 07:53:54'),
('b7f1fbfd-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:43'),
('b8c18b37-7e47-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:46:53'),
('bdbac2d9-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:01:43'),
('be244180-7e47-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:47:02'),
('c06cdc09-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', 'd31c6e78-6d1b-4e5d-8ae3-2625fe614dec', NULL, NULL, '::1', NULL, '2026-07-28 06:49:50'),
('c0bfcb54-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:58'),
('c3aff032-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '40a948c9-ff5b-4511-a810-c2138245be54', NULL, NULL, '::1', NULL, '2026-07-30 08:55:42'),
('c6a09585-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:15:54'),
('c6ad6995-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', '0d9c504d-68de-46a1-b830-7a898dd12c42', NULL, NULL, '::1', NULL, '2026-07-28 08:23:04'),
('c72ee468-7e2c-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:03:41'),
('c804074e-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:50:02'),
('c8282cf0-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:01:38'),
('c8ac1839-7e4b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:15:58'),
('c99efe32-7e2c-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:03:45'),
('c99f04ec-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:23:09'),
('cad5d930-7e3f-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:50:07'),
('cc320386-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:01:45'),
('d8732a3f-8b42-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '6ecd859d-7dc8-4eb7-90a6-fa929929c235', NULL, NULL, '::1', NULL, '2026-07-30 08:34:48'),
('d8e5aca7-8b42-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '800c06a8-69e8-4c70-b671-f7d79bb25992', NULL, NULL, '::1', NULL, '2026-07-30 08:34:49'),
('db157408-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:23:38'),
('e2d46a50-8b2c-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-30 05:57:37'),
('f1b845d5-7e3f-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:51:12'),
('f308a2c9-7e4b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:17:09'),
('f88b4909-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:51:24'),
('fb18ff99-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '026bf873-0bc7-4976-91db-b2c7385d89db', NULL, NULL, '::1', NULL, '2026-07-28 07:55:54'),
('fec025d4-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:56:00'),
('ffc80cad-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:17:30');

-- --------------------------------------------------------

--
-- Table structure for table `biometric_credentials`
--

CREATE TABLE `biometric_credentials` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `employee_id` char(36) NOT NULL,
  `credential_id` text NOT NULL,
  `public_key` text NOT NULL,
  `counter` int(11) DEFAULT 0,
  `device_name` varchar(255) DEFAULT NULL,
  `photo_data` longtext DEFAULT NULL,
  `device_type` enum('fingerprint','face_id','pin','card') NOT NULL,
  `registered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_used_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `biometric_credentials`
--

INSERT INTO `biometric_credentials` (`id`, `employee_id`, `credential_id`, `public_key`, `counter`, `device_name`, `photo_data`, `device_type`, `registered_at`, `last_used_at`, `is_active`) VALUES
('4a29b0ea-456c-4e9e-b919-91eb90c1c2b9', 'a7a18a24-6c5f-4316-b7c5-22223310062d', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-07-30 07:54:16', NULL, 1),
('c8065271-066c-4e56-82ce-f5897ef5710d', 'a7a18a24-6c5f-4316-b7c5-22223310062d', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-07-12 20:28:35', NULL, 1),
('d3c6e6bf-560a-4499-b95f-8d6470fca78b', '267867e1-ec9f-4f16-89aa-7d20d428bf36', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-07-28 07:59:55', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `manager_id` char(36) DEFAULT NULL,
  `parent_id` char(36) DEFAULT NULL,
  `head_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `manager` varchar(150) DEFAULT NULL,
  `color` varchar(20) DEFAULT '#7c3aed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `code`, `manager_id`, `parent_id`, `head_count`, `created_at`, `updated_at`, `manager`, `color`) VALUES
('b8e124e9-f45d-4532-8afc-2c7df02b4e59', 'Sm fairview', '415266', NULL, NULL, 0, '2026-07-12 19:40:27', '2026-07-12 19:40:27', NULL, '#7c3aed');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `employee_code` varchar(50) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `avatar_url` longtext DEFAULT NULL,
  `department_id` char(36) DEFAULT NULL,
  `job_title` varchar(255) NOT NULL,
  `employment_type` enum('full_time','part_time','contract','intern') NOT NULL DEFAULT 'full_time',
  `status` enum('active','inactive','on_leave','terminated') NOT NULL DEFAULT 'active',
  `hire_date` date NOT NULL,
  `termination_date` date DEFAULT NULL,
  `manager_id` char(36) DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `hourly_rate` decimal(8,2) DEFAULT NULL,
  `timezone` varchar(100) DEFAULT 'Asia/Manila',
  `address` text DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `emergency_contact_relationship` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `employee_code`, `user_id`, `first_name`, `last_name`, `full_name`, `email`, `phone`, `avatar_url`, `department_id`, `job_title`, `employment_type`, `status`, `hire_date`, `termination_date`, `manager_id`, `salary`, `hourly_rate`, `timezone`, `address`, `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`, `created_at`, `updated_at`) VALUES
('0d9c504d-68de-46a1-b830-7a898dd12c42', '415265', NULL, 'Arjay', 'Pineda', '', 'arjay@gmail.com', '09460416809', NULL, NULL, 'tag halo', 'full_time', 'active', '2026-07-28', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-28 08:23:04', '2026-07-28 08:23:04'),
('267867e1-ec9f-4f16-89aa-7d20d428bf36', '415267', NULL, 'Erwin', 'Caduhada', '', 'erwincaduhada@gmail.com', '09460416809', NULL, 'b8e124e9-f45d-4532-8afc-2c7df02b4e59', 'Pogi lang', 'part_time', 'on_leave', '2026-07-28', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-28 07:58:53', '2026-07-28 07:58:53'),
('a7a18a24-6c5f-4316-b7c5-22223310062d', '415266', NULL, 'Arbie Jade', 'Pineda', '', 'rbpineda10@gmail.com', '09460416809', NULL, NULL, 'Software Engineer', 'full_time', 'active', '2026-07-26', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-12 19:27:03', '2026-07-12 19:27:03'),
('c3020ac8-7e3c-11f1-a5bb-4439c43b0d39', 'EMP-001', NULL, 'Arbie Jade', 'Pineda', '', 'employee1@workforce.io', NULL, NULL, 'b8e124e9-f45d-4532-8afc-2c7df02b4e59', 'Staff', 'full_time', 'active', '2026-07-28', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-28 06:28:25', '2026-07-28 06:28:25');

-- --------------------------------------------------------

--
-- Table structure for table `employee_shifts`
--

CREATE TABLE `employee_shifts` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `employee_id` char(36) NOT NULL,
  `shift_id` char(36) NOT NULL,
  `date` date NOT NULL,
  `status` enum('scheduled','active','completed','cancelled') DEFAULT 'scheduled',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employee_shifts`
--

INSERT INTO `employee_shifts` (`id`, `employee_id`, `shift_id`, `date`, `status`, `notes`, `created_at`) VALUES
('63c54092-2601-4de3-919a-90ab3ef6f33b', '0d9c504d-68de-46a1-b830-7a898dd12c42', '947115a5-ce16-45b9-93af-f1b63f017452', '2026-07-30', 'scheduled', NULL, '2026-07-30 05:59:06');

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

CREATE TABLE `leave_requests` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `employee_id` char(36) NOT NULL,
  `leave_type` enum('annual','sick','maternity','paternity','unpaid','emergency','compensatory') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days_count` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `approver_id` char(36) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leave_requests`
--

INSERT INTO `leave_requests` (`id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `days_count`, `reason`, `status`, `approver_id`, `approved_at`, `rejection_reason`, `created_at`, `updated_at`) VALUES
('40a948c9-ff5b-4511-a810-c2138245be54', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'maternity', '2026-07-30', '2026-08-07', 9, NULL, 'approved', NULL, NULL, NULL, '2026-07-30 08:55:15', '2026-07-30 08:55:42'),
('4b70d9e5-d27e-4afd-95fb-8ba7257258d6', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'compensatory', '2026-07-29', '2026-07-31', 3, NULL, 'rejected', NULL, NULL, NULL, '2026-07-30 09:20:45', '2026-07-30 09:20:51'),
('6ecd859d-7dc8-4eb7-90a6-fa929929c235', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'paternity', '2026-07-08', '2026-07-27', 20, NULL, 'approved', NULL, NULL, NULL, '2026-07-30 08:32:12', '2026-07-30 08:34:48'),
('800c06a8-69e8-4c70-b671-f7d79bb25992', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'sick', '2026-07-30', '2026-07-31', 2, 'lagnat laki lang to', 'approved', NULL, NULL, NULL, '2026-07-30 08:18:47', '2026-07-30 08:34:49'),
('bdc1f93a-f3ea-4afa-8f9e-05997845efeb', '267867e1-ec9f-4f16-89aa-7d20d428bf36', 'maternity', '2026-07-28', '2026-07-31', 4, NULL, 'approved', NULL, NULL, NULL, '2026-07-28 08:18:08', '2026-07-28 08:18:22'),
('d31c6e78-6d1b-4e5d-8ae3-2625fe614dec', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'paternity', '2026-07-28', '2026-07-31', 4, NULL, 'approved', NULL, NULL, NULL, '2026-07-28 06:49:50', '2026-07-28 06:52:24'),
('d641195b-e582-4970-aa61-810a8abcb9c4', '267867e1-ec9f-4f16-89aa-7d20d428bf36', 'sick', '2026-07-29', '2026-07-30', 2, 'may sakit sa utak', 'approved', NULL, NULL, NULL, '2026-07-30 08:54:09', '2026-07-30 08:54:17');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) NOT NULL,
  `type` enum('leave_request','leave_approved','leave_rejected','shift_assigned','timesheet_due','attendance_alert','system','announcement') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `action_url` varchar(500) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `is_read`, `action_url`, `metadata`, `created_at`) VALUES
('15f75bcf-51a2-40ee-b4cf-68a6818eef2a', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a compensatory leave request (2026-07-29 to 2026-07-31).', 0, NULL, NULL, '2026-07-30 09:20:45'),
('1e2806e5-ccab-4282-8204-aea5cc575c00', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_approved', 'Leave Request Approved', 'Your paternity leave request (Wed Jul 08 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Mon Jul 27 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:34:48'),
('2198f424-a8a2-46d0-8425-02a9caea2af4', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a paternity leave request (2026-07-08 to 2026-07-27).', 0, NULL, NULL, '2026-07-30 08:32:12'),
('33dce320-4138-4e00-a111-a9794f9bc072', '25244f66-006c-434c-957d-820ddcf10f53', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a compensatory leave request (2026-07-29 to 2026-07-31).', 0, NULL, NULL, '2026-07-30 09:20:45'),
('3a9d6640-4b1d-4ad5-b445-1b9eb774a9a6', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_approved', 'Leave Request Approved', 'Your sick leave request (Thu Jul 30 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Fri Jul 31 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:34:49'),
('3f31a72a-5f5e-4a26-b603-5fa081ef7f03', '25244f66-006c-434c-957d-820ddcf10f53', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a paternity leave request (2026-07-08 to 2026-07-27).', 0, NULL, NULL, '2026-07-30 08:32:12'),
('7e86f14e-5557-4c1a-8415-8f37f8b74592', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_approved', 'Leave Request Approved', 'Your maternity leave request (Thu Jul 30 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Fri Aug 07 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:55:42'),
('c0800a69-17a2-4273-8c3a-1cac56d313c6', '026bf873-0bc7-4976-91db-b2c7385d89db', 'leave_approved', 'Leave Request Approved', 'Your sick leave request (Wed Jul 29 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Thu Jul 30 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:54:17'),
('cc0484c2-f756-41fb-9a41-13eac23e925d', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_rejected', 'Leave Request Rejected', 'Your compensatory leave request (Wed Jul 29 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Fri Jul 31 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been rejected.', 0, NULL, NULL, '2026-07-30 09:20:51');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `code` varchar(100) NOT NULL,
  `module` varchar(100) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `code` enum('admin','hr_manager','supervisor','employee') NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` char(36) NOT NULL,
  `permission_id` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `key` varchar(255) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  `category` enum('general','attendance','leave','payroll','notification','security') NOT NULL,
  `label` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `key`, `value`, `category`, `label`, `description`, `updated_at`) VALUES
('c14fdc7d-8b34-11f1-a361-4439c43b0d39', 'company_name', '\"\"', 'general', 'Company Name', 'The name displayed throughout the system', '2026-07-30 06:58:52'),
('c14ff7e8-8b34-11f1-a361-4439c43b0d39', 'timezone', '\"UTC-5 (EST)\"', 'general', 'Timezone', 'Default timezone for attendance and scheduling', '2026-07-30 06:53:56'),
('c14ff94d-8b34-11f1-a361-4439c43b0d39', 'date_format', '\"MM/DD/YYYY\"', 'general', 'Date Format', 'How dates are displayed across the system', '2026-07-30 06:53:56'),
('c14ff997-8b34-11f1-a361-4439c43b0d39', 'work_week_start', '\"Monday\"', 'general', 'Work Week Start', 'First day of the work week', '2026-07-30 06:53:56'),
('c14ff9dc-8b34-11f1-a361-4439c43b0d39', 'employee_id_prefix', '\"EMP-\"', 'general', 'Employee ID Prefix', 'Prefix for auto-generated employee codes', '2026-07-30 06:53:56'),
('c14ffa1a-8b34-11f1-a361-4439c43b0d39', 'work_hours_per_day', '8', 'attendance', 'Work Hours per Day', 'Standard daily work hours', '2026-07-30 06:53:56'),
('c14ffa5a-8b34-11f1-a361-4439c43b0d39', 'late_threshold_minutes', '15', 'attendance', 'Late Threshold (minutes)', 'Minutes after shift start to flag as late', '2026-07-30 06:53:56'),
('c14ffaaf-8b34-11f1-a361-4439c43b0d39', 'early_checkin_window_minutes', '30', 'attendance', 'Early Check-in Window (minutes)', 'How early employees can check in', '2026-07-30 06:53:56'),
('c14ffb0d-8b34-11f1-a361-4439c43b0d39', 'overtime_threshold_hours', '8', 'attendance', 'Overtime Threshold (hours)', 'Daily hours before overtime kicks in', '2026-07-30 06:53:56'),
('c14ffb4b-8b34-11f1-a361-4439c43b0d39', 'biometric_required', 'true', 'attendance', 'Biometric Required', 'Require biometric verification for check-in', '2026-07-30 06:53:56'),
('c14ffb85-8b34-11f1-a361-4439c43b0d39', 'geofencing', 'false', 'attendance', 'Geofencing', 'Restrict check-in to approved locations', '2026-07-30 06:53:56'),
('c14ffbbc-8b34-11f1-a361-4439c43b0d39', 'annual_leave_days', '21', 'leave', 'Annual Leave Days', 'Default annual leave entitlement per employee', '2026-07-30 06:53:56'),
('c14ffbf4-8b34-11f1-a361-4439c43b0d39', 'sick_leave_days', '12', 'leave', 'Sick Leave Days', 'Default sick leave entitlement per employee', '2026-07-30 06:53:56'),
('c14ffc2d-8b34-11f1-a361-4439c43b0d39', 'carry_forward_cap', '5', 'leave', 'Carry Forward Cap', 'Max leave days that can be carried to next year', '2026-07-30 06:53:56'),
('c14ffc61-8b34-11f1-a361-4439c43b0d39', 'advance_notice_days', '2', 'leave', 'Advance Notice (days)', 'Minimum days notice required for leave requests', '2026-07-30 06:53:56'),
('c14ffc9a-8b34-11f1-a361-4439c43b0d39', 'auto_approve_long_absence', 'true', 'leave', 'Auto-approve Long Absence', 'Flag requests exceeding 14 days for HR review', '2026-07-30 06:53:56'),
('c14ffcd9-8b34-11f1-a361-4439c43b0d39', 'leave_request_alerts', 'true', 'notification', 'Leave Request Alerts', 'Notify managers of new leave requests', '2026-07-30 06:53:56'),
('c14ffd16-8b34-11f1-a361-4439c43b0d39', 'late_arrival_alerts', 'true', 'notification', 'Late Arrival Alerts', 'Notify supervisors of late arrivals', '2026-07-30 06:53:56'),
('c14ffd48-8b34-11f1-a361-4439c43b0d39', 'timesheet_reminders', 'true', 'notification', 'Timesheet Reminders', 'Send weekly submission reminders to employees', '2026-07-30 06:53:56'),
('c14ffd7d-8b34-11f1-a361-4439c43b0d39', 'shift_change_alerts', 'true', 'notification', 'Shift Change Alerts', 'Notify employees of shift changes', '2026-07-30 06:53:56'),
('c14ffdb3-8b34-11f1-a361-4439c43b0d39', 'email_notifications', 'true', 'notification', 'Email Notifications', 'Send notifications via email', '2026-07-30 06:53:56'),
('c14ffdeb-8b34-11f1-a361-4439c43b0d39', 'push_notifications', 'false', 'notification', 'Push Notifications', 'Browser push notifications', '2026-07-30 06:53:56'),
('c14ffe23-8b34-11f1-a361-4439c43b0d39', 'session_timeout_minutes', '30', 'security', 'Session Timeout (minutes)', 'Idle time before automatic logout', '2026-07-30 06:53:56'),
('c14ffe5c-8b34-11f1-a361-4439c43b0d39', 'password_expiry_days', '90', 'security', 'Password Expiry (days)', 'Force password reset after this many days', '2026-07-30 06:53:56'),
('c14ffe92-8b34-11f1-a361-4439c43b0d39', 'two_factor_auth', 'true', 'security', 'Two-Factor Authentication', 'Require 2FA for admin accounts', '2026-07-30 06:53:56'),
('c14ffeca-8b34-11f1-a361-4439c43b0d39', 'biometric_login', 'true', 'security', 'Biometric Login', 'Allow WebAuthn/biometric system access', '2026-07-30 06:53:56'),
('c14ffeff-8b34-11f1-a361-4439c43b0d39', 'audit_all_actions', 'true', 'security', 'Audit All Actions', 'Log every system action for compliance', '2026-07-30 06:53:56'),
('c14fff3d-8b34-11f1-a361-4439c43b0d39', 'ip_whitelist', 'false', 'security', 'IP Whitelist', 'Restrict system access to approved IP ranges', '2026-07-30 06:53:56');

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

CREATE TABLE `shifts` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` enum('day','evening','night','rotating') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_duration` int(11) DEFAULT 60,
  `days_of_week` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`days_of_week`)),
  `department_id` char(36) DEFAULT NULL,
  `color` varchar(20) DEFAULT '#7c3aed',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shifts`
--

INSERT INTO `shifts` (`id`, `name`, `code`, `type`, `start_time`, `end_time`, `break_duration`, `days_of_week`, `department_id`, `color`, `is_active`, `created_at`, `updated_at`) VALUES
('947115a5-ce16-45b9-93af-f1b63f017452', 'Monday', '', 'evening', '00:00:00', '00:00:00', 60, NULL, NULL, '#f59e0b', 1, '2026-07-12 19:41:31', '2026-07-12 19:41:31');

-- --------------------------------------------------------

--
-- Table structure for table `timesheets`
--

CREATE TABLE `timesheets` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `employee_id` char(36) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `total_regular_hours` decimal(6,2) DEFAULT 0.00,
  `total_overtime_hours` decimal(6,2) DEFAULT 0.00,
  `entries` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`entries`)),
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approver_id` char(36) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `role` enum('admin','hr_manager','supervisor','employee') NOT NULL DEFAULT 'employee',
  `department_id` char(36) DEFAULT NULL,
  `employee_id` char(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(20) DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `last_notifications_read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `role`, `department_id`, `employee_id`, `created_at`, `status`, `last_login`, `last_notifications_read_at`) VALUES
('026bf873-0bc7-4976-91db-b2c7385d89db', 'erwincaduhada@gmail.com', '$2a$10$21VmvPrVO5IuJ99y8INIsOTxySW6HexTjBfvxndWkaQ4yGwG/jJDq', 'erwincaduhada', NULL, 'employee', NULL, '267867e1-ec9f-4f16-89aa-7d20d428bf36', '2026-07-28 07:55:54', 'active', '2026-07-28 08:18:38', NULL),
('25244f66-006c-434c-957d-820ddcf10f53', 'rbpineda10@gmail.com', '$2a$10$3r1SPA5D8W1ngKzQlCo/U.Fqbl7GfSg3hTt6wNPr8xIQvmC9BrcfC', 'arbie@gmail.com', NULL, 'supervisor', NULL, NULL, '2026-07-28 08:25:53', 'active', '2026-07-28 08:26:08', NULL),
('25b65752-73a8-4a09-abff-79a96650f95c', 'arjaypineda@gmail.com', '$2a$10$Narrt10ImC.EYx3ZdaTN4.7QfRsm9pyTqXZiZRLOitZPGY9UpgMmK', 'Arjay pineda', NULL, 'employee', NULL, '267867e1-ec9f-4f16-89aa-7d20d428bf36', '2026-07-28 08:21:23', 'suspended', NULL, NULL),
('8315c722-9f5f-4034-8c99-7f3e08c831d1', 'employee1@workforce.io', '$2a$10$/WBXIqFOmG23nnCmA7YSDOus9FuSNcdm05jUOwqTvK1uB51om3W/W', 'Arbie jade pineda', NULL, 'employee', NULL, 'a7a18a24-6c5f-4316-b7c5-22223310062d', '2026-07-28 06:19:49', 'active', '2026-07-30 08:04:04', NULL),
('b23e4e86-7e15-11f1-949c-4439c43b0d39', 'admin@workforce.io', '$2a$10$u3qgJ2pUKRqqIiLtR.UhueMF8Dwzm0uBeurZQyEoieNlHnyuhFd5.', 'Administrator', NULL, 'admin', NULL, NULL, '2026-07-12 17:18:27', 'active', '2026-07-30 08:03:53', NULL),
('e35d7eac-57bb-4263-9a83-2b073ceedd47', 'rbpineda11@gmail.com', '$2a$10$A4qhncf/VVFjXaNfz3vqNeL0dYHU5ARDYKJ/VNTWBIXUSdHao9Sa6', 'rbpineda', NULL, 'employee', NULL, '267867e1-ec9f-4f16-89aa-7d20d428bf36', '2026-07-28 08:26:54', 'active', '2026-07-28 08:27:01', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_emp_date` (`employee_id`,`date`),
  ADD KEY `idx_attendance_date` (`date`),
  ADD KEY `idx_attendance_employee` (`employee_id`);

--
-- Indexes for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_audit_created` (`created_at`);

--
-- Indexes for table `biometric_credentials`
--
ALTER TABLE `biometric_credentials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `fk_dept_manager` (`manager_id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_code` (`employee_code`),
  ADD KEY `manager_id` (`manager_id`),
  ADD KEY `idx_employees_status` (`status`),
  ADD KEY `idx_employees_dept` (`department_id`);

--
-- Indexes for table `employee_shifts`
--
ALTER TABLE `employee_shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `shift_id` (`shift_id`);

--
-- Indexes for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `approver_id` (`approver_id`),
  ADD KEY `idx_leave_status` (`status`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `timesheets`
--
ALTER TABLE `timesheets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `approver_id` (`approver_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_user_dept` (`department_id`),
  ADD KEY `fk_user_emp` (`employee_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD CONSTRAINT `attendance_logs_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `biometric_credentials`
--
ALTER TABLE `biometric_credentials`
  ADD CONSTRAINT `biometric_credentials_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_dept_manager` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  ADD CONSTRAINT `employees_ibfk_2` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employee_shifts`
--
ALTER TABLE `employee_shifts`
  ADD CONSTRAINT `employee_shifts_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `employee_shifts_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shifts`
--
ALTER TABLE `shifts`
  ADD CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `timesheets`
--
ALTER TABLE `timesheets`
  ADD CONSTRAINT `timesheets_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `timesheets_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_user_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
