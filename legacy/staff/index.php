<?php
// 1. INITIALIZATION & SESSION
session_start();
require_once '../config/db.php'; // Uncomment when connected
require_once '../includes/notification_helper.php';
$role = $_SESSION['role'] ?? '';
if (!isset($_SESSION['user_id']) || $role !== 'Staff') {
    header("Location: ../login.php");
    exit();
}

$mustStmt = $pdo->prepare("SELECT must_change_password FROM user_account WHERE user_id = ? LIMIT 1");
$mustStmt->execute([$_SESSION['user_id']]);
if ((int)$mustStmt->fetchColumn() === 1) {
    $_SESSION['force_reset'] = true;
    header("Location: ../auth/change_password.php");
    exit();
}
unset($_SESSION['force_reset']);
ensureReviewAndNotificationSchema($pdo);

$staff_id = $_SESSION['staff_id'] ?? null;
$user_id = $_SESSION['user_id'] ?? null;

if ($staff_id) {
    $stmt = $pdo->prepare("
        SELECT s.*, r.rank_name, d.name as department_name 
        FROM staff s 
        LEFT JOIN academic_rank r ON s.rank_id = r.rank_id 
        LEFT JOIN department d ON s.department_id = d.department_id 
        WHERE s.staff_id = ?
    ");
    $stmt->execute([$staff_id]);
} else {
    $stmt = $pdo->prepare("
        SELECT s.*, r.rank_name, d.name as department_name 
        FROM user_account ua
        LEFT JOIN staff s ON ua.staff_id = s.staff_id
        LEFT JOIN academic_rank r ON s.rank_id = r.rank_id 
        LEFT JOIN department d ON s.department_id = d.department_id 
        WHERE ua.user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
}

$user = $stmt->fetch();
if (!$user) {
    $user = [
        'title' => '',
        'first_name' => $_SESSION['username'] ?? 'Staff',
        'last_name' => '',
    ];
}
$staff_id = $staff_id ?: ($user['staff_id'] ?? null);

$staff_full_name = trim(
    ($user['title'] ?? '') . ' ' .
    ($user['first_name'] ?? '') . ' ' .
    ($user['last_name'] ?? '')
);
if ($staff_full_name === '') {
    $staff_full_name = $_SESSION['username'] ?? 'Staff';
}

$initial_first = strtoupper(substr((string)($user['first_name'] ?? ''), 0, 1));
$initial_last = strtoupper(substr((string)($user['last_name'] ?? ''), 0, 1));
$staff_initials = trim($initial_first . $initial_last);
if ($staff_initials === '') {
    $staff_initials = strtoupper(substr((string)$staff_full_name, 0, 2));
}

$staff_portfolio_public_url = 'view_portfolio.php?mode=public';
$staff_portfolio_private_url = 'view_portfolio.php?mode=private';
if (!empty($staff_id)) {
    $staff_portfolio_public_url = 'view_portfolio.php?staff_id=' . urlencode((string)$staff_id) . '&mode=public';
    $staff_portfolio_private_url = 'view_portfolio.php?staff_id=' . urlencode((string)$staff_id) . '&mode=private';
}

$unread_notifications_count = countUnreadStaffNotifications($pdo, (int)$user_id);
$top_notifications = fetchStaffNotifications($pdo, (int)$user_id, 8);
// 2. ROUTING & FILE MAPPING
// This maps the URL 'page' parameter to the actual physical file in your directory
// Format: 'url_slug' => ['file' => 'real_filename.php', 'title' => 'Page Title']
$routes = [
    'dashboard'       => ['file' => 'dashboard.php',       'title' => 'Dashboard'],
    'profile'         => ['file' => 'profile_edit.php',    'title' => 'Personal Information'],
    'qualifications'  => ['file' => 'qualifications.php',  'title' => 'Qualifications'],
    'research'        => ['file' => 'research_areas.php',  'title' => 'Research Areas'],
    'publications'    => ['file' => 'publications.php',    'title' => 'Publications'],
    'courses'         => ['file' => 'courses.php',         'title' => 'Courses'],
    'grants'          => ['file' => 'grants.php',          'title' => 'Grants'],
    'supervision'     => ['file' => 'supervision.php',     'title' => 'Supervision'],
    'memberships'     => ['file' => 'memberships.php',     'title' => 'Memberships'],
    'external'        => ['file' => 'external_profiles.php','title' => 'External Profiles'],
    'history'         => ['file' => 'change_history.php',  'title' => 'System History'],
];

// Get current page or default to dashboard
$page_slug = $_GET['page'] ?? 'dashboard';

// Security: Check if page exists in our whitelist, otherwise 404
if (array_key_exists($page_slug, $routes)) {
    $current_page = $routes[$page_slug];
} else {
    $current_page = ['file' => '404', 'title' => 'Page Not Found'];
}

// Helper for Sidebar Active State
function isActive($slug) {
    global $page_slug;
    return $page_slug === $slug ? 'active bg-warning text-dark fw-bold shadow-sm' : 'text-white-50 hover-white';
}

function routeUrl($slug) {
    global $routes;
    return array_key_exists($slug, $routes) ? '?page=' . $slug : '?page=dashboard';
}

$sidebar_sections = [
    [
        'title' => null,
        'items' => [
            ['slug' => 'dashboard', 'icon' => 'fa-th-large', 'label' => 'Dashboard'],
        ],
    ],
    [
        'title' => 'My Profile',
        'items' => [
            ['slug' => 'profile', 'icon' => 'fa-user-edit', 'label' => 'Personal Info'],
            ['slug' => 'qualifications', 'icon' => 'fa-certificate', 'label' => 'Qualifications'],
            ['slug' => 'memberships', 'icon' => 'fa-id-card', 'label' => 'Memberships'],
            ['slug' => 'external', 'icon' => 'fa-globe', 'label' => 'Web Profiles'],
        ],
    ],
    [
        'title' => 'Academic Output',
        'items' => [
            ['slug' => 'research', 'icon' => 'fa-microscope', 'label' => 'Research Areas'],
            ['slug' => 'publications', 'icon' => 'fa-book-open', 'label' => 'Publications'],
            ['slug' => 'supervision', 'icon' => 'fa-users-cog', 'label' => 'Supervision'],
        ],
    ],
    [
        'title' => 'Teaching & Grants',
        'items' => [
            ['slug' => 'courses', 'icon' => 'fa-chalkboard-teacher', 'label' => 'Courses'],
            ['slug' => 'grants', 'icon' => 'fa-file-invoice-dollar', 'label' => 'Grants'],
        ],
    ],
    [
        'title' => 'System',
        'items' => [
            ['slug' => 'history', 'icon' => 'fa-history', 'label' => 'Change History'],
        ],
    ],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Portal | <?= $current_page['title'] ?></title>
    <link rel="icon" type="image/jpeg" href="../images/jostum.jpeg">
    
    <link rel="stylesheet" href="../assets/css/fonts.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --shell-brown: #5b3a29;
            --shell-brown-deep: #4a2f21;
            --shell-gold: #c8a36b;
            --uni-navy: var(--shell-brown);
            --uni-gold: var(--shell-gold);
            --sidebar-width: 260px;
            --navbar-height: 60px;
        }
        body { background-color: #f8f9fa; font-family: 'Ubuntu', sans-serif; }

        /* HEADER */
        .navbar-main {
            background: var(--shell-brown);
            border-bottom: 4px solid var(--shell-gold);
            height: var(--navbar-height);
            z-index: 1050;
        }

        /* SIDEBAR */
        .sidebar-wrapper {
            position: fixed;
            top: var(--navbar-height);
            bottom: 0;
            left: 0;
            width: var(--sidebar-width);
            background: var(--shell-brown);
            overflow-y: auto;
            transition: all 0.3s;
            z-index: 1040;
            padding-bottom: 2rem;
        }
        
        .sidebar-section-title {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #adb5bd;
            margin: 1.5rem 0 0.5rem 1rem;
            font-weight: 700;
        }

        .nav-link {
            font-size: 0.9rem;
            padding: 0.75rem 1.25rem;
            border-radius: 0 25px 25px 0; /* Rounded tabs on right */
            margin-right: 1rem;
            transition: all 0.2s;
        }
        .nav-link i { width: 25px; text-align: center; }
        .hover-white:hover {
            color: #fff !important;
            background: rgba(255,255,255,0.05);
            padding-left: 1.5rem;
        }

        /* MAIN CONTENT */
        .main-content {
            margin-top: var(--navbar-height);
            margin-left: var(--sidebar-width);
            padding: 2rem;
            min-height: calc(100vh - var(--navbar-height));
            transition: all 0.3s;
        }

        /* Responsive Fixes */
        @media (max-width: 992px) {
            .sidebar-wrapper { left: -100%; width: 100%; }
            .sidebar-wrapper.show { left: 0; }
            .main-content { margin-left: 0; }
        }

        .text-navy { color: var(--shell-brown) !important; }
        .bg-navy { background-color: var(--shell-brown) !important; }
        .btn-navy {
            background: var(--shell-brown);
            color: #fff;
            border: 1px solid var(--shell-brown);
        }
        .btn-navy:hover,
        .btn-navy:focus {
            background: var(--shell-brown-deep);
            border-color: var(--shell-brown-deep);
            color: #fff;
        }

        /* Uniform typography and control sizing across all staff pages */
        .main-content,
        .main-content p,
        .main-content small,
        .main-content .small,
        .main-content .text-muted,
        .main-content .form-text,
        .main-content .btn,
        .main-content .badge,
        .main-content .form-control,
        .main-content .form-select,
        .main-content .input-group-text {
            font-size: 0.95rem;
        }
        .main-content .form-label {
            font-size: 0.82rem;
        }
        .main-content .form-control-lg,
        .main-content .form-select-lg {
            font-size: 0.95rem;
            padding: 0.55rem 0.8rem;
        }
        .main-content .form-control::placeholder,
        .main-content .form-select::placeholder,
        .main-content textarea::placeholder,
        .main-content input::placeholder {
            font-size: 0.95rem;
            color: #8a9198;
            opacity: 1;
        }
        .main-content .modal-content {
            font-size: 0.95rem;
        }
        .main-content .modal-title {
            font-size: 1.05rem;
        }

        .notif-btn {
            position: relative;
            color: #fff;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.18);
            text-decoration: none;
        }
        .notif-btn:hover { color: #fff; background: rgba(255,255,255,0.2); }
        .notif-badge {
            position: absolute;
            top: -5px;
            right: -6px;
            background: #dc3545;
            color: #fff;
            border-radius: 999px;
            min-width: 19px;
            height: 19px;
            font-size: 0.7rem;
            line-height: 19px;
            text-align: center;
            font-weight: 700;
            padding: 0 4px;
        }
        .notif-menu {
            width: min(420px, 92vw);
            max-height: 420px;
            overflow-y: auto;
        }
        .notif-item {
            display: block;
            text-decoration: none;
            color: #212529;
            border-bottom: 1px solid #f0f0f0;
            padding: 0.65rem 0.85rem;
        }
        .notif-item:last-child { border-bottom: none; }
        .notif-item.unread { background: #fff8ef; }
        .notif-item:hover { background: #f7f7f7; color: #212529; }
        .notif-title { font-weight: 700; font-size: 0.88rem; }
        .notif-msg { font-size: 0.84rem; color: #495057; }
        .notif-time { font-size: 0.75rem; color: #6c757d; }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark navbar-main fixed-top shadow">
  <div class="container-fluid">
    <button class="btn btn-link text-white d-lg-none me-2" type="button" onclick="document.querySelector('.sidebar-wrapper').classList.toggle('show')">
        <i class="fas fa-bars"></i>
    </button>

    <a class="navbar-brand d-flex align-items-center" href="?page=dashboard">
        <i class="fas fa-university me-2 text-warning"></i>
        <span class="fw-bold tracking-tight">Staff Portfolio</span>
    </a>

    <div class="ms-auto d-flex align-items-center gap-3">
        <a href="<?= htmlspecialchars($staff_portfolio_public_url) ?>" target="_blank" class="btn btn-outline-warning btn-sm d-none d-md-block">
            <i class="fas fa-external-link-alt me-1"></i> Public View
        </a>

        <div class="dropdown">
            <a href="#" class="notif-btn" data-bs-toggle="dropdown" aria-expanded="false" title="Notifications">
                <i class="fas fa-bell"></i>
                <?php if ($unread_notifications_count > 0): ?>
                    <span class="notif-badge"><?= $unread_notifications_count > 99 ? '99+' : (int)$unread_notifications_count ?></span>
                <?php endif; ?>
            </a>
            <div class="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-0 notif-menu">
                <div class="px-3 py-2 border-bottom bg-light">
                    <div class="fw-bold">Notifications</div>
                    <div class="small text-muted"><?= (int)$unread_notifications_count ?> unread</div>
                </div>
                <?php if (empty($top_notifications)): ?>
                    <div class="px-3 py-3 text-muted small">No notifications yet.</div>
                <?php else: ?>
                    <?php foreach ($top_notifications as $n): ?>
                        <a class="notif-item <?= ((int)$n['is_read'] === 0) ? 'unread' : '' ?>" href="notification_open.php?id=<?= (int)$n['notification_id'] ?>">
                            <div class="notif-title"><?= htmlspecialchars((string)$n['title']) ?></div>
                            <div class="notif-msg"><?= htmlspecialchars((string)$n['message']) ?></div>
                            <div class="notif-time"><?= htmlspecialchars(date('d M Y, h:i A', strtotime((string)$n['created_at']))) ?></div>
                        </a>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
        
        <div class="dropdown">
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown">
                <div class="bg-warning rounded-circle d-flex justify-content-center align-items-center text-dark fw-bold me-2" style="width:35px; height:35px;">
                    <?= htmlspecialchars($staff_initials) ?>
                </div>
                <span class="d-none d-sm-inline small fw-bold"><?= htmlspecialchars($staff_full_name) ?></span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                <li><a class="dropdown-item" href="<?= routeUrl('profile') ?>"><i class="fas fa-user-circle me-2"></i> Profile</a></li>
                <li><a class="dropdown-item" href="<?= routeUrl('history') ?>"><i class="fas fa-cog me-2"></i> Settings</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="../logout.php"><i class="fas fa-sign-out-alt me-2"></i> Sign out</a></li>
            </ul>
        </div>
    </div>
  </div>
</nav>

<aside class="sidebar-wrapper">
    <div class="pt-3">
        <ul class="nav nav-pills flex-column">
            <?php foreach ($sidebar_sections as $section): ?>
                <?php if (!empty($section['title'])): ?>
                    <div class="sidebar-section-title"><?= htmlspecialchars($section['title']) ?></div>
                <?php endif; ?>
                <?php foreach ($section['items'] as $item): ?>
                    <li class="nav-item">
                        <a href="<?= routeUrl($item['slug']) ?>" class="nav-link <?= isActive($item['slug']) ?>">
                            <i class="fas <?= htmlspecialchars($item['icon']) ?>"></i> <?= htmlspecialchars($item['label']) ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            <?php endforeach; ?>
        </ul>
    </div>
</aside>

<main class="main-content">
    
    <nav aria-label="breadcrumb" class="mb-4">
        <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="?page=dashboard" class="text-decoration-none text-muted">Home</a></li>
            <li class="breadcrumb-item active" aria-current="page"><?= $current_page['title'] ?></li>
        </ol>
    </nav>

    <div class="content-wrapper fade-in">
        <?php
            $file_path = $current_page['file'];
            
            // Check if the file physically exists before including
            if (file_exists($file_path)) {
                include $file_path;
            } else {
                // Fallback UI if the file is missing
                echo "
                <div class='card border-danger shadow-sm'>
                    <div class='card-body text-center py-5'>
                        <i class='fas fa-exclamation-triangle text-danger fa-3x mb-3'></i>
                        <h3>File Not Found</h3>
                        <p class='text-muted'>The file <code>{$file_path}</code> could not be found in the directory.</p>
                        <a href='?page=dashboard' class='btn btn-secondary'>Return to Dashboard</a>
                    </div>
                </div>";
            }
        ?>
    </div>

</main>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
