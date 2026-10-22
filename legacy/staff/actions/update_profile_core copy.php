


<?php
session_start();
require '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_update'])) {
    $user_id = $_SESSION['user_id'];
    $staff_id = $_SESSION['staff_id'];

    $stmt = $pdo->prepare("SELECT * FROM staff WHERE staff_id = ?");
    $stmt->execute([$staff_id]);
    $current_data = $stmt->fetch(PDO::FETCH_ASSOC);

    $fields_to_track = ['first_name', 'last_name', 'phone', 'biography', 'office_location'];
    $proposed_changes = [];

    foreach ($fields_to_track as $field) {
        if (isset($_POST[$field])) {
            $new_value = trim($_POST[$field]);
            $old_value = trim($current_data[$field] ?? '');

            if ($new_value !== $old_value) {
                $proposed_changes[$field] = $new_value;
            }
        }
    }

    if (!empty($proposed_changes)) {
        try {
            $pdo->beginTransaction();

            $log_stmt = $pdo->prepare("INSERT INTO change_log 
                (user_id, entity_name, entity_id, change_payload, action, status) 
                VALUES (?, ?, ?, ?, ?, ?)");
            
            $log_stmt->execute([
                $user_id,
                'staff',
                $staff_id,
                json_encode($proposed_changes), 
                'UPDATE',
                'Pending'
            ]);

            $pdo->commit();
            header("Location: ../profile_edit.php?status=submitted");
            exit;
        
        } catch (Exception $e) {
            $pdo->rollBack();
            die("Error logging changes: " . $e->getMessage());
        }
    } else {
        header("Location: ../profile_edit.php?status=no_change");
        exit;
    }
} else {
    header("Location: ../dashboard.php");
    exit;
}