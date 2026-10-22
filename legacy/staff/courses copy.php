<?php
session_start();
require '../config/db.php';
// if (!isset($_SESSION['staff_id'])) { header("Location: ../login.php"); exit; }

$staff_id = $_SESSION['staff_id'];

// Handle Link Course to Staff
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['link_course'])) {
    $stmt = $pdo->prepare("INSERT IGNORE INTO staff_course (staff_id, course_id, session) VALUES (?,?,?)");
    $stmt->execute([$staff_id, $_POST['course_id'], $_POST['session']]);
    header("Location: courses.php?status=linked"); exit;
}

// Handle Unlink
if (isset($_GET['remove'])) {
    $stmt = $pdo->prepare("DELETE FROM staff_course WHERE staff_id = ? AND course_id = ? AND session = ?");
    $stmt->execute([$staff_id, $_GET['remove'], $_GET['sess']]);
    header("Location: courses.php?status=removed"); exit;
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

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Teaching Portfolio | Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --uni-navy: #0d2c56; --uni-gold: #c5a017; }
        body { background-color: #f4f7f6; font-family: 'Ubuntu', sans-serif; }
        .session-header { background: var(--uni-navy); color: white; padding: 10px 20px; border-radius: 8px; margin-top: 2rem; }
        .course-card { border: none; border-radius: 12px; transition: 0.3s; border-left: 4px solid var(--uni-gold); }
        .course-card:hover { transform: translateX(5px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .level-badge { background: #e9ecef; color: #495057; font-weight: 700; font-size: 0.75rem; padding: 5px 10px; border-radius: 4px; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
        <div class="col-lg-2 p-0">
            <?php include 'partials/staff_sidebar.php'; ?>
        </div>

        <main class="col-lg-10 p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold">Teaching Portfolio</h2>
                    <p class="text-muted">Manage the courses you have facilitated across academic sessions.</p>
                </div>
                <button class="btn btn-dark px-4 shadow-sm" data-bs-toggle="modal" data-bs-target="#courseModal">
                    <i class="fas fa-book-open me-2 text-gold"></i> Link Course
                </button>
            </div>

            <?php 
            $current_session = "";
            while($c = $my_courses->fetch()): 
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
                     
                        <a href="./actions/update_courses_core.php?remove=<?= $c['course_id'] ?>&sess=<?= $c['session'] ?>" 
                            class="btn btn-sm btn-outline-danger border-0" 
                            onclick="return confirm('Remove this course from your portfolio for this session?')">
                            <i class="fas fa-times-circle"></i>
                        </a>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </main>
    </div>
</div>

<div class="modal fade" id="courseModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <!-- <form method="POST" class="modal-content border-0 shadow-lg"> -->
        <form method="POST" action="actions/update_courses_core.php" class="modal-content border-0 shadow-lg">
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
                <div class="alert alert-warning small border-0 py-2">
                    <i class="fas fa-info-circle me-1"></i> If a course is missing, please contact the Departmental Admin to add it to the master list.
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="link_course" class="btn btn-navy w-100 py-2 fw-bold" style="background:var(--uni-navy); color:white;">Add to Portfolio</button>
            </div>
        </form>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>