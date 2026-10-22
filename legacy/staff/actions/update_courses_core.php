<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require '../../config/db.php';

// Ensure user is logged in
if (!isset($_SESSION['staff_id'])) {
    header("Location: ../login.php");
    exit();
}

$staff_id = $_SESSION['staff_id'];
$user_id  = $_SESSION['user_id'] ?? 0; // Fallback if user_id isn't set, though it should be

// ==========================================
// 1. HANDLE LINKING A NEW COURSE (POST)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['link_course'])) {
    
    $course_id = intval($_POST['course_id']);
    $session   = $_POST['session'];

    // 1. Insert into staff_course
    try {
        $stmt = $pdo->prepare("INSERT IGNORE INTO staff_course (staff_id, course_id, session) VALUES (?, ?, ?)");
        $stmt->execute([$staff_id, $course_id, $session]);

        if ($stmt->rowCount() > 0) {
            // 2. Log the change
            $payload = json_encode([
                'course_id' => $course_id,
                'session'   => $session
            ]);

            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'staff_course', ?, ?, 'CREATE', 'Approved')
            ");
            // Note: status is 'Approved' because course linking usually doesn't need admin approval unlike profile bio changes
            $logStmt->execute([$user_id, $staff_id, $payload]); 

            header("Location: ../courses.php?status=linked");
        } else {
            // Duplicate entry or no change
            header("Location: ../courses.php?status=exists");
        }
        exit();

    } catch (PDOException $e) {
        die("Error linking course: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE REMOVING A COURSE (GET)
// ==========================================
if (isset($_GET['remove']) && isset($_GET['sess'])) {
    
    $course_id = intval($_GET['remove']);
    $session   = $_GET['sess'];

    try {
        // 1. Delete from staff_course
        $stmt = $pdo->prepare("DELETE FROM staff_course WHERE staff_id = ? AND course_id = ? AND session = ?");
        $stmt->execute([$staff_id, $course_id, $session]);

        if ($stmt->rowCount() > 0) {
            // 2. Log the change
            $payload = json_encode([
                'course_id' => $course_id,
                'session'   => $session
            ]);

            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'staff_course', ?, ?, 'DELETE', 'Approved')
            ");
            $logStmt->execute([$user_id, $staff_id, $payload]);

            header("Location: ../courses.php?status=removed");
        } else {
            header("Location: ../courses.php?status=error");
        }
        exit();

    } catch (PDOException $e) {
        die("Error removing course: " . $e->getMessage());
    }
}

// If accessed directly without valid params
header("Location: ../courses.php");
exit();
?>