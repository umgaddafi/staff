<?php
session_start();
require '../../config/db.php';
require_once '../../includes/notification_helper.php';

function redirectWithMessage(string $type, string $message, int $logId = 0): void
{
    $_SESSION['msg_type'] = $type;
    $_SESSION['msg'] = $message;
    $target = '../index.php?page=requests';

    $returnTo = $_POST['return_to'] ?? '';
    $returnStaffId = (int)($_POST['staff_id'] ?? 0);
    if ($returnTo === 'request_history' && $returnStaffId > 0) {
        $target = '../index.php?page=request_history&staff_id=' . $returnStaffId;
    } elseif ($logId > 0) {
        $target .= '&focus=' . $logId;
    }

    header('Location: ' . $target);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirectWithMessage('danger', 'Invalid request method.');
}

if (!isset($_SESSION['user_id']) || (($_SESSION['role'] ?? '') !== 'Admin')) {
    redirectWithMessage('danger', 'Unauthorized action.');
}

$log_id = (int)($_POST['log_id'] ?? 0);
$action_type = $_POST['action'] ?? '';

if ($log_id <= 0 || !in_array($action_type, ['approve', 'reject'], true)) {
    redirectWithMessage('danger', 'Invalid request payload.');
}

$stmt = $pdo->prepare('SELECT * FROM change_log WHERE log_id = ?');
$stmt->execute([$log_id]);
$log = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$log) {
    redirectWithMessage('danger', 'Request not found.', $log_id);
}

if (($log['status'] ?? '') !== 'Pending') {
    redirectWithMessage('warning', 'This request has already been processed.', $log_id);
}

ensureReviewAndNotificationSchema($pdo);

if ($action_type === 'reject') {
    $rejectionReason = trim((string)($_POST['rejection_reason'] ?? ''));
    if ($rejectionReason === '') {
        redirectWithMessage('danger', 'Rejection reason is required.', $log_id);
    }

    if (dbColumnExists($pdo, 'change_log', 'admin_comment')) {
        $stmt = $pdo->prepare("UPDATE change_log SET status = 'Rejected', admin_comment = ? WHERE log_id = ?");
        $stmt->execute([$rejectionReason, $log_id]);
    } else {
        $stmt = $pdo->prepare("UPDATE change_log SET status = 'Rejected' WHERE log_id = ?");
        $stmt->execute([$log_id]);
    }
    createDecisionNotification($pdo, $log, 'Rejected', $rejectionReason);
    redirectWithMessage('success', 'Request rejected successfully.', $log_id);
}

$data = json_decode((string)($log['change_payload'] ?? ''), true);
if (!is_array($data)) {
    $data = [];
}

$table = (string)($log['entity_name'] ?? '');
$entity_id = (int)($log['entity_id'] ?? 0);
$db_action = (string)($log['action'] ?? '');
$user_id = (int)($log['user_id'] ?? 0);

$pkMap = [
    'staff' => 'staff_id',
    'publication' => 'publication_id',
    'qualification' => 'qualification_id',
    'course' => 'course_id',
    'research_area' => 'research_area_id',
    'staff_course' => 'course_id',
    'grant_project' => 'project_id',
    'supervision' => 'supervision_id',
    'external_profile' => 'profile_id',
    'professional_membership' => 'membership_id',
];

$allowed_tables = array_keys($pkMap);

if (!in_array($table, $allowed_tables, true)) {
    redirectWithMessage('danger', 'Unsupported entity type in this request.', $log_id);
}

$staffRequiredOnCreate = ['qualification', 'grant_project', 'supervision', 'external_profile', 'professional_membership'];

$resolveStaffId = function () use ($pdo, $entity_id, $user_id): int {
    if ($entity_id > 0) {
        return $entity_id;
    }
    if ($user_id > 0) {
        $s = $pdo->prepare('SELECT staff_id FROM user_account WHERE user_id = ? LIMIT 1');
        $s->execute([$user_id]);
        return (int)($s->fetchColumn() ?: 0);
    }
    return 0;
};

