<?php
// Note: session_start() is already called in index.php, so we don't need it here.
// But we do need to ensure we are authenticated if this file is accessed directly (optional security)
if (!defined('ABSPATH') && !isset($_SESSION)) { 
    // This prevents direct access to this file without index.php (optional)
    // exit('Direct access not allowed'); 
}

require_once '../config/db.php'; // Use require_once to avoid double loading
$staff_id = $_SESSION['staff_id'] ?? ($staff_id ?? null); // Assumes session is set in index.php
$current_year = date('Y');

// Handle Logic (Same as before, but redirects changed)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_grant'])) {
    $cleanAmount = filter_var($_POST['amount'], FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    $stmt = $pdo->prepare("INSERT INTO grant_project (staff_id, title, sponsor, amount, start_year, end_year) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$staff_id, $_POST['title'], $_POST['sponsor'], $cleanAmount, $_POST['start'], $_POST['end']]);
    
    // IMPORTANT: Redirect to the ?page= URL, not the file directly
    echo "<script>window.location.href='?page=grants&status=success';</script>";
    exit;
}

if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM grant_project WHERE project_id = ? AND staff_id = ?");
    $stmt->execute([$_GET['del'], $staff_id]);
    echo "<script>window.location.href='?page=grants&status=deleted';</script>";
    exit;
}

$grants = $pdo->prepare("SELECT * FROM grant_project WHERE staff_id = ? ORDER BY start_year DESC");
$grants->execute([$staff_id]);

$total_funding = $pdo->prepare("SELECT SUM(amount) FROM grant_project WHERE staff_id = ?");
$total_funding->execute([$staff_id]);
$sum = $total_funding->fetchColumn();
?>

<style>
    .grant-card { border: none; border-radius: 12px; background: #fff; transition: all 0.2s ease; border-left: 5px solid var(--uni-gold); }
    .grant-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    .amount-display { color: #198754; font-family: 'Ubuntu', sans-serif; font-weight: 700; }
    .stat-banner { background: var(--shell-brown); color: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .status-pill { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 50px; }
</style>

<div class="stat-banner d-flex justify-content-between align-items-center shadow-sm">
    <div>
        <h6 class="text-white-50 mb-1">Total Research Funding Secured</h6>
        <h2 class="fw-bold mb-0">₦ <?= number_format($sum, 2) ?></h2>
    </div>
    <button class="btn btn-navy fw-bold px-4" data-bs-toggle="modal" data-bs-target="#grantModal">
        <i class="fas fa-plus-circle me-2"></i> Register New Grant
    </button>
</div>

<?php if(isset($_GET['status'])): ?>
    <div class="alert alert-success border-0 shadow-sm fade show mb-4">
        <i class="fas fa-check-circle me-2"></i> 
        <?= $_GET['status'] == 'success' ? 'Grant added successfully.' : 'Record deleted successfully.' ?>
    </div>
<?php endif; ?>

<h4 class="fw-bold mb-4 text-dark">Project Portfolio</h4>

<?php if($grants->rowCount() == 0): ?>
    <div class="card p-5 text-center border-0 shadow-sm bg-white">
        <div class="text-muted opacity-50 mb-3"><i class="fas fa-folder-open fa-4x"></i></div>
        <h5 class="text-muted">No research projects recorded yet.</h5>
    </div>
<?php endif; ?>

<div class="row g-3">
    <?php while($g = $grants->fetch()): 
        $isActive = ($current_year <= $g['end_year']);
    ?>
    <div class="col-12">
        <div class="card grant-card shadow-sm">
            <div class="card-body p-3">
                <div class="row align-items-center">
                    <div class="col-md-7">
                        <div class="d-flex align-items-center mb-1">
                            <span class="status-pill me-2 <?= $isActive ? 'bg-success text-white' : 'bg-secondary text-white' ?>">
                                <?= $isActive ? 'Active' : 'Completed' ?>
                            </span>
                            <small class="text-muted" style="font-size:0.8rem"><?= $g['start_year'] ?> — <?= $g['end_year'] ?></small>
                        </div>
                        <h5 class="fw-bold text-dark mb-1"><?= htmlspecialchars($g['title']) ?></h5>
                        <p class="mb-0 small"><span class="text-muted">Sponsor:</span> <span class="fw-bold text-dark"><?= htmlspecialchars($g['sponsor']) ?></span></p>
                    </div>
                    <div class="col-md-3 text-md-end border-start border-light">
                        <h5 class="amount-display mb-0">₦ <?= number_format($g['amount'], 2) ?></h5>
                    </div>
                    <div class="col-md-2 text-end">
                        <a href="?page=grants&del=<?= $g['project_id'] ?>" 
                            class="btn btn-light btn-sm text-danger" 
                            onclick="return confirm('Remove this grant?')">
                            <i class="fas fa-trash-alt"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endwhile; ?>
</div>

<div class="modal fade" id="grantModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <form method="POST" class="modal-content">
            <div class="modal-header bg-navy text-white">
                <h5 class="modal-title fw-bold">Add Research Project</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold small">Project Title</label>
                    <input type="text" name="title" class="form-control" required>
                </div>
                <div class="row g-3 mb-3">
                    <div class="col-md-8">
                        <label class="form-label fw-bold small">Sponsor</label>
                        <input type="text" name="sponsor" class="form-control" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label fw-bold small">Amount (₦)</label>
                        <input type="text" name="amount" class="form-control" placeholder="0.00" required>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Start Year</label>
                        <input type="number" name="start" class="form-control" value="<?= date('Y') ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">End Year</label>
                        <input type="number" name="end" class="form-control" value="<?= date('Y')+1 ?>" required>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="submit" name="add_grant" class="btn btn-navy w-100">Save Grant</button>
            </div>
        </form>
    </div>
</div>
