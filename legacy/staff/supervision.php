<?php
// Note: session_start() and DB connection are already handled by staff_portal.php
$staff_id = $_SESSION['staff_id'];

// --- LOGIC: HANDLE ADD SUPERVISION ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_supervision'])) {
    $stmt = $pdo->prepare("INSERT INTO supervision (staff_id, student_name, degree, thesis_title, status, year_started, year_completed) VALUES (?,?,?,?,?,?,?)");
    $end_year = !empty($_POST['end']) ? $_POST['end'] : null;
    $stmt->execute([$staff_id, $_POST['student'], $_POST['degree'], $_POST['title'], $_POST['status'], $_POST['start'], $end_year]);
    
    // REDIRECT: Ensure we stay inside the portal frame
    echo "<script>window.location.href='?page=supervision&status=success';</script>";
    exit;
}

// --- LOGIC: HANDLE DELETE ---
if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM supervision WHERE supervision_id = ? AND staff_id = ?");
    $stmt->execute([$_GET['del'], $staff_id]);
    
    // REDIRECT: Ensure we stay inside the portal frame
    echo "<script>window.location.href='?page=supervision&status=deleted';</script>";
    exit;
}

// --- DATA FETCHING ---
$students = $pdo->prepare("SELECT * FROM supervision WHERE staff_id = ? ORDER BY 
    CASE WHEN degree = 'PhD' THEN 1 WHEN degree = 'MSc' THEN 2 ELSE 3 END, 
    status DESC, year_started DESC");
$students->execute([$staff_id]);
?>

<style>
    .student-card { border: none; border-radius: 12px; transition: 0.3s; border-left: 5px solid #dee2e6; background: #fff; }
    .student-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
    .border-phd { border-left-color: var(--uni-navy) !important; }
    .border-msc { border-left-color: var(--uni-gold) !important; }
    .border-pgd { border-left-color: #6c757d !important; }
    .degree-tag { background: #f0f4f8; color: var(--uni-navy); font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; }
    .thesis-text { font-style: italic; color: #495057; line-height: 1.4; border-left: 2px solid #eee; padding-left: 10px; }
</style>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold mb-1">Supervision & Mentorship</h2>
        <p class="text-muted small">Tracking progress for PhD, MSc, and PGD candidates.</p>
    </div>
    <button class="btn btn-primary px-4 shadow-sm" style="background: var(--uni-navy);" data-bs-toggle="modal" data-bs-target="#supModal">
        <i class="fas fa-user-graduate me-2"></i> Register New Student
    </button>
</div>

<?php if(isset($_GET['status'])): ?>
    <div class="alert alert-success border-0 shadow-sm mb-4">
        <i class="fas fa-check-circle me-2"></i> 
        <?= ($_GET['status'] == 'success') ? 'Supervision record added successfully.' : 'Record removed successfully.' ?>
    </div>
<?php endif; ?>

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
                    <a href="?page=supervision&del=<?= $s['supervision_id'] ?>" 
                       class="btn btn-sm btn-outline-danger border-0" 
                       onclick="return confirm('Remove this supervision record?')">
                        <i class="fas fa-trash"></i> Delete
                    </a>
                </div>
            </div>
        </div>
    </div>
    <?php endwhile; ?>
</div>

<div class="modal fade" id="supModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form action="?page=supervision" method="POST" class="modal-content border-0">
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
                            <option value="PhD">PhD</option>
                            <option value="MSc">MSc</option>
                            <option value="PGD">PGD</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-bold small">Current Status</label>
                        <select name="status" id="statusSelect" class="form-select" required onchange="toggleEndYear(this.value)">
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold small">Research/Thesis Title</label>
                    <textarea name="title" class="form-control" rows="3" placeholder="Working title..."></textarea>
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