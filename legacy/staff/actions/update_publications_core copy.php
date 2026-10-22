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
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['title'])) {
    
    // Package all form data into a payload
    $data = [
        'title'             => $_POST['title'],
        'publication_type'  => $_POST['type'],
        'journal_or_venue'  => $_POST['venue'],
        'publisher'         => $_POST['publisher'],
        'year_published'    => $_POST['year'],
        'doi'               => $_POST['doi'],
        'url'               => $_POST['url'],
        'author_order'      => 1 // Defaulting to first author for self-entry
    ];
    
    $payload = json_encode($data);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'publication', ?, ?, 'CREATE', 'Pending')
        ");
        $stmt->execute([$user_id, $staff_id, $payload]);

        header("Location: ../publications.php?status=submitted");
        exit();
    } catch (PDOException $e) {
        die("Error logging publication request: " . $e->getMessage());
    }
}

// ==========================================
// 2. HANDLE DELETION REQUEST (Pending Admin)
// ==========================================
if (isset($_GET['del'])) {
    $publication_id = intval($_GET['del']);

    try {
        // Fetch current record for admin reference in the log
        $fetchStmt = $pdo->prepare("SELECT * FROM publication WHERE publication_id = ?");
        $fetchStmt->execute([$publication_id]);
        $oldData = $fetchStmt->fetch();

        if ($oldData) {
            $payload = json_encode($oldData);
            $logStmt = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'publication', ?, ?, 'DELETE', 'Pending')
            ");
            // entity_id stores the specific publication_id being targeted for removal
            $logStmt->execute([$user_id, $publication_id, $payload]);

            header("Location: ../publications.php?status=delete_submitted");
        }
        exit();
    } catch (PDOException $e) {
        die("Error logging removal request: " . $e->getMessage());
    }
}

header("Location: ../publications.php");
exit();