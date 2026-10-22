-- =============================================================================
-- JOSTUM ANNUAL PERFORMANCE EVALUATION REPORT (APER) SYSTEM DATABASE SCHEMA
-- Designed by Senior Database Engineer
-- Target DBMS: MySQL 8.0+ / MariaDB 10.4+
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET TIME_ZONE = "+00:00";

-- -----------------------------------------------------------------------------
-- 1. APPRAISAL PERIODS (Academic / Operational Evaluation Cycles)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_periods`;
CREATE TABLE `appraisal_periods` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `year_label` VARCHAR(20) NOT NULL COMMENT 'e.g. 2025/2026',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_period_status` (`status`, `year_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. MAIN APPRAISAL EVALUATIONS HEADER
-- Core entity linking staff, current stage, supervisor, department, and final status
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_evaluations`;
CREATE TABLE `appraisal_evaluations` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `appraisal_period_id` BIGINT UNSIGNED NOT NULL,
  `staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK to users/staff table',
  `supervisor_id` BIGINT UNSIGNED NULL COMMENT 'FK to supervisor user',
  `department_id` BIGINT UNSIGNED NULL,
  `current_stage` ENUM(
    'part_a_drafting',
    'part_b_supervisor',
    'part_c_staff_sign',
    'part_d_dept_review',
    'part_e_apc_final',
    'completed'
  ) NOT NULL DEFAULT 'part_a_drafting',
  `overall_status` ENUM(
    'draft',
    'submitted_part_a',
    'evaluated_part_b',
    'signed_part_c',
    'reviewed_part_d',
    'ratified_part_e',
    'rejected'
  ) NOT NULL DEFAULT 'draft',
  `part_b_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `department_recommendation` VARCHAR(255) NULL,
  `final_decision` VARCHAR(255) NULL,
  `submitted_part_a_at` TIMESTAMP NULL DEFAULT NULL,
  `evaluated_part_b_at` TIMESTAMP NULL DEFAULT NULL,
  `signed_part_c_at` TIMESTAMP NULL DEFAULT NULL,
  `reviewed_part_d_at` TIMESTAMP NULL DEFAULT NULL,
  `ratified_part_e_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_eval_period` FOREIGN KEY (`appraisal_period_id`) REFERENCES `appraisal_periods` (`id`) ON DELETE CASCADE,
  INDEX `idx_eval_staff_period` (`staff_id`, `appraisal_period_id`),
  INDEX `idx_eval_supervisor_stage` (`supervisor_id`, `current_stage`),
  INDEX `idx_eval_dept_stage` (`department_id`, `current_stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. PART A: STAFF DETAILS & DECLARATION (1:1 with appraisal_evaluations)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_part_a`;
CREATE TABLE `appraisal_part_a` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `evaluation_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `pf_number` VARCHAR(50) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `college` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `present_rank` VARCHAR(255) NULL,
  `present_level` VARCHAR(20) NULL,
  `present_step` VARCHAR(20) NULL,
  `salary_per_annum` DECIMAL(12,2) NULL,
  `date_of_birth` DATE NULL,
  `phone` VARCHAR(30) NULL,
  `marital_status` VARCHAR(20) NULL,
  `declaration_signed` TINYINT(1) NOT NULL DEFAULT 0,
  `declaration_name` VARCHAR(255) NULL,
  `declaration_date` DATE NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_part_a_eval` FOREIGN KEY (`evaluation_id`) REFERENCES `appraisal_evaluations` (`id`) ON DELETE CASCADE,
  INDEX `idx_part_a_pf` (`pf_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. PART A NORMALIZED ITEMS (Duties, Qualifications, History, Training)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_part_a_items`;
CREATE TABLE `appraisal_part_a_items` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `evaluation_id` BIGINT UNSIGNED NOT NULL,
  `category` ENUM(
    'duty',
    'qualification',
    'institution',
    'previous_employment',
    'training',
    'acting_appointment',
    'examination'
  ) NOT NULL,
  `item_text` TEXT NOT NULL,
  `subtype` VARCHAR(100) NULL COMMENT 'Degree e.g. B.Sc, M.Sc, PhD',
  `start_period` VARCHAR(50) NULL,
  `end_period` VARCHAR(50) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_part_a_items_eval` FOREIGN KEY (`evaluation_id`) REFERENCES `appraisal_evaluations` (`id`) ON DELETE CASCADE,
  INDEX `idx_part_a_cat` (`evaluation_id`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. PART B: SUPERVISOR ASSESSMENT & 100-POINT MATRIX (1:1 with evaluation)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_part_b`;
CREATE TABLE `appraisal_part_b` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `evaluation_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `evaluator_id` BIGINT UNSIGNED NULL,
  
  -- Discipline & Attendance Metrics
  `absent_with_permission` INT NOT NULL DEFAULT 0,
  `absent_without_permission` INT NOT NULL DEFAULT 0,
  `warned_count` INT NOT NULL DEFAULT 0,
  `suspended_count` INT NOT NULL DEFAULT 0,

  -- 100 Points Matrix Breakdown
  `basic_qualification_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `additional_qualification_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `work_experience_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `admin_tech_experience_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `relevant_training_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `personality_team_spirit_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `quality_of_work_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `regularity_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `punctuality_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `care_of_property_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `integrity_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `initiative_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `knowledge_regulations_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `professional_membership_score` DECIMAL(4,2) NOT NULL DEFAULT 0.00,

  `total_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `supervisor_remarks` TEXT NULL,
  `supervisor_recommendation` VARCHAR(255) NULL,
  `evaluated_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_part_b_eval` FOREIGN KEY (`evaluation_id`) REFERENCES `appraisal_evaluations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. PART C: STAFF ACKNOWLEDGMENT & SIGNATURE (1:1 with evaluation)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_part_c`;
CREATE TABLE `appraisal_part_c` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `evaluation_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `staff_agreed` TINYINT(1) NOT NULL DEFAULT 1,
  `staff_comments` TEXT NULL,
  `signed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_part_c_eval` FOREIGN KEY (`evaluation_id`) REFERENCES `appraisal_evaluations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. PART D: DEPARTMENTAL REVIEW COMMITTEE (1:1 with evaluation)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_part_d`;
CREATE TABLE `appraisal_part_d` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `evaluation_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `reviewer_id` BIGINT UNSIGNED NULL,
  `recommendation` ENUM('approve_promotion', 'approve_increment', 'deferred', 'not_recommended') NOT NULL,
  `committee_minutes_excerpt` TEXT NULL,
  `dept_chairman_signature` VARCHAR(255) NULL,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_part_d_eval` FOREIGN KEY (`evaluation_id`) REFERENCES `appraisal_evaluations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. PART E: A&P COMMITTEE FINAL RATIFICATION (1:1 with evaluation)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_part_e`;
CREATE TABLE `appraisal_part_e` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `evaluation_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `apc_chairman_id` BIGINT UNSIGNED NULL,
  `final_decision` ENUM('approve_promotion', 'approve_increment', 'deferred', 'rejected') NOT NULL,
  `effective_date` DATE NULL,
  `apc_remarks` TEXT NULL,
  `ratified_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_part_e_eval` FOREIGN KEY (`evaluation_id`) REFERENCES `appraisal_evaluations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. APPRAISAL AUDIT LOGS (Immutable Activity & Transition History)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `appraisal_audit_logs`;
CREATE TABLE `appraisal_audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `evaluation_id` BIGINT UNSIGNED NOT NULL,
  `actor_id` BIGINT UNSIGNED NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `previous_stage` VARCHAR(50) NULL,
  `new_stage` VARCHAR(50) NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_eval` FOREIGN KEY (`evaluation_id`) REFERENCES `appraisal_evaluations` (`id`) ON DELETE CASCADE,
  INDEX `idx_audit_actor` (`actor_id`, `actor_role`),
  INDEX `idx_audit_eval_action` (`evaluation_id`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
