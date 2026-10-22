<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require '../../config/db.php';

if (!isset($_SESSION['staff_id'])) {
    header("Location: ../login.php");
    exit();
}

$staff_id = $_SESSION['staff_id'];
$user_id  = $_SESSION['user_id'];

// ==========================================
// 1. HANDLE ADDITION REQUEST
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['title'])) {
    
    $cleanAmount = filter_var($_POST['amount'], FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);

    $data = [
        'title'      => $_POST['title'],
        'sponsor'    => $_POST['sponsor'],
        'amount'     => $cleanAmount,
        'start_year' => intval($_POST['start']),
        'end_year'   => intval($_POST['end'])
    ];
    
    $payload = json_encode($data);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'grant_project', ?, ?, 'CREATE', 'Pending')
        ");
        $stmt->execute([$user_id, $staff_id, $payload]);

        header("Location: ../grants.php?status=submitted");
        exit();
    } catch (PDOException $e) {
        die("Error logging grant request: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE DELETION REQUEST
// ==========================================
if (isset($_GET['del'])) {
    $project_id = intval($_GET['del']); // Renamed variable for clarity

    try {
        // FIXED: Using 'project_id' as confirmed by your DESC command
        $fetchStmt = $pdo->prepare("SELECT * FROM grant_project WHERE project_id = ? AND staff_id = ?");
        $fetchStmt->execute([$project_id, $staff_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            $payload = json_encode($oldData);
            
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'grant_project', ?, ?, 'DELETE', 'Pending')
            ");
            // entity_id in change_log stores the project_id being deleted
            $logStmt->execute([$user_id, $project_id, $payload]);

            header("Location: ../grants.php?status=delete_submitted");
        } else {
            die("Error: Grant record not found.");
        }
        exit();
    } catch (PDOException $e) {
        die("Error logging removal request: " . $e->getMessage());
    }
}

header("Location: ../grants.php");
exit();