<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require '../../config/db.php';

if (!isset($_SESSION['staff_id'])) {
    header("Location: ../../login.php");
    exit();
}

$staff_id = $_SESSION['staff_id'];
$user_id  = $_SESSION['user_id'];

// ==========================================
// 1. HANDLE ADDITION REQUEST (Pending)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['area_name'])) {
    
    $area_name = trim($_POST['area_name']);
    
    // We package the name. The Admin Approval script will handle 
    // checking the master table and linking it to the staff.
    $payload = json_encode(['name' => $area_name]);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'research_area', ?, ?, 'CREATE', 'Pending')
        ");
        $stmt->execute([$user_id, $staff_id, $payload]);

        header("Location: ../index.php?page=research&status=submitted");
        exit();
    } catch (PDOException $e) {
        die("Error logging research request: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE DELETION REQUEST (Pending)
// ==========================================
if (isset($_GET['remove'])) {
    $area_id = intval($_GET['remove']);

    try {
        // Fetch the name for the log so the admin knows what is being unlinked
        $fetchStmt = $pdo->prepare("
            SELECT ra.name 
            FROM research_area ra 
            JOIN staff_research_area sra ON ra.research_area_id = sra.research_area_id 
            WHERE sra.research_area_id = ? AND sra.staff_id = ?
        ");
        $fetchStmt->execute([$area_id, $staff_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            $payload = json_encode(['research_area_id' => $area_id, 'name' => $oldData['name']]);
            
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'research_area', ?, ?, 'DELETE', 'Pending')
            ");
            $logStmt->execute([$user_id, $staff_id, $payload]);

            header("Location: ../index.php?page=research&status=delete_submitted");
        }
        exit();
    } catch (PDOException $e) {
        die("Error logging removal request: " . $e->getMessage());
    }
}

header("Location: ../index.php?page=research");
exit();
