<?php
session_start();
require '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id'])) {
    $newPass = $_POST['new_password'] ?? '';
    $confirmPass = $_POST['confirm_password'] ?? '';

    if (strlen($newPass) < 8) {
        header("Location: change_password.php?err=short");
        exit();
    }

    if ($newPass !== $confirmPass) {
        header("Location: change_password.php?err=mismatch");
        exit();
    }

    $hashed = password_hash($newPass, PASSWORD_DEFAULT);
    
    // Update password and reset first-login flag; username remains unchanged.
    $stmt = $pdo->prepare("UPDATE user_account SET password = ?, must_change_password = 0 WHERE user_id = ?");
    
    if ($stmt->execute([$hashed, $_SESSION['user_id']])) {
        unset($_SESSION['force_reset']); // Remove the force flag

        $u = $pdo->prepare("SELECT username FROM user_account WHERE user_id = ? LIMIT 1");
        $u->execute([$_SESSION['user_id']]);
        $_SESSION['username'] = (string)($u->fetchColumn() ?: ($_SESSION['username'] ?? ''));
        
        // Redirect to appropriate dashboard
        if ($_SESSION['role'] === 'Admin') {
            header("Location: ../admin/index.php?page=dashboard");
        } else {
            header("Location: ../staff/index.php?page=dashboard");
        }
        exit();
    }
}

header("Location: change_password.php?err=failed");
exit();
