<?php
// admin/index.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();
require_once '../config/db.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'Admin') {
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

// 1. INITIALIZATION (Assuming admin session exists)
// If you have specific admin data to fetch, you'd do it here similar to the staff code
// $admin_id = $_SESSION['admin_id']; 

// 2. ROUTING & FILE MAPPING
// Using the structured array approach from the staff code
$routes = [
    'dashboard'   => ['file' => 'dashboard.php',   'title' => 'Admin Dashboard'],
    'staff'       => ['file' => 'manage_staff.php', 'title' => 'Staff Directory'],
    'colleges'    => ['file' => 'colleges.php',  'title' => 'Colleges / Faculties'],
    'departments' => ['file' => 'departments.php',  'title' => 'Departments'],
    'ranks'       => ['file' => 'ranks.php',  'title' => 'Academic Ranks'],
    'review'      => ['file' => 'review_change.php', 'title' => 'Review Change Request'],
    'requests'    => ['file' => 'request_changes.php', 'title' => 'Change Requests'],
    'request_history' => ['file' => 'staff_request_history.php', 'title' => 'Staff Request History'],
    '404'         => ['file' => '404.php',         'title' => 'Page Not Found'],
];

// Get current page or default to dashboard
$page_slug = $_GET['page'] ?? 'dashboard';

// Security: Check if page exists in our whitelist
if (array_key_exists($page_slug, $routes)) {
    $current_page = $routes[$page_slug];
} else {
    $current_page = $routes['404'];
}

// Helper for Active Menu Highlighting (Updated to match your admin CSS)
function isActive($slug) {
    global $page_slug;
    return $page_slug === $slug ? 'active-nav' : 'text-white-50 hover-light';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Portal | <?= $current_page['title'] ?></title>
    <link rel="icon" type="image/jpeg" href="../images/jostum.jpeg">
    
    <link rel="stylesheet" href="../assets/css/fonts.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --shell-brown: #5b3a29;
            --shell-brown-deep: #4a2f21;
            --shell-gold: #c8a36b;
            --uni-green: var(--shell-brown);
            --uni-gold: var(--shell-gold);
            --sidebar-width: 260px;
            --topbar-height: 60px;
        }

        body { 
            background-color: #f4f6f8; 
            font-family: 'Ubuntu', sans-serif; 
            overflow-x: hidden;
        }

        .sidebar-wrapper, .navbar-main {
            background-color: var(--uni-green);
        }

        .navbar-main {
            height: var(--topbar-height);
            border-bottom: 4px solid var(--uni-gold);
            z-index: 1050;
        }

        .sidebar-wrapper {
            position: fixed;
            top: var(--topbar-height);
            bottom: 0;
            left: 0;
            width: var(--sidebar-width);
            border-right: 1px solid rgba(255,255,255,0.1);
            overflow-y: auto;
            z-index: 1040;
            padding-top: 1rem;
        }

        .nav-link {
            font-size: 0.95rem;
            padding: 0.85rem 1.5rem;
            margin: 0.2rem 0;
            transition: all 0.2s;
            border-left: 4px solid transparent;
            color: rgba(255,255,255,0.7);
        }

        .hover-light:hover {
            background: rgba(255,255,255,0.1);
            color: white !important;
            padding-left: 1.75rem;
        }

        .active-nav {
            background: rgba(200, 163, 107, 0.18);
            color: #fff !important;
            border-left-color: var(--uni-gold);
            font-weight: 600;
        }

        .sidebar-heading {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: rgba(255,255,255,0.4);
            padding: 1.5rem 1.5rem 0.5rem;
            font-weight: 700;
        }

        .main-content {
            margin-top: var(--topbar-height);
            margin-left: var(--sidebar-width);
            padding: 2rem;
            min-height: calc(100vh - var(--topbar-height));
            transition: margin 0.3s;
        }

        .card { border: none; box-shadow: 0 2px 15px rgba(0,0,0,0.03); border-radius: 10px; }
        
        @media (max-width: 992px) {
            .sidebar-wrapper { left: -100%; width: 100%; transition: left 0.3s; }
            .sidebar-wrapper.show { left: 0; }
            .main-content { margin-left: 0; }
        }
        /* Custom SweetAlert2 Styling */
