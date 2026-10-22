<?php 
ini_set('display_error',1);
ini_set('display_startup_error',1);
error_reporting(E_ALL);
?>
<?php

// admin/review_change.php

// 1. Validate Input (Redirects now use the index.php routing)
$log_id = $_GET['id'] ?? 0;
if (!$log_id) {
    echo "<script>window.location.href='index.php?page=dashboard';</script>";
    exit;
}

// 2. Fetch Log + Requester Details
$stmt = $pdo->prepare("
    SELECT cl.*, s.first_name, s.last_name, s.staff_number, s.profile_photo, ua.username
    FROM change_log cl
    LEFT JOIN user_account ua ON cl.user_id = ua.user_id
    LEFT JOIN staff s ON ua.staff_id = s.staff_id
    WHERE cl.log_id = ?
");
$stmt->execute([$log_id]);
$request = $stmt->fetch();

if (!$request) {
    echo "<div class='alert alert-danger'>Request not found.</div>";
    return; // Using return instead of die to keep the index wrapper intact
}

// 3. Decode Payloads
$new_data = json_decode($request['change_payload'], true);
if (!is_array($new_data)) {
    $new_data = [];
}
$entity_id = $request['entity_id'];
$entity_type = $request['entity_name'];

function renderEvidenceCell($file) {
    $file = basename((string)$file);
    if ($file === '') {
        return '<em class="text-muted">Empty</em>';
    }

    $url = "../uploads/evidence/" . rawurlencode($file);
    $safe_name = htmlspecialchars($file, ENT_QUOTES, 'UTF-8');

    if (preg_match('/\.(jpg|jpeg|png|webp)$/i', $file)) {
        return '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">' .
               '<img src="' . $url . '" alt="' . $safe_name . '" style="max-width:120px; max-height:120px;" class="rounded border">' .
               '</a>';
    }

    if (preg_match('/\.pdf$/i', $file)) {
        return '<a class="btn btn-sm btn-outline-primary" href="' . $url . '" target="_blank" rel="noopener noreferrer">' .
               '<i class="fas fa-file-pdf me-1"></i> View PDF</a>';
    }

    return $safe_name;
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

// 4. Fetch Current Live Data
$current_data = [];
if ($entity_id) {
    $entity_pk_map = [
        'staff' => 'staff_id',
        'publication' => 'publication_id',
        'qualification' => 'qualification_id',
        'course' => 'course_id',
        'grant_project' => 'project_id',
        'supervision' => 'supervision_id',
        'external_profile' => 'profile_id',
        'professional_membership' => 'membership_id',
        'research_area' => 'research_area_id',
        'staff_course' => 'staff_course_id'
    ];

    if (isset($entity_pk_map[$entity_type])) {
        $pk_column = $entity_pk_map[$entity_type];
        try {
            $stmt2 = $pdo->prepare("SELECT * FROM {$entity_type} WHERE {$pk_column} = ?");
            $stmt2->execute([$entity_id]);
            $row = $stmt2->fetch();
            $current_data = is_array($row) ? $row : [];
        } catch (Throwable $e) {
            $current_data = [];
        }
    }
}
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h2 class="h3 mb-0 text-dark">Review Change Request #<?= $request['log_id'] ?></h2>
    <a href="?page=dashboard" class="btn btn-sm btn-outline-secondary">
        <i class="fas fa-arrow-left me-1"></i> Back to Dashboard
    </a>
</div>

<div class="row g-4">
    <div class="col-lg-4">
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white fw-bold py-3">
                <i class="fas fa-user-circle me-2 text-primary"></i> Requester Info
            </div>
            <div class="card-body text-center pt-4">
                <img src="<?= $request['profile_photo'] ? '../uploads/'.$request['profile_photo'] : 'https://ui-avatars.com/api/?name='.urlencode($request['first_name']).'&background=random' ?>" 
                     class="rounded-circle mb-3 border" width="80" height="80">
                <h5 class="mb-0"><?= htmlspecialchars($request['first_name'] . ' ' . $request['last_name']) ?></h5>
                <small class="text-muted"><?= htmlspecialchars($request['staff_number'] ?? 'N/A') ?></small>
                <hr>
                <div class="d-flex justify-content-between text-start small mb-2">
                    <span class="text-muted">Username:</span>
                    <span class="fw-bold"><?= htmlspecialchars($request['username']) ?></span>
                </div>
                <div class="d-flex justify-content-between text-start small">
                    <span class="text-muted">Submitted:</span>
                    <span class="fw-bold"><?= date('M d, Y h:i A', strtotime($request['timestamp'])) ?></span>
                </div>
            </div>
        </div>

        <div class="card shadow-sm">
            <div class="card-body">
                <h6 class="text-muted text-uppercase small fw-bold mb-3">Context</h6>
                <div class="d-flex align-items-center mb-3">
                    <div class="bg-light p-2 rounded me-3 text-primary"><i class="fas fa-database"></i></div>
                    <div>
                        <small class="text-muted d-block">Entity</small>
                        <span class="fw-bold text-capitalize"><?= $request['entity_name'] ?></span>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <div class="bg-light p-2 rounded me-3 text-<?= $request['action'] == 'DELETE' ? 'danger' : 'success' ?>"><i class="fas fa-exchange-alt"></i></div>
                    <div>
                        <small class="text-muted d-block">Action</small>
                        <span class="badge bg-<?= $request['action'] == 'DELETE' ? 'danger' : ($request['action'] == 'UPDATE' ? 'info' : 'success') ?>">
                            <?= $request['action'] ?>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-lg-8">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <span class="fw-bold"><i class="fas fa-table me-2 text-primary"></i> Data Comparison</span>
                <span class="badge bg-warning text-dark">Pending Approval</span>
            </div>
            
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
                        <?php if (empty($new_data)): ?>
                        <tr>
                            <td colspan="3" class="text-center text-muted py-4">No proposed change payload available for this request.</td>
                        </tr>
                        <?php else: ?>
                        <?php foreach ($new_data as $key => $new_val): 
                            $field_label = ucwords(str_replace('_', ' ', $key));
                            $old_val = $current_data[$key] ?? null;
                            $old_norm = is_scalar($old_val) || $old_val === null ? (string)($old_val ?? '') : json_encode($old_val);
                            $new_norm = is_scalar($new_val) || $new_val === null ? (string)($new_val ?? '') : json_encode($new_val);
                            $old_display = resolveDisplayValue($pdo, (string)$key, $old_val);
                            $new_display = resolveDisplayValue($pdo, (string)$key, $new_val);
                            $is_diff = (trim($old_norm) !== trim($new_norm));
                        ?>
                        <tr class="<?= $is_diff ? 'bg-light' : '' ?>">
                            <td class="ps-4 fw-medium text-secondary"><?= $field_label ?></td>
                            <td class="text-muted small">
                                <?php if ($key === 'evidence_file'): ?>
                                    <?= (empty($old_val) && $old_val !== '0') ? '<em>N/A</em>' : renderEvidenceCell($old_val) ?>
                                <?php else: ?>
                                    <?= (empty($old_display) && $old_display !== '0') ? '<em>N/A</em>' : htmlspecialchars(substr((string)$old_display, 0, 80)) ?>
                                <?php endif; ?>
                            </td>
                            <td class="<?= $is_diff ? 'fw-bold text-dark' : '' ?>">
                                <?php if($is_diff): ?><i class="fas fa-pen-fancy text-primary small me-1"></i><?php endif; ?>
                                <?php if ($key === 'evidence_file'): ?>
                                    <?= renderEvidenceCell($new_val) ?>
                                <?php else: ?>
                                    <?= (empty($new_display) && $new_display !== '0') ? '<em class="text-muted">Empty</em>' : htmlspecialchars((string)$new_display) ?>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <div class="card-footer bg-white p-4 border-top">
                <form action="actions/admin_approve_core.php" method="POST">
                    <input type="hidden" name="log_id" value="<?= $request['log_id'] ?>">
                    <div class="mb-3">
                        <label class="form-label small mb-1">Rejection Reason (required only when rejecting)</label>
                        <textarea name="rejection_reason" class="form-control" rows="2" placeholder="State why this request is being rejected..."></textarea>
                    </div>
                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-outline-secondary px-4" onclick="history.back()">Cancel</button>
                        <button type="submit" name="action" value="reject" class="btn btn-outline-danger" onclick="return confirm('Reject this change?');">
                            Reject
                        </button>
                        <button type="submit" name="action" value="approve" class="btn btn-success px-5 fw-bold">
                            Approve & Publish
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
