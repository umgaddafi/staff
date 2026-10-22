<?php
// Note: session_start() and db.php are inherited from index.php
$staff_id = $_SESSION['staff_id'] ?? ($staff_id ?? null);

// Data Fetching
$quals = $pdo->prepare("SELECT * FROM qualification WHERE staff_id = ? ORDER BY year_awarded DESC");
$quals->execute([$staff_id]);
?>

<style>
    /* Premium Timeline Styles */
    .timeline-container { position: relative; padding-left: 1.5rem; }
    .timeline-container::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0;
        width: 4px; background: #e9ecef; border-radius: 2px;
    }
    
    .qual-card {
        border: none; border-radius: 20px;
        background: #fff; transition: all 0.3s ease;
        position: relative; margin-bottom: 1.5rem;
    }
    .qual-card::before {
        content: ''; position: absolute; left: -1.95rem; top: 25px;
        width: 20px; height: 20px; background: #fff;
        border: 4px solid var(--uni-navy, #0d2c56); border-radius: 50%; z-index: 2;
    }
    .qual-card:hover { transform: translateX(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }

    .degree-badge {
        padding: 8px 16px; border-radius: 10px; font-weight: 700; font-size: 0.8rem;
        background: #0d2c5615; color: #0d2c56; display: inline-block;
    }
    
    .inst-icon {
        width: 45px; height: 45px; border-radius: 12px;
        background: #f8f9fa; display: flex; align-items: center; 
        justify-content: center; color: #6c757d;
    }
</style>

<div class="container-fluid px-0">
    <div class="row align-items-center mb-5">
        <div class="col">
            <h2 class="fw-bold text-navy mb-1">Educational Background</h2>
            <p class="text-muted mb-0">Your verified academic credentials and certifications.</p>
        </div>
        <div class="col-auto">
            <button class="btn btn-dark px-4 py-2 rounded-pill fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#addQualModal">
                <i class="fas fa-plus-circle me-2 text-warning"></i> Add Qualification
            </button>
        </div>
    </div>

    <?php if(isset($_GET['status']) && $_GET['status'] !== 'missing_file'): ?>
        <div class="alert alert-dark alert-dismissible fade show border-0 shadow-lg p-3 mb-4" style="border-radius: 15px;">
            <i class="fas fa-info-circle me-2 text-warning"></i> 
            <strong>Request Received:</strong> Your update is pending administrative verification.
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>
    <?php if(isset($_GET['status']) && $_GET['status'] === 'missing_file'): ?>
        <div class="alert alert-danger alert-dismissible fade show border-0 shadow-lg p-3 mb-4" style="border-radius: 15px;">
            <i class="fas fa-exclamation-triangle me-2"></i> 
            <strong>Evidence Required:</strong> Please upload your certificate (image or PDF).
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="timeline-container">
        <?php if($quals->rowCount() == 0): ?>
            <div class="text-center py-5 bg-light rounded-4">
                <p class="text-muted mb-0">No qualifications found. Click "Add" to start your profile.</p>
            </div>
        <?php endif; ?>

        <?php while($q = $quals->fetch()): ?>
        <div class="card qual-card shadow-sm">
            <div class="card-body p-4">
                <div class="row align-items-center">
                    <div class="col-lg-8">
                        <div class="d-flex align-items-center mb-3">
                            <span class="degree-badge me-3"><?= htmlspecialchars($q['degree']) ?></span>
                            <h4 class="fw-bold mb-0 text-dark"><?= htmlspecialchars($q['field_of_study']) ?></h4>
                        </div>
                        <div class="d-flex align-items-center text-muted">
                            <div class="inst-icon me-3">
                                <i class="fas fa-university"></i>
                            </div>
                            <div>
                                <p class="mb-0 fw-bold text-secondary"><?= htmlspecialchars($q['institution']) ?></p>
                                <small><i class="fas fa-map-marker-alt me-1"></i> <?= htmlspecialchars($q['country']) ?></small>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-2 text-lg-center mt-3 mt-lg-0">
                        <span class="h4 fw-bold text-navy"><?= $q['year_awarded'] ?></span>
                        <p class="small text-muted mb-0">Year Awarded</p>
                    </div>
                    <div class="col-lg-2 text-lg-end mt-3 mt-lg-0">
                        <a href="./actions/update_qualifications_core.php?del=<?= $q['qualification_id'] ?>" 
                           class="btn btn-outline-danger btn-sm rounded-pill px-3"
                           onclick="return confirm('Request removal of this qualification?')">
                            <i class="fas fa-trash-alt me-1"></i> Remove
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <?php endwhile; ?>
    </div>
</div>

<div class="modal fade" id="addQualModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form action="./actions/update_qualifications_core.php" method="POST" enctype="multipart/form-data" class="modal-content border-0 shadow-lg" style="border-radius: 25px;">
            <div class="modal-header bg-navy text-white p-4">
                <h5 class="modal-title fw-bold"><i class="fas fa-graduation-cap me-2 text-warning"></i> Add New Qualification</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted text-uppercase">Degree Type</label>
                    <input type="text" name="degree" class="form-control form-control-lg border-2" placeholder="e.g. PhD, M.Sc, B.Tech" required>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted text-uppercase">Field of Study</label>
                    <input type="text" name="field" class="form-control form-control-lg border-2" placeholder="e.g. Computer Science" required>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted text-uppercase">Institution Name</label>
                    <input type="text" name="institution" class="form-control form-control-lg border-2" required>
                </div>
                <div class="row">
                    <div class="col-md-7">
                        <label class="form-label small fw-bold text-muted text-uppercase">Country</label>
                        <input type="text" name="country" class="form-control form-control-lg border-2" required>
                    </div>
                    <div class="col-md-5">
                        <label class="form-label small fw-bold text-muted text-uppercase">Year</label>
                        <input type="number" name="year" class="form-control form-control-lg border-2" value="<?= date('Y') ?>" required>
                    </div>
                </div>
                <div class="mt-3">
                    <label class="form-label small fw-bold text-muted text-uppercase">Upload Certificate (Image/PDF)</label>
                    <input type="file" name="evidence_file" class="form-control form-control-lg border-2" accept=".jpg,.jpeg,.png,.webp,.pdf" required>
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_qual" class="btn btn-navy w-100 py-3 fw-bold rounded-3 shadow">Submit for Verification</button>
            </div>
        </form>
    </div>
</div>
