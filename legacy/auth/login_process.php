<?php
session_start();
require '../config/db.php';

$username = trim($_POST['username']);
$password = $_POST['password'];

$stmt = $pdo->prepare("
    SELECT * FROM user_account 
    WHERE username = ? AND is_active = 1
");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    header("Location: login.php?error=1");
    exit;
}

/* SESSION */
$_SESSION['user_id']  = $user['user_id'];
$_SESSION['staff_id'] = $user['staff_id'];
$_SESSION['role']     = $user['role'];

if (!empty($user['must_change_password'])) {
    $_SESSION['force_reset'] = true;
    header("Location: change_password.php");
    exit;
}

/* ROLE REDIRECT */
switch ($user['role']) {
    case 'Admin':
        header("Location: ../admin/index.php?page=dashboard");
        break;

    case 'Staff':
        header("Location: ../staff/index.php?page=dashboard");
        break;

    default:
        header("Location: login.php?error=1");
}

exit;
