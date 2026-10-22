<?php
// admin/staff_request_history.php
$staff_id = (int)($_GET['staff_id'] ?? 0);
if ($staff_id <= 0) {
    echo "<div class='alert alert-danger'>Invalid staff selected.</div>";
    return;
}

$staffStmt = $pdo->prepare("SELECT staff_id, first_name, last_name, staff_number FROM staff WHERE staff_id = ?");
$staffStmt->execute([$staff_id]);
$staff = $staffStmt->fetch();

if (!$staff) {
    echo "<div class='alert alert-danger'>Staff not found.</div>";
    return;
}

$logsStmt = $pdo->prepare("
    SELECT cl.*, ua.username
    FROM change_log cl
    JOIN user_account ua ON cl.user_id = ua.user_id
    WHERE ua.staff_id = ?
    ORDER BY cl.timestamp DESC
");
$logsStmt->execute([$staff_id]);
$logs = $logsStmt->fetchAll();

function renderEvidenceValue($value): string
{
    $file = basename((string)$value);
    if ($file === '') {
        return '<em class="text-muted">Empty</em>';
    }

    $url = "../uploads/evidence/" . rawurlencode($file);
    $safe = htmlspecialchars($file, ENT_QUOTES, 'UTF-8');

    if (preg_match('/\.(jpg|jpeg|png|webp)$/i', $file)) {
        return '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">' .
               '<img src="' . $url . '" alt="' . $safe . '" style="max-width:100px; max-height:100px;" class="rounded border">' .
               '</a>';
    }
    if (preg_match('/\.pdf$/i', $file)) {
        return '<a class="btn btn-sm btn-outline-secondary" href="' . $url . '" target="_blank" rel="noopener noreferrer">' .
               '<i class="fas fa-file-pdf me-1"></i> View PDF</a>';
    }
    return $safe;
}

function resolveDisplayValue(PDO $pdo, string $key, $value): string
{
    if ($value === null || $value === '') {
        return '';
    }

    if ($key === 'rank_id') {
        static $rankCache = [];
        $rankId = (int)$value;
        if ($rankId <= 0) {
            return (string)$value;
        }
        if (!array_key_exists($rankId, $rankCache)) {
            $s = $pdo->prepare("SELECT rank_name FROM academic_rank WHERE rank_id = ? LIMIT 1");
            $s->execute([$rankId]);
            $rankCache[$rankId] = (string)($s->fetchColumn() ?: (string)$value);
        }
        return $rankCache[$rankId];
    }

    return (string)$value;
}

function fetchCurrentData(PDO $pdo, string $entity, int $entityId, int $staffId, array $payload): array
{
    switch ($entity) {
        case 'staff':
            $stmt = $pdo->prepare("SELECT * FROM staff WHERE staff_id = ?");
            $stmt->execute([$entityId > 0 ? $entityId : $staffId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'publication':
            $stmt = $pdo->prepare("SELECT * FROM publication WHERE publication_id = ?");
            $stmt->execute([$entityId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'qualification':
            $stmt = $pdo->prepare("SELECT * FROM qualification WHERE qualification_id = ?");
            $stmt->execute([$entityId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'grant_project':
            $stmt = $pdo->prepare("SELECT * FROM grant_project WHERE project_id = ?");
            $stmt->execute([$entityId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'supervision':
            $stmt = $pdo->prepare("SELECT * FROM supervision WHERE supervision_id = ?");
            $stmt->execute([$entityId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'external_profile':
            $stmt = $pdo->prepare("SELECT * FROM external_profile WHERE profile_id = ?");
            $stmt->execute([$entityId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'professional_membership':
            $stmt = $pdo->prepare("SELECT * FROM professional_membership WHERE membership_id = ?");
            $stmt->execute([$entityId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'research_area':
            $areaId = (int)($payload['research_area_id'] ?? 0);
            if ($areaId <= 0 && !empty($payload['name'])) {
                $stmt = $pdo->prepare("SELECT research_area_id, name FROM research_area WHERE name = ? LIMIT 1");
                $stmt->execute([trim((string)$payload['name'])]);
                return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            }
            $stmt = $pdo->prepare("SELECT research_area_id, name FROM research_area WHERE research_area_id = ?");
            $stmt->execute([$areaId]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        case 'staff_course':
            $courseId = (int)($payload['course_id'] ?? 0);
            $session = (string)($payload['session'] ?? '');
            if ($courseId > 0 && $session !== '') {
                $stmt = $pdo->prepare("SELECT * FROM staff_course WHERE staff_id = ? AND course_id = ? AND session = ?");
                $stmt->execute([$staffId, $courseId, $session]);
                return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
            }
            return [];
        default:
            return [];
    }
}
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="fw-bold text-dark mb-0">Request History</h4>
        <p class="text-muted mb-0">
            <?= htmlspecialchars($staff['first_name'] . ' ' . $staff['last_name']) ?> (PF: <?= htmlspecialchars($staff['staff_number']) ?>)
        </p>
    </div>
    <a href="?page=requests" class="btn btn-outline-secondary btn-sm">
        <i class="fas fa-arrow-left me-1"></i> Back
    </a>
</div>

<div class="card shadow-sm border-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-secondary small text-uppercase">
                <tr>
                    <th class="ps-4 py-3">Date</th>
                    <th class="py-3">Entity</th>
                    <th class="py-3">Action</th>
                    <th class="py-3">Status</th>
                    <th class="text-end pe-4 py-3">Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($logs)): ?>
                    <tr><td colspan="5" class="text-center py-5 text-muted">No request history found for this staff.</td></tr>
                <?php else: ?>
                    <?php foreach ($logs as $log): ?>
                        <?php
                        $status = (string)$log['status'];
                        $statusClass = $status === 'Pending' ? 'bg-warning text-dark' : ($status === 'Approved' ? 'bg-success' : 'bg-danger');
                        ?>
                        <tr>
                            <td class="ps-4 small text-muted"><?= htmlspecialchars(date('M d, Y h:i A', strtotime($log['timestamp']))) ?></td>
                            <td class="text-capitalize"><?= htmlspecialchars(str_replace('_', ' ', (string)$log['entity_name'])) ?></td>
                            <td><span class="badge bg-light text-dark border"><?= htmlspecialchars((string)$log['action']) ?></span></td>
                            <td><span class="badge <?= $statusClass ?>"><?= htmlspecialchars($status) ?></span></td>
                            <td class="text-end pe-4">
                                <?php if ($status === 'Pending'): ?>
                                    <button class="btn btn-sm btn-admin" data-bs-toggle="modal" data-bs-target="#reviewModal<?= (int)$log['log_id'] ?>">
                                        <i class="fas fa-eye me-1"></i> Review
                                    </button>
                                <?php else: ?>
                                    <span class="text-muted small">Processed</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php foreach ($logs as $log): ?>
    <?php if (($log['status'] ?? '') !== 'Pending') continue; ?>
    <?php
    $payload = json_decode((string)($log['change_payload'] ?? ''), true);
    if (!is_array($payload)) $payload = [];
    $current = fetchCurrentData($pdo, (string)$log['entity_name'], (int)$log['entity_id'], $staff_id, $payload);
    ?>
    <div class="modal fade" id="reviewModal<?= (int)$log['log_id'] ?>" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content border-0 shadow">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">
                        Review Request #<?= (int)$log['log_id'] ?> (<?= htmlspecialchars((string)$log['entity_name']) ?> / <?= htmlspecialchars((string)$log['action']) ?>)
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Field</th>
                                    <th>Current Data</th>
                                    <th class="table-primary">Proposed Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($payload)): ?>
                                    <tr><td colspan="3" class="text-center py-4 text-muted">No payload found for this request.</td></tr>
                                <?php else: ?>
                                    <?php foreach ($payload as $key => $newVal): ?>
                                        <?php
                                        $label = ucwords(str_replace('_', ' ', (string)$key));
                                        $oldVal = $current[$key] ?? null;
                                        $oldDisplay = resolveDisplayValue($pdo, (string)$key, $oldVal);
                                        $newDisplay = resolveDisplayValue($pdo, (string)$key, $newVal);
                                        $isDiff = trim((string)$oldVal) !== trim((string)$newVal);
                                        ?>
                                        <tr class="<?= $isDiff ? 'bg-light' : '' ?>">
                                            <td class="ps-4 fw-medium text-secondary"><?= htmlspecialchars($label) ?></td>
                                            <td class="small text-muted">
                                                <?php if ($key === 'evidence_file'): ?>
                                                    <?= ($oldVal === null || $oldVal === '') ? '<em class="text-muted">N/A</em>' : renderEvidenceValue($oldVal) ?>
                                                <?php else: ?>
                                                    <?= ($oldDisplay === '') ? '<em class="text-muted">N/A</em>' : htmlspecialchars((string)$oldDisplay) ?>
                                                <?php endif; ?>
                                            </td>
                                            <td class="<?= $isDiff ? 'fw-bold text-dark' : '' ?>">
                                                <?php if ($isDiff): ?><i class="fas fa-pen-fancy text-primary small me-1"></i><?php endif; ?>
                                                <?php if ($key === 'evidence_file'): ?>
                                                    <?= ($newVal === null || $newVal === '') ? '<em class="text-muted">Empty</em>' : renderEvidenceValue($newVal) ?>
                                                <?php else: ?>
                                                    <?= ($newDisplay === '') ? '<em class="text-muted">Empty</em>' : htmlspecialchars((string)$newDisplay) ?>
                                                <?php endif; ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <form action="actions/admin_approve_core.php" method="POST" class="ms-auto w-100">
                        <input type="hidden" name="log_id" value="<?= (int)$log['log_id'] ?>">
                        <input type="hidden" name="return_to" value="request_history">
                        <input type="hidden" name="staff_id" value="<?= (int)$staff_id ?>">
                        <div class="mb-2">
                            <label class="form-label small mb-1">Rejection Reason (required only when rejecting)</label>
                            <textarea name="rejection_reason" class="form-control" rows="2" placeholder="State why this request is being rejected..."></textarea>
                        </div>
                        <div class="d-flex justify-content-end gap-2">
                            <button type="submit" name="action" value="reject" class="btn btn-outline-danger">Reject</button>
                            <button type="submit" name="action" value="approve" class="btn btn-admin">Approve</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
<?php endforeach; ?>
