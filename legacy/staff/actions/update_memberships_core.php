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
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_membership'])) {
    $evidence_file = null;
    if (isset($_FILES['evidence_file']) && $_FILES['evidence_file']['error'] === 0) {
        $target_dir = "../../uploads/evidence/";
        if (!is_dir($target_dir)) {
            mkdir($target_dir, 0755, true);
        }

        $file_ext = strtolower(pathinfo($_FILES["evidence_file"]["name"], PATHINFO_EXTENSION));
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

        if (in_array($file_ext, $allowed_extensions)) {
            $new_file_name = "membership_" . $staff_id . "_" . time() . "." . $file_ext;
            $target_file = $target_dir . $new_file_name;

            if (move_uploaded_file($_FILES["evidence_file"]["tmp_name"], $target_file)) {
                $evidence_file = $new_file_name;
            }
        }
    }

    if (!$evidence_file) {
        header("Location: ../index.php?page=memberships&status=missing_file");
        exit();
    }

    $data = [
        'staff_id'     => $staff_id,
        'body_name'     => $_POST['body_name'],
        'membership_no' => $_POST['membership_no'],
        'role'          => $_POST['role'],
        'evidence_file' => $evidence_file
    ];
    $payload = json_encode($data);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'professional_membership', ?, ?, 'CREATE', 'Pending')
        ");
        $stmt->execute([$user_id, $staff_id, $payload]);

        header("Location: ../index.php?page=memberships&status=submitted");
        exit();
    } catch (PDOException $e) {
        die("Error logging membership request: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE DELETION REQUEST (Pending Admin)
// ==========================================
if (isset($_GET['del'])) {
    $membership_id = intval($_GET['del']);

    try {
        // Fetch current record to include in the log for admin reference
        $fetchStmt = $pdo->prepare("SELECT * FROM professional_membership WHERE membership_id = ? AND staff_id = ?");
        $fetchStmt->execute([$membership_id, $staff_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            $payload = json_encode($oldData);
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'professional_membership', ?, ?, 'DELETE', 'Pending')
            ");
            // Note: entity_id stores the specific record ID for deletions
            $logStmt->execute([$user_id, $membership_id, $payload]);

            header("Location: ../index.php?page=memberships&status=delete_submitted");
        }
        exit();
    } catch (PDOException $e) {
        die("Error logging removal request: " . $e->getMessage());
    }
}

header("Location: ../index.php?page=memberships");
exit();
