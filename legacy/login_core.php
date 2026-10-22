<?php
session_start();
require 'config/db.php'; // Path to your PDO connection

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    $stmt = $pdo->prepare("SELECT * FROM user_account WHERE username = ? AND is_active = 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // Set Session Data
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['staff_id'] = $user['staff_id'];
        $_SESSION['username'] = $user['username'];

        // FORCE PASSWORD CHANGE LOGIC
        if ((int)$user['must_change_password'] === 1) {
            $_SESSION['force_reset'] = true;
            header("Location: auth/change_password.php");
            exit();
        }

        // Normal Redirect
        if ($user['role'] === 'Admin') {
            header("Location: admin/index.php?page=dashboard");
        } else {
            header("Location: staff/index.php?page=dashboard");
        }
    } else {
        header("Location: login.php?err=invalid");
    }
    exit();
}
