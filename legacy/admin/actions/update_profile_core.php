<?php
session_start();
require '../config/db.php';

if (isset($_POST['submit_update'])) {
    $staff_id = $_SESSION['staff_id'];
    $user_id  = $_SESSION['user_id'];

    // 1. Collect Data to Serialize
    $changes = [
        'biography' => $_POST['biography'],
        'office_location' => $_POST['office_location']
    ];

    // 2. Convert array to JSON
    $json_payload = json_encode($changes);

    // 3. Insert into Change Log (Status = Pending)
    $sql = "INSERT INTO change_log (user_id, entity_name, entity_id, action, change_payload, status) 
            VALUES (?, 'staff', ?, 'UPDATE', ?, 'Pending')";
    
    $stmt = $pdo->prepare($sql);
    
    if ($stmt->execute([$user_id, $staff_id, $json_payload])) {
        // Redirect back with success message
        header("Location: ../staff/dashboard.php?msg=request_sent");
    } else {
        header("Location: ../staff/profile_edit.php?err=db_error");
    }
    exit();
}