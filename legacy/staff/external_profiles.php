<?php
// Note: session_start() and db connection are already handled in index.php
$staff_id = $_SESSION['staff_id'] ?? ($staff_id ?? null);
if (!$staff_id && isset($_SESSION['user_id'])) {
    $map_stmt = $pdo->prepare("SELECT staff_id FROM user_account WHERE user_id = ? LIMIT 1");
    $map_stmt->execute([$_SESSION['user_id']]);
    $staff_id = $map_stmt->fetchColumn() ?: 0;
}

// Logic for fetching profiles
$profiles = $pdo->prepare("SELECT * FROM external_profile WHERE staff_id = ?");
$profiles->execute([$staff_id]);
?>

<style>
    /* Mobile-First Base Styles */
    .platform-card { 
        border: none; 
        border-radius: 12px; 
        transition: transform 0.2s ease; 
        background: #fff;
    }
    
    /* Touch optimization: slightly larger buttons and interactive elements */
    .icon-box { 
        width: 44px; 
        height: 44px; 
        border-radius: 10px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 1.25rem; 
    }

    /* Platform Borders */
    .brand-orcid { border-left: 6px solid #A6CE39; }
    .brand-google { border-left: 6px solid #4285F4; }
    .brand-researchgate { border-left: 6px solid #00CCBB; }
    .brand-scopus { border-left: 6px solid #EB7125; }

    /* Responsive Typography */
    @media (max-width: 576px) {
        h2 { font-size: 1.5rem; }
        .btn-mobile-full { width: 100%; margin-top: 1rem; }
    }
</style>

<div class="container-fluid px-0">
    <?php if(isset($_GET['status'])): ?>
        <div class="alert alert-dismissible fade show border-0 shadow-sm mb-4 <?php 
            echo (in_array($_GET['status'], ['submitted', 'added'])) ? 'alert-success' : 'alert-warning'; 
        ?>" role="alert">
            <i class="fas fa-info-circle me-2"></i>
            <?php
                if($_GET['status'] == 'submitted' || $_GET['status'] == 'added') echo "Profile updated successfully!";
                elseif($_GET['status'] == 'delete_submitted' || $_GET['status'] == 'deleted') echo "Profile removal requested.";
                else echo "An error occurred. Please try again.";
            ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="d-md-flex justify-content-between align-items-center mb-4">
        <div class="mb-3 mb-md-0">
            <h2 class="fw-bold text-dark mb-1">Research Profiles</h2>
            <p class="text-muted mb-0">Manage your external academic links.</p>
        </div>
        <button class="btn btn-navy btn-mobile-full shadow-sm" data-bs-toggle="modal" data-bs-target="#extModal">
            <i class="fas fa-plus-circle me-2"></i> Add New Link
        </button>
    </div>

    <?php if($profiles->rowCount() == 0): ?>
        <div class="card border-0 shadow-sm text-center py-5 px-3">
            <div class="card-body">
                <img src="https://illustrations.popsy.co/blue/web-design.svg" style="max-width: 200px;" class="mb-4 img-fluid" alt="Empty">
                <h5 class="fw-bold">No profiles linked yet</h5>
                <p class="text-muted small">Connect ORCID or Google Scholar to boost your visibility.</p>
            </div>
        </div>
    <?php endif; ?>

    <div class="row g-3">
        <?php while($p = $profiles->fetch()): 
            $brandClass = ''; $icon = 'fa-link'; $color = '#6c757d';
            switch($p['platform']) {
                case 'Google Scholar': $brandClass = 'brand-google'; $icon = 'fa-graduation-cap'; $color = '#4285F4'; break;
                case 'ORCID': $brandClass = 'brand-orcid'; $icon = 'fa-id-card'; $color = '#A6CE39'; break;
                case 'ResearchGate': $brandClass = 'brand-researchgate'; $icon = 'fa-flask'; $color = '#00CCBB'; break;
                case 'Scopus': $brandClass = 'brand-scopus'; $icon = 'fa-search-plus'; $color = '#EB7125'; break;
            }
        ?>
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card platform-card shadow-sm h-100 <?= $brandClass ?>">
                <div class="card-body p-3">
                    <div class="d-flex align-items-center mb-3">
                        <div class="icon-box me-3" style="background: <?= $color ?>15; color: <?= $color ?>;">
                            <i class="fas <?= $icon ?>"></i>
                        </div>
                        <div class="flex-grow-1 overflow-hidden">
                            <h6 class="fw-bold mb-0"><?= htmlspecialchars((string)$p['platform']) ?></h6>
                            <small class="text-muted text-truncate d-block"><?= htmlspecialchars($p['profile_url']) ?></small>
                        </div>
                        <a href="./actions/update_external_profiles_core.php?del=<?= $p['profile_id'] ?>" 
                           class="btn btn-link text-danger p-2" 
                           onclick="return confirm('Remove this profile?')">
                            <i class="fas fa-trash-alt"></i>
                        </a>
                    </div>
                    
                    <div class="d-grid">
                        <a href="<?= htmlspecialchars($p['profile_url']) ?>" target="_blank" class="btn btn-outline-light text-dark border btn-sm rounded-pill">
                            View Profile <i class="fas fa-external-link-alt ms-1" style="font-size: 0.7rem;"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <?php endwhile; ?>
    </div>
</div>

<div class="modal fade" id="extModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
        <form action="./actions/update_external_profiles_core.php" method="POST" class="modal-content border-0">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold">Link Platform</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label small fw-bold text-uppercase">Platform</label>
                    <select name="platform" class="form-select form-select-lg" required>
                        <option value="" disabled selected>Select...</option>
                        <option>ORCID</option>
                        <option>Google Scholar</option>
                        <option>Scopus</option>
                        <option>ResearchGate</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold text-uppercase">Profile URL</label>
                    <input type="url" name="url" class="form-control form-control-lg" placeholder="https://..." required>
                </div>
                <div class="p-3 bg-light rounded-3 small text-muted">
                    <i class="fas fa-info-circle me-1"></i> Ensure the link is public and starts with <strong>https://</strong>
                </div>
            </div>
            <div class="modal-footer border-0 p-4">
                <button type="submit" name="add_profile" class="btn btn-navy w-100 py-3 shadow">Save Link</button>
            </div>
        </form>
    </div>
</div>