try {
    $pdo->beginTransaction();

    if ($table === 'research_area') {
        $staff_id = 0;
        if (!empty($data['staff_id'])) {
            $staff_id = (int)$data['staff_id'];
        }
        if ($staff_id <= 0) {
            $staff_id = $resolveStaffId();
        }
        if ($staff_id <= 0) {
            throw new RuntimeException('Cannot determine staff owner for research area request.');
        }

        if ($db_action === 'CREATE' || $db_action === 'UPDATE') {
            $name = trim((string)($data['name'] ?? ''));
            if ($name === '') {
                throw new RuntimeException('Research area name is required.');
            }

            // Ensure master research area exists
            $findArea = $pdo->prepare('SELECT research_area_id FROM research_area WHERE name = ? LIMIT 1');
            $findArea->execute([$name]);
            $research_area_id = (int)($findArea->fetchColumn() ?: 0);

            if ($research_area_id <= 0) {
                $createArea = $pdo->prepare('INSERT INTO research_area (name) VALUES (?)');
                $createArea->execute([$name]);
                $research_area_id = (int)$pdo->lastInsertId();
            }

            // Link to staff (idempotent)
            $linkStmt = $pdo->prepare('INSERT IGNORE INTO staff_research_area (staff_id, research_area_id) VALUES (?, ?)');
            $linkStmt->execute([$staff_id, $research_area_id]);
        } elseif ($db_action === 'DELETE') {
            $research_area_id = (int)($data['research_area_id'] ?? 0);
            if ($research_area_id <= 0 && !empty($data['name'])) {
                $findArea = $pdo->prepare('SELECT research_area_id FROM research_area WHERE name = ? LIMIT 1');
                $findArea->execute([trim((string)$data['name'])]);
                $research_area_id = (int)($findArea->fetchColumn() ?: 0);
            }
            if ($research_area_id > 0) {
                $unlinkStmt = $pdo->prepare('DELETE FROM staff_research_area WHERE staff_id = ? AND research_area_id = ?');
                $unlinkStmt->execute([$staff_id, $research_area_id]);
            }
        } else {
            throw new RuntimeException('Unsupported action for research area request.');
        }
    } elseif ($table === 'staff_course') {
        $staff_id = $resolveStaffId();
        if ($staff_id <= 0) {
            throw new RuntimeException('Cannot determine staff owner for course request.');
        }

        $course_id = (int)($data['course_id'] ?? 0);
        $session = trim((string)($data['session'] ?? ''));
        if ($course_id <= 0 || $session === '') {
            throw new RuntimeException('Course ID and session are required for course requests.');
        }

        if ($db_action === 'CREATE' || $db_action === 'UPDATE') {
            $link = $pdo->prepare('INSERT IGNORE INTO staff_course (staff_id, course_id, session) VALUES (?, ?, ?)');
            $link->execute([$staff_id, $course_id, $session]);
        } elseif ($db_action === 'DELETE') {
            $unlink = $pdo->prepare('DELETE FROM staff_course WHERE staff_id = ? AND course_id = ? AND session = ?');
            $unlink->execute([$staff_id, $course_id, $session]);
        } else {
            throw new RuntimeException('Unsupported action for staff course request.');
        }
    } elseif ($db_action === 'UPDATE') {
        $set_clauses = [];
        $params = [];

        foreach ($data as $column => $value) {
            if (preg_match('/^[a-z0-9_]+$/i', (string)$column)) {
                $set_clauses[] = "$column = ?";
                $params[] = $value;
            }
        }

        if (empty($set_clauses)) {
            throw new RuntimeException('No valid fields found to update.');
        }

        $pk = $pkMap[$table];
        $params[] = $entity_id;
        $sql = "UPDATE $table SET " . implode(', ', $set_clauses) . " WHERE {$pk} = ?";
        $u = $pdo->prepare($sql);
        $u->execute($params);
    } elseif ($db_action === 'CREATE') {
        if (in_array($table, $staffRequiredOnCreate, true) && empty($data['staff_id'])) {
            $resolved = $resolveStaffId();
            if ($resolved <= 0) {
                throw new RuntimeException('Cannot determine staff owner for this request.');
            }
            $data['staff_id'] = $resolved;
        }

        $columns = [];
        $placeholders = [];
        $params = [];

        foreach ($data as $column => $value) {
            if (preg_match('/^[a-z0-9_]+$/i', (string)$column)) {
                $columns[] = $column;
                $placeholders[] = '?';
                $params[] = $value;
            }
        }

        if (empty($columns)) {
            throw new RuntimeException('No valid fields found to create record.');
        }

        $sql = "INSERT INTO $table (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $c = $pdo->prepare($sql);
        $c->execute($params);
    } elseif ($db_action === 'DELETE') {
        $pk = $pkMap[$table];
        if ($entity_id <= 0) {
            throw new RuntimeException('Missing target record identifier for delete action.');
        }
        $sql = "DELETE FROM $table WHERE {$pk} = ?";
        $d = $pdo->prepare($sql);
        $d->execute([$entity_id]);
    } else {
        throw new RuntimeException('Unsupported action type: ' . $db_action);
    }

    if (dbColumnExists($pdo, 'change_log', 'admin_comment')) {
        $update_log = $pdo->prepare("UPDATE change_log SET status = 'Approved', admin_comment = NULL WHERE log_id = ?");
        $update_log->execute([$log_id]);
    } else {
        $update_log = $pdo->prepare("UPDATE change_log SET status = 'Approved' WHERE log_id = ?");
        $update_log->execute([$log_id]);
    }

    $pdo->commit();
    createDecisionNotification($pdo, $log, 'Approved');
    redirectWithMessage('success', 'Request approved and applied successfully.', $log_id);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    $friendly = 'Approval could not be completed. Please review the payload and required fields.';
    if (stripos($e->getMessage(), 'staff_id') !== false) {
        $friendly = 'Approval failed because the request has no linked staff profile. Ensure the staff account is linked and try again.';
    }

    redirectWithMessage('danger', $friendly, $log_id);
}
?>
