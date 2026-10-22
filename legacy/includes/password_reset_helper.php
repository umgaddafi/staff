<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../PhpMailer/src/Exception.php';
require_once __DIR__ . '/../PhpMailer/src/PHPMailer.php';
require_once __DIR__ . '/../PhpMailer/src/SMTP.php';

function ensurePasswordResetSchema(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS password_reset_token (
            reset_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (reset_id),
            UNIQUE KEY uniq_token_hash (token_hash),
            KEY idx_prt_user (user_id),
            KEY idx_prt_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    ");

    $done = true;
}

function findActiveUserByEmail(PDO $pdo, string $email): array
{
    $stmt = $pdo->prepare("
        SELECT ua.user_id, ua.username, ua.is_active, s.first_name, s.last_name, s.email
        FROM user_account ua
        JOIN staff s ON s.staff_id = ua.staff_id
        WHERE LOWER(s.email) = LOWER(?) AND ua.is_active = 1
        LIMIT 1
    ");
    $stmt->execute([$email]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
}

function createPasswordResetToken(PDO $pdo, int $userId, int $ttlSeconds = 3600): string
{
    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);
    $expiresAt = date('Y-m-d H:i:s', time() + $ttlSeconds);

    $pdo->prepare("UPDATE password_reset_token SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL")
        ->execute([$userId]);

    $stmt = $pdo->prepare("
        INSERT INTO password_reset_token (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$userId, $tokenHash, $expiresAt]);

    return $rawToken;
}

function resolvePasswordResetToken(PDO $pdo, string $rawToken): array
{
    $tokenHash = hash('sha256', $rawToken);
    $stmt = $pdo->prepare("
        SELECT prt.reset_id, prt.user_id, prt.expires_at, prt.used_at, ua.username, s.first_name, s.last_name
        FROM password_reset_token prt
        JOIN user_account ua ON ua.user_id = prt.user_id
        LEFT JOIN staff s ON s.staff_id = ua.staff_id
        WHERE prt.token_hash = ?
        LIMIT 1
    ");
    $stmt->execute([$tokenHash]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return [];
    }

    if (!empty($row['used_at'])) {
        return [];
    }

    if (strtotime((string)$row['expires_at']) < time()) {
        return [];
    }

    return $row;
}

function markPasswordResetTokenUsed(PDO $pdo, int $resetId): void
{
    $stmt = $pdo->prepare("UPDATE password_reset_token SET used_at = NOW() WHERE reset_id = ? LIMIT 1");
    $stmt->execute([$resetId]);
}

function sendPasswordResetEmail(string $toEmail, string $toName, string $resetLink): bool
{
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'jostumpg@gmail.com';
        $mail->Password = 'avajrmliqzokhbbi';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->setFrom('jostumpg@gmail.com', 'JOSTUM ICT');
        $mail->addAddress($toEmail, $toName);

        $mail->isHTML(true);
        $mail->Subject = 'JOSTUM Password Reset Link';
        $mail->Body = "
            <div style='font-family: Ubuntu, sans-serif; line-height:1.6; color:#2d2d2d;'>
                <h2 style='margin-bottom:8px;'>Password Reset Request</h2>
                <p>We received a request to reset your Academic Portfolio password.</p>
                <p>
                    <a href='{$resetLink}' style='display:inline-block; background:#5b3a29; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px;'>
                        Reset Password
                    </a>
                </p>
                <p>This link expires in 1 hour and can be used once.</p>
                <p>If you did not request this, you can ignore this email.</p>
                <p style='font-size:12px;color:#6b7280;'>JOSTUM ICT Directorate</p>
            </div>
        ";
        $mail->send();
        return true;
    } catch (Exception $e) {
        return false;
    }
}

