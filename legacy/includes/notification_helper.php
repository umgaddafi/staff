<?php

function dbColumnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
    $stmt->execute([$column]);
    return (bool)$stmt->fetch(PDO::FETCH_ASSOC);
}

function ensureReviewAndNotificationSchema(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }

    try {
        if (!dbColumnExists($pdo, 'change_log', 'admin_comment')) {
            $pdo->exec("ALTER TABLE change_log ADD COLUMN admin_comment TEXT NULL AFTER status");
        }
    } catch (Throwable $e) {
        // Keep app usable even if schema auto-upgrade fails.
    }

    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS staff_notification (
                notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT(20) NOT NULL,
                log_id BIGINT(20) DEFAULT NULL,
                title VARCHAR(190) NOT NULL,
                message TEXT NULL,
                target_url VARCHAR(255) NOT NULL DEFAULT 'index.php?page=history',
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME NULL,
                PRIMARY KEY (notification_id),
                KEY idx_staff_notification_user_read_time (user_id, is_read, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        ");
    } catch (Throwable $e) {
        // Keep app usable even if schema auto-upgrade fails.
    }

    $done = true;
}

function notificationPageForEntity(string $entity): string
{
    $map = [
        'staff' => 'profile',
        'qualification' => 'qualifications',
        'professional_membership' => 'memberships',
        'grant_project' => 'grants',
        'supervision' => 'supervision',
        'external_profile' => 'external',
        'research_area' => 'research',
        'staff_course' => 'courses',
        'course' => 'courses',
        'publication' => 'publications',
    ];

    return $map[$entity] ?? 'history';
}

function notificationEntityLabel(string $entity): string
{
    $map = [
        'staff' => 'profile',
        'qualification' => 'qualification',
        'professional_membership' => 'membership',
        'grant_project' => 'grant',
        'supervision' => 'supervision',
        'external_profile' => 'web profile',
        'research_area' => 'research area',
        'staff_course' => 'course',
        'course' => 'course',
        'publication' => 'publication',
    ];

    return $map[$entity] ?? str_replace('_', ' ', $entity);
}

function createDecisionNotification(PDO $pdo, array $log, string $status, string $adminComment = ''): void
{
    $userId = (int)($log['user_id'] ?? 0);
    if ($userId <= 0) {
        return;
    }

    ensureReviewAndNotificationSchema($pdo);

    $entity = (string)($log['entity_name'] ?? '');
    $action = strtoupper((string)($log['action'] ?? 'UPDATE'));
    $entityLabel = notificationEntityLabel($entity);
    $page = notificationPageForEntity($entity);
    $logId = (int)($log['log_id'] ?? 0);

    $statusUpper = strtoupper($status);
    $title = $statusUpper === 'APPROVED' ? 'Update Approved' : 'Update Rejected';
    $message = "Your {$action} request for {$entityLabel} was {$statusUpper}.";
    if ($statusUpper === 'REJECTED' && trim($adminComment) !== '') {
        $message .= ' Reason: ' . trim($adminComment);
    }

    $targetUrl = "index.php?page={$page}&focus_log={$logId}";
    $stmt = $pdo->prepare("
        INSERT INTO staff_notification (user_id, log_id, title, message, target_url, is_read)
        VALUES (?, ?, ?, ?, ?, 0)
    ");
    $stmt->execute([$userId, $logId, $title, $message, $targetUrl]);
}

function fetchStaffNotifications(PDO $pdo, int $userId, int $limit = 8): array
{
    ensureReviewAndNotificationSchema($pdo);
    $stmt = $pdo->prepare("
        SELECT notification_id, title, message, target_url, is_read, created_at
        FROM staff_notification
        WHERE user_id = ?
        ORDER BY notification_id DESC
        LIMIT ?
    ");
    $stmt->bindValue(1, $userId, PDO::PARAM_INT);
    $stmt->bindValue(2, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

function countUnreadStaffNotifications(PDO $pdo, int $userId): int
{
    ensureReviewAndNotificationSchema($pdo);
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM staff_notification WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$userId]);
    return (int)($stmt->fetchColumn() ?: 0);
}

