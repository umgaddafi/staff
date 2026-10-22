<?php
/**
 * Dashboard Refactor: Executive Overview
 * Optimized for Mobile-First experience with Desktop-Grade depth.
 * Variable $user is inherited from index.php
 */
?>

<?php
$staff_name_core = trim(($user['first_name'] ?? '') !== '' ? $user['first_name'] : ($user['last_name'] ?? ''));
$staff_display_name = trim(($user['title'] ?? '') . ' ' . $staff_name_core);
if ($staff_display_name === '') {
    $staff_display_name = 'Staff';
}

$dashboard_stats = [
    ['label' => 'Publications', 'val' => 0, 'icon' => 'fa-book', 'color' => '#0d6efd', 'slug' => 'publications'],
    ['label' => 'Supervisions', 'val' => 0, 'icon' => 'fa-users', 'color' => '#198754', 'slug' => 'supervision'],
    ['label' => 'Active Grants', 'val' => 0, 'icon' => 'fa-hand-holding-usd', 'color' => '#ffc107', 'slug' => 'grants'],
    ['label' => 'Verified Logs', 'val' => 0, 'icon' => 'fa-history', 'color' => '#6c757d', 'slug' => 'history'],
];

$recent_logs = [];
if (!empty($staff_id)) {
    $pub_stmt = $pdo->prepare("SELECT COUNT(*) FROM staff_publication WHERE staff_id = ?");
    $pub_stmt->execute([$staff_id]);
    $dashboard_stats[0]['val'] = (int) $pub_stmt->fetchColumn();

    $sup_stmt = $pdo->prepare("SELECT COUNT(*) FROM supervision WHERE staff_id = ?");
    $sup_stmt->execute([$staff_id]);
    $dashboard_stats[1]['val'] = (int) $sup_stmt->fetchColumn();

    $grant_stmt = $pdo->prepare("SELECT COUNT(*) FROM grant_project WHERE staff_id = ? AND (end_year IS NULL OR end_year >= YEAR(CURDATE()))");
    $grant_stmt->execute([$staff_id]);
    $dashboard_stats[2]['val'] = (int) $grant_stmt->fetchColumn();
}

$verified_stmt = $pdo->prepare("SELECT COUNT(*) FROM change_log WHERE user_id = ? AND status = 'Approved'");
$verified_stmt->execute([$_SESSION['user_id'] ?? 0]);
$dashboard_stats[3]['val'] = (int) $verified_stmt->fetchColumn();

