<?php
session_start();
require '../config/db.php';
require_once '../includes/password_reset_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: reset_password.php');
    exit();
}

ensurePasswordResetSchema($pdo);

$token = trim((string)($_POST['token'] ?? ''));
$newPassword = (string)($_POST['new_password'] ?? '');
$confirmPassword = (string)($_POST['confirm_password'] ?? '');

if ($token === '') {
    header('Location: reset_password.php');
    exit();
}

if (strlen($newPassword) < 8) {
    header('Location: reset_password_change.php?token=' . urlencode($token) . '&msg=short');
    exit();
}

if ($newPassword !== $confirmPassword) {
    header('Location: reset_password_change.php?token=' . urlencode($token) . '&msg=mismatch');
    exit();
}

$tokenData = resolvePasswordResetToken($pdo, $token);
if (empty($tokenData['user_id']) || empty($tokenData['reset_id'])) {
    header('Location: reset_password_change.php?token=' . urlencode($token));
    exit();
}

try {
    $pdo->beginTransaction();

    $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE user_account SET password = ?, must_change_password = 0 WHERE user_id = ? LIMIT 1");
    $stmt->execute([$hashed, (int)$tokenData['user_id']]);

    markPasswordResetTokenUsed($pdo, (int)$tokenData['reset_id']);

    $pdo->commit();
    header('Location: ../login.php?reset=success');
    exit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    header('Location: reset_password_change.php?token=' . urlencode($token));
    exit();
}

