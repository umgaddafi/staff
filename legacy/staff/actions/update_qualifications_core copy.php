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
$user_id  = $_SESSION['user_id'] ?? 0;

// ==========================================
// 1. HANDLE ADDING NEW QUALIFICATION
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_qual'])) {
    
    $degree      = $_POST['degree'];
    $field       = $_POST['field'];
    $institution = $_POST['institution'];
    $country     = $_POST['country'];
    $year        = intval($_POST['year']);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO qualification (staff_id, degree, field_of_study, institution, country, year_awarded) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$staff_id, $degree, $field, $institution, $country, $year]);

        if ($stmt->rowCount() > 0) {
            // Log the creation
            $payload = json_encode([
                'degree'         => $degree,
                'field_of_study' => $field,
                'institution'    => $institution,
                'year_awarded'   => $year
            ]);

            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'qualification', ?, ?, 'CREATE', 'Approved')
            ");
            $logStmt->execute([$user_id, $staff_id, $payload]);

            header("Location: ../qualifications.php?status=added");
        }
        exit();

    } catch (PDOException $e) {
        die("Error adding qualification: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE DELETING QUALIFICATION
// ==========================================
if (isset($_GET['del'])) {
    
    $qual_id = intval($_GET['del']);

    try {
        // Fetch data before deleting for the log
        $fetchStmt = $pdo->prepare("SELECT * FROM qualification WHERE qualification_id = ? AND staff_id = ?");
        $fetchStmt->execute([$qual_id, $staff_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            $stmt = $pdo->prepare("DELETE FROM qualification WHERE qualification_id = ? AND staff_id = ?");
            $stmt->execute([$qual_id, $staff_id]);

            // Log the deletion
            $payload = json_encode($oldData);
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'qualification', ?, ?, 'DELETE', 'Approved')
            ");
            $logStmt->execute([$user_id, $staff_id, $payload]);

            header("Location: ../qualifications.php?status=deleted");
        }
        exit();

    } catch (PDOException $e) {
        die("Error deleting qualification: " . $e->getMessage());
    }
}

header("Location: ../qualifications.php");
exit();