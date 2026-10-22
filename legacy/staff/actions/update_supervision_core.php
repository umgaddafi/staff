<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require '../../config/db.php';

// Check authentication
if (!isset($_SESSION['staff_id'])) {
    header("Location: ../login.php");
    exit();
}

$staff_id = $_SESSION['staff_id'];
$user_id  = $_SESSION['user_id'];

// ==========================================
// 1. HANDLE ADDITION REQUEST (Pending Admin)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['student'])) {
    
    // Package form data
    $data = [
        'student_name'   => $_POST['student'],
        'degree'         => $_POST['degree'],
        'thesis_title'   => $_POST['title'],
        'status'         => $_POST['status'],
        'year_started'   => $_POST['start'],
        'year_completed' => !empty($_POST['end']) ? $_POST['end'] : null
    ];
    
    $payload = json_encode($data);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'supervision', ?, ?, 'CREATE', 'Pending')
        ");
        $stmt->execute([$user_id, $staff_id, $payload]);

        header("Location: ../supervision.php?status=submitted");
        exit();
    } catch (PDOException $e) {
        die("Error logging supervision request: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE DELETION REQUEST (Pending Admin)
// ==========================================
if (isset($_GET['del'])) {
    $supervision_id = intval($_GET['del']);

    try {
        // Fetch current record for admin reference
        $fetchStmt = $pdo->prepare("SELECT * FROM supervision WHERE supervision_id = ? AND staff_id = ?");
        $fetchStmt->execute([$supervision_id, $staff_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            $payload = json_encode($oldData);
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'supervision', ?, ?, 'DELETE', 'Pending')
            ");
            // entity_id stores the specific record ID for the deletion task
            $logStmt->execute([$user_id, $supervision_id, $payload]);

            header("Location: ../supervision.php?status=delete_submitted");
        }
        exit();
    } catch (PDOException $e) {
        die("Error logging removal request: " . $e->getMessage());
    }
}

header("Location: ../supervision.php");
exit();