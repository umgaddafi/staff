<?php
ini_set('display_error',1);
ini_set('display_startup_error',1);
error_reporting(E_ALL);
session_start();
require '../../config/db.php';

if ($_POST['action'] == 'approve') {
    $log_id = $_POST['log_id'];

    // 1. Get the Payload
    $stmt = $pdo->prepare("SELECT * FROM change_log WHERE log_id = ?");
    $stmt->execute([$log_id]);
    $log = $stmt->fetch();

    $data = json_decode($log['change_payload'], true);
    $table = $log['entity_name']; // e.g., 'staff' or 'publication'
    $id = $log['entity_id'];

    // 2. Dynamically build the SQL UPDATE query
    // Example result: "UPDATE staff SET biography = ?, office_location = ? WHERE staff_id = ?"
    
    $set_clauses = [];
    $params = [];

    foreach ($data as $column => $value) {
        $set_clauses[] = "$column = ?";
        $params[] = $value;
    }
    
    // Add the ID for the WHERE clause
    $params[] = $id; 

    $sql = "UPDATE $table SET " . implode(', ', $set_clauses) . " WHERE {$table}_id = ?";

    try {
        $pdo->beginTransaction();

        // Apply changes to actual table
        $update_stmt = $pdo->prepare($sql);
        $update_stmt->execute($params);

        // Mark log as Approved
        $pdo->prepare("UPDATE change_log SET status = 'Approved' WHERE log_id = ?")->execute([$log_id]);

        $pdo->commit();
        header("Location: ../admin/dashboard.php?msg=approved");

    } catch (Exception $e) {
        $pdo->rollBack();
        die("Error: " . $e->getMessage());
    }
}