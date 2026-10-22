<?php
// Database and session data are inherited from the index.php wrapper
$staff_id = $_SESSION['staff_id'] ?? ($staff_id ?? null);

$memberships = $pdo->prepare("SELECT * FROM professional_membership WHERE staff_id = ? ORDER BY body_name ASC");
$memberships->execute([$staff_id]);
?>

<style>
    /* Mobile-First: Default Styles (Small Screens) */
    .membership-card {
        border: none;
        border-radius: 20px;
        background: #ffffff;
        transition: all 0.3s ease;
        border: 1px solid rgba(0,0,0,0.05);
        padding: 1.25rem; /* Comfortably spaced for mobile */
    }
    
    .body-logo-placeholder {
        width: 50px; height: 50px;
        background: #0d2c56;
        color: #fff;
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem;
    }

    /* Large touch targets for buttons */
    .btn-mobile-action {
        width: 44px; height: 44px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%;
    }

    /* Desktop Adjustments (Breakpoints) */
    @media (min-width: 768px) {
        .membership-card { padding: 1.75rem; }
        .membership-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.08) !important;
        }
        .body-logo-placeholder { width: 60px; height: 60px; border-radius: 18px; }
    }

    .role-badge {
        background: #f1f3f5;
        color: #0d2c56;
        font-weight: 700;
        font-size: 0.7rem;
        padding: 5px 12px;
        border-radius: 8px;
        text-transform: uppercase;
    }

    .reg-no {
        font-family: 'Ubuntu', sans-serif;
        background: #fff9e6;
        color: #856404;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: bold;
    }
</style>

<div class="container-fluid px-0 px-md-2">
    <div class="row align-items-center mb-4 mb-md-5">
        <div class="col-12 col-md-8 mb-3 mb-md-0 text-center text-md-start">
            <h2 class="fw-bold text-navy mb-1">Professional Memberships</h2>
            <p class="text-muted small mb-0">Manage your verified academic and professional affiliations.</p>
        </div>
        <div class="col-12 col-md-4 text-center text-md-end">
            <button class="btn btn-dark w-100 w-md-auto px-4 py-2 rounded-pill fw-bold shadow" data-bs-toggle="modal" data-bs-target="#membershipModal">
                <i class="fas fa-plus-circle me-2 text-warning"></i> Add New Body
            </button>
        </div>
    </div>

    <?php if(isset($_GET['status']) && $_GET['status'] !== 'missing_file'): ?>
        <div class="alert alert-dark alert-dismissible fade show border-0 shadow-sm p-3 mb-4 rounded-4" role="alert">
            <div class="d-flex align-items-center">
                <i class="fas fa-check-circle me-3 text-warning"></i>
                <div class="small">Request submitted for admin verification.</div>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>
    <?php if(isset($_GET['status']) && $_GET['status'] === 'missing_file'): ?>
        <div class="alert alert-danger alert-dismissible fade show border-0 shadow-sm p-3 mb-4 rounded-4" role="alert">
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-3"></i>
                <div class="small">Please upload your membership evidence (image or PDF) before submitting.</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-3 g-md-4">
        <?php if($memberships->rowCount() == 0): ?>
            <div class="col-12 text-center py-5">
                <i class="fas fa-certificate fa-4x text-light mb-3"></i>
                <h5 class="text-muted">No memberships found.</h5>
            </div>
        <?php endif; ?>

        <?php while($m = $memberships->fetch()): ?>
        <div class="col-12 col-md-6 col-xl-4">
            <div class="card membership-card shadow-sm">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="body-logo-placeholder">
                        <i class="fas fa-award"></i>
                    </div>
                    <a href="./actions/update_membership_core.php?del=<?= $m['membership_id'] ?>" 
                       class="btn btn-light btn-mobile-action text-danger shadow-sm"
                       onclick="return confirm('Request removal of this membership?')">
                        <i class="fas fa-trash-alt"></i>
                    </a>
                </div>

                <h5 class="fw-bold text-dark mb-1"><?= htmlspecialchars($m['body_name']) ?></h5>
                <div class="mb-3">
                    <span class="role-badge"><?= htmlspecialchars($m['role'] ?: 'Member') ?></span>
                </div>

                <div class="pt-3 border-top mt-auto d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted d-block text-uppercase fw-bold mb-1" style="font-size: 0.6rem;">ID Number</small>
                        <span class="reg-no"><?= htmlspecialchars($m['membership_no']) ?></span>
                    </div>
                    <span class="badge rounded-pill bg-success-subtle text-success border border-success border-opacity-25 px-3 py-2">
                        <i class="fas fa-check-circle me-1"></i> Verified
                    </span>
                </div>
            </div>
        </div>
        <?php endwhile; ?>
    </div>
</div>

<div class="modal fade" id="membershipModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered px-3"> <form action="./actions/update_memberships_core.php" method="POST" enctype="multipart/form-data" class="modal-content border-0 shadow-lg" style="border-radius: 24px;">
            <div class="modal-header bg-navy text-white p-4">
                <h5 class="modal-title fw-bold">Link Affiliation</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted">ORGANIZATION NAME</label>
                    <input type="text" name="body_name" class="form-control form-control-lg border-2" placeholder="e.g. ACM, IEEE" required>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted">MEMBERSHIP NO.</label>
                    <input type="text" name="membership_no" class="form-control form-control-lg border-2" placeholder="Registration ID" required>
                </div>
                <div class="mb-0">
                    <label class="form-label small fw-bold text-muted">MEMBERSHIP GRADE</label>
                    <input type="text" name="role" class="form-control form-control-lg border-2" placeholder="e.g. Full Member, Fellow">
                </div>
                <div class="mb-0 mt-3">
                    <label class="form-label small fw-bold text-muted">UPLOAD EVIDENCE (IMAGE/PDF)</label>
                    <input type="file" name="evidence_file" class="form-control form-control-lg border-2" accept=".jpg,.jpeg,.png,.webp,.pdf" required>
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_membership" class="btn btn-navy w-100 py-3 fw-bold rounded-pill">Submit Record</button>
            </div>
        </form>
    </div>
