<?php
// admin/ranks.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (isset($_POST['add_rank'])) {
            $rank_name = trim((string)($_POST['rank_name'] ?? ''));
            $rank_level = (int)($_POST['rank_level'] ?? 0);

            if ($rank_name === '') {
                $_SESSION['msg'] = "Rank name is required.";
                $_SESSION['msg_type'] = "danger";
            } else {
                $stmt = $pdo->prepare("INSERT INTO academic_rank (rank_name, rank_level) VALUES (?, ?)");
                $stmt->execute([$rank_name, $rank_level]);
                $_SESSION['msg'] = "Rank created successfully.";
                $_SESSION['msg_type'] = "success";
            }
        }

        if (isset($_POST['update_rank'])) {
            $rank_id = (int)($_POST['rank_id'] ?? 0);
            $rank_name = trim((string)($_POST['rank_name'] ?? ''));
            $rank_level = (int)($_POST['rank_level'] ?? 0);

            if ($rank_id <= 0 || $rank_name === '') {
                $_SESSION['msg'] = "Invalid rank update request.";
                $_SESSION['msg_type'] = "danger";
            } else {
                $stmt = $pdo->prepare("UPDATE academic_rank SET rank_name = ?, rank_level = ? WHERE rank_id = ?");
                $stmt->execute([$rank_name, $rank_level, $rank_id]);
                $_SESSION['msg'] = "Rank updated successfully.";
                $_SESSION['msg_type'] = "success";
            }
        }
    } catch (PDOException $e) {
        if ((int)$e->getCode() === 23000) {
            $_SESSION['msg'] = "Duplicate rank name is not allowed.";
        } else {
            $_SESSION['msg'] = "Database Error: " . $e->getMessage();
        }
        $_SESSION['msg_type'] = "danger";
    }

    echo "<script>window.location.href='index.php?page=ranks';</script>";
    return;
}

if (isset($_GET['delete'])) {
    $rank_id = (int)$_GET['delete'];
    try {
        $stmt = $pdo->prepare("DELETE FROM academic_rank WHERE rank_id = ?");
        $stmt->execute([$rank_id]);
        $_SESSION['msg'] = "Rank deleted successfully.";
        $_SESSION['msg_type'] = "success";
    } catch (PDOException $e) {
        $_SESSION['msg'] = "Unable to delete this rank. It may be linked to staff records.";
        $_SESSION['msg_type'] = "danger";
    }

    echo "<script>window.location.href='index.php?page=ranks';</script>";
    return;
}

$ranks = $pdo->query("SELECT rank_id, rank_name, rank_level FROM academic_rank ORDER BY rank_level ASC, rank_name ASC")->fetchAll();
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
    <h4 class="fw-bold text-dark mb-0">Academic Rank Management</h4>
    <button class="btn btn-admin" data-bs-toggle="modal" data-bs-target="#addRankModal">
        <i class="fas fa-plus me-2"></i> Add Rank
    </button>
</div>

<div class="card shadow-sm border-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-secondary small text-uppercase">
                <tr>
                    <th class="ps-4 py-3">Rank Name</th>
                    <th class="py-3">Level</th>
                    <th class="text-end pe-4 py-3">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($ranks)): ?>
                    <tr><td colspan="3" class="text-center py-5 text-muted">No ranks found.</td></tr>
                <?php else: ?>
                    <?php foreach ($ranks as $r): ?>
                        <tr>
                            <td class="ps-4">
                                <div class="fw-bold text-dark"><?= htmlspecialchars($r['rank_name']) ?></div>
                            </td>
                            <td><span class="badge bg-light text-dark border"><?= (int)$r['rank_level'] ?></span></td>
                            <td class="text-end pe-4">
                                <button
                                    class="btn btn-sm btn-light text-primary me-1 edit-rank-btn"
                                    data-id="<?= (int)$r['rank_id'] ?>"
                                    data-name="<?= htmlspecialchars($r['rank_name']) ?>"
                                    data-level="<?= (int)$r['rank_level'] ?>"
                                    data-bs-toggle="modal"
                                    data-bs-target="#editRankModal"
                                >
                                    <i class="fas fa-edit"></i>
                                </button>
                                <a
                                    class="btn btn-sm btn-light text-danger"
                                    href="index.php?page=ranks&delete=<?= (int)$r['rank_id'] ?>"
                                    onclick="return confirm('Delete this rank?');"
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

<div class="modal fade" id="addRankModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <form method="POST" class="modal-content border-0 shadow">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">Add Academic Rank</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">Rank Name</label>
                    <input type="text" class="form-control" name="rank_name" required placeholder="e.g. Professor, VC, Registrar">
                </div>
                <div class="mb-0">
                    <label class="form-label">Rank Level</label>
                    <input type="number" class="form-control" name="rank_level" min="0" value="0">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" name="add_rank" class="btn btn-admin">Save Rank</button>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="editRankModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <form method="POST" class="modal-content border-0 shadow">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">Edit Academic Rank</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="rank_id" id="edit_rank_id_input">
                <div class="mb-3">
                    <label class="form-label">Rank Name</label>
                    <input type="text" class="form-control" name="rank_name" id="edit_rank_name_input" required>
                </div>
                <div class="mb-0">
                    <label class="form-label">Rank Level</label>
                    <input type="number" class="form-control" name="rank_level" id="edit_rank_level_input" min="0">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" name="update_rank" class="btn btn-admin">Update Rank</button>
            </div>
        </form>
    </div>
</div>

<script>
document.querySelectorAll('.edit-rank-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.getElementById('edit_rank_id_input').value = this.dataset.id;
        document.getElementById('edit_rank_name_input').value = this.dataset.name;
        document.getElementById('edit_rank_level_input').value = this.dataset.level;
    });
});
</script>