$activity_stmt = $pdo->prepare("
    SELECT action, entity_name, status, timestamp, change_payload
    FROM change_log
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT 5
");
$activity_stmt->execute([$_SESSION['user_id'] ?? 0]);
$recent_logs = $activity_stmt->fetchAll(PDO::FETCH_ASSOC);

$entity_labels = [
    'publication' => 'Publication',
    'staff' => 'Profile',
    'qualification' => 'Qualification',
    'research_area' => 'Research Area',
    'staff_course' => 'Course',
    'grant_project' => 'Grant',
    'supervision' => 'Supervision',
    'professional_membership' => 'Membership',
    'external_profile' => 'External Profile',
];
?>

<style>
    :root {
        --glass-bg: rgba(255, 255, 255, 0.95);
        --brand-navy: #2c170f;
        --brand-gold: #c5a017;
    }

    /* Mobile-First Banner */
    .hero-banner {
        background: linear-gradient(135deg, var(--brand-navy) 0%, #1d0f0a 100%);
        border-radius: 20px;
        color: white;
        position: relative;
        overflow: hidden;
        padding: 1rem 1.1rem;
    }
    
    .hero-banner::after {
        content: '';
        position: absolute;
        top: -30px;
        right: -30px;
        width: 150px;
        height: 150px;
        background: rgba(255,255,255,0.05);
        border-radius: 50%;
    }

    /* KPI Cards - Stacks on Mobile, Grids on Desktop */
    .kpi-card {
        border: none;
        border-radius: 16px;
        background: #fff;
        padding: 1.25rem;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        height: 100%;
    }

    .icon-box {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        margin-bottom: 1rem;
    }

    /* Mobile Quick Actions: Large touch targets */
    .quick-nav-item {
        background: white;
        border-radius: 14px;
        padding: 1rem;
        text-decoration: none;
        color: var(--brand-navy);
        display: flex;
        align-items: center;
        border: 1px solid #eee;
        margin-bottom: 0.75rem;
        transition: 0.2s;
    }
    
    .quick-nav-item:active { background: #f8f9fa; transform: scale(0.98); }

    /* Desktop Enhancements */
    @media (min-width: 768px) {
        .hero-banner { padding: 1.6rem 1.8rem; border-radius: 22px; }
        .hero-banner h1 { font-size: 2rem; }
        .kpi-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important;
        }
    }

    /* Timeline Styling (Mobile Alternative to Tables) */
    .timeline-item {
        border-left: 2px solid #eee;
        padding-left: 1.5rem;
        position: relative;
        padding-bottom: 1.5rem;
    }
    .timeline-item::before {
        content: '';
        position: absolute;
        left: -7px;
        top: 0;
        width: 12px;
        height: 12px;
        background: var(--brand-gold);
        border-radius: 50%;
    }
</style>

<div class="container-fluid px-2 px-md-4">
    <div class="hero-banner mb-4 shadow-lg">
        <div class="row align-items-center">
            <div class="col-lg-8">
                <h6 class="text-warning fw-bold small text-uppercase mb-2" style="letter-spacing: 1.5px;">Academic Portal</h6>
                <h1 class="fw-bold mb-1">Hello, <?= htmlspecialchars($staff_display_name) ?>!</h1>
                <p class="opacity-75 mb-2 small d-none d-md-block">Welcome to your executive overview.</p>
                <div class="d-flex flex-column flex-md-row gap-2">
                    <a href="?page=profile" class="btn btn-warning px-4 py-2 fw-bold rounded-pill shadow-sm">
                        <i class="fas fa-user-edit me-2"></i>Edit Profile
                    </a>
                    <a href="<?= htmlspecialchars($staff_portfolio_private_url ?? 'view_portfolio.php?mode=private') ?>" target="_blank" class="btn btn-outline-light px-4 py-2 fw-bold rounded-pill">
                        <i class="fas fa-user-shield me-2"></i>Private View
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-4">
        <?php foreach ($dashboard_stats as $s): ?>
        <div class="col-6 col-md-3">
            <a href="?page=<?= urlencode($s['slug']) ?>" class="text-decoration-none text-reset d-block">
                <div class="kpi-card shadow-sm">
                    <div class="icon-box" style="background: <?= $s['color'] ?>15; color: <?= $s['color'] ?>;">
                        <i class="fas <?= $s['icon'] ?>"></i>
                    </div>
                    <h3 class="fw-bold mb-0"><?= (int) $s['val'] ?></h3>
                    <small class="text-muted text-uppercase fw-bold" style="font-size: 0.7rem;"><?= htmlspecialchars($s['label']) ?></small>
                </div>
            </a>
        </div>
        <?php endforeach; ?>
    </div>

    <div class="row g-4">
        <div class="col-12 col-lg-4">
            <div class="kpi-card">
                <h5 class="fw-bold text-navy mb-4">Quick Management</h5>
                <a href="?page=publications" class="quick-nav-item">
                    <div class="icon-box mb-0 me-3 bg-light" style="width:40px; height:40px; font-size:1rem;">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div>
                        <span class="fw-bold d-block small">Add Publication</span>
                        <small class="text-muted">Research & Papers</small>
                    </div>
                </a>
                <a href="?page=external" class="quick-nav-item">
                    <div class="icon-box mb-0 me-3 bg-light" style="width:40px; height:40px; font-size:1rem;">
                        <i class="fas fa-link"></i>
                    </div>
                    <div>
                        <span class="fw-bold d-block small">Sync Profiles</span>
                        <small class="text-muted">ORCID, Google Scholar</small>
                    </div>
                </a>
            </div>
        </div>

        <div class="col-12 col-lg-8">
            <div class="kpi-card">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="fw-bold text-navy m-0">Recent Activity</h5>
                    <a href="?page=history" class="btn btn-sm btn-light rounded-pill px-3 fw-bold">View All</a>
                </div>
                
                <div class="activity-feed">
                    <?php if (empty($recent_logs)): ?>
                        <div class="timeline-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1 fw-bold small">No recent activity</h6>
                                    <p class="text-muted small mb-0">Changes you submit will appear here.</p>
                                </div>
                            </div>
                        </div>
                    <?php else: ?>
                        <?php foreach ($recent_logs as $log): ?>
                            <?php
                            $payload = json_decode($log['change_payload'] ?? '', true);
                            if (!is_array($payload)) {
                                $payload = [];
                            }
                            $entity_key = (string)($log['entity_name'] ?? '');
                            $entity_label = $entity_labels[$entity_key] ?? ucwords(str_replace('_', ' ', $entity_key));
                            $action_label = ucfirst(strtolower((string)($log['action'] ?? 'Update')));
                            $item_title = trim($action_label . ' ' . $entity_label);
                            $item_detail = trim((string)($payload['title'] ?? $payload['name'] ?? $payload['degree'] ?? 'Record updated'));
                            $status = (string)($log['status'] ?? 'Pending');
                            $status_class = 'bg-warning-subtle text-warning';
                            if ($status === 'Approved') {
                                $status_class = 'bg-success-subtle text-success';
                            } elseif ($status === 'Rejected') {
                                $status_class = 'bg-danger-subtle text-danger';
                            }
                            ?>
                            <div class="timeline-item">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1 fw-bold small"><?= htmlspecialchars($item_title) ?></h6>
                                        <p class="text-muted small mb-0"><?= htmlspecialchars($item_detail) ?></p>
                                    </div>
                                    <span class="badge <?= $status_class ?> rounded-pill" style="font-size: 0.65rem;"><?= htmlspecialchars($status) ?></span>
                                </div>
                                <small class="text-muted mt-2 d-block"><?= htmlspecialchars(date('d M Y, h:i A', strtotime((string)$log['timestamp']))) ?></small>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>








<!-- <?php
// Note: Database connection and $user data are inherited from index.php
?>

<style>
    /* World Class Dashboard Styles */
    .stat-card {
        border: none;
        border-radius: 24px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: #ffffff;
    }
    .stat-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.05) !important;
    }
    .icon-shape {
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 18px;
        font-size: 1.5rem;
    }
    .welcome-banner {
        background: linear-gradient(135deg, #0d2c56 0%, #1a4a8d 100%);
        border-radius: 30px;
        position: relative;
        overflow: hidden;
    }
    .welcome-banner::after {
        content: '';
        position: absolute;
        top: -50px;
        right: -50px;
        width: 200px;
        height: 200px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
    }
    .quick-action-btn {
        border-radius: 15px;
        padding: 15px;
        transition: 0.2s;
        border: 1px solid #eee;
        text-decoration: none;
        display: block;
        color: #333;
    }
    .quick-action-btn:hover {
        background: #f8f9fa;
        border-color: var(--uni-gold);
        color: var(--uni-navy);
    }
    @media (max-width: 576px) {
        .welcome-banner { padding: 1.5rem !important; min-height: auto !important; border-radius: 18px !important; }
        .welcome-banner h1 { font-size: 1.8rem !important; }
        .stat-card { padding: 1rem !important; border-radius: 16px !important; }
        .icon-box-modern { width: 40px; height: 40px; border-radius: 10px; font-size: 1rem; }
    }
</style>

<div class="container-fluid p-0">
    <div class="welcome-banner p-5 mb-5 shadow-lg text-white">
        <div class="row align-items-center">
            <div class="col-lg-8">
                <h1 class="display-5 fw-bold mb-2">Welcome back, <?= htmlspecialchars($user['title'] . ' ' . $user['last_name']) ?>!</h1>
                <p class="fs-5 opacity-75 mb-0">Your academic portfolio is currently <span class="text-warning fw-bold">85% complete</span>. Keep it updated to stay visible.</p>
            </div>
            <div class="col-lg-4 text-lg-end mt-4 mt-lg-0">
                <a href="view_portfolio.php?staff_id=<?= $staff_id ?>"  target="_blank" class="btn btn-light btn-lg px-4 py-3 fw-bold rounded-pill shadow-sm">
                    <i class="fas fa-eye me-2"></i> View Portfolio
                </a>
            </div>
        </div>
    </div>

    <div class="row g-4 mb-5">
        <div class="col-md-3">
            <div class="card stat-card p-4 shadow-sm">
                <div class="d-flex align-items-center">
                    <div class="icon-shape bg-primary bg-opacity-10 text-primary me-3">
                        <i class="fas fa-book"></i>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1 fw-bold small">PUBLICATIONS</h6>
                        <h3 class="fw-bold mb-0">24</h3>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stat-card p-4 shadow-sm">
                <div class="d-flex align-items-center">
                    <div class="icon-shape bg-success bg-opacity-10 text-success me-3">
                        <i class="fas fa-users"></i>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1 fw-bold small">SUPERVISIONS</h6>
                        <h3 class="fw-bold mb-0">12</h3>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stat-card p-4 shadow-sm">
                <div class="d-flex align-items-center">
                    <div class="icon-shape bg-warning bg-opacity-10 text-warning me-3">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1 fw-bold small">ACTIVE GRANTS</h6>
                        <h3 class="fw-bold mb-0">3</h3>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stat-card p-4 shadow-sm">
                <div class="d-flex align-items-center">
                    <div class="icon-shape bg-info bg-opacity-10 text-info me-3">
                        <i class="fas fa-history"></i>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1 fw-bold small">PENDING LOGS</h6>
                        <h3 class="fw-bold mb-0">5</h3>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-4">
        <div class="col-lg-4">
            <div class="card stat-card p-4 h-100 shadow-sm">
                <h5 class="fw-bold text-navy mb-4">Quick Management</h5>
                <div class="d-grid gap-3">
                    <a href="?page=profile" class="quick-action-btn">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-user-edit me-3 text-muted"></i>
                            <div>
                                <span class="fw-bold d-block">Update Biography</span>
                                <small class="text-muted">Edit your professional summary</small>
                            </div>
                        </div>
                    </a>
                    <a href="?page=publications" class="quick-action-btn">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-plus-circle me-3 text-muted"></i>
                            <div>
                                <span class="fw-bold d-block">Add Publication</span>
                                <small class="text-muted">Upload your latest research</small>
                            </div>
                        </div>
                    </a>
                    <a href="?page=external" class="quick-action-btn">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-link me-3 text-muted"></i>
                            <div>
                                <span class="fw-bold d-block">Sync Web Profiles</span>
                                <small class="text-muted">Link ORCID or Google Scholar</small>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>

        <div class="col-lg-8">
            <div class="card stat-card p-4 h-100 shadow-sm">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="fw-bold text-navy m-0">System Activity History</h5>
                    <a href="?page=history" class="btn btn-sm btn-outline-dark rounded-pill px-3">View All</a>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light">
                            <tr>
                                <th class="border-0 small fw-bold text-muted">ACTION</th>
                                <th class="border-0 small fw-bold text-muted">ENTITY</th>
                                <th class="border-0 small fw-bold text-muted">STATUS</th>
                                <th class="border-0 small fw-bold text-muted text-end">DATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span class="badge bg-success-subtle text-success px-2">CREATE</span></td>
                                <td class="fw-medium">New Publication Added</td>
                                <td><span class="badge bg-warning text-dark">Pending Review</span></td>
                                <td class="text-end text-muted small">2 hours ago</td>
                            </tr>
                            <tr>
                                <td><span class="badge bg-info-subtle text-info px-2">UPDATE</span></td>
                                <td class="fw-medium">Biography Updated</td>
                                <td><span class="badge bg-success">Approved</span></td>
                                <td class="text-end text-muted small">Yesterday</td>
                            </tr>
                            <tr>
                                <td><span class="badge bg-danger-subtle text-danger px-2">DELETE</span></td>
                                <td class="fw-medium">Old Grant Record</td>
                                <td><span class="badge bg-success">Approved</span></td>
                                <td class="text-end text-muted small">3 days ago</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div> -->
