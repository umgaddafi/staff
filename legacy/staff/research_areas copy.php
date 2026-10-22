<?php
require '../config/db.php';

session_start();
$staff_id = $_SESSION['staff_id'];

// Handle Add (Check if exists, if not create, then link)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['area_name'])) {
    $area = trim($_POST['area_name']);
    // Check if area exists
    $check = $pdo->prepare("SELECT research_area_id FROM research_area WHERE name = ?");
    $check->execute([$area]);
    $exists = $check->fetch();

    if ($exists) {
        $r_id = $exists['research_area_id'];
    } else {
        $ins = $pdo->prepare("INSERT INTO research_area (name) VALUES (?)");
        $ins->execute([$area]);
        $r_id = $pdo->lastInsertId();
    }
    
    // Link to staff (ignore duplicates)
    $link = $pdo->prepare("INSERT IGNORE INTO staff_research_area (staff_id, research_area_id) VALUES (?, ?)");
    $link->execute([$staff_id, $r_id]);
    header("Location: research_areas.php"); exit;
}

// Handle Unlink
if (isset($_GET['remove'])) {
    $stmt = $pdo->prepare("DELETE FROM staff_research_area WHERE staff_id = ? AND research_area_id = ?");
    $stmt->execute([$staff_id, $_GET['remove']]);
    header("Location: research_areas.php"); exit;
}

$areas = $pdo->prepare("SELECT ra.research_area_id, ra.name FROM research_area ra JOIN staff_research_area sra ON ra.research_area_id = sra.research_area_id WHERE sra.staff_id = ?");
$areas->execute([$staff_id]);
?>
<?php if(isset($_GET['status'])): ?>
    <?php if($_GET['status'] == 'submitted'): ?>
        <div class="alert alert-info border-0 shadow-sm mb-4">
            <i class="fas fa-clock me-2"></i> New research area submitted for admin approval.
        </div>
    <?php elseif($_GET['status'] == 'delete_submitted'): ?>
        <div class="alert alert-warning border-0 shadow-sm mb-4">
            <i class="fas fa-trash-alt me-2"></i> Removal request sent to administrator.
        </div>
    <?php endif; ?>
<?php endif; ?>

<div class="container-fluid">
    <div class="row">
       
        <main class="col-lg-10 col-md-9 ms-auto p-4">
            <h3 class="fw-bold mb-4">Research Interests</h3>
            
            <div class="card border-0 shadow-sm p-4 mb-4">
                <form method="POST" class="d-flex gap-2">
                    <!-- <input type="text" name="area_name" class="form-control" placeholder="Enter a research area (e.g. Artificial Intelligence)" required>
                    <button class="btn btn-success text-nowrap"><i class="fas fa-plus"></i> Add Area</button>
                </form> -->
                <form action="./actions/update_research_core.php" method="POST" class="d-flex gap-2">
                    <input type="text" name="area_name" class="form-control" placeholder="Enter a research area..." required>
                    <button class="btn btn-success text-nowrap"><i class="fas fa-plus"></i> Add Area</button>
                </form>
            </div>

            <div class="d-flex flex-wrap gap-2">
                <?php while($r = $areas->fetch()): ?>
                <div class="bg-white border rounded-pill py-2 px-3 shadow-sm d-flex align-items-center">
                    <span class="fw-bold text-dark me-2"><?= htmlspecialchars($r['name']) ?></span>
                    <!-- <a href="?remove=<?= $r['research_area_id'] ?>" class="text-danger hover-opacity"><i class="fas fa-times-circle"></i></a> -->
                    <a href="./actions/update_research_core.php?remove=<?= $r['research_area_id'] ?>" 
                        class="text-danger hover-opacity" 
                        onclick="return confirm('Request to remove this research interest?')">
                        <i class="fas fa-times-circle"></i>
                    </a>
                </div>
                <?php endwhile; ?>
            </div>
            
                    </main>
    </div>
</div>
<?php require '../includes/footer.php'; ?>