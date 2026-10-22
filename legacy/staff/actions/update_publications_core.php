<?php
session_start();
require '../../config/db.php';

// Authentication Check
if (!isset($_SESSION['staff_id'])) {
    header("Location: ../../login.php");
    exit();
}

$staff_id = $_SESSION['staff_id'];
$user_id  = $_SESSION['user_id'];

// --- 1. HANDLE DELETE REQUEST ---
if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['id'])) {
    $pub_id = intval($_GET['id']);

    try {
        // Fetch record to store in log for admin reference
        $stmt = $pdo->prepare("SELECT * FROM publication WHERE publication_id = ?");
        $stmt->execute([$pub_id]);
        $current_data = $stmt->fetch();

        if ($current_data) {
            $payload = json_encode($current_data);
            $log = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, 'publication', ?, ?, 'DELETE', 'Pending')
            ");
            $log->execute([$user_id, $pub_id, $payload]);
            header("Location: ../index.php?page=publications&status=delete_pending");
        }
    } catch (PDOException $e) {
        die("Error: " . $e->getMessage());
    }
    exit();
}

// --- 2. HANDLE ADD (CREATE) OR EDIT (UPDATE) REQUEST ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['title'])) {
    $action = isset($_POST['publication_id']) ? 'UPDATE' : 'CREATE';
    $target_id = isset($_POST['publication_id']) ? $_POST['publication_id'] : $staff_id;

    $data = [
        'title'            => trim($_POST['title']),
        'publication_type' => $_POST['type'],
        'journal_or_venue' => trim($_POST['venue']),
        'year_published'   => $_POST['year'],
        'doi'              => trim($_POST['doi']),
        'url'              => trim($_POST['url']),
        'publisher'        => 'N/A'
    ];

    $payload = json_encode($data);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'publication', ?, ?, ?, 'Pending')
        ");
        $stmt->execute([$user_id, $target_id, $payload, $action]);

        header("Location: ../index.php?page=publications&status=submitted");
    } catch (PDOException $e) {
        die("Error: " . $e->getMessage());
    }
    exit();
}