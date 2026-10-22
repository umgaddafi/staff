<?php
// admin/fetch_staff.php
require_once '../config/db.php';

$search = $_GET['search'] ?? '';
$dept_filter = $_GET['department_id'] ?? '';
$rank_filter = $_GET['rank_id'] ?? '';
$role_filter = $_GET['role'] ?? ''; // Get the new filter

$params = [];
$where_clauses = ["(s.first_name LIKE ? OR s.last_name LIKE ? OR s.email LIKE ?)"];
$params[] = "%$search%";
$params[] = "%$search%";
$params[] = "%$search%";

if (!empty($dept_filter)) {
    $where_clauses[] = "s.department_id = ?";
    $params[] = $dept_filter;
}

if (!empty($rank_filter)) {
    $where_clauses[] = "s.rank_id = ?";
    $params[] = $rank_filter;
}

// Handle Role Filtering
if ($role_filter === 'NULL') {
    $where_clauses[] = "ua.role IS NULL";
} elseif (!empty($role_filter)) {
    $where_clauses[] = "ua.role = ?";
    $params[] = $role_filter;
}

$where_sql = "WHERE " . implode(" AND ", $where_clauses);

$sql = "SELECT s.*, d.name as dept_name, r.rank_name, ua.role 
        FROM staff s 
        LEFT JOIN department d ON s.department_id = d.department_id
        LEFT JOIN academic_rank r ON s.rank_id = r.rank_id
        LEFT JOIN user_account ua ON s.staff_id = ua.staff_id
        $where_sql
        ORDER BY s.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

if ($stmt->rowCount() === 0): ?>
    <tr><td colspan="5" class="text-center py-5 text-muted">No staff members found.</td></tr>
<?php else: 
    while($row = $stmt->fetch()): ?>
    <tr>
        <td class="ps-4">
            <div class="fw-bold text-dark"><?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?></div>
            <div class="small text-muted"><?= htmlspecialchars($row['email']) ?></div>
        </td>
        <td>
            <?php if ($row['role']): ?>
                <span class="badge rounded-pill bg-light text-dark border">
                    <i class="fas fa-user-shield me-1 text-secondary small"></i>
                    <?= htmlspecialchars($row['role']) ?>
                </span>
            <?php else: ?>
                <span class="text-muted small">No Account</span>
            <?php endif; ?>
        </td>
        <td><span class="badge bg-info bg-opacity-10 text-info border border-info"><?= htmlspecialchars($row['rank_name']) ?></span></td>
        <td class="text-dark"><?= htmlspecialchars($row['dept_name']) ?></td>
        <td class="text-end pe-4">
            <button class="btn btn-sm btn-light text-danger delete-staff-btn" 
                    data-id="<?= $row['staff_id'] ?>" 
                    data-name="<?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?>">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    </tr>
<?php endwhile; endif; ?>







<!-- <?php
// admin/fetch_staff.php
require_once '../config/db.php';

$search = $_GET['search'] ?? '';
$dept_filter = $_GET['department_id'] ?? '';
$rank_filter = $_GET['rank_id'] ?? '';

$params = [];
$where_clauses = ["(s.first_name LIKE ? OR s.last_name LIKE ? OR s.email LIKE ?)"];
$params[] = "%$search%";
$params[] = "%$search%";
$params[] = "%$search%";

if (!empty($dept_filter)) {
    $where_clauses[] = "s.department_id = ?";
    $params[] = $dept_filter;
}

if (!empty($rank_filter)) {
    $where_clauses[] = "s.rank_id = ?";
    $params[] = $rank_filter;
}

$where_sql = "WHERE " . implode(" AND ", $where_clauses);

$sql = "SELECT s.*, d.name as dept_name, r.rank_name 
        FROM staff s 
        LEFT JOIN department d ON s.department_id = d.department_id
        LEFT JOIN academic_rank r ON s.rank_id = r.rank_id
        $where_sql
        ORDER BY s.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

if ($stmt->rowCount() === 0): ?>
    <tr><td colspan="4" class="text-center py-5 text-muted">No staff members found matching your criteria.</td></tr>
<?php else: 
    while($row = $stmt->fetch()): ?>
    <tr>
        <td class="ps-4">
            <div class="fw-bold text-dark"><?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?></div>
            <div class="small text-muted"><?= htmlspecialchars($row['email']) ?></div>
        </td>
        <td><span class="badge bg-info bg-opacity-10 text-info border border-info"><?= htmlspecialchars($row['rank_name']) ?></span></td>
        <td class="text-dark"><?= htmlspecialchars($row['dept_name']) ?></td>
        <td class="text-end pe-4">
            <button class="btn btn-sm btn-light text-primary" onclick="editStaff(<?= $row['staff_id'] ?>)">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-light text-danger delete-staff-btn" 
                    data-id="<?= $row['staff_id'] ?>" 
                    data-name="<?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?>">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    </tr>
<?php endwhile; endif; ?> -->
