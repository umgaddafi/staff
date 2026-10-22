<?php
ini_set('display_error',   1);
ini_set('display_startup_error',   1);
error_reporting(E_ALL);
// Note: session_start() and db.php are already handled in index.php
$staff_id = $_SESSION['staff_id'];

// 1. DATA PROCESSING (Logic)
// Handle Link Course to Staff
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['link_course'])) {
    $stmt = $pdo->prepare("INSERT IGNORE INTO staff_course (staff_id, course_id, session) VALUES (?,?,?)");
    $stmt->execute([$staff_id, $_POST['course_id'], $_POST['session']]);
    echo "<script>window.location.href='index.php?page=courses&status=linked';</script>"; 
    exit;
}

// Handle Unlink
if (isset($_GET['remove'])) {
    $stmt = $pdo->prepare("DELETE FROM staff_course WHERE staff_id = ? AND course_id = ? AND session = ?");
    $stmt->execute([$staff_id, $_GET['remove'], $_GET['sess']]);
    echo "<script>window.location.href='index.php?page=courses&status=removed';</script>"; 
    exit;
}

// Fetch Master Course List for the Dropdown
$master_courses = $pdo->query("SELECT * FROM course ORDER BY course_code ASC")->fetchAll();

// Fetch Staff's Assigned Courses grouped by Session
$my_courses = $pdo->prepare("
    SELECT sc.*, c.course_code, c.course_title, c.level 
    FROM staff_course sc
    JOIN course c ON sc.course_id = c.course_id
    WHERE sc.staff_id = ?
    ORDER BY sc.session DESC, c.course_code ASC
");
$my_courses->execute([$staff_id]);
?>

<style>
    .session-header { background: var(--uni-navy); color: white; padding: 10px 20px; border-radius: 8px; margin-top: 2rem; }
    .course-card { border: none; border-radius: 12px; transition: 0.3s; border-left: 4px solid var(--uni-gold); }
    .course-card:hover { transform: translateX(5px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
    .level-badge { background: #e9ecef; color: #495057; font-weight: 700; font-size: 0.75rem; padding: 5px 10px; border-radius: 4px; }
    .text-navy { color: var(--uni-navy); }
</style>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold">Teaching Portfolio</h2>
        <p class="text-muted">Manage the courses you have facilitated across academic sessions.</p>
    </div>
    <button class="btn btn-dark px-4 shadow-sm" data-bs-toggle="modal" data-bs-target="#courseModal">
        <i class="fas fa-book-open me-2 text-warning"></i> Link Course
    </button>
</div>

<?php 
$current_session = "";
$has_courses = false;
while($c = $my_courses->fetch()): 
    $has_courses = true;
    if ($current_session != $c['session']): 
        $current_session = $c['session'];
?>
    <div class="session-header shadow-sm d-flex justify-content-between align-items-center">
        <span class="fw-bold"><i class="fas fa-history me-2"></i> Academic Session: <?= $current_session ?></span>
    </div>
<?php endif; ?>

<div class="card course-card shadow-sm mt-3 p-3">
    <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center">
            <div class="me-4 text-center" style="min-width: 80px;">
                <span class="level-badge"><?= $c['level'] ?>L</span>
                <div class="fw-bold mt-1 text-navy"><?= $c['course_code'] ?></div>
            </div>
            <div>
                <h6 class="fw-bold mb-0 text-dark"><?= htmlspecialchars($c['course_title']) ?></h6>
                <small class="text-muted">Faculty Course Record</small>
            </div>
        </div>
        <div>
            <a href="index.php?page=courses&remove=<?= $c['course_id'] ?>&sess=<?= $c['session'] ?>" 
                class="btn btn-sm btn-outline-danger border-0" 
                onclick="return confirm('Remove this course from your portfolio for this session?')">
                <i class="fas fa-times-circle"></i>
            </a>
        </div>
    </div>
</div>
<?php endwhile; 

if(!$has_courses): ?>
    <div class="text-center py-5">
        <i class="fas fa-chalkboard fa-3x text-light mb-3"></i>
        <p class="text-muted">No courses linked to your portfolio yet.</p>
    </div>
<?php endif; ?>

<div class="modal fade" id="courseModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form method="POST" action="index.php?page=courses" class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white p-4">
                <h5 class="modal-title fw-bold">Link Course to Session</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold small">Select Academic Session</label>
                    <select name="session" class="form-select border-2" required>
                        <?php
                        $yr = date('Y');
                        for($i=0; $i<5; $i++) {
                            $s = ($yr-$i) . "/" . ($yr-$i+1);
                            echo "<option>$s</option>";
                        }
                        ?>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold small">Course</label>
                    <select name="course_id" class="form-select border-2" required>
                        <option value="" disabled selected>Search for course...</option>
                        <?php foreach($master_courses as $mc): ?>
                            <option value="<?= $mc['course_id'] ?>">
                                <?= $mc['course_code'] ?> - <?= $mc['course_title'] ?> (<?= $mc['level'] ?>L)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="link_course" class="btn btn-navy w-100 py-2 fw-bold" style="background:var(--uni-navy); color:white;">Add to Portfolio</button>
            </div>
        </form>
    </div>
</div>