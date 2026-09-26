-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 05, 2026 at 10:24 AM
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

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `employee_id`, `date`, `check_in`, `check_out`, `status`, `work_hours`, `overtime_hours`, `notes`, `created_at`, `updated_at`) VALUES
('272dcfd5-d15a-438f-adf4-2d63c3412fca', '0d9c504d-68de-46a1-b830-7a898dd12c42', '2026-09-05', '15:43:02', NULL, 'present', NULL, NULL, NULL, '2026-09-05 07:43:02', '2026-09-05 07:43:02');

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

--
-- Dumping data for table `attendance_logs`
--

INSERT INTO `attendance_logs` (`id`, `employee_id`, `timestamp`, `type`, `method`, `location`, `ip_address`, `device_id`) VALUES
('fcdcab11-29a0-464e-8418-60a49da42772', '0d9c504d-68de-46a1-b830-7a898dd12c42', '2026-09-05 15:43:02', 'check_in', 'biometric', NULL, NULL, 'SIMULATOR001');

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
('03a9df9f-8c33-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 09:16:15'),
('04573f3c-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:30:15'),
('054bb4eb-7e4b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:10:30'),
('065ddd2f-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:42:14'),
('06d00360-8c43-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', 'f731b0c1-7daf-4e4a-bc7f-b03fe9b93985', NULL, NULL, '::1', NULL, '2026-08-08 11:10:52'),
('0701af0d-9711-11f1-a14f-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-15 19:26:54'),
('085ea2c9-8c3e-11f1-9f98-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:35:07'),
('08ccc76d-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:10:36'),
('097a0bf8-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:30:24'),
('0a87d07e-8c3a-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employee_shifts', 'b0224c59-d236-4385-ab26-a696e3ced43c', NULL, NULL, '::1', NULL, '2026-08-08 10:06:33'),
('0afac6b0-8c34-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'settings', NULL, NULL, NULL, '::1', NULL, '2026-08-08 09:23:37'),
('0e11fb71-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:49:16'),
('0e887d45-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:11:08'),
('0fa0502b-7e2d-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:05:42'),
('10919b52-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:42:31'),
('110c66d9-7e40-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:05'),
('117eb954-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:16:18'),
('129dfb8a-7e2d-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:05:47'),
('132b7184-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:09'),
('13e5ed41-9c81-11f1-a582-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '213f2595-e827-4038-81fe-50769f48be87', NULL, NULL, '::1', NULL, '2026-09-05 06:57:06'),
('1587a89f-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:42:39'),
('1612e19b-7e2d-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:05:53'),
('162d903f-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'create', 'leave_requests', 'bdc1f93a-f3ea-4afa-8f9e-05997845efeb', NULL, NULL, '::1', NULL, '2026-07-28 08:18:08'),
('17fb3328-8b2d-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employee_shifts', '63c54092-2601-4de3-919a-90ab3ef6f33b', NULL, NULL, '::1', NULL, '2026-07-30 05:59:06'),
('18329fb0-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:16:29'),
('1851674b-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:11'),
('1a33c78b-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:14'),
('1a809077-9c7d-11f1-a582-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-09-05 06:28:39'),
('1a855600-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'users', '25b65752-73a8-4a09-abff-79a96650f95c', NULL, NULL, '::1', NULL, '2026-07-28 08:25:24'),
('1b923400-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:42:49'),
('1bccd4eb-8c46-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '20234c4e-1bd8-43ac-8325-b9f98723c526', NULL, NULL, '::1', NULL, '2026-08-08 11:32:56'),
('1c7dc3a8-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', 'd31c6e78-6d1b-4e5d-8ae3-2625fe614dec', NULL, NULL, '::1', NULL, '2026-07-28 06:52:24'),
('1e12db02-8c3a-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employee_shifts', 'ef993fb7-eb7e-48d3-a895-fd2181dc5859', NULL, NULL, '::1', NULL, '2026-08-08 10:07:06'),
('1e70780d-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', 'bdc1f93a-f3ea-4afa-8f9e-05997845efeb', NULL, NULL, '::1', NULL, '2026-07-28 08:18:22'),
('1eaf2bde-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'users', '25b65752-73a8-4a09-abff-79a96650f95c', NULL, NULL, '::1', NULL, '2026-07-28 08:25:31'),
('1f8d94d1-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:29'),
('216f9b58-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:16:45'),
('2172edde-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:27'),
('2216615a-8c46-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '100814b4-4670-4a5c-b5c4-133e20c1e4be', NULL, NULL, '::1', NULL, '2026-08-08 11:33:07'),
('23e317e8-9734-11f1-a14f-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-16 15:49:29'),
('256a87bc-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:43:06'),
('25d28346-7e40-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:52:40'),
('2625d710-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:11:48'),
('2816a504-9c88-11f1-a582-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employee_shifts', '81b638ed-4913-4be6-a098-1454fffe9190', NULL, NULL, '::1', NULL, '2026-09-05 07:47:46'),
('2820c256-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:38'),
('2985dc7d-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:57:12'),
('29cba6a1-7e24-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 19:02:01'),
('2b946807-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '25244f66-006c-434c-957d-820ddcf10f53', NULL, NULL, '::1', NULL, '2026-07-28 08:25:53'),
('2e21c0a8-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:57:19'),
('2e6d6158-8c41-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'departments', 'a35a0db1-61fb-4d86-8c56-5fe80685becc', NULL, NULL, '::1', NULL, '2026-08-08 10:57:40'),
('2eac3e29-8b3d-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '4a29b0ea-456c-4e9e-b919-91eb90c1c2b9', NULL, NULL, '::1', NULL, '2026-07-30 07:54:16'),
('30315bbc-7e30-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:28:05'),
('30e01a7a-7e4c-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:18:52'),
('312f5dfd-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:43:25'),
('3148f6f1-7e4d-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:26:03'),
('34687c24-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:12:12'),
('349c784e-7e4d-11f1-a5bb-4439c43b0d39', '25244f66-006c-434c-957d-820ddcf10f53', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:26:08'),
('34afa08e-8c4d-11f1-9f98-4439c43b0d39', '895aaa32-4ecd-4303-a844-a18dd87ef162', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 12:23:44'),
('351a9908-8c3f-11f1-9f98-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:43:32'),
('3568c40c-7e30-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 20:28:14'),
('3a0bffcc-7e40-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:53:14'),
('3adbb6d0-7e1d-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:12:23'),
('3e1a1d03-8c42-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '2c654d7b-1a8d-4495-bded-523a03fb99d1', NULL, NULL, '::1', NULL, '2026-08-08 11:05:16'),
('3f2fe846-7e40-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:53:22'),
('4166b35e-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:17:39'),
('41d5b4ff-7e30-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', 'c8065271-066c-4e56-82ce-f5897ef5710d', NULL, NULL, '::1', NULL, '2026-07-12 20:28:35'),
('43ba3565-8b49-11f1-a361-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', '4b70d9e5-d27e-4afd-95fb-8ba7257258d6', NULL, NULL, '::1', NULL, '2026-07-30 09:20:45'),
('46d12154-8c3c-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:22:33'),
('472cadf8-8b49-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '4b70d9e5-d27e-4afd-95fb-8ba7257258d6', NULL, NULL, '::1', NULL, '2026-07-30 09:20:51'),
('4b834341-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', '4292329f-2424-480c-8b7f-177ff4535b2c', NULL, NULL, '::1', NULL, '2026-07-28 07:50:59'),
('4ef1ba82-8c44-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'departments', '43ec8064-2c6e-4bca-a1e3-7737b5837c89', NULL, NULL, '::1', NULL, '2026-08-08 11:20:03'),
('4fe8ad20-7e4d-11f1-a5bb-4439c43b0d39', '25244f66-006c-434c-957d-820ddcf10f53', 'create', 'users', 'e35d7eac-57bb-4263-9a83-2b073ceedd47', NULL, NULL, '::1', NULL, '2026-07-28 08:26:54'),
('51b3328a-7e4d-11f1-a5bb-4439c43b0d39', '25244f66-006c-434c-957d-820ddcf10f53', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:26:57'),
('53ff2885-7e4d-11f1-a5bb-4439c43b0d39', 'e35d7eac-57bb-4263-9a83-2b073ceedd47', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:27:01'),
('5b65fcbe-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:06:08'),
('5efa9c4a-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:32:47'),
('60ac3c3d-7e4d-11f1-a5bb-4439c43b0d39', 'e35d7eac-57bb-4263-9a83-2b073ceedd47', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:27:22'),
('60ee800f-99a6-11f1-ab12-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-19 15:24:16'),
('61f0335b-9c84-11f1-a582-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', 'ac3e85f7-5843-4911-8e54-5f4016f09432', NULL, NULL, '::1', NULL, '2026-09-05 07:20:45'),
('64532192-7e3d-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:32:56'),
('66011bb0-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', '267867e1-ec9f-4f16-89aa-7d20d428bf36', NULL, NULL, '::1', NULL, '2026-07-28 07:58:53'),
('68e95bc1-8c41-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', '371eab96-3a40-4b46-9220-f6ebdc5e209b', NULL, NULL, '::1', NULL, '2026-08-08 10:59:18'),
('698025de-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:58:59'),
('6e313d45-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:51:57'),
('6e57b70e-99a6-11f1-ab12-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-19 15:24:38'),
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
('82cf964e-8c37-11f1-9f98-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', '3154d428-0121-4f2e-9f6e-7e0f2e586af2', NULL, NULL, '::1', NULL, '2026-08-08 09:48:26'),
('85752afd-9c87-11f1-a582-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-09-05 07:43:14'),
('86e87d4a-8b3e-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-30 08:03:53'),
('8778bb16-8c44-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', 'ba91cc87-f001-4583-9895-fd8679f98d83', NULL, NULL, '::1', NULL, '2026-08-08 11:21:38'),
('88874ed1-8c46-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 11:35:58'),
('88dfab40-7e29-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'departments', 'b8e124e9-f45d-4532-8afc-2c7df02b4e59', NULL, NULL, '::1', NULL, '2026-07-12 19:40:28'),
('892c1014-8c3b-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '89339232-ff7e-40e1-80e8-a1851022f1c3', NULL, NULL, '::1', NULL, '2026-08-08 10:17:15'),
('89ea1805-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:52:44'),
('8a8f54c5-8c37-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '3154d428-0121-4f2e-9f6e-7e0f2e586af2', NULL, NULL, '::1', NULL, '2026-08-08 09:48:39'),
('8aa20f74-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '25b65752-73a8-4a09-abff-79a96650f95c', NULL, NULL, '::1', NULL, '2026-07-28 08:21:23'),
('8af46366-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', 'd3c6e6bf-560a-4499-b95f-8d6470fca78b', NULL, NULL, '::1', NULL, '2026-07-28 07:59:55'),
('8bacdfa3-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:45:57'),
('8bf381ac-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:21:25'),
('8c6d338d-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'leave_requests', 'd641195b-e582-4970-aa61-810a8abcb9c4', NULL, NULL, '::1', NULL, '2026-07-30 08:54:09'),
('8d38aa97-8b3e-11f1-a361-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-30 08:04:04'),
('8db34bbd-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:23'),
('8f231e82-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '8315c722-9f5f-4034-8c99-7f3e08c831d1', NULL, NULL, '::1', NULL, '2026-07-28 06:19:49'),
('8f551f28-7e49-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:00:02'),
('8fb459f2-8c44-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employee_shifts', '000ed141-1e86-42eb-bdec-bfa482ca7cbf', NULL, NULL, '::1', NULL, '2026-08-08 11:21:51'),
('90c90017-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', 'd641195b-e582-4970-aa61-810a8abcb9c4', NULL, NULL, '::1', NULL, '2026-07-30 08:54:17'),
('90e28e58-7e3b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:19:52'),
('90edc292-7e3a-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:12:42'),
('928fa880-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:31'),
('92aabdfb-7e49-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:00:08'),
('9476c29c-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:34'),
('94cf81e5-7e3b-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:19:58'),
('94d7a9e1-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:21:40'),
('96895bfa-8c40-11f1-9f98-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', '9d5feea5-e14a-4fa6-a688-840e77dc5fbf', NULL, NULL, '::1', NULL, '2026-08-08 10:53:25'),
('968e144d-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:00:38'),
('9a68cff7-7e3a-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:12:58'),
('9b35f1b4-8b40-11f1-a361-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', '800c06a8-69e8-4c70-b671-f7d79bb25992', NULL, NULL, '::1', NULL, '2026-07-30 08:18:47'),
('9b62e721-7e31-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 05:08:34'),
('9c83dda5-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:48:49'),
('a0726f7a-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:53:22'),
('a0999dc6-8c3f-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:46:32'),
('a154a481-8c40-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '9d5feea5-e14a-4fa6-a688-840e77dc5fbf', NULL, NULL, '::1', NULL, '2026-08-08 10:53:43'),
('a986ad26-7e27-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', 'a7a18a24-6c5f-4316-b7c5-22223310062d', NULL, NULL, '::1', NULL, '2026-07-12 19:27:03'),
('abd179a9-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:15:09'),
('ae3f0bfa-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:27'),
('aed36a5c-7e29-11f1-acf7-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'shifts', '947115a5-ce16-45b9-93af-f1b63f017452', NULL, NULL, '::1', NULL, '2026-07-12 19:41:31'),
('af0e50da-8c45-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '38a5540c-6ed3-4556-b2b2-932348d90276', NULL, NULL, '::1', NULL, '2026-08-08 11:29:54'),
('b01b4d38-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:53:48'),
('b05bb432-7e4b-11f1-a5bb-4439c43b0d39', '026bf873-0bc7-4976-91db-b2c7385d89db', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:15:17'),
('b16639a1-8c33-11f1-9f98-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 09:21:07'),
('b174b368-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:49:25'),
('b2db6d83-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:35'),
('b3638e2d-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'leave_requests', '40a948c9-ff5b-4511-a810-c2138245be54', NULL, NULL, '::1', NULL, '2026-07-30 08:55:15'),
('b3871923-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'delete', 'employees', '4292329f-2424-480c-8b7f-177ff4535b2c', NULL, NULL, '::1', NULL, '2026-07-28 07:53:54'),
('b3d0ffa8-9c87-11f1-a582-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-09-05 07:44:31'),
('b7f1fbfd-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:43'),
('b8c18b37-7e47-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:46:53'),
('b91d89e8-8c44-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '895aaa32-4ecd-4303-a844-a18dd87ef162', NULL, NULL, '::1', NULL, '2026-08-08 11:23:01'),
('bc2bd62f-8c3e-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 10:40:09'),
('bdbac2d9-7e1b-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:01:43'),
('bdf56460-8c44-11f1-9f98-4439c43b0d39', '895aaa32-4ecd-4303-a844-a18dd87ef162', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 11:23:09'),
('be244180-7e47-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 07:47:02'),
('bec09072-8c45-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'departments', 'a57ac95f-fa70-43ac-bb2d-19443e9804e6', NULL, NULL, '::1', NULL, '2026-08-08 11:30:20'),
('c06cdc09-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'create', 'leave_requests', 'd31c6e78-6d1b-4e5d-8ae3-2625fe614dec', NULL, NULL, '::1', NULL, '2026-07-28 06:49:50'),
('c0bfcb54-7e1c-11f1-949c-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-12 18:08:58'),
('c29d9a1c-8c42-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employee_shifts', '3373c488-ae00-4639-beba-1f4e0d1cd6d4', NULL, NULL, '::1', NULL, '2026-08-08 11:08:58'),
('c3aff032-8b45-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '40a948c9-ff5b-4511-a810-c2138245be54', NULL, NULL, '::1', NULL, '2026-07-30 08:55:42'),
('c3dce6d7-9c74-11f1-a582-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-09-05 05:28:58'),
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
('d475e5b4-9710-11f1-a14f-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-15 19:25:29'),
('d5f7fc2c-8c33-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'settings', NULL, NULL, NULL, '::1', NULL, '2026-08-08 09:22:08'),
('d8732a3f-8b42-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '6ecd859d-7dc8-4eb7-90a6-fa929929c235', NULL, NULL, '::1', NULL, '2026-07-30 08:34:48'),
('d8e5aca7-8b42-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'leave_requests', '800c06a8-69e8-4c70-b671-f7d79bb25992', NULL, NULL, '::1', NULL, '2026-07-30 08:34:49'),
('db157408-7e4c-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:23:38'),
('e105c985-9c86-11f1-a582-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '2d6dd4ae-78e1-4032-beaa-8007759d8c24', NULL, NULL, '::1', NULL, '2026-09-05 07:38:38'),
('e2d46a50-8b2c-11f1-a361-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-30 05:57:37'),
('e69987a7-8c33-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'biometric_credentials', '8699fd40-00ff-4ed7-bfb7-9bdc94abb761', NULL, NULL, '::1', NULL, '2026-08-08 09:22:36'),
('f1b845d5-7e3f-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:51:12'),
('f308a2c9-7e4b-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 08:17:09'),
('f612eec1-8c43-11f1-9f98-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'logout', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-08-08 11:17:34'),
('f88b4909-7e3f-11f1-a5bb-4439c43b0d39', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'login', 'auth', NULL, NULL, NULL, '::1', NULL, '2026-07-28 06:51:24'),
('fb18ff99-7e48-11f1-a5bb-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'users', '026bf873-0bc7-4976-91db-b2c7385d89db', NULL, NULL, '::1', NULL, '2026-07-28 07:55:54'),
('fdc2ece7-8c33-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'update', 'settings', NULL, NULL, NULL, '::1', NULL, '2026-08-08 09:23:15'),
('fe7a76f9-8c45-11f1-9f98-4439c43b0d39', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'create', 'employees', '96edff5c-ad28-407b-8c98-ce8b60702a3e', NULL, NULL, '::1', NULL, '2026-08-08 11:32:07'),
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
  `is_active` tinyint(1) DEFAULT 1,
  `face_descriptor` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `biometric_credentials`
--

INSERT INTO `biometric_credentials` (`id`, `employee_id`, `credential_id`, `public_key`, `counter`, `device_name`, `photo_data`, `device_type`, `registered_at`, `last_used_at`, `is_active`, `face_descriptor`) VALUES
('100814b4-4670-4a5c-b5c4-133e20c1e4be', '96edff5c-ad28-407b-8c98-ce8b60702a3e', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-08-08 11:33:07', NULL, 1, NULL),
('2d6dd4ae-78e1-4032-beaa-8007759d8c24', '0d9c504d-68de-46a1-b830-7a898dd12c42', '1001', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-09-05 07:38:37', NULL, 1, NULL),
('38a5540c-6ed3-4556-b2b2-932348d90276', 'ba91cc87-f001-4583-9895-fd8679f98d83', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-08-08 11:29:54', NULL, 1, NULL),
('4a29b0ea-456c-4e9e-b919-91eb90c1c2b9', 'a7a18a24-6c5f-4316-b7c5-22223310062d', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-07-30 07:54:16', NULL, 1, NULL),
('8699fd40-00ff-4ed7-bfb7-9bdc94abb761', '0d9c504d-68de-46a1-b830-7a898dd12c42', '', '', 0, 'Camera Face ID', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAHgAoADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAEI/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDKIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAigAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAigAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAAgKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAigAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiooAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICgAAAAAAAAAAA//9k=', 'face_id', '2026-08-08 09:22:36', NULL, 1, NULL),
('89339232-ff7e-40e1-80e8-a1851022f1c3', 'c3020ac8-7e3c-11f1-a5bb-4439c43b0d39', '', '', 0, 'Camera Face ID', 'data:image/jpeg;base64,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', 'face_id', '2026-08-08 10:17:15', NULL, 1, '[-0.09782640635967255,0.06484810262918472,0.07750878483057022,-0.008954783901572227,-0.05226263776421547,-0.06600672006607056,-0.007295212242752314,-0.07124049961566925,0.1288015991449356,-0.04275938868522644,0.21742674708366394,-0.059682998806238174,-0.21261733770370483,-0.17091184854507446,0.006206932477653027,0.1797504425048828,-0.19212988018989563,-0.11979242414236069,-0.03731784597039223,-0.05667472258210182,0.10497143119573593,0.03066110983490944,-0.011535700410604477,-0.0005249442183412611,-0.14157146215438843,-0.34864819049835205,-0.0779329463839531,-0.07853087037801743,0.03395571932196617,-0.04658384993672371,-0.0466914102435112,0.016198264434933662,-0.2529560923576355,-0.09108627587556839,0.029664523899555206,0.1099848747253418,-0.030486557632684708,-0.07640725374221802,0.18939323723316193,0.027777545154094696,-0.220365509390831,0.056373871862888336,0.03431117907166481,0.22843468189239502,0.16828036308288574,0.012644723989069462,-0.013812189921736717,-0.07122311741113663,0.11840883642435074,-0.1457669883966446,-0.010530514642596245,0.16580545902252197,0.1375121772289276,0.09708257019519806,-0.015665991231799126,-0.10678456723690033,0.015301416628062725,0.12787362933158875,-0.208816796541214,-0.026284419000148773,0.020004451274871826,-0.12919726967811584,-0.00365293282084167,-0.06281013786792755,0.201731339097023,0.04731885343790054,-0.10890819877386093,-0.180031418800354,0.1034587174654007,-0.13818827271461487,-0.06204667314887047,0.09259238094091415,-0.12508916854858398,-0.1398741602897644,-0.371497243642807,0.06704370677471161,0.3822154104709625,0.0721065104007721,-0.20955567061901093,0.007733697537332773,-0.0730147734284401,-0.007052984554320574,0.10792966187000275,0.14737556874752045,-0.019715066999197006,0.08311057835817337,-0.08300317078828812,0.004228532314300537,0.18319827318191528,-0.045775242149829865,-0.045337751507759094,0.21363306045532227,0.001433468540199101,0.12349357455968857,-0.00003256914351368323,-0.019114471971988678,-0.05582714453339577,0.007812836207449436,-0.06897450983524323,-0.030931798741221428,0.05613383278250694,-0.05276840180158615,0.04329202324151993,0.14373284578323364,-0.15078720450401306,0.0952569991350174,0.01905250735580921,0.018713563680648804,0.0014336355961859226,0.016345951706171036,-0.06570021063089371,-0.07186603546142578,0.08505885303020477,-0.2677417993545532,0.2210397720336914,0.2049493044614792,-0.01135692372918129,0.10641492903232574,0.08702472597360611,0.057191018015146255,-0.072787806391716,-0.022418642416596413,-0.17290887236595154,-0.011345010250806808,0.09016919881105423,0.007295988500118256,0.12123167514801025,-0.010126607492566109]'),
('ac3e85f7-5843-4911-8e54-5f4016f09432', '371eab96-3a40-4b46-9220-f6ebdc5e209b', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-09-05 07:20:45', NULL, 1, NULL),
('c8065271-066c-4e56-82ce-f5897ef5710d', 'a7a18a24-6c5f-4316-b7c5-22223310062d', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-07-12 20:28:35', NULL, 1, NULL),
('d3c6e6bf-560a-4499-b95f-8d6470fca78b', '267867e1-ec9f-4f16-89aa-7d20d428bf36', '', '', 0, 'Manual Device', NULL, 'fingerprint', '2026-07-28 07:59:55', NULL, 1, NULL);

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
('43ec8064-2c6e-4bca-a1e3-7737b5837c89', 'ace logistics', 'LOGS', NULL, NULL, 0, '2026-08-08 11:20:03', '2026-08-08 11:20:03', NULL, '#f59e0b'),
('a35a0db1-61fb-4d86-8c56-5fe80685becc', 'Merchandising', 'MERCH', NULL, NULL, 0, '2026-08-08 10:57:40', '2026-08-08 10:57:40', NULL, '#14b8a6'),
('a57ac95f-fa70-43ac-bb2d-19443e9804e6', 'Marketing', 'MKT', NULL, NULL, 0, '2026-08-08 11:30:20', '2026-08-08 11:30:20', NULL, '#7c3aed'),
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
('0d9c504d-68de-46a1-b830-7a898dd12c42', '415265', NULL, 'Arjay', 'Pineda', '', 'arjay@gmail.com', '09460416809', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAHgAoADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAEI/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDKIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAigAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAigAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIoAAAAAAAAAAAAAAgKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAigAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiooAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICgAAAAAAAAAAA//9k=', NULL, 'tag halo', 'full_time', 'active', '2026-07-28', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-28 08:23:04', '2026-08-08 09:22:36'),
('267867e1-ec9f-4f16-89aa-7d20d428bf36', '415267', NULL, 'Erwin', 'Caduhada', '', 'erwincaduhada@gmail.com', '09460416809', NULL, 'b8e124e9-f45d-4532-8afc-2c7df02b4e59', 'Pogi lang', 'part_time', 'on_leave', '2026-07-28', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-28 07:58:53', '2026-07-28 07:58:53'),
('371eab96-3a40-4b46-9220-f6ebdc5e209b', 'EMP-3244001', NULL, 'Alden', 'richards', '', 'Alden@company.com', '09460416809', NULL, 'a35a0db1-61fb-4d86-8c56-5fe80685becc', 'Merchandiser', 'full_time', 'active', '2026-08-08', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-08-08 10:59:18', '2026-08-08 10:59:18'),
('96edff5c-ad28-407b-8c98-ce8b60702a3e', 'EMP-3244003', NULL, 'Ajax', 'Besco', '', 'ajax@company.com', '09460416809', NULL, 'a57ac95f-fa70-43ac-bb2d-19443e9804e6', 'Programmer', 'full_time', 'active', '2026-08-15', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-08-08 11:32:07', '2026-08-08 11:32:07'),
('a7a18a24-6c5f-4316-b7c5-22223310062d', '415266', NULL, 'Arbie Jade', 'Pineda', '', 'rbpineda10@gmail.com', '09460416809', NULL, NULL, 'Software Engineer', 'full_time', 'active', '2026-07-26', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-12 19:27:03', '2026-07-12 19:27:03'),
('ba91cc87-f001-4583-9895-fd8679f98d83', 'EMP-3244002', NULL, 'Juan', 'Dela cruz', '', 'juan@company.com', '09460416809', NULL, '43ec8064-2c6e-4bca-a1e3-7737b5837c89', 'merch', 'part_time', 'active', '2026-08-08', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-08-08 11:21:38', '2026-08-08 11:21:38'),
('c3020ac8-7e3c-11f1-a5bb-4439c43b0d39', 'EMP-001', NULL, 'Arbie Jade', 'Pineda', '', 'employee1@workforce.io', '09460416809', 'data:image/jpeg;base64,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', 'b8e124e9-f45d-4532-8afc-2c7df02b4e59', 'Staff', 'full_time', 'active', '2026-07-28', NULL, NULL, NULL, NULL, 'Asia/Manila', NULL, NULL, NULL, NULL, '2026-07-28 06:28:25', '2026-08-08 11:23:20');

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
('000ed141-1e86-42eb-bdec-bfa482ca7cbf', 'ba91cc87-f001-4583-9895-fd8679f98d83', '947115a5-ce16-45b9-93af-f1b63f017452', '2026-08-03', 'scheduled', NULL, '2026-08-08 11:21:51'),
('3373c488-ae00-4639-beba-1f4e0d1cd6d4', '371eab96-3a40-4b46-9220-f6ebdc5e209b', '947115a5-ce16-45b9-93af-f1b63f017452', '2026-08-03', 'scheduled', NULL, '2026-08-08 11:08:58'),
('63c54092-2601-4de3-919a-90ab3ef6f33b', '0d9c504d-68de-46a1-b830-7a898dd12c42', '947115a5-ce16-45b9-93af-f1b63f017452', '2026-07-30', 'scheduled', NULL, '2026-07-30 05:59:06'),
('81b638ed-4913-4be6-a098-1454fffe9190', 'ba91cc87-f001-4583-9895-fd8679f98d83', '947115a5-ce16-45b9-93af-f1b63f017452', '2026-09-05', 'scheduled', NULL, '2026-09-05 07:47:46'),
('b0224c59-d236-4385-ab26-a696e3ced43c', 'a7a18a24-6c5f-4316-b7c5-22223310062d', '947115a5-ce16-45b9-93af-f1b63f017452', '2026-08-03', 'scheduled', NULL, '2026-08-08 10:06:33'),
('ef993fb7-eb7e-48d3-a895-fd2181dc5859', 'c3020ac8-7e3c-11f1-a5bb-4439c43b0d39', '947115a5-ce16-45b9-93af-f1b63f017452', '2026-08-03', 'scheduled', NULL, '2026-08-08 10:07:06');

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
('3154d428-0121-4f2e-9f6e-7e0f2e586af2', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'emergency', '2026-08-08', '2026-08-11', 4, NULL, 'rejected', NULL, NULL, NULL, '2026-08-08 09:48:26', '2026-08-08 09:48:39'),
('40a948c9-ff5b-4511-a810-c2138245be54', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'maternity', '2026-07-30', '2026-08-07', 9, NULL, 'approved', NULL, NULL, NULL, '2026-07-30 08:55:15', '2026-07-30 08:55:42'),
('4b70d9e5-d27e-4afd-95fb-8ba7257258d6', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'compensatory', '2026-07-29', '2026-07-31', 3, NULL, 'rejected', NULL, NULL, NULL, '2026-07-30 09:20:45', '2026-07-30 09:20:51'),
('6ecd859d-7dc8-4eb7-90a6-fa929929c235', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'paternity', '2026-07-08', '2026-07-27', 20, NULL, 'approved', NULL, NULL, NULL, '2026-07-30 08:32:12', '2026-07-30 08:34:48'),
('800c06a8-69e8-4c70-b671-f7d79bb25992', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'sick', '2026-07-30', '2026-07-31', 2, 'lagnat laki lang to', 'approved', NULL, NULL, NULL, '2026-07-30 08:18:47', '2026-07-30 08:34:49'),
('9d5feea5-e14a-4fa6-a688-840e77dc5fbf', 'a7a18a24-6c5f-4316-b7c5-22223310062d', 'unpaid', '2026-08-14', '2026-08-25', 12, NULL, 'approved', NULL, NULL, NULL, '2026-08-08 10:53:25', '2026-08-08 10:53:43'),
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
('0cd30adb-7da5-4d15-acd4-6585895b32e8', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_approved', 'Leave Request Approved', 'Your unpaid leave request (Fri Aug 14 2026 00:00:00 GMT+0800 (Australian Western Standard Time) to Tue Aug 25 2026 00:00:00 GMT+0800 (Australian Western Standard Time)) has been approved.', 0, NULL, NULL, '2026-08-08 10:53:43'),
('0d62ddad-caef-4aa3-aa51-55481c21e725', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_rejected', 'Leave Request Rejected', 'Your emergency leave request (Sat Aug 08 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Tue Aug 11 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been rejected.', 0, NULL, NULL, '2026-08-08 09:48:39'),
('15f75bcf-51a2-40ee-b4cf-68a6818eef2a', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a compensatory leave request (2026-07-29 to 2026-07-31).', 1, NULL, NULL, '2026-07-30 09:20:45'),
('1dfa4b5d-0adf-4a9a-8247-1c394b07a3ba', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a unpaid leave request (2026-08-14 to 2026-08-25).', 1, NULL, NULL, '2026-08-08 10:53:25'),
('1e2806e5-ccab-4282-8204-aea5cc575c00', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_approved', 'Leave Request Approved', 'Your paternity leave request (Wed Jul 08 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Mon Jul 27 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:34:48'),
('2198f424-a8a2-46d0-8425-02a9caea2af4', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a paternity leave request (2026-07-08 to 2026-07-27).', 1, NULL, NULL, '2026-07-30 08:32:12'),
('33dce320-4138-4e00-a111-a9794f9bc072', '25244f66-006c-434c-957d-820ddcf10f53', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a compensatory leave request (2026-07-29 to 2026-07-31).', 0, NULL, NULL, '2026-07-30 09:20:45'),
('3a9d6640-4b1d-4ad5-b445-1b9eb774a9a6', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_approved', 'Leave Request Approved', 'Your sick leave request (Thu Jul 30 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Fri Jul 31 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:34:49'),
('3d76cdcc-c864-458a-afbe-6491c8a72ce8', 'b23e4e86-7e15-11f1-949c-4439c43b0d39', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a emergency leave request (2026-08-08 to 2026-08-11).', 1, NULL, NULL, '2026-08-08 09:48:26'),
('3f31a72a-5f5e-4a26-b603-5fa081ef7f03', '25244f66-006c-434c-957d-820ddcf10f53', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a paternity leave request (2026-07-08 to 2026-07-27).', 0, NULL, NULL, '2026-07-30 08:32:12'),
('597ff8f7-f8a9-4428-8938-a10556a79e8e', '25244f66-006c-434c-957d-820ddcf10f53', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a emergency leave request (2026-08-08 to 2026-08-11).', 0, NULL, NULL, '2026-08-08 09:48:26'),
('7e86f14e-5557-4c1a-8415-8f37f8b74592', '8315c722-9f5f-4034-8c99-7f3e08c831d1', 'leave_approved', 'Leave Request Approved', 'Your maternity leave request (Thu Jul 30 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Fri Aug 07 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:55:42'),
('c0800a69-17a2-4273-8c3a-1cac56d313c6', '026bf873-0bc7-4976-91db-b2c7385d89db', 'leave_approved', 'Leave Request Approved', 'Your sick leave request (Wed Jul 29 2026 00:00:00 GMT+0800 (Philippine Standard Time) to Thu Jul 30 2026 00:00:00 GMT+0800 (Philippine Standard Time)) has been approved.', 0, NULL, NULL, '2026-07-30 08:54:17'),
('c5670915-8653-4b9c-b59f-eba0e821b889', '25244f66-006c-434c-957d-820ddcf10f53', 'leave_request', 'New Leave Request', 'Arbie jade pineda filed a unpaid leave request (2026-08-14 to 2026-08-25).', 0, NULL, NULL, '2026-08-08 10:53:25'),
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
('c14fdc7d-8b34-11f1-a361-4439c43b0d39', 'company_name', '\"TRI-M \"', 'general', 'Company Name', 'The name displayed throughout the system', '2026-08-08 09:23:15'),
('c14ff7e8-8b34-11f1-a361-4439c43b0d39', 'timezone', '\"UTC-5 (EST)\"', 'general', 'Timezone', 'Default timezone for attendance and scheduling', '2026-07-30 06:53:56'),
('c14ff94d-8b34-11f1-a361-4439c43b0d39', 'date_format', '\"MM/DD/YYYY\"', 'general', 'Date Format', 'How dates are displayed across the system', '2026-07-30 06:53:56'),
('c14ff997-8b34-11f1-a361-4439c43b0d39', 'work_week_start', '\"Monday\"', 'general', 'Work Week Start', 'First day of the work week', '2026-07-30 06:53:56'),
('c14ff9dc-8b34-11f1-a361-4439c43b0d39', 'employee_id_prefix', '\"EMP-3244\"', 'general', 'Employee ID Prefix', 'Prefix for auto-generated employee codes', '2026-08-08 09:23:37'),
('c14ffa1a-8b34-11f1-a361-4439c43b0d39', 'work_hours_per_day', '8', 'attendance', 'Work Hours per Day', 'Standard daily work hours', '2026-07-30 06:53:56'),
('c14ffa5a-8b34-11f1-a361-4439c43b0d39', 'late_threshold_minutes', '15', 'attendance', 'Late Threshold (minutes)', 'Minutes after shift start to flag as late', '2026-07-30 06:53:56'),
('c14ffaaf-8b34-11f1-a361-4439c43b0d39', 'early_checkin_window_minutes', '30', 'attendance', 'Early Check-in Window (minutes)', 'How early employees can check in', '2026-07-30 06:53:56'),
('c14ffb0d-8b34-11f1-a361-4439c43b0d39', 'overtime_threshold_hours', '8', 'attendance', 'Overtime Threshold (hours)', 'Daily hours before overtime kicks in', '2026-07-30 06:53:56'),
('c14ffb4b-8b34-11f1-a361-4439c43b0d39', 'biometric_required', 'false', 'attendance', 'Biometric Required', 'Require biometric verification for check-in', '2026-08-08 09:22:08'),
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
('20234c4e-1bd8-43ac-8325-b9f98723c526', 'ajax@company', '$2a$10$RsvPP6lVpzPpLbOO/ScAiOq9ASZbts0jZvNYwh6LPrJn0pPLeTJue', 'Ajax besco', NULL, 'hr_manager', NULL, NULL, '2026-08-08 11:32:56', 'active', NULL, NULL),
('25244f66-006c-434c-957d-820ddcf10f53', 'rbpineda10@gmail.com', '$2a$10$3r1SPA5D8W1ngKzQlCo/U.Fqbl7GfSg3hTt6wNPr8xIQvmC9BrcfC', 'arbie@gmail.com', NULL, 'supervisor', NULL, NULL, '2026-07-28 08:25:53', 'active', '2026-07-28 08:26:08', NULL),
('25b65752-73a8-4a09-abff-79a96650f95c', 'arjaypineda@gmail.com', '$2a$10$Narrt10ImC.EYx3ZdaTN4.7QfRsm9pyTqXZiZRLOitZPGY9UpgMmK', 'Arjay pineda', NULL, 'employee', NULL, '267867e1-ec9f-4f16-89aa-7d20d428bf36', '2026-07-28 08:21:23', 'suspended', NULL, NULL),
('2c654d7b-1a8d-4495-bded-523a03fb99d1', 'Alden@company.co', '$2a$10$CAA9bsWXGDDyUrx8ljOdSO5JUi1V5XrA/IWxucl/hgLpWgE6tN8hy', 'Alden richards', NULL, 'employee', NULL, '0d9c504d-68de-46a1-b830-7a898dd12c42', '2026-08-08 11:05:16', 'active', NULL, NULL),
('8315c722-9f5f-4034-8c99-7f3e08c831d1', 'employee1@workforce.io', '$2a$10$/WBXIqFOmG23nnCmA7YSDOus9FuSNcdm05jUOwqTvK1uB51om3W/W', 'Arbie jade pineda', NULL, 'employee', NULL, 'a7a18a24-6c5f-4316-b7c5-22223310062d', '2026-07-28 06:19:49', 'active', '2026-09-05 06:28:39', NULL),
('895aaa32-4ecd-4303-a844-a18dd87ef162', 'juan@company.com', '$2a$10$H60mB6n0FJMtoh0avnByluC3JHd4OIkVqEMuB9ChFVMdx/KsHR9CK', 'Juan dela cruz', NULL, 'employee', NULL, 'c3020ac8-7e3c-11f1-a5bb-4439c43b0d39', '2026-08-08 11:23:01', 'active', '2026-08-08 11:23:09', NULL),
('b23e4e86-7e15-11f1-949c-4439c43b0d39', 'admin@workforce.io', '$2a$10$u3qgJ2pUKRqqIiLtR.UhueMF8Dwzm0uBeurZQyEoieNlHnyuhFd5.', 'Administrator', NULL, 'admin', NULL, NULL, '2026-07-12 17:18:27', 'active', '2026-09-05 07:44:31', NULL),
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
