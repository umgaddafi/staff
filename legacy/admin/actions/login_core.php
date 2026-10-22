<?php
session_start();
require '../config/db.php'; // Ensure this file exists from previous step

if (isset($_POST['login_btn'])) {
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    // Secure Query
    $stmt = $pdo->prepare("SELECT * FROM user_account WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user) {
        // Verify Password
        // NOTE: In production, ensure passwords in DB are hashed using password_hash()
        // If your test DB has plain text, update this line temporarily or hash your DB passwords.
        if (password_verify($password, $user['password'])) {
            
            if ($user['is_active'] == 0) {
                header("Location: ../login.php?err=inactive");
                exit();
            }

            // Set Session Variables
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['staff_id'] = $user['staff_id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            if (!empty($user['must_change_password'])) {
                $_SESSION['force_reset'] = true;
                header("Location: ../auth/change_password.php");
                exit();
            }

            // Redirect based on Role
            if ($user['role'] === 'Admin') {
                header("Location: ../admin/index.php?page=dashboard");
            } else {
                header("Location: ../staff/index.php?page=dashboard");
            }
            exit();
        }
    }
    
    // Auth Failed
    header("Location: ../login.php?err=invalid");
    exit();
}
