<?php
// Note: session_start() and DB connection are already handled by index.php
$staff_id = $_SESSION['staff_id'] ?? ($staff_id ?? null);

// 1. DATA FETCHING
// Fetch linked research areas for the logged-in staff
$areas = $pdo->prepare("
    SELECT ra.research_area_id, ra.name 
    FROM research_area ra 
    JOIN staff_research_area sra ON ra.research_area_id = sra.research_area_id 
    WHERE sra.staff_id = ?
");
$areas->execute([$staff_id]);
?>

<style>
    .research-tag {
        transition: all 0.3s ease;
        border: 1px solid #dee2e6;
        background: white;
    }
    .research-tag:hover {
        border-color: var(--uni-gold);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.05);
    }
    .add-area-card {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 1px dashed #dee2e6;
    }
</style>

<div class="d-flex align-items-center justify-content-between mb-4">
    <div>
        <h2 class="fw-bold mb-1">Research Interests</h2>
        <p class="text-muted small">Manage the academic areas and topics you are currently exploring.</p>
    </div>
    <div class="text-end">
        <span class="badge bg-navy px-3 py-2 rounded-pill">
            Total Areas: <?= $areas->rowCount(); ?>
        </span>
    </div>
</div>

<?php if(isset($_GET['status'])): ?>
    <div class="alert alert-<?= ($_GET['status'] == 'success') ? 'success' : 'info' ?> border-0 shadow-sm fade show mb-4">
        <i class="fas fa-info-circle me-2"></i>
        <?php 
            if($_GET['status'] == 'submitted') echo "New research area submitted for approval.";
            if($_GET['status'] == 'removed') echo "Research area removed from your profile.";
        ?>
    </div>
<?php endif; ?>

<div class="row g-4">
    <div class="col-lg-4">
        <div class="card add-area-card p-4 shadow-sm border-0 sticky-top" style="top: 80px;">
            <h6 class="fw-bold mb-3"><i class="fas fa-plus-circle text-success me-2"></i>Add New Interest</h6>
            <p class="small text-muted mb-4">Type a field of study (e.g., "Deep Learning" or "Modern History") to add it to your profile.</p>
            
            <form action="./actions/update_research_core.php" method="POST">
                <div class="mb-3">
                    <input type="text" name="area_name" class="form-control form-control-lg border-2" 
                           placeholder="Enter area name..." required>
                </div>
                <button type="submit" class="btn btn-navy w-100 fw-bold py-2">
                    Add to Profile
                </button>
            </form>
        </div>
    </div>

    <div class="col-lg-8">
        <div class="card border-0 shadow-sm p-4 h-100">
            <h6 class="fw-bold mb-4 text-uppercase tracking-wider small text-muted">Active Research Areas</h6>
            
            <?php if($areas->rowCount() == 0): ?>
                <div class="text-center py-5">
                    <i class="fas fa-flask fa-3x text-light mb-3"></i>
                    <p class="text-muted">You haven't added any research areas yet.</p>
                </div>
            <?php else: ?>
                <div class="d-flex flex-wrap gap-3">
                    <?php while($r = $areas->fetch()): ?>
                        <div class="research-tag rounded-pill py-2 px-4 d-flex align-items-center">
                            <span class="fw-bold text-dark me-3"><?= htmlspecialchars($r['name']) ?></span>
                            
                            <a href="./actions/update_research_core.php?remove=<?= $r['research_area_id'] ?>" 
                               class="text-danger opacity-50 hover-opacity-100" 
                               onclick="return confirm('Remove this research area?')"
                               title="Remove">
                                <i class="fas fa-times-circle"></i>
                            </a>
                        </div>
                    <?php endwhile; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>
