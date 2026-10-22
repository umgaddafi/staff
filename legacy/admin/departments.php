<?php
// admin/departments.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Handle create/update/delete actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (isset($_POST['add_department'])) {
            $name = trim($_POST['name'] ?? '');
            $college_id = (int)($_POST['college_id'] ?? 0);

            if ($name === '' || $college_id <= 0) {
                $_SESSION['msg'] = "Department name and college are required.";
                $_SESSION['msg_type'] = "danger";
            } else {
                $stmt = $pdo->prepare("INSERT INTO department (name, college_id) VALUES (?, ?)");
                $stmt->execute([$name, $college_id]);
                $_SESSION['msg'] = "Department created successfully.";
                $_SESSION['msg_type'] = "success";
            }
        }

        if (isset($_POST['update_department'])) {
            $department_id = (int)($_POST['department_id'] ?? 0);
            $name = trim($_POST['name'] ?? '');
            $college_id = (int)($_POST['college_id'] ?? 0);

            if ($department_id <= 0 || $name === '' || $college_id <= 0) {
                $_SESSION['msg'] = "Invalid department update request.";
                $_SESSION['msg_type'] = "danger";
            } else {
                $stmt = $pdo->prepare("UPDATE department SET name = ?, college_id = ? WHERE department_id = ?");
                $stmt->execute([$name, $college_id, $department_id]);
                $_SESSION['msg'] = "Department updated successfully.";
                $_SESSION['msg_type'] = "success";
            }
        }
    } catch (PDOException $e) {
        $_SESSION['msg'] = "Database Error: " . $e->getMessage();
        $_SESSION['msg_type'] = "danger";
    }

    echo "<script>window.location.href='index.php?page=departments';</script>";
    return;
}

if (isset($_GET['delete'])) {
    $department_id = (int)$_GET['delete'];
    try {
        $stmt = $pdo->prepare("DELETE FROM department WHERE department_id = ?");
        $stmt->execute([$department_id]);
        $_SESSION['msg'] = "Department deleted successfully.";
        $_SESSION['msg_type'] = "success";
    } catch (PDOException $e) {
        $_SESSION['msg'] = "Unable to delete department. It may be linked to existing staff records.";
        $_SESSION['msg_type'] = "danger";
    }

    echo "<script>window.location.href='index.php?page=departments';</script>";
    return;
}

$colleges = $pdo->query("SELECT college_id, name FROM college ORDER BY name ASC")->fetchAll();
$departments = $pdo->query("
    SELECT d.department_id, d.name AS department_name, c.name AS college_name, d.college_id
    FROM department d
    LEFT JOIN college c ON d.college_id = c.college_id
    ORDER BY d.name ASC
")->fetchAll();
?>

<?php if (isset($_SESSION['msg'])): ?>
    <div id="session-alert" class="alert alert-<?= $_SESSION['msg_type']; ?> alert-dismissible fade show border-0 shadow-sm mb-4" role="alert">
        <div class="d-flex align-items-center">
            <?php if ($_SESSION['msg_type'] === 'success'): ?>
                <i class="fas fa-check-circle me-2"></i>
            <?php else: ?>
                <i class="fas fa-exclamation-circle me-2"></i>
            <?php endif; ?>
            <div><?= $_SESSION['msg']; ?></div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    <?php unset($_SESSION['msg'], $_SESSION['msg_type']); ?>
<?php endif; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold text-dark mb-0">Department Management</h4>
    <button class="btn btn-admin" data-bs-toggle="modal" data-bs-target="#addDepartmentModal">
        <i class="fas fa-plus me-2"></i> Add Department
    </button>
</div>

<div class="card shadow-sm border-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-secondary small text-uppercase">
                <tr>
                    <th class="ps-4 py-3">Department</th>
                    <th class="py-3">College</th>
                    <th class="text-end pe-4 py-3">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($departments)): ?>
                    <tr><td colspan="3" class="text-center py-5 text-muted">No departments found.</td></tr>
                <?php else: ?>
                    <?php foreach ($departments as $d): ?>
                        <tr>
                            <td class="ps-4">
                                <div class="fw-bold text-dark"><?= htmlspecialchars($d['department_name']) ?></div>
                            </td>
                            <td><?= htmlspecialchars($d['college_name'] ?? 'N/A') ?></td>
                            <td class="text-end pe-4">
                                <button
                                    class="btn btn-sm btn-light text-primary me-1 edit-dept-btn"
                                    data-id="<?= (int)$d['department_id'] ?>"
                                    data-name="<?= htmlspecialchars($d['department_name']) ?>"
                                    data-college-id="<?= (int)$d['college_id'] ?>"
                                    data-bs-toggle="modal"
                                    data-bs-target="#editDepartmentModal"
                                >
                                    <i class="fas fa-edit"></i>
                                </button>
                                <a
                                    class="btn btn-sm btn-light text-danger"
                                    href="index.php?page=departments&delete=<?= (int)$d['department_id'] ?>"
                                    onclick="return confirm('Delete this department?');"
                                >
                                    <i class="fas fa-trash-alt"></i>
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<div class="modal fade" id="addDepartmentModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <form method="POST" class="modal-content border-0 shadow">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">Add Department</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">College</label>
                    <select class="form-select" name="college_id" required>
                        <option value="">Select College</option>
                        <?php foreach ($colleges as $c): ?>
                            <option value="<?= (int)$c['college_id'] ?>"><?= htmlspecialchars($c['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="mb-0">
                    <label class="form-label">Department Name</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" name="add_department" class="btn btn-admin">Save Department</button>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="editDepartmentModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <form method="POST" class="modal-content border-0 shadow">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">Edit Department</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="department_id" id="edit_department_id">
                <div class="mb-3">
                    <label class="form-label">College</label>
                    <select class="form-select" name="college_id" id="edit_college_id" required>
                        <option value="">Select College</option>
                        <?php foreach ($colleges as $c): ?>
                            <option value="<?= (int)$c['college_id'] ?>"><?= htmlspecialchars($c['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="mb-0">
                    <label class="form-label">Department Name</label>
                    <input type="text" class="form-control" name="name" id="edit_department_name" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" name="update_department" class="btn btn-admin">Update Department</button>
            </div>
        </form>
    </div>
</div>

<script>
document.querySelectorAll('.edit-dept-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.getElementById('edit_department_id').value = this.dataset.id;
        document.getElementById('edit_department_name').value = this.dataset.name;
        document.getElementById('edit_college_id').value = this.dataset.collegeId;
    });
});
</script>
