-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: academic_portfolio
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `academic_rank`
--

DROP TABLE IF EXISTS `academic_rank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `academic_rank` (
  `rank_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `rank_name` varchar(100) NOT NULL,
  `rank_level` int(11) NOT NULL,
  PRIMARY KEY (`rank_id`),
  UNIQUE KEY `rank_name` (`rank_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `academic_rank`
--

LOCK TABLES `academic_rank` WRITE;
/*!40000 ALTER TABLE `academic_rank` DISABLE KEYS */;
INSERT INTO `academic_rank` VALUES (1,'Senior Lecturer',2);
/*!40000 ALTER TABLE `academic_rank` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `change_history`
--

DROP TABLE IF EXISTS `change_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `change_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `change_type` varchar(50) NOT NULL,
  `old_data` text DEFAULT NULL,
  `new_data` text NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `change_history`
--

LOCK TABLES `change_history` WRITE;
/*!40000 ALTER TABLE `change_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `change_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `change_log`
--

DROP TABLE IF EXISTS `change_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `change_log` (
  `log_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `entity_name` varchar(100) DEFAULT NULL,
  `entity_id` bigint(20) DEFAULT NULL,
  `change_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`change_payload`)),
  `action` enum('CREATE','UPDATE','DELETE') DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `change_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `change_log`
--

LOCK TABLES `change_log` WRITE;
/*!40000 ALTER TABLE `change_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `change_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `college`
--

DROP TABLE IF EXISTS `college`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `college` (
  `college_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`college_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `college`
--

LOCK TABLES `college` WRITE;
/*!40000 ALTER TABLE `college` DISABLE KEYS */;
INSERT INTO `college` VALUES (1,'College of Science and Technology');
/*!40000 ALTER TABLE `college` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course`
--

