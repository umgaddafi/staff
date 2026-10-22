<?php
// admin/colleges.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (isset($_POST['add_college'])) {
            $name = trim($_POST['name'] ?? '');
            if ($name === '') {
                $_SESSION['msg'] = "College/Faculty name is required.";
                $_SESSION['msg_type'] = "danger";
            } else {
                $stmt = $pdo->prepare("INSERT INTO college (name) VALUES (?)");
                $stmt->execute([$name]);
                $_SESSION['msg'] = "College/Faculty created successfully.";
                $_SESSION['msg_type'] = "success";
            }
        }

        if (isset($_POST['update_college'])) {
            $college_id = (int)($_POST['college_id'] ?? 0);
            $name = trim($_POST['name'] ?? '');
            if ($college_id <= 0 || $name === '') {
                $_SESSION['msg'] = "Invalid college update request.";
                $_SESSION['msg_type'] = "danger";
            } else {
                $stmt = $pdo->prepare("UPDATE college SET name = ? WHERE college_id = ?");
                $stmt->execute([$name, $college_id]);
                $_SESSION['msg'] = "College/Faculty updated successfully.";
                $_SESSION['msg_type'] = "success";
            }
        }
    } catch (PDOException $e) {
        $_SESSION['msg'] = "Database Error: " . $e->getMessage();
        $_SESSION['msg_type'] = "danger";
    }

    echo "<script>window.location.href='index.php?page=colleges';</script>";
    return;
}

if (isset($_GET['delete'])) {
    $college_id = (int)$_GET['delete'];
    try {
        $stmt = $pdo->prepare("DELETE FROM college WHERE college_id = ?");
        $stmt->execute([$college_id]);
        $_SESSION['msg'] = "College/Faculty deleted successfully.";
        $_SESSION['msg_type'] = "success";
    } catch (PDOException $e) {
        $_SESSION['msg'] = "Unable to delete college/faculty. It may be linked to existing departments.";
        $_SESSION['msg_type'] = "danger";
    }

    echo "<script>window.location.href='index.php?page=colleges';</script>";
    return;
}

$colleges = $pdo->query("SELECT college_id, name FROM college ORDER BY name ASC")->fetchAll();
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
    <h4 class="fw-bold text-dark mb-0">College / Faculty Management</h4>
    <button class="btn btn-admin" data-bs-toggle="modal" data-bs-target="#addCollegeModal">
        <i class="fas fa-plus me-2"></i> Add College/Faculty
    </button>
</div>

<div class="card shadow-sm border-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-secondary small text-uppercase">
                <tr>
                    <th class="ps-4 py-3">College / Faculty Name</th>
                    <th class="text-end pe-4 py-3">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($colleges)): ?>
                    <tr><td colspan="2" class="text-center py-5 text-muted">No colleges/faculties found.</td></tr>
                <?php else: ?>
                    <?php foreach ($colleges as $c): ?>
                        <tr>
                            <td class="ps-4">
                                <div class="fw-bold text-dark"><?= htmlspecialchars($c['name']) ?></div>
                            </td>
                            <td class="text-end pe-4">
                                <button
                                    class="btn btn-sm btn-light text-primary me-1 edit-college-btn"
                                    data-id="<?= (int)$c['college_id'] ?>"
                                    data-name="<?= htmlspecialchars($c['name']) ?>"
                                    data-bs-toggle="modal"
                                    data-bs-target="#editCollegeModal"
                                >
                                    <i class="fas fa-edit"></i>
                                </button>
                                <a
                                    class="btn btn-sm btn-light text-danger"
                                    href="index.php?page=colleges&delete=<?= (int)$c['college_id'] ?>"
                                    onclick="return confirm('Delete this college/faculty?');"
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

<div class="modal fade" id="addCollegeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <form method="POST" class="modal-content border-0 shadow">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">Add College/Faculty</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-0">
                    <label class="form-label">College / Faculty Name</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" name="add_college" class="btn btn-admin">Save</button>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="editCollegeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <form method="POST" class="modal-content border-0 shadow">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">Edit College/Faculty</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="college_id" id="edit_college_id_input">
                <div class="mb-0">
                    <label class="form-label">College / Faculty Name</label>
                    <input type="text" class="form-control" name="name" id="edit_college_name_input" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" name="update_college" class="btn btn-admin">Update</button>
            </div>
        </form>
    </div>
</div>

<script>
document.querySelectorAll('.edit-college-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.getElementById('edit_college_id_input').value = this.dataset.id;
        document.getElementById('edit_college_name_input').value = this.dataset.name;
    });
});
</script>
