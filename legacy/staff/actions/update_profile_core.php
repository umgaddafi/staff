<?php
/**
 * Refactored Backend Logic for Profile Updates
 * Handles file uploads and logs changes for admin approval.
 */

session_start();
require '../../config/db.php';

function redirectProfile(string $status): void
{
    header("Location: ../index.php?page=profile&status=" . urlencode($status));
    exit();
}

// Authentication Check
if (!isset($_SESSION['user_id'])) {
    header("Location: ../../login.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['submit_update'])) {
    $user_id  = (int) $_SESSION['user_id'];
    $staff_id = isset($_SESSION['staff_id']) ? (int) $_SESSION['staff_id'] : 0;
    if ($staff_id <= 0) {
        $sid_stmt = $pdo->prepare("SELECT staff_id FROM user_account WHERE user_id = ? LIMIT 1");
        $sid_stmt->execute([$user_id]);
        $staff_id = (int) ($sid_stmt->fetchColumn() ?: 0);
    }
    if ($staff_id <= 0) {
        redirectProfile('error');
    }

    $current_staff_stmt = $pdo->prepare("SELECT rank_id FROM staff WHERE staff_id = ? LIMIT 1");
    $current_staff_stmt->execute([$staff_id]);
    $current_staff = $current_staff_stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $current_rank_id = (int)($current_staff['rank_id'] ?? 0);
    $requested_rank_id = (int)($_POST['rank_id'] ?? 0);
    if ($requested_rank_id > 0) {
        $rank_exists_stmt = $pdo->prepare("SELECT COUNT(*) FROM academic_rank WHERE rank_id = ?");
        $rank_exists_stmt->execute([$requested_rank_id]);
        if ((int)$rank_exists_stmt->fetchColumn() === 0) {
            redirectProfile('invalid');
        }
    }
    $rank_change_requested = ($requested_rank_id > 0 && $requested_rank_id !== $current_rank_id);

    // 1. Handle Profile Photo Upload
    $profile_photo = null;
    if (isset($_FILES['profile_photo']) && (int)$_FILES['profile_photo']['error'] !== UPLOAD_ERR_NO_FILE) {
        $upload_error = (int)($_FILES['profile_photo']['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($upload_error !== UPLOAD_ERR_OK) {
            redirectProfile('upload_error');
        }

        $target_dir = __DIR__ . "/../../uploads/";

        // Ensure directory exists
        if (!is_dir($target_dir) && !mkdir($target_dir, 0755, true)) {
            redirectProfile('upload_dir_error');
        }

        $file_ext = strtolower(pathinfo((string)$_FILES["profile_photo"]["name"], PATHINFO_EXTENSION));
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'webp'];
        $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp'];
        $file_size = (int)($_FILES['profile_photo']['size'] ?? 0);

        if ($file_size <= 0 || $file_size > (5 * 1024 * 1024)) {
            redirectProfile('upload_size_error');
        }

        if (in_array($file_ext, $allowed_extensions)) {
            $tmp_name = (string)$_FILES["profile_photo"]["tmp_name"];
            $mime_type = (string)(mime_content_type($tmp_name) ?: '');
            if (!in_array($mime_type, $allowed_mimes, true)) {
                redirectProfile('upload_type_error');
            }

            // Rename file: staff_1_timestamp.jpg
            $new_file_name = "staff_" . $staff_id . "_" . time() . "." . $file_ext;
            $target_file = $target_dir . $new_file_name;

            if (move_uploaded_file($tmp_name, $target_file)) {
                $profile_photo = $new_file_name;
            } else {
                redirectProfile('upload_failed');
            }
        } else {
            redirectProfile('upload_type_error');
        }
    }

    // 2. Sanitize and Prepare Form Data
    $data = [
        'title'           => trim($_POST['title']),
        'first_name'      => trim($_POST['first_name']),
        'middle_name'     => trim($_POST['middle_name']),
        'last_name'       => trim($_POST['last_name']),
        'gender'          => $_POST['gender'],
        'date_of_birth'   => !empty($_POST['date_of_birth']) ? $_POST['date_of_birth'] : null,
        'phone'           => trim($_POST['phone']),
        'office_location' => trim($_POST['office_location']),
        'biography'       => trim($_POST['biography'])
    ];

    // Append new photo name to payload if uploaded
    if ($profile_photo) {
        $data['profile_photo'] = $profile_photo;
    }

    // 3. Persist immediately in staff table
    $columns = [
        'title',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'date_of_birth',
        'phone',
        'office_location',
        'biography',
    ];
    if ($profile_photo) {
        $columns[] = 'profile_photo';
    }

    $set_parts = [];
    $params = [];
    foreach ($columns as $col) {
        $set_parts[] = "{$col} = ?";
        $params[] = $data[$col] ?? null;
    }
    $params[] = $staff_id;

    try {
        $pdo->beginTransaction();

        $update_sql = "UPDATE staff SET " . implode(', ', $set_parts) . " WHERE staff_id = ?";
        $update_stmt = $pdo->prepare($update_sql);
        $update_stmt->execute($params);

        // Keep an audit record for traceability (auto-approved since data is already persisted)
        $payload = json_encode($data);
        $log_stmt = $pdo->prepare("
            INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status) 
            VALUES (?, 'staff', ?, ?, 'UPDATE', 'Approved')
        ");
        $log_stmt->execute([$user_id, $staff_id, $payload]);

        if ($rank_change_requested) {
            $rank_payload = json_encode(['rank_id' => $requested_rank_id]);
            $rank_log = $pdo->prepare("
                INSERT INTO change_log (user_id, entity_name, entity_id, change_payload, action, status)
                VALUES (?, 'staff', ?, ?, 'UPDATE', 'Pending')
            ");
            $rank_log->execute([$user_id, $staff_id, $rank_payload]);
        }

        $pdo->commit();

        // 4. Redirect via Router
        redirectProfile($rank_change_requested ? 'saved_rank_pending' : 'saved');

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log("Profile Update Error: " . $e->getMessage());
        redirectProfile('error');
    }
} else {
    // Redirect if accessed directly without POST
    redirectProfile('invalid');
}