DROP TABLE IF EXISTS `course`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `course` (
  `course_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `course_code` varchar(20) DEFAULT NULL,
  `course_title` varchar(200) DEFAULT NULL,
  `level` int(11) DEFAULT NULL,
  PRIMARY KEY (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course`
--

LOCK TABLES `course` WRITE;
/*!40000 ALTER TABLE `course` DISABLE KEYS */;
/*!40000 ALTER TABLE `course` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `department` (
  `department_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `college_id` bigint(20) NOT NULL,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`department_id`),
  KEY `college_id` (`college_id`),
  CONSTRAINT `department_ibfk_1` FOREIGN KEY (`college_id`) REFERENCES `college` (`college_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` VALUES (1,1,'Computer Science');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `external_profile`
--

DROP TABLE IF EXISTS `external_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `external_profile` (
  `profile_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) NOT NULL,
  `platform` enum('ORCID','Google Scholar','Scopus','ResearchGate') DEFAULT NULL,
  `profile_url` text DEFAULT NULL,
  PRIMARY KEY (`profile_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `external_profile_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `external_profile`
--

LOCK TABLES `external_profile` WRITE;
/*!40000 ALTER TABLE `external_profile` DISABLE KEYS */;
/*!40000 ALTER TABLE `external_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grant_project`
--

DROP TABLE IF EXISTS `grant_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `grant_project` (
  `project_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) NOT NULL,
  `title` text DEFAULT NULL,
  `sponsor` varchar(200) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `start_year` year(4) DEFAULT NULL,
  `end_year` year(4) DEFAULT NULL,
  PRIMARY KEY (`project_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `grant_project_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grant_project`
--

LOCK TABLES `grant_project` WRITE;
/*!40000 ALTER TABLE `grant_project` DISABLE KEYS */;
/*!40000 ALTER TABLE `grant_project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `professional_membership`
--

DROP TABLE IF EXISTS `professional_membership`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `professional_membership` (
  `membership_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) NOT NULL,
  `body_name` varchar(200) DEFAULT NULL,
  `membership_no` varchar(100) DEFAULT NULL,
  `role` varchar(150) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`membership_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `professional_membership_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `professional_membership`
--

LOCK TABLES `professional_membership` WRITE;
/*!40000 ALTER TABLE `professional_membership` DISABLE KEYS */;
/*!40000 ALTER TABLE `professional_membership` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `publication`
--

DROP TABLE IF EXISTS `publication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `publication` (
  `publication_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` text NOT NULL,
  `publication_type` enum('Journal','Conference','Book','Book Chapter') DEFAULT NULL,
  `journal_or_venue` varchar(255) DEFAULT NULL,
  `publisher` varchar(255) DEFAULT NULL,
  `year_published` year(4) DEFAULT NULL,
  `doi` varchar(150) DEFAULT NULL,
  `url` text DEFAULT NULL,
  PRIMARY KEY (`publication_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `publication`
--

LOCK TABLES `publication` WRITE;
/*!40000 ALTER TABLE `publication` DISABLE KEYS */;
/*!40000 ALTER TABLE `publication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qualification`
--

DROP TABLE IF EXISTS `qualification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `qualification` (
  `qualification_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) NOT NULL,
  `degree` varchar(150) DEFAULT NULL,
  `field_of_study` varchar(150) DEFAULT NULL,
  `institution` varchar(200) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `year_awarded` year(4) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`qualification_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `qualification_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qualification`
--

LOCK TABLES `qualification` WRITE;
/*!40000 ALTER TABLE `qualification` DISABLE KEYS */;
/*!40000 ALTER TABLE `qualification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `research_area`
--

DROP TABLE IF EXISTS `research_area`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `research_area` (
  `research_area_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`research_area_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `research_area`
--

LOCK TABLES `research_area` WRITE;
/*!40000 ALTER TABLE `research_area` DISABLE KEYS */;
/*!40000 ALTER TABLE `research_area` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff` (
  `staff_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_number` varchar(50) NOT NULL,
  `title` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `rank_id` bigint(20) NOT NULL,
  `department_id` bigint(20) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `office_location` varchar(150) DEFAULT NULL,
  `biography` text DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_number` (`staff_number`),
  UNIQUE KEY `email` (`email`),
  KEY `rank_id` (`rank_id`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`rank_id`) REFERENCES `academic_rank` (`rank_id`),
  CONSTRAINT `staff_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES (1,'UNIV/2024/001','Dr.','Jane',NULL,'Smith',NULL,NULL,1,1,'jane.smith@university.edu',NULL,NULL,NULL,NULL,1,'2026-02-01 08:31:25','2026-02-01 08:31:25');
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_course`
--

DROP TABLE IF EXISTS `staff_course`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_course` (
  `staff_id` bigint(20) NOT NULL,
  `course_id` bigint(20) NOT NULL,
  `session` varchar(20) NOT NULL,
  PRIMARY KEY (`staff_id`,`course_id`,`session`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `staff_course_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `staff_course_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_course`
--

LOCK TABLES `staff_course` WRITE;
/*!40000 ALTER TABLE `staff_course` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_course` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_publication`
--

DROP TABLE IF EXISTS `staff_publication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_publication` (
  `staff_id` bigint(20) NOT NULL,
  `publication_id` bigint(20) NOT NULL,
  `author_order` int(11) DEFAULT NULL,
  PRIMARY KEY (`staff_id`,`publication_id`),
  KEY `publication_id` (`publication_id`),
  CONSTRAINT `staff_publication_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `staff_publication_ibfk_2` FOREIGN KEY (`publication_id`) REFERENCES `publication` (`publication_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_publication`
--

LOCK TABLES `staff_publication` WRITE;
/*!40000 ALTER TABLE `staff_publication` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_publication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_research_area`
--

DROP TABLE IF EXISTS `staff_research_area`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_research_area` (
  `staff_id` bigint(20) NOT NULL,
  `research_area_id` bigint(20) NOT NULL,
  PRIMARY KEY (`staff_id`,`research_area_id`),
  KEY `research_area_id` (`research_area_id`),
  CONSTRAINT `staff_research_area_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `staff_research_area_ibfk_2` FOREIGN KEY (`research_area_id`) REFERENCES `research_area` (`research_area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_research_area`
--

LOCK TABLES `staff_research_area` WRITE;
/*!40000 ALTER TABLE `staff_research_area` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_research_area` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staffs`
--

DROP TABLE IF EXISTS `staffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staffs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'staff',
  `must_change_password` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_id` (`staff_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffs`
--

LOCK TABLES `staffs` WRITE;
/*!40000 ALTER TABLE `staffs` DISABLE KEYS */;
/*!40000 ALTER TABLE `staffs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supervision`
--

DROP TABLE IF EXISTS `supervision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supervision` (
  `supervision_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) NOT NULL,
  `student_name` varchar(200) DEFAULT NULL,
  `degree` enum('PGD','MSc','PhD') DEFAULT NULL,
  `thesis_title` text DEFAULT NULL,
  `status` enum('Ongoing','Completed') DEFAULT NULL,
  `year_started` year(4) DEFAULT NULL,
  `year_completed` year(4) DEFAULT NULL,
  PRIMARY KEY (`supervision_id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `supervision_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supervision`
--

LOCK TABLES `supervision` WRITE;
/*!40000 ALTER TABLE `supervision` DISABLE KEYS */;
/*!40000 ALTER TABLE `supervision` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_account`
--

DROP TABLE IF EXISTS `user_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_account` (
  `user_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_id` bigint(20) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('Staff','Moderator','Admin') DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `must_change_password` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `user_account_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_account`
--

LOCK TABLES `user_account` WRITE;
/*!40000 ALTER TABLE `user_account` DISABLE KEYS */;
INSERT INTO `user_account` VALUES (1,NULL,'admin','$2y$10$8W3Y6L5GjC0K.zR/8p9mye.U4YvK9O.iMvI0X0X0X0X0X0X0X0X0X','Admin',1,0),(2,1,'shamad','$2y$10$/13vOs7ki7YR/mOWh479yOCrl8x2Rnv1RTQMHjeqFjAuTzpF.kKhq','Admin',1,0),(3,NULL,'general','$2y$10$R4cTVdRTto3SmXJoCp7F0Oy0OZZYn.WIL6aGwfK2l1b8iQ62Jj2hS','Staff',1,0);
/*!40000 ALTER TABLE `user_account` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-01 15:46:10
