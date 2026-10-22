<?php
session_start();
require '../config/db.php';

// if ($_SESSION['role'] !== 'Admin') {
//     header("Location: ../auth/login.php");
//     exit;
// }

$username = trim($_POST['username']);
$password = $_POST['password'];
$role     = $_POST['role'];
$staff_id = !empty($_POST['staff_id']) ? $_POST['staff_id'] : null;

/* Prevent duplicate usernames */
$check = $pdo->prepare("SELECT user_id FROM user_account WHERE username=?");
$check->execute([$username]);

if ($check->rowCount() > 0) {
    die("Username already exists");
}

/* Staff role must have staff_id */
// if ($role === 'Staff' && !$staff_id) {
//     die("Staff account must be linked to staff record");
// }

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("
    INSERT INTO user_account (staff_id, username, password, role, must_change_password)
    VALUES (?, ?, ?, ?, 1)
");
$stmt->execute([$staff_id, $username, $hash, $role]);

header("Location: create_account.php?success=1");
exit;
