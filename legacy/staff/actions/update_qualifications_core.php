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

// --- HANDLE ADDITION REQUEST ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_qual'])) {
    $evidence_file = null;
    if (isset($_FILES['evidence_file']) && $_FILES['evidence_file']['error'] === 0) {
        $target_dir = "../../uploads/evidence/";
        if (!is_dir($target_dir)) {
            mkdir($target_dir, 0755, true);
        }

        $file_ext = strtolower(pathinfo($_FILES["evidence_file"]["name"], PATHINFO_EXTENSION));
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

        if (in_array($file_ext, $allowed_extensions)) {
            $new_file_name = "qualification_" . $staff_id . "_" . time() . "." . $file_ext;
            $target_file = $target_dir . $new_file_name;

            if (move_uploaded_file($_FILES["evidence_file"]["tmp_name"], $target_file)) {
                $evidence_file = $new_file_name;
            }
        }
    }

    if (!$evidence_file) {
        header("Location: ../index.php?page=qualifications&status=missing_file");
        exit();
    }

    // Prepare the data payload for admin review
    $data = [
        'staff_id'       => $staff_id,
        'degree'         => $_POST['degree'],
        'field_of_study' => $_POST['field'],
        'institution'    => $_POST['institution'],
        'country'        => $_POST['country'],
        'year_awarded'   => $_POST['year'],
        'evidence_file'  => $evidence_file
    ];
    $payload = json_encode($data);

    try {
        // We do NOT insert into the qualification table here.
        // We only insert into change_log with status 'Pending'.
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'qualification', ?, ?, 'CREATE', 'Pending')
        ");
        $stmt->execute([$user_id, $staff_id, $payload]);

        header("Location: ../index.php?page=qualifications&status=submitted");
        exit();
    } catch (PDOException $e) {
        die("Error logging request: " . $e->getMessage());
    }
}

// --- HANDLE DELETION REQUEST ---
if (isset($_GET['del'])) {
    $qual_id = intval($_GET['del']);

    try {
        // Fetch current data so admin knows what is being deleted
        $fetchStmt = $pdo->prepare("SELECT * FROM qualification WHERE qualification_id = ? AND staff_id = ?");
        $fetchStmt->execute([$qual_id, $staff_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            // Again, we do NOT delete from the qualification table yet.
            // We log the intent to delete for admin approval.
            $payload = json_encode($oldData);
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'qualification', ?, ?, 'DELETE', 'Pending')
            ");
            $logStmt->execute([$user_id, $qual_id, $payload]);

            header("Location: ../index.php?page=qualifications&status=delete_submitted");
        }
        exit();
    } catch (PDOException $e) {
        die("Error logging delete request: " . $e->getMessage());
    }
}
