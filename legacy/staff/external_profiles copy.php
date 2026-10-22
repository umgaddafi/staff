<?php
session_start();
require '../config/db.php';
// if (!isset($_SESSION['staff_id'])) { header("Location: ../login.php"); exit; }

$staff_id = $_SESSION['staff_id'];

// Handle Add Profile
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_profile'])) {
    $stmt = $pdo->prepare("INSERT INTO external_profile (staff_id, platform, profile_url) VALUES (?,?,?)");
    $stmt->execute([$staff_id, $_POST['platform'], $_POST['url']]);
    header("Location: external_profiles.php?status=added"); exit;
}

// Handle Delete
if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM external_profile WHERE profile_id=? AND staff_id=?");
    $stmt->execute([$_GET['del'], $staff_id]);
    header("Location: external_profiles.php?status=deleted"); exit;
}

$profiles = $pdo->prepare("SELECT * FROM external_profile WHERE staff_id = ?");
$profiles->execute([$staff_id]);
?>
<?php if(isset($_GET['status'])): ?>
    <div class="container mt-3">
        <?php if($_GET['status'] == 'submitted'): ?>
            <div class="alert alert-info border-0 shadow-sm">
                <i class="fas fa-clock me-2"></i> Profile link submitted! It will appear on your portfolio once approved by an admin.
            </div>
        <?php elseif($_GET['status'] == 'delete_submitted'): ?>
            <div class="alert alert-warning border-0 shadow-sm">
                <i class="fas fa-shield-alt me-2"></i> Removal request sent for admin approval.
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Digital Presence | Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --uni-navy: #0d2c56; --uni-gold: #c5a017; }
        body { background-color: #f8f9fa; font-family: 'Ubuntu', sans-serif; }
        .platform-card { border: none; border-radius: 16px; transition: all 0.3s ease; overflow: hidden; }
        .platform-card:hover { transform: translateY(-5px); box-shadow: 0 12px 20px rgba(0,0,0,0.1); }
        
        /* Platform Brand Colors */
        .brand-orcid { border-top: 5px solid #A6CE39; }
        .brand-google { border-top: 5px solid #4285F4; }
        .brand-researchgate { border-top: 5px solid #00CCBB; }
        .brand-scopus { border-top: 5px solid #EB7125; }
        
        .icon-box { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .btn-navy { background: var(--uni-navy); color: white; border-radius: 8px; }
        .btn-navy:hover { background: #081d3a; color: white; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
       

        <main class="col-lg-10 p-4">
            <div class="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h2 class="fw-bold text-dark">Digital Research Profiles</h2>
                    <p class="text-muted">Connect your external academic identities to your portfolio.</p>
                </div>
                <button class="btn btn-navy px-4 py-2 shadow-sm" data-bs-toggle="modal" data-bs-target="#extModal">
                    <i class="fas fa-plus me-2"></i> Add Research Link
                </button>
            </div>

            <?php if($profiles->rowCount() == 0): ?>
                <div class="text-center py-5">
                    <img src="https://illustrations.popsy.co/blue/web-design.svg" style="width: 280px;" class="mb-4">
                    <h4 class="text-muted">No external profiles found.</h4>
                    <p>Link your ORCID or Google Scholar to help others find your work.</p>
                </div>
            <?php endif; ?>

            <div class="row g-4">
                <?php while($p = $profiles->fetch()): 
                    $brandClass = '';
                    $icon = 'fa-link';
                    $color = '#6c757d';

                    switch($p['platform']) {
                        case 'Google Scholar': $brandClass = 'brand-google'; $icon = 'fa-graduation-cap'; $color = '#4285F4'; break;
                        case 'ORCID': $brandClass = 'brand-orcid'; $icon = 'fa-id-card'; $color = '#A6CE39'; break;
                        case 'ResearchGate': $brandClass = 'brand-researchgate'; $icon = 'fa-flask'; $color = '#00CCBB'; break;
                        case 'Scopus': $brandClass = 'brand-scopus'; $icon = 'fa-search-plus'; $color = '#EB7125'; break;
                    }
                ?>
                <div class="col-md-4">
                    <div class="card platform-card shadow-sm h-100 <?= $brandClass ?>">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-start mb-4">
                                <div class="icon-box" style="background: <?= $color ?>15; color: <?= $color ?>;">
                                    <i class="fas <?= $icon ?>"></i>
                                </div>
                                <!-- <a href="?del=<?= $p['profile_id'] ?>" class="btn btn-sm btn-light text-danger rounded-circle" onclick="return confirm('Disconnect this profile?')">
                                    <i class="fas fa-trash"></i>
                                </a> -->
                                <a href="./actions/update_external_profiles_core.php?del=<?= $p['profile_id'] ?>" 
                                    class="text-danger" 
                                    onclick="return confirm('Request to remove this profile link?')">
                                        <i class="fas fa-trash"></i>
                                </a>
                            </div>
                            <h5 class="fw-bold mb-1"><?= $p['platform'] ?></h5>
                            <p class="text-muted small text-truncate mb-4"><?= htmlspecialchars($p['profile_url']) ?></p>
                            <a href="<?= htmlspecialchars($p['profile_url']) ?>" target="_blank" class="btn btn-outline-secondary btn-sm w-100 rounded-pill">
                                <i class="fas fa-external-link-alt me-2"></i> Visit Profile
                            </a>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="extModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <!-- <form method="POST" class="modal-content border-0 shadow-lg"> -->
            <form action="./actions/update_external_profiles_core.php" method="POST" class="modal-content">
            <div class="modal-header bg-dark text-white p-4">
                <h5 class="modal-title fw-bold"><i class="fas fa-share-nodes me-2 text-gold"></i> Link Research Platform</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-4">
                    <label class="form-label fw-bold small">Select Platform</label>
                    <select name="platform" class="form-select border-2" required>
                        <option value="" disabled selected>Choose a platform...</option>
                        <option>ORCID</option>
                        <option>Google Scholar</option>
                        <option>Scopus</option>
                        <option>ResearchGate</option>
                    </select>
                </div>
                <div class="mb-2">
                    <label class="form-label fw-bold small">Full Profile URL</label>
                    <input type="url" name="url" class="form-control border-2" placeholder="https://scholar.google.com/citations?user=..." required>
                </div>
                <div class="alert alert-info py-2 px-3 small border-0">
                    <i class="fas fa-info-circle me-1"></i> Ensure the URL starts with <strong>https://</strong>
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_profile" class="btn btn-navy w-100 py-2 fw-bold">Link Profile</button>
            </div>
        </form>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>











<!-- <?php
require '../config/db.php';
require '../includes/header.php';
session_start();
$staff_id = $_SESSION['staff_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = $pdo->prepare("INSERT INTO external_profile (staff_id, platform, profile_url) VALUES (?,?,?)");
    $stmt->execute([$staff_id, $_POST['platform'], $_POST['url']]);
    header("Location: external_profiles.php"); exit;
}

if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM external_profile WHERE profile_id=? AND staff_id=?");
    $stmt->execute([$_GET['del'], $staff_id]);
    header("Location: external_profiles.php"); exit;
}

$profiles = $pdo->prepare("SELECT * FROM external_profile WHERE staff_id = ?");
$profiles->execute([$staff_id]);
?>

<div class="container-fluid">
    <div class="row">
        <?php include 'partials/staff_sidebar.php'; ?>
        <main class="col-lg-10 col-md-9 ms-auto p-4">
            <div class="d-flex justify-content-between mb-4">
                <h3 class="fw-bold">External Profiles</h3>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#extModal"><i class="fas fa-plus"></i> Add Link</button>
            </div>

            <div class="row">
                <?php while($p = $profiles->fetch()): 
                    $icon = 'fa-link';
                    if($p['platform'] == 'Google Scholar') $icon = 'fa-graduation-cap';
                    if($p['platform'] == 'ORCID') $icon = 'fa-id-card';
                    if($p['platform'] == 'ResearchGate') $icon = 'fa-flask';
                ?>
                <div class="col-md-4 mb-3">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-body d-flex align-items-center">
                            <div class="bg-light p-3 rounded-circle me-3 text-primary">
                                <i class="fas <?= $icon ?> fa-lg"></i>
                            </div>
                            <div class="flex-grow-1 overflow-hidden">
                                <h6 class="fw-bold mb-0"><?= $p['platform'] ?></h6>
                                <a href="<?= $p['profile_url'] ?>" target="_blank" class="text-muted small text-truncate d-block">View Profile</a>
                            </div>
                            <a href="?del=<?= $p['profile_id'] ?>" class="text-danger"><i class="fas fa-trash"></i></a>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="extModal" tabindex="-1">
    <div class="modal-dialog">
        <form method="POST" class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Add Profile Link</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3">
                    <label>Platform</label>
                    <select name="platform" class="form-select">
                        <option>Google Scholar</option><option>ORCID</option><option>ResearchGate</option><option>Scopus</option>
                    </select>
                </div>
                <div class="mb-3"><label>Profile URL</label><input type="url" name="url" class="form-control" placeholder="https://..." required></div>
            </div>
            <div class="modal-footer"><button type="submit" class="btn btn-primary">Save Link</button></div>
        </form>
    </div>
</div>
<?php require '../includes/footer.php'; ?> -->