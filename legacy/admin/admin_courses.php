<?php
// admin_courses.php
require '../config/db.php';

// Initialize variables
$msg = "";
$edit_mode = false;
$edit_data = ['course_id' => '', 'course_code' => '', 'course_title' => '', 'level' => ''];

// 1. Handle Deletion
if (isset($_GET['delete'])) {
    $stmt = $pdo->prepare("DELETE FROM course WHERE course_id = ?");
    $stmt->execute([$_GET['delete']]);
    header("Location: admin_courses.php?status=deleted");
    exit;
}

// 2. Handle Form Submission (Create only)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_course'])) {
    $code  = strtoupper(trim($_POST['course_code']));
    $title = trim($_POST['course_title']);
    $level = intval($_POST['level']);
    // Insert new record
    $stmt = $pdo->prepare("INSERT INTO course (course_code, course_title, level) VALUES (?, ?, ?)");
    $stmt->execute([$code, $title, $level]);
    header("Location: admin_courses.php?status=added");
    exit;
}

// Handle feedback messages
if (isset($_GET['status'])) {
    switch ($_GET['status']) {
        case 'added': $msg = "New course added to master list!"; break;
        case 'deleted': $msg = "Course removed successfully."; break;
    }
}

// 4. Fetch the Master List for display
$courses = $pdo->query("SELECT * FROM course ORDER BY level ASC, course_code ASC")->fetchAll();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Manage Master Courses</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --uni-navy: #001f3f; }
        .bg-navy { background-color: var(--uni-navy); }
        .btn-navy { background-color: var(--uni-navy); color: white; }
        .btn-navy:hover { background-color: #001126; color: white; }
        .card { border-radius: 12px; }
    </style>
</head>
<body class="bg-light">

<div class="container py-5">
    <div class="row justify-content-center">
        <div class="col-lg-10">
            
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="h4 mb-0 text-dark fw-bold">Master Course Management</h2>
                <a href="dashboard.php" class="btn btn-sm btn-outline-secondary">
                    <i class="fas fa-arrow-left me-1"></i> Back to Dashboard
                </a>
            </div>

            <div class="card shadow-sm border-0 mb-4">
                <div class="card-header bg-navy text-white fw-bold py-3">
                    <i class="fas fa-plus-circle me-2"></i>
                    Register New Master Course
                </div>
                <div class="card-body p-4">
                    <?php if($msg): ?>
                        <div class="alert alert-success border-0 shadow-sm alert-dismissible fade show" role="alert">
                            <i class="fas fa-check-circle me-2"></i> <?= $msg ?>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    <?php endif; ?>

                    <form method="POST" class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted text-uppercase">Course Code</label>
                            <input type="text" name="course_code" class="form-control" placeholder="e.g. CSC 101" 
                                   required>
                        </div>
                        
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted text-uppercase">Course Title</label>
                            <input type="text" name="course_title" class="form-control" placeholder="Full name of the course" 
                                   required>
                        </div>
                        
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted text-uppercase">Level</label>
                            <select name="level" class="form-select">
                                <?php for($i=100; $i<=500; $i+=100): ?>
                                    <option value="<?= $i ?>"><?= $i ?>L</option>
                                <?php endfor; ?>
                            </select>
                        </div>

                        <div class="col-12 text-end mt-4">
                            <button type="submit" name="save_course" class="btn btn-navy px-5 fw-bold">
                                Save Course
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card shadow-sm border-0 mb-3">
                <div class="card-body py-3">
                    <div class="input-group">
                        <span class="input-group-text bg-white border-end-0 text-muted">
                            <i class="fas fa-search"></i>
                        </span>
                        <input type="text" id="courseSearch" class="form-control border-start-0 ps-0" 
                               placeholder="Start typing to filter by course code or title...">
                    </div>
                </div>
            </div>

            <div class="card shadow-sm border-0">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="courseTable">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4" style="width: 15%;">Code</th>
                                    <th style="width: 50%;">Course Title</th>
                                    <th style="width: 15%;">Level</th>
                                    <th class="text-end pe-4" style="width: 20%;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach($courses as $c): ?>
                                <tr class="course-row">
                                    <td class="ps-4 fw-bold course-code"><?= htmlspecialchars($c['course_code']) ?></td>
                                    <td class="course-title text-secondary"><?= htmlspecialchars($c['course_title']) ?></td>
                                    <td><span class="badge bg-light text-dark border"><?= $c['level'] ?>L</span></td>
                                    <td class="text-end pe-4">
                                        <a href="?delete=<?= $c['course_id'] ?>" 
                                           class="btn btn-sm btn-outline-danger border-0" 
                                           onclick="return confirm('WARNING: Deleting this course will affect staff teaching portfolios. Proceed?')" 
                                           title="Delete Record">
                                            <i class="fas fa-trash"></i>
                                        </a>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                                
                                <?php if(empty($courses)): ?>
                                    <tr>
                                        <td colspan="4" class="text-center py-5 text-muted">
                                            <i class="fas fa-inbox fa-3x mb-3 d-block opacity-25"></i>
                                            No courses found in the system. Use the form above to add one.
                                        </td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('courseSearch').addEventListener('keyup', function() {
    let filter = this.value.toLowerCase();
    let rows = document.querySelectorAll('.course-row');

    rows.forEach(row => {
        let code = row.querySelector('.course-code').textContent.toLowerCase();
        let title = row.querySelector('.course-title').textContent.toLowerCase();
        
        if (code.includes(filter) || title.includes(filter)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
});
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
