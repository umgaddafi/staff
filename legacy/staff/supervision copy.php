<?php
session_start();
require '../config/db.php';
// if (!isset($_SESSION['staff_id'])) { header("Location: ../login.php"); exit; }

$staff_id = $_SESSION['staff_id'];

// Handle Add Supervision
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_supervision'])) {
    $stmt = $pdo->prepare("INSERT INTO supervision (staff_id, student_name, degree, thesis_title, status, year_started, year_completed) VALUES (?,?,?,?,?,?,?)");
    $end_year = !empty($_POST['end']) ? $_POST['end'] : null;
    $stmt->execute([$staff_id, $_POST['student'], $_POST['degree'], $_POST['title'], $_POST['status'], $_POST['start'], $end_year]);
    header("Location: supervision.php?status=success"); exit;
}

// Handle Delete
if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM supervision WHERE supervision_id = ? AND staff_id = ?");
    $stmt->execute([$_GET['del'], $staff_id]);
    header("Location: supervision.php?status=deleted"); exit;
}

$students = $pdo->prepare("SELECT * FROM supervision WHERE staff_id = ? ORDER BY 
    CASE WHEN degree = 'PhD' THEN 1 WHEN degree = 'MSc' THEN 2 ELSE 3 END, 
    status DESC, year_started DESC");
$students->execute([$staff_id]);
?>
<?php if(isset($_GET['status'])): ?>
    <div class="container mt-3">
        <?php if($_GET['status'] == 'submitted'): ?>
            <div class="alert alert-info border-0 shadow-sm">
                <i class="fas fa-hourglass-half me-2"></i> Supervision record submitted. It will be added to your profile once approved by an admin.
            </div>
        <?php elseif($_GET['status'] == 'delete_submitted'): ?>
            <div class="alert alert-warning border-0 shadow-sm">
                <i class="fas fa-shield-alt me-2"></i> Deletion request sent for admin verification.
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Student Supervision | Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --uni-navy: #0d2c56; --uni-gold: #c5a017; }
        body { background-color: #f8f9fa; font-family: 'Ubuntu', sans-serif; }
        .student-card { border: none; border-radius: 12px; transition: 0.3s; border-left: 5px solid #dee2e6; }
        .student-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        /* Degree Specific Border Colors */
        .border-phd { border-left-color: var(--uni-navy); }
        .border-msc { border-left-color: var(--uni-gold); }
        .border-pgd { border-left-color: #6c757d; }
        
        .status-badge { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .degree-tag { background: #f0f4f8; color: var(--uni-navy); font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; }
        .thesis-text { font-style: italic; color: #495057; line-height: 1.4; border-left: 2px solid #eee; padding-left: 10px; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
     

        <main class="col-lg-10 p-4">
            <div class="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h2 class="fw-bold">Supervision & Mentorship</h2>
                    <p class="text-muted">Tracking PhD, MSc, and PGD student progress.</p>
                </div>
                <button class="btn btn-primary px-4 shadow-sm bg-navy" style="background: var(--uni-navy);" data-bs-toggle="modal" data-bs-target="#supModal">
                    <i class="fas fa-user-graduate me-2"></i> Register New Student
                </button>
            </div>

            <div class="row g-4">
                <?php while($s = $students->fetch()): 
                    $borderClass = 'border-' . strtolower($s['degree']);
                    $statusColor = ($s['status'] == 'Ongoing') ? 'text-warning' : 'text-success';
                ?>
                <div class="col-md-6">
                    <div class="card student-card shadow-sm h-100 <?= $borderClass ?>">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="degree-tag"><?= $s['degree'] ?> Candidate</span>
                                <div class="small fw-bold <?= $statusColor ?>">
                                    <i class="fas fa-circle me-1 small"></i> <?= $s['status'] ?>
                                </div>
                            </div>
                            
                            <h5 class="fw-bold mb-1 text-dark"><?= htmlspecialchars($s['student_name']) ?></h5>
                            <div class="text-muted small mb-3">
                                <i class="far fa-calendar-check me-1"></i> <?= $s['year_started'] ?> — <?= $s['year_completed'] ?? 'Present' ?>
                            </div>

                            <p class="thesis-text mb-4">"<?= htmlspecialchars($s['thesis_title']) ?: 'Thesis title not yet registered.' ?>"</p>

                            <div class="d-flex justify-content-end border-top pt-3">
                                <!-- <a href="?del=<?= $s['supervision_id'] ?>" class="btn btn-sm btn-link text-danger p-0" onclick="return confirm('Archive this record?')">
                                    <i class="fas fa-trash-alt me-1"></i> Delete Record
                                </a> -->
                                <a href="./actions/update_supervision_core.php?del=<?= $s['supervision_id'] ?>" 
                                    class="btn btn-sm btn-outline-danger border-0" 
                                    onclick="return confirm('Request to remove this supervision record?')">
                                    <i class="fas fa-trash"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="supModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <!-- <form method="POST" class="modal-content border-0 shadow-lg"> -->
            <form action="./actions/update_supervision_core.php" method="POST" class="modal-content">
            <div class="modal-header bg-dark text-white p-4">
                <h5 class="modal-title fw-bold">Register Student Supervision</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold small">Full Name of Student</label>
                    <input type="text" name="student" class="form-control" placeholder="Enter name..." required>
                </div>
                <div class="row g-3 mb-3">
                    <div class="col-6">
                        <label class="form-label fw-bold small">Degree Type</label>
                        <select name="degree" class="form-select" required>
                            <option>PhD</option>
                            <option>MSc</option>
                            <option>PGD</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-bold small">Current Status</label>
                        <select name="status" id="statusSelect" class="form-select" required onchange="toggleEndYear(this.value)">
                            <option>Ongoing</option>
                            <option>Completed</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold small">Research/Thesis Title</label>
                    <textarea name="title" class="form-control" rows="3" placeholder="Working title of the project..."></textarea>
                </div>
                <div class="row g-3">
                    <div class="col-6">
                        <label class="form-label fw-bold small">Year Started</label>
                        <input type="number" name="start" class="form-control" value="<?= date('Y') ?>" required>
                    </div>
                    <div class="col-6" id="endYearContainer" style="display:none;">
                        <label class="form-label fw-bold small">Year Completed</label>
                        <input type="number" name="end" class="form-control" value="<?= date('Y') ?>">
                    </div>
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_supervision" class="btn btn-dark w-100 py-2">Add Student to Portfolio</button>
            </div>
        </form>
    </div>
</div>

<script>
    function toggleEndYear(status) {
        const container = document.getElementById('endYearContainer');
        container.style.display = (status === 'Completed') ? 'block' : 'none';
    }
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>









<!-- <?php
require '../config/db.php';
require '../includes/header.php';
session_start();
$staff_id = $_SESSION['staff_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $pdo->prepare("INSERT INTO supervision (staff_id, student_name, degree, thesis_title, status, year_started, year_completed) VALUES (?,?,?,?,?,?,?)");
    $stmt->execute([$staff_id, $_POST['student'], $_POST['degree'], $_POST['title'], $_POST['status'], $_POST['start'], $_POST['end'] ?: null]);
    header("Location: supervision.php"); exit;
}

$students = $pdo->prepare("SELECT * FROM supervision WHERE staff_id = ? ORDER BY status DESC, year_started DESC");
$students->execute([$staff_id]);
?>

<div class="container-fluid">
    <div class="row">
        <?php include 'partials/staff_sidebar.php'; ?>
        <main class="col-lg-10 col-md-9 ms-auto p-4">
            <div class="d-flex justify-content-between mb-4">
                <h3 class="fw-bold">Student Supervision</h3>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#supModal"><i class="fas fa-plus"></i> Add Student</button>
            </div>

            <div class="row g-4">
                <?php while($s = $students->fetch()): ?>
                <div class="col-md-6">
                    <div class="card h-100 border-0 shadow-sm border-start border-4 <?= $s['status'] == 'Ongoing' ? 'border-warning' : 'border-success' ?>">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge bg-secondary"><?= $s['degree'] ?></span>
                                <span class="badge <?= $s['status'] == 'Ongoing' ? 'bg-warning text-dark' : 'bg-success' ?>"><?= $s['status'] ?></span>
                            </div>
                            <h5 class="fw-bold"><?= htmlspecialchars($s['student_name']) ?></h5>
                            <p class="text-muted small mb-3">"<?= htmlspecialchars($s['thesis_title']) ?>"</p>
                            <div class="d-flex align-items-center text-secondary small">
                                <i class="far fa-calendar-alt me-2"></i>
                                <?= $s['year_started'] ?> - <?= $s['year_completed'] ?? 'Present' ?>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="supModal" tabindex="-1">
    <div class="modal-dialog">
        <form method="POST" class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Add Supervision</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3"><label>Student Name</label><input type="text" name="student" class="form-control" required></div>
                <div class="row mb-3">
                    <div class="col"><label>Degree</label><select name="degree" class="form-select"><option>PGD</option><option>MSc</option><option>PhD</option></select></div>
                    <div class="col"><label>Status</label><select name="status" class="form-select"><option>Ongoing</option><option>Completed</option></select></div>
                </div>
                <div class="mb-3"><label>Thesis Title</label><textarea name="title" class="form-control"></textarea></div>
                <div class="row">
                    <div class="col"><label>Start Year</label><input type="number" name="start" class="form-control" required></div>
                    <div class="col"><label>End Year (If done)</label><input type="number" name="end" class="form-control"></div>
                </div>
            </div>
            <div class="modal-footer"><button type="submit" class="btn btn-primary">Save</button></div>
        </form>
    </div>
</div>
<?php require '../includes/footer.php'; ?> -->