.uni-toast-title {
    font-weight: 600 !important;
    font-family: 'Ubuntu', sans-serif !important;
}

.uni-popup {
    border-radius: 15px !important;
    padding: 2rem !important;
}

.uni-confirm-button {
    background-color: #dc3545 !important; /* Bootstrap Danger */
    box-shadow: 0 4px 10px rgba(220, 53, 69, 0.3) !important;
    padding: 10px 30px !important;
    font-weight: 600 !important;
}

.uni-cancel-button {
    background-color: #f8f9fa !important;
    color: #6c757d !important;
    border: 1px solid #dee2e6 !important;
    padding: 10px 30px !important;
    font-weight: 600 !important;
}

.btn-admin {
    background-color: var(--uni-green);
    color: #fff;
    border: 1px solid var(--uni-green);
}
.btn-admin:hover,
.btn-admin:focus {
    background-color: var(--shell-brown-deep);
    border-color: var(--shell-brown-deep);
    color: #fff;
}
    </style>
</head>
<body>

    <nav class="navbar navbar-expand-lg navbar-dark navbar-main fixed-top">
        <div class="container-fluid">
            <button class="btn text-white d-lg-none me-2" onclick="document.querySelector('.sidebar-wrapper').classList.toggle('show')">
                <i class="fas fa-bars"></i>
            </button>

            <a class="navbar-brand d-flex align-items-center fw-bold" href="?page=dashboard">
                <i class="fas fa-shield-alt me-2 text-warning"></i> 
                ADMIN PORTAL
            </a>

            <div class="ms-auto d-flex align-items-center gap-3">
                <div class="dropdown">
                    <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown">
                        <div class="bg-warning text-dark rounded-circle d-flex justify-content-center align-items-center fw-bold me-2" style="width:32px; height:32px;">A</div>
                        <span class="d-none d-sm-inline small">Administrator</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                        <li><a class="dropdown-item" href="#"><i class="fas fa-cog me-2"></i> Settings</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="../logout.php"><i class="fas fa-sign-out-alt me-2"></i> Logout</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>

    <aside class="sidebar-wrapper">
        <div class="nav flex-column">
            
            <a href="?page=dashboard" class="nav-link <?= isActive('dashboard') ?>">
                <i class="fas fa-th-large me-3" style="width:20px"></i> Dashboard
            </a>

            <div class="sidebar-heading">Management</div>
            
            <a href="?page=colleges" class="nav-link <?= isActive('colleges') ?>">
                <i class="fas fa-university me-3" style="width:20px"></i> Colleges / Faculties
            </a>
             <a href="?page=departments" class="nav-link <?= isActive('departments') ?>">
                <i class="fas fa-building me-3" style="width:20px"></i> Departments
            </a>
            <a href="?page=staff" class="nav-link <?= isActive('staff') ?>">
                <i class="fas fa-users me-3" style="width:20px"></i> Staff Directory
            </a>
            <a href="?page=ranks" class="nav-link <?= isActive('ranks') ?>">
                <i class="fas fa-user-tie me-3" style="width:20px"></i> Academic Ranks
            </a>
            <!-- <a href="?page=requests" class="nav-link <?= isActive('requests') ?>">
                <i class="fas fa-clipboard-list me-3" style="width:20px"></i> Change Requests
            </a> -->
            <a href="?page=requests" class="nav-link <?= isActive('requests') ?>">
                <i class="fas fa-tasks me-3" style="width:20px"></i> Change Requests
            </a>
            
           

        </div>
    </aside>
  

    <main class="main-content">
        <nav aria-label="breadcrumb" class="mb-4">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="?page=dashboard" class="text-decoration-none text-success">Home</a></li>
                <li class="breadcrumb-item active" aria-current="page"><?= $current_page['title'] ?></li>
            </ol>
        </nav>

        <div class="content-wrapper">
            <?php 
                $file_path = $current_page['file'];
                
                if (file_exists($file_path)) {
                    include $file_path; 
                } else {
                    // Use the styled error card from the staff code
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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>
</html>
