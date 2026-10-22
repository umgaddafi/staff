<?php
// Note: session_start() is already called in index.php, so we don't need it here.
// But we do need to ensure we are authenticated if this file is accessed directly (optional security)
if (!defined('ABSPATH') && !isset($_SESSION)) { 
    // This prevents direct access to this file without index.php (optional)
    // exit('Direct access not allowed'); 
}

require_once '../config/db.php'; // Use require_once to avoid double loading
$staff_id = $_SESSION['staff_id']; // Assumes session is set in index.php
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
    .stat-banner { background: var(--uni-navy); color: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .status-pill { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 50px; }
</style>

<div class="stat-banner d-flex justify-content-between align-items-center shadow-sm">
    <div>
        <h6 class="text-white-50 mb-1">Total Research Funding Secured</h6>
        <h2 class="fw-bold mb-0">₦ <?= number_format($sum, 2) ?></h2>
    </div>
    <button class="btn btn-warning fw-bold px-4" data-bs-toggle="modal" data-bs-target="#grantModal">
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
            <div class="modal-header bg-dark text-white">
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
                <button type="submit" name="add_grant" class="btn btn-primary w-100">Save Grant</button>
            </div>
        </form>
    </div>
</div>








<!-- <?php
session_start();
require '../config/db.php';
// if (!isset($_SESSION['staff_id'])) { header("Location: ../login.php"); exit; }

$staff_id = $_SESSION['staff_id'];
$current_year = date('Y');

// Handle Add Grant
// if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_grant'])) {
//     $stmt = $pdo->prepare("INSERT INTO grant_project (staff_id, title, sponsor, amount, start_year, end_year) VALUES (?,?,?,?,?,?)");
//     $stmt->execute([$staff_id, $_POST['title'], $_POST['sponsor'], $_POST['amount'], $_POST['start'], $_POST['end']]);
//     header("Location: grants.php?status=success"); exit;
// }
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_grant'])) {
    // Sanitize: ensure it's a valid float before DB entry
    $cleanAmount = filter_var($_POST['amount'], FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    
    $stmt = $pdo->prepare("INSERT INTO grant_project (staff_id, title, sponsor, amount, start_year, end_year) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$staff_id, $_POST['title'], $_POST['sponsor'], $cleanAmount, $_POST['start'], $_POST['end']]);
    header("Location: grants.php?status=success"); 
    exit;
}

// Handle Delete
if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM grant_project WHERE project_id = ? AND staff_id = ?");
    $stmt->execute([$_GET['del'], $staff_id]);
    header("Location: grants.php?status=deleted"); exit;
}

$grants = $pdo->prepare("SELECT * FROM grant_project WHERE staff_id = ? ORDER BY start_year DESC");
$grants->execute([$staff_id]);

// Calculate Total Funding for UX "Wow" factor
$total_funding = $pdo->prepare("SELECT SUM(amount) FROM grant_project WHERE staff_id = ?");
$total_funding->execute([$staff_id]);
$sum = $total_funding->fetchColumn();
?>

<?php if(isset($_GET['status'])): ?>
    <div class="container mt-3">
        <?php if($_GET['status'] == 'submitted'): ?>
            <div class="alert alert-info border-0 shadow-sm">
                <i class="fas fa-clock me-2"></i> Grant details submitted for verification. It will be added to your profile once approved.
            </div>
        <?php elseif($_GET['status'] == 'delete_submitted'): ?>
            <div class="alert alert-warning border-0 shadow-sm">
                <i class="fas fa-user-shield me-2"></i> Deletion request sent to administrator for approval.
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Grants & Research Projects | Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --uni-navy: #0d2c56; --uni-gold: #c5a017; --success-green: #198754; }
        body { background-color: #f8f9fa; font-family: 'Ubuntu', sans-serif; }
        .grant-card { border: none; border-radius: 16px; background: #fff; transition: all 0.3s ease; border-left: 6px solid var(--uni-gold); }
        .grant-card:hover { transform: scale(1.01); box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        .amount-display { color: var(--success-green); font-family: 'Ubuntu', sans-serif; font-weight: 800; }
        .stat-banner { background: var(--uni-navy); color: white; border-radius: 15px; padding: 25px; margin-bottom: 30px; }
        .status-pill { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; padding: 5px 12px; border-radius: 50px; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
      

        <main class="col-lg-10 p-4">
            <div class="stat-banner d-flex justify-content-between align-items-center shadow">
                <div>
                    <h5 class="text-white-50 mb-1">Total Research Funding Secured</h5>
                    <h2 class="fw-bold mb-0">₦ <?= number_format($sum, 2) ?></h2>
                </div>
                <button class="btn btn-warning fw-bold px-4" data-bs-toggle="modal" data-bs-target="#grantModal">
                    <i class="fas fa-plus-circle me-2"></i> Register New Grant
                </button>
            </div>

            <h4 class="fw-bold mb-4 text-dark">Project Portfolio</h4>

            <?php if($grants->rowCount() == 0): ?>
                <div class="card p-5 text-center border-0 shadow-sm">
                    <i class="fas fa-hand-holding-dollar fa-4x text-light mb-3"></i>
                    <h4 class="text-muted">No research projects recorded yet.</h4>
                </div>
            <?php endif; ?>

            <div class="row g-4">
                <?php while($g = $grants->fetch()): 
                    $isActive = ($current_year <= $g['end_year']);
                ?>
                <div class="col-12">
                    <div class="card grant-card shadow-sm">
                        <div class="card-body p-4">
                            <div class="row align-items-center">
                                <div class="col-md-7">
                                    <div class="d-flex align-items-center mb-2">
                                        <span class="status-pill me-3 <?= $isActive ? 'bg-success text-white' : 'bg-secondary text-white' ?>">
                                            <?= $isActive ? 'Active' : 'Completed' ?>
                                        </span>
                                        <small class="text-muted"><i class="fas fa-calendar-alt me-1"></i> <?= $g['start_year'] ?> — <?= $g['end_year'] ?></small>
                                    </div>
                                    <h5 class="fw-bold text-dark mb-1"><?= htmlspecialchars($g['title']) ?></h5>
                                    <p class="mb-0"><span class="text-muted">Sponsor:</span> <span class="fw-bold text-navy"><?= htmlspecialchars($g['sponsor']) ?></span></p>
                                </div>
                                <div class="col-md-3 text-md-end">
                                    <h4 class="amount-display mb-0">₦ <?= number_format($g['amount'], 2) ?></h4>
                                    <small class="text-muted uppercase">Allocated Funds</small>
                                </div>
                                <div class="col-md-2 text-end">
                                    <!-- <a href="?del=<?= $g['project_id'] ?>" class="btn btn-outline-danger border-0" onclick="return confirm('Archive this project record?')">
                                        <i class="fas fa-trash-alt"></i>
                                    </a> -->
                                    <a href="./actions/update_grants_core.php?del=<?= $g['grant_id'] ?>" 
                                        class="text-danger" 
                                        onclick="return confirm('Request to remove this grant from your portfolio?')">
                                        <i class="fas fa-trash-alt"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="grantModal" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <!-- <form method="POST" class="modal-content border-0 shadow-lg"> -->
            <form action="./actions/update_grants_core.php" method="POST" class="modal-content">
            <div class="modal-header bg-dark text-white p-4">
                <h5 class="modal-title fw-bold">Add Research Project / Grant</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-4">
                    <label class="form-label fw-bold small">Project Title</label>
                    <textarea name="title" class="form-control" rows="2" placeholder="Enter the full title of the research project..." required></textarea>
                </div>
                <div class="row g-3 mb-4">
                    <div class="col-md-8">
                        <label class="form-label fw-bold small">Funding Agency / Sponsor</label>
                        <input type="text" name="sponsor" class="form-control" placeholder="e.g. TETFund, UNESCO, World Bank" required>
                    </div>
                    <!-- <div class="col-md-4">
                        <label class="form-label fw-bold small">Total Amount (₦)</label>
                        <input type="number" step="0.01" name="amount" class="form-control" placeholder="0.00" required>
                    </div> -->
                    <div class="col-md-4">
                        <label class="form-label fw-bold small text-navy">Total Amount</label>
                        <div class="input-group">
                            <span class="input-group-text bg-light fw-bold">₦</span>
                            <input type="text" id="amount_visual" class="form-control border-2 fw-bold text-success" 
                                placeholder="0.00" oninput="formatCurrency(this)" required>
                            
                            <input type="hidden" name="amount" id="amount_actual">
                        </div>
                        <div id="amount_words" class="form-text mt-1 small text-muted italic"></div>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Start Year</label>
                        <input type="number" name="start" class="form-control" min="1990" max="2099" value="<?= date('Y') ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Expected End Year</label>
                        <input type="number" name="end" class="form-control" min="1990" max="2099" value="<?= date('Y')+1 ?>" required>
                    </div>
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_grant" class="btn btn-navy w-100 py-3 fw-bold">Register Project</button>
            </div>
        </form>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<script>
    function formatCurrency(input) {
    // 1. Remove all non-numeric characters except the decimal point
    let value = input.value.replace(/[^0-9.]/g, '');
    
    // 2. Prevent multiple decimal points
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');

    // 3. Format with commas for the visual display
    if (value !== '') {
        let formattedValue = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        if (parts.length === 2) {
            formattedValue += "." + parts[1].substring(0, 2); // Limit to 2 decimal places
        }
        input.value = formattedValue;
        
        // 4. Update the hidden input with the raw number for the DB
        document.getElementById('amount_actual').value = value;
        
        // 5. Bonus UX: Show a "Short Scale" preview (e.g., 1.5 Million)
        updateAmountWords(parseFloat(value));
    }
}

function updateAmountWords(num) {
    const wordBox = document.getElementById('amount_words');
    if (num >= 1000000) {
        wordBox.innerText = "Approx: " + (num / 1000000).toFixed(2) + " Million";
    } else if (num >= 1000) {
        wordBox.innerText = "Approx: " + (num / 1000).toFixed(1) + " Thousand";
    } else {
        wordBox.innerText = "";
    }
}
</script>
</body>
</html> -->








<!-- <?php
require '../config/db.php';
require '../includes/header.php';
session_start();
$staff_id = $_SESSION['staff_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $pdo->prepare("INSERT INTO grant_project (staff_id, title, sponsor, amount, start_year, end_year) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$staff_id, $_POST['title'], $_POST['sponsor'], $_POST['amount'], $_POST['start'], $_POST['end']]);
    header("Location: grants.php"); exit;
}

$grants = $pdo->prepare("SELECT * FROM grant_project WHERE staff_id = ? ORDER BY start_year DESC");
$grants->execute([$staff_id]);
?>

<div class="container-fluid">
    <div class="row">
        <?php include 'partials/staff_sidebar.php'; ?>
        <main class="col-lg-10 col-md-9 ms-auto p-4">
            <div class="d-flex justify-content-between mb-4">
                <h3 class="fw-bold">Grants & Projects</h3>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#grantModal"><i class="fas fa-plus"></i> Add Grant</button>
            </div>

            <div class="row g-4">
                <?php while($g = $grants->fetch()): ?>
                <div class="col-md-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <h5 class="fw-bold text-primary mb-1"><?= htmlspecialchars($g['title']) ?></h5>
                                <span class="badge bg-success fs-6"><?= number_format($g['amount']) ?> currency</span>
                            </div>
                            <p class="mb-1 text-dark fw-bold">Sponsor: <?= htmlspecialchars($g['sponsor']) ?></p>
                            <p class="text-muted mb-0">
                                <i class="fas fa-clock me-1"></i> <?= $g['start_year'] ?> - <?= $g['end_year'] ?>
                            </p>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="grantModal" tabindex="-1">
    <div class="modal-dialog">
        <form method="POST" class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Add Grant</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3"><label>Project Title</label><input type="text" name="title" class="form-control" required></div>
                <div class="row mb-3">
                    <div class="col"><label>Sponsor</label><input type="text" name="sponsor" class="form-control" required></div>
                    <div class="col"><label>Amount</label><input type="number" name="amount" class="form-control" required></div>
                </div>
                <div class="row">
                    <div class="col"><label>Start Year</label><input type="number" name="start" class="form-control" required></div>
                    <div class="col"><label>End Year</label><input type="number" name="end" class="form-control" required></div>
                </div>
            </div>
            <div class="modal-footer"><button type="submit" class="btn btn-primary">Save Grant</button></div>
        </form>
    </div>
</div>
<?php require '../includes/footer.php'; ?> -->