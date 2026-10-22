<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require '../../config/db.php';

// Check authentication
if (!isset($_SESSION['staff_id'])) {
    header("Location: ../../login.php");
    exit();
}

$staff_id = $_SESSION['staff_id'];
$user_id  = $_SESSION['user_id'];

// ==========================================
// 1. HANDLE ADDITION REQUEST (Pending Admin)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['platform'])) {
    
    $data = [
        'platform'    => $_POST['platform'],
        'profile_url' => $_POST['url']
    ];
    $payload = json_encode($data);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'external_profile', ?, ?, 'CREATE', 'Pending')
        ");
        $stmt->execute([$user_id, $staff_id, $payload]);
        header("Location: ../index.php?page=external&status=submitted"); // Success flag
        exit();
    } catch (PDOException $e) {
        header("Location: ../index.php?page=external&status=error"); // Failure flag
    
        die("Error logging profile request: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE DELETION REQUEST (Pending Admin)
// ==========================================
if (isset($_GET['del'])) {
    $profile_id = intval($_GET['del']);

    try {
        // Fetch current record for admin reference
        $fetchStmt = $pdo->prepare("SELECT * FROM external_profile WHERE profile_id = ? AND staff_id = ?");
        $fetchStmt->execute([$profile_id, $staff_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            $payload = json_encode($oldData);
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'external_profile', ?, ?, 'DELETE', 'Pending')
            ");
            // entity_id stores the specific profile_id being targeted for removal
            $logStmt->execute([$user_id, $profile_id, $payload]);

            // header("Location: ../external_profiles.php?status=delete_submitted");
            header("Location: ../index.php?page=external&status=delete_submitted");
            exit();
        }
        header("Location: ../index.php?page=external&status=error");
        exit();
    } catch (PDOException $e) {
        die("Error logging removal request: " . $e->getMessage());
    }
}

header("Location: ../index.php?page=external");
exit();
