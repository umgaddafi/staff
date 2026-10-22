<?php
session_start();
require_once '../config/db.php';
require_once '../includes/notification_helper.php';

if (!isset($_SESSION['user_id']) || (($_SESSION['role'] ?? '') !== 'Staff')) {
    header('Location: ../login.php');
    exit();
}

ensureReviewAndNotificationSchema($pdo);

$notificationId = (int)($_GET['id'] ?? 0);
$userId = (int)($_SESSION['user_id'] ?? 0);

if ($notificationId <= 0 || $userId <= 0) {
    header('Location: index.php?page=history');
    exit();
}

$stmt = $pdo->prepare("
    SELECT notification_id, target_url
    FROM staff_notification
    WHERE notification_id = ? AND user_id = ?
    LIMIT 1
");
$stmt->execute([$notificationId, $userId]);
$notification = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$notification) {
    header('Location: index.php?page=history');
    exit();
}

$mark = $pdo->prepare("
    UPDATE staff_notification
    SET is_read = 1, read_at = NOW()
    WHERE notification_id = ? AND user_id = ?
");
$mark->execute([$notificationId, $userId]);

$target = (string)($notification['target_url'] ?? '');
if ($target === '' || !preg_match('/^index\.php\?page=[a-z_]+/i', $target)) {
    $target = 'index.php?page=history';
}

header('Location: ' . $target);
exit();