</div>








<!-- <?php
// Database and session data are inherited from the index.php wrapper
$staff_id = $_SESSION['staff_id'];

$memberships = $pdo->prepare("SELECT * FROM professional_membership WHERE staff_id = ? ORDER BY body_name ASC");
$memberships->execute([$staff_id]);
?>

<style>
    .membership-card {
        border: none;
        border-radius: 24px;
        background: #ffffff;
        transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        border: 1px solid rgba(0,0,0,0.05);
    }
    .membership-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.06) !important;
    }
    .body-logo-placeholder {
        width: 64px; height: 64px;
        background: var(--uni-navy, #0d2c56);
        color: #fff;
        border-radius: 18px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.5rem;
        box-shadow: 0 8px 15px rgba(13, 44, 86, 0.2);
    }
    .role-badge {
        background: #f8f9fa;
        color: #495057;
        font-weight: 700;
        font-size: 0.75rem;
        padding: 6px 14px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .membership-no {
        font-family: 'Ubuntu', sans-serif;
        background: #fff9e6;
        color: #856404;
        padding: 2px 8px;
        border-radius: 5px;
        font-size: 0.85rem;
    }
</style>

<div class="container-fluid px-0">
    <div class="row align-items-end mb-5">
        <div class="col">
            <h1 class="fw-bold text-navy mb-1">Professional Affiliations</h1>
            <p class="text-muted fs-5 mb-0">Verified memberships in global and local professional bodies.</p>
        </div>
        <div class="col-auto">
            <button class="btn btn-dark btn-lg px-4 rounded-pill fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#membershipModal">
                <i class="fas fa-plus-circle me-2 text-warning"></i> Add Membership
            </button>
        </div>
    </div>

    <?php if(isset($_GET['status'])): ?>
        <div class="alert alert-dark alert-dismissible fade show border-0 shadow-lg p-4 mb-4" role="alert" style="border-radius: 20px;">
            <div class="d-flex align-items-center">
                <div class="spinner-grow spinner-grow-sm text-warning me-3" role="status"></div>
                <div>
                    <strong class="d-block">Request Logged Successfully</strong>
                    <span class="small opacity-75">Your membership update is currently being verified by the administration.</span>
                </div>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row g-4">
        <?php if($memberships->rowCount() == 0): ?>
            <div class="col-12 text-center py-5">
                <img src="https://illustrations.popsy.co/blue/awards.svg" style="height: 200px; opacity: 0.8;" class="mb-4">
                <h4 class="text-muted fw-bold">No memberships recorded.</h4>
                <p class="text-muted">Showcase your professional status by adding your certifications.</p>
            </div>
        <?php endif; ?>

        <?php while($m = $memberships->fetch()): ?>
        <div class="col-xl-4 col-md-6">
            <div class="card membership-card h-100 p-4 shadow-sm">
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div class="body-logo-placeholder">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <a href="./actions/update_membership_core.php?del=<?= $m['membership_id'] ?>" 
                       class="btn btn-light btn-sm text-danger rounded-circle shadow-sm"
                       onclick="return confirm('Request removal of this affiliation?')">
                        <i class="fas fa-trash"></i>
                    </a>
                </div>

                <h5 class="fw-bold text-dark mb-2"><?= htmlspecialchars($m['body_name']) ?></h5>
                <div class="mb-4">
                    <span class="role-badge"><i class="fas fa-user-tag me-1"></i> <?= htmlspecialchars($m['role'] ?: 'Member') ?></span>
                </div>

                <div class="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted d-block text-uppercase fw-bold" style="font-size: 0.65rem;">Registration No.</small>
                        <span class="membership-no"><?= htmlspecialchars($m['membership_no']) ?></span>
                    </div>
                    <i class="fas fa-check-circle text-success" title="Active Status"></i>
                </div>
            </div>
        </div>
        <?php endwhile; ?>
    </div>
</div>

<div class="modal fade" id="membershipModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <form action="./actions/update_membership_core.php" method="POST" class="modal-content border-0 shadow-lg" style="border-radius: 28px;">
            <div class="modal-header bg-navy text-white p-4">
                <h5 class="modal-title fw-bold"><i class="fas fa-certificate me-2 text-warning"></i> Add Affiliation</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-4">
                    <label class="form-label small fw-bold text-muted">PROFESSIONAL BODY NAME</label>
                    <input type="text" name="body_name" class="form-control form-control-lg border-2" placeholder="e.g. IEEE, ICAN, COREN" required>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label small fw-bold text-muted">MEMBERSHIP ID</label>
                        <input type="text" name="membership_no" class="form-control form-control-lg border-2" placeholder="Reg. Number" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label small fw-bold text-muted">YOUR ROLE/GRADE</label>
                        <input type="text" name="role" class="form-control form-control-lg border-2" placeholder="e.g. Fellow">
                    </div>
                </div>
                <div class="alert alert-info border-0 small mb-0">
                    <i class="fas fa-info-circle me-1"></i> New entries will be visible on your public portfolio after admin verification.
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_membership" class="btn btn-navy w-100 py-3 fw-bold rounded-pill shadow">Submit Credential</button>
            </div>
        </form>
    </div>
</div> -->
