<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
session_start();
require '../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['submit_update'])) {
    $staff_id = $_SESSION['staff_id'];
    $user_id  = $_SESSION['user_id'];

    // 1. Handle File Upload (profile_photo)
    $profile_photo = null;
    // Check if a new file was actually uploaded
    if (isset($_FILES['profile_photo']) && $_FILES['profile_photo']['error'] == 0) {
        $target_dir = "../../uploads/";
        $file_ext = pathinfo($_FILES["profile_photo"]["name"], PATHINFO_EXTENSION);
        // Rename file to prevent overwriting: staff_1_162345678.jpg
        $new_file_name = "staff_" . $staff_id . "_" . time() . "." . $file_ext;
        $target_file = $target_dir . $new_file_name;

        if (move_uploaded_file($_FILES["profile_photo"]["tmp_name"], $target_file)) {
            $profile_photo = $new_file_name;
        }
    }

    // 2. Prepare Data for Change Log
    // We collect everything from the form
    $data = [
        'title'           => $_POST['title'],
        'first_name'      => $_POST['first_name'],
        'middle_name'     => $_POST['middle_name'],
        'last_name'       => $_POST['last_name'],
        'gender'          => $_POST['gender'],
        'date_of_birth'   => !empty($_POST['date_of_birth']) ? $_POST['date_of_birth'] : null,
        'phone'           => $_POST['phone'],
        'office_location' => $_POST['office_location'],
        'biography'       => $_POST['biography']
    ];

    // If a new photo was uploaded, add it to the payload
    if ($profile_photo) {

        $data['profile_photo'] = $profile_photo;
        echo "New profile photo uploaded: " . $profile_photo; // Debugging line
    }

    // 3. Convert to JSON for the Change Log
    $payload = json_encode($data);

    try {
        // Insert into change_log table as per your schema
        $stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'staff', ?, ?, 'UPDATE', 'Pending')
        ");
        
        $stmt->execute([$user_id, $staff_id, $payload]);

        header("Location: ../profile_edit.php?status=submitted");
        exit();

    } catch (PDOException $e) {
        die("Error logging changes: " . $e->getMessage());
    }
}