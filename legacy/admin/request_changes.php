<?php
// admin/request_changes.php
$search = trim($_GET['search'] ?? '');

$sql = "
    SELECT
        s.staff_id,
        s.first_name,
        s.last_name,
        s.staff_number,
        COUNT(cl.log_id) AS total_requests,
        SUM(CASE WHEN cl.status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests,
        MAX(cl.timestamp) AS last_request_at
    FROM change_log cl
    JOIN user_account ua ON cl.user_id = ua.user_id
    JOIN staff s ON ua.staff_id = s.staff_id
";

$params = [];
if ($search !== '') {
    $sql .= " WHERE s.first_name LIKE ? OR s.last_name LIKE ? OR s.staff_number LIKE ? ";
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

$sql .= "
    GROUP BY s.staff_id, s.first_name, s.last_name, s.staff_number
    ORDER BY last_request_at DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();
?>

<?php if (isset($_SESSION['msg'])): ?>
    <div id="session-alert" class="alert alert-<?= $_SESSION['msg_type'] ?? 'info'; ?> alert-dismissible fade show border-0 shadow-sm mb-4" role="alert">
        <div class="d-flex align-items-center">
            <?php if (($_SESSION['msg_type'] ?? '') === 'success'): ?>
                <i class="fas fa-check-circle me-2"></i>
            <?php elseif (($_SESSION['msg_type'] ?? '') === 'danger'): ?>
                <i class="fas fa-exclamation-triangle me-2"></i>
            <?php else: ?>
                <i class="fas fa-info-circle me-2"></i>
            <?php endif; ?>
            <div><?= $_SESSION['msg']; ?></div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    <?php unset($_SESSION['msg'], $_SESSION['msg_type']); ?>
<?php endif; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold text-dark mb-0">Change Requests</h4>
</div>

<div class="card mb-4 border-0 shadow-sm">
    <div class="card-body">
        <form method="GET" class="row g-3">
            <input type="hidden" name="page" value="requests">
            <div class="col-md-10">
                <label class="small fw-bold text-muted mb-1">Search Staff Name / PF Number</label>
                <div class="input-group">
                    <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted"></i></span>
                    <input type="text" name="search" class="form-control border-0 bg-light" value="<?= htmlspecialchars($search) ?>" placeholder="e.g. Jane or UNIV/2024/001">
                </div>
            </div>
            <div class="col-md-2 d-flex align-items-end">
                <button type="submit" class="btn btn-admin w-100">Filter</button>
            </div>
        </form>
    </div>
</div>

<div class="card shadow-sm border-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-secondary small text-uppercase">
                <tr>
                    <th class="ps-4 py-3">Staff Name</th>
                    <th class="py-3">PF Number</th>
                    <th class="py-3">Pending</th>
                    <th class="py-3">Last Request</th>
                    <th class="text-end pe-4 py-3">Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($rows)): ?>
                    <tr>
                        <td colspan="5" class="text-center py-5 text-muted">No staff request records found.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($rows as $row): ?>
                        <tr>
                            <td class="ps-4">
                                <div class="fw-bold text-dark"><?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?></div>
                            </td>
                            <td><?= htmlspecialchars($row['staff_number']) ?></td>
                            <td>
                                <span class="badge <?= ((int)$row['pending_requests'] > 0) ? 'bg-warning text-dark' : 'bg-success' ?>">
                                    <?= (int)$row['pending_requests'] ?>
                                </span>
                            </td>
                            <td class="text-muted small"><?= htmlspecialchars(date('M d, Y h:i A', strtotime($row['last_request_at']))) ?></td>
                            <td class="text-end pe-4">
                                <a href="?page=request_history&staff_id=<?= (int)$row['staff_id'] ?>" class="btn btn-sm btn-admin">
                                    <i class="fas fa-eye me-1"></i> View
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>