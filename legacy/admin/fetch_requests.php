<?php
// admin/fetch_requests.php
require_once '../config/db.php';

$status_filter = $_GET['status'] ?? '';
$action_filter = $_GET['action'] ?? '';

$params = [];
$where_clauses = [];

if (!empty($status_filter)) {
    $where_clauses[] = "cl.status = ?";
    $params[] = $status_filter;
}
if (!empty($action_filter)) {
    $where_clauses[] = "cl.action = ?";
    $params[] = $action_filter;
}

$where_sql = !empty($where_clauses) ? "WHERE " . implode(" AND ", $where_clauses) : "";

$sql = "SELECT cl.*, s.first_name, s.last_name 
        FROM change_log cl 
        LEFT JOIN user_account ua ON cl.user_id = ua.user_id
        LEFT JOIN staff s ON ua.staff_id = s.staff_id
        $where_sql
        ORDER BY cl.timestamp DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

if ($stmt->rowCount() === 0): ?>
    <tr><td colspan="6" class="text-center py-5">No requests found matching filters.</td></tr>
<?php else: 
    while($row = $stmt->fetch()): ?>
    <tr>
        <td class="ps-4"><div class="fw-bold text-dark"><?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?></div></td>
        <td class="text-capitalize small text-muted"><?= htmlspecialchars($row['entity_name']) ?></td>
        <td>
            <span class="badge bg-opacity-10 <?= $row['action'] === 'DELETE' ? 'bg-danger text-danger' : 'bg-info text-info' ?> border">
                <?= $row['action'] ?>
            </span>
        </td>
        <td class="text-muted small"><?= date('M d, Y', strtotime($row['timestamp'])) ?></td>
        <td><span class="badge <?= $row['status'] === 'Pending' ? 'bg-warning text-dark' : ($row['status'] === 'Approved' ? 'bg-success' : 'bg-danger') ?>"><?= $row['status'] ?></span></td>
        <td class="text-end pe-4">
            <a href="?page=review&id=<?= $row['log_id'] ?>" class="btn btn-sm btn-light border text-primary"><i class="fas fa-eye"></i> Review</a>
        </td>
    </tr>
<?php endwhile; endif; ?>