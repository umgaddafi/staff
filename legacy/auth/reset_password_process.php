<?php
session_start();
require '../config/db.php';
require_once '../includes/password_reset_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: reset_password.php');
    exit();
}

$email = trim((string)($_POST['email'] ?? ''));
if ($email === '') {
    header('Location: reset_password.php?msg=sent');
    exit();
}

try {
    ensurePasswordResetSchema($pdo);
    $user = findActiveUserByEmail($pdo, $email);

    if (!empty($user['user_id'])) {
        $token = createPasswordResetToken($pdo, (int)$user['user_id'], 3600);
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $base = '/university-portfolio';
        $link = $protocol . $host . $base . '/auth/reset_password_change.php?token=' . urlencode($token);

        $fullName = trim(((string)($user['first_name'] ?? '')) . ' ' . ((string)($user['last_name'] ?? '')));
        if ($fullName === '') {
            $fullName = (string)($user['username'] ?? 'Staff');
        }

        $sent = sendPasswordResetEmail((string)$email, $fullName, $link);
        if (!$sent) {
            header('Location: reset_password.php?msg=error');
            exit();
        }
    }

    // Always generic response for security.
    header('Location: reset_password.php?msg=sent');
    exit();
} catch (Throwable $e) {
    header('Location: reset_password.php?msg=error');
    exit();
}

