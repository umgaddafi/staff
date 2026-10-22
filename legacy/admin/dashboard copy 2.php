<?php
// admin/dashboard.php
// Note: Session and DB are already loaded by index.php

// 1. Local Data Fetching
$stats = [
    'pending' => $pdo->query("SELECT COUNT(*) FROM change_log WHERE status = 'Pending'")->fetchColumn(),
    'staff'   => $pdo->query("SELECT COUNT(*) FROM staff WHERE is_active = 1")->fetchColumn(),
    'pubs'    => $pdo->query("SELECT COUNT(*) FROM publication")->fetchColumn(),
];

$pending_stmt = $pdo->query("SELECT cl.*, s.first_name, s.last_name 
                             FROM change_log cl 
                             LEFT JOIN user_account ua ON cl.user_id = ua.user_id
                             LEFT JOIN staff s ON ua.staff_id = s.staff_id
                             WHERE cl.status = 'Pending' 
                             ORDER BY cl.timestamp ASC LIMIT 5");
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="fw-bold text-dark mb-1">Dashboard Overview</h4>
        <p class="text-muted small mb-0">System Summary & Alerts</p>
    </div>
    <div class="text-end">
        <span class="badge bg-white text-dark border p-2 shadow-sm">
            <i class="far fa-calendar-alt me-1"></i> <?= date('F d, Y') ?>
        </span>
    </div>
</div>

<div class="row g-4 mb-4">
    <div class="col-md-4">
        <div class="card p-3 h-100 border-start border-4 border-warning">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="text-muted text-uppercase small fw-bold">Pending Requests</h6>
                    <h2 class="mb-0 fw-bold"><?= $stats['pending'] ?></h2>
                </div>
                <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
                    <i class="fas fa-exclamation-triangle fa-lg"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card p-3 h-100 border-start border-4 border-success">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="text-muted text-uppercase small fw-bold">Active Staff</h6>
                    <h2 class="mb-0 fw-bold"><?= $stats['staff'] ?></h2>
                </div>
                <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                    <i class="fas fa-users fa-lg"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card p-3 h-100 border-start border-4 border-primary">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="text-muted text-uppercase small fw-bold">Total Publications</h6>
                    <h2 class="mb-0 fw-bold"><?= $stats['pubs'] ?></h2>
                </div>
                <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                    <i class="fas fa-book fa-lg"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="card">
    <div class="card-header bg-white py-3">
        <h6 class="mb-0 fw-bold">Pending Approval Queue</h6>
    </div>
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th class="ps-4">Staff Name</th>
                    <th>Action Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php while($row = $pending_stmt->fetch()): ?>
                <tr>
                    <td class="ps-4 fw-bold"><?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?></td>
                    <td>Update <?= htmlspecialchars($row['entity_name']) ?></td>
                    <td class="text-muted small"><?= date('M d', strtotime($row['timestamp'])) ?></td>
                    <td><span class="badge bg-warning text-dark">Pending</span></td>
                    <td><button class="btn btn-sm btn-outline-dark">Review</button></td>
                </tr>
                <?php endwhile; ?>
                <?php if($pending_stmt->rowCount() == 0): ?>
                    <tr><td colspan="5" class="text-center py-4 text-muted">No pending items.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>














<!-- <?php 
// 1. INITIALIZATION & SESSION
session_start();
require '../config/db.php';

// AUTH CHECK (Uncomment for production)
// if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'Admin') {
//     header("Location: ../auth/login.php");
//     exit;
// }

// 2. DATA FETCHING (Preserving your existing logic)
$stats = [
    'pending' => $pdo->query("SELECT COUNT(*) FROM change_log WHERE status = 'Pending'")->fetchColumn(),
    'staff'   => $pdo->query("SELECT COUNT(*) FROM staff WHERE is_active = 1")->fetchColumn(),
    'pubs'    => $pdo->query("SELECT COUNT(*) FROM publication")->fetchColumn(),
    'users'   => $pdo->query("SELECT COUNT(*) FROM user_account")->fetchColumn() // Added extra stat
];

// Fetch Pending Queue
$stmt = $pdo->query("SELECT cl.*, s.first_name, s.last_name, s.staff_number 
                     FROM change_log cl 
                     LEFT JOIN user_account ua ON cl.user_id = ua.user_id
                     LEFT JOIN staff s ON ua.staff_id = s.staff_id
                     WHERE cl.status = 'Pending' 
                     ORDER BY cl.timestamp ASC LIMIT 5");

// Helper for Sidebar Active State (Hardcoded for this file)
function isActive($page) {
    return $page === 'dashboard' ? 'active bg-warning text-dark fw-bold shadow-sm' : 'text-white-50 hover-white';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Portal | Dashboard</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            /* Colors extracted from your University Image */
            --uni-green: #145928; /* The deep green background */
            --uni-gold: #d4af37;  /* The accent gold */
            --sidebar-width: 260px;
            --navbar-height: 60px;
        }
        body { background-color: #f4f6f8; font-family: 'Ubuntu', sans-serif; }

        /* HEADER */
        .navbar-main {
            background: var(--uni-green);
            border-bottom: 4px solid var(--uni-gold);
            height: var(--navbar-height);
            z-index: 1050;
        }

        /* SIDEBAR - Exactly matching index.php structure */
        .sidebar-wrapper {
            position: fixed;
            top: var(--navbar-height);
            bottom: 0;
            left: 0;
            width: var(--sidebar-width);
            background: #1e2124; /* Slightly darker for Admin distinction */
            overflow-y: auto;
            transition: all 0.3s;
            z-index: 1040;
            padding-bottom: 2rem;
        }
        
        .sidebar-section-title {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #6c757d;
            margin: 1.5rem 0 0.5rem 1rem;
            font-weight: 700;
        }

        .nav-link {
            font-size: 0.9rem;
            padding: 0.75rem 1.25rem;
            border-radius: 0 25px 25px 0; 
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

        /* DASHBOARD WIDGETS (New) */
        .stat-card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.04);
            transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-3px); }
        .icon-circle {
            width: 48px; height: 48px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
        }

        .table-card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            overflow: hidden;
        }
        .table thead th {
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.5px;
            background-color: #f8f9fa;
            border-bottom: 2px solid #e9ecef;
        }

        /* Responsive */
        @media (max-width: 992px) {
            .sidebar-wrapper { left: -100%; width: 100%; }
            .sidebar-wrapper.show { left: 0; }
            .main-content { margin-left: 0; }
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark navbar-main fixed-top shadow">
  <div class="container-fluid">
    <button class="btn btn-link text-white d-lg-none me-2" type="button" onclick="document.querySelector('.sidebar-wrapper').classList.toggle('show')">
        <i class="fas fa-bars"></i>
    </button>

    <a class="navbar-brand d-flex align-items-center" href="#">
        <i class="fas fa-university me-2 text-white"></i> 
        <span class="fw-bold tracking-tight">Admin Console</span>
    </a>

    <div class="d-none d-md-block mx-auto w-50">
        <div class="input-group">
            <span class="input-group-text bg-white border-0"><i class="fas fa-search text-muted"></i></span>
            <input type="text" class="form-control border-0" placeholder="Search staff, departments, or logs...">
        </div>
    </div>

    <div class="ms-auto d-flex align-items-center gap-3">
        <div class="position-relative me-2 cursor-pointer">
            <i class="fas fa-bell text-white fs-5"></i>
            <?php if($stats['pending'] > 0): ?>
            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
                <?= $stats['pending'] ?>
            </span>
            <?php endif; ?>
        </div>
        
        <div class="dropdown">
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown">
                <div class="bg-white rounded-circle d-flex justify-content-center align-items-center text-success fw-bold me-2" style="width:35px; height:35px;">
                    AD
                </div>
                <span class="d-none d-sm-inline small fw-bold">Administrator</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                <li><a class="dropdown-item" href="#"><i class="fas fa-user-shield me-2"></i> Admin Profile</a></li>
                <li><a class="dropdown-item" href="settings.php"><i class="fas fa-cogs me-2"></i> System Settings</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="../auth/logout.php"><i class="fas fa-sign-out-alt me-2"></i> Sign out</a></li>
            </ul>
        </div>
    </div>
  </div>
</nav>

<aside class="sidebar-wrapper">
    <div class="pt-3">
        <ul class="nav nav-pills flex-column">
            <li class="nav-item">
                <a href="dashboard.php" class="nav-link <?= isActive('dashboard') ?>">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
            </li>

            <div class="sidebar-section-title">Directory Management</div>
            <li><a href="manage_staff.php" class="nav-link text-white-50 hover-white"><i class="fas fa-users"></i> Staff Directory</a></li>
            <li><a href="departments.php" class="nav-link text-white-50 hover-white"><i class="fas fa-building"></i> Departments</a></li>
            <li><a href="academic_ranks.php" class="nav-link text-white-50 hover-white"><i class="fas fa-graduation-cap"></i> Academic Ranks</a></li>

            <div class="sidebar-section-title">Approvals & Logs</div>
            <li>
                <a href="pending_requests.php" class="nav-link text-white-50 hover-white d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-clipboard-check"></i> Pending Requests</span>
                    <?php if($stats['pending'] > 0): ?>
                        <span class="badge bg-warning text-dark rounded-pill"><?= $stats['pending'] ?></span>
                    <?php endif; ?>
                </a>
            </li>
            <li><a href="audit_logs.php" class="nav-link text-white-50 hover-white"><i class="fas fa-history"></i> Audit Logs</a></li>

            <div class="sidebar-section-title">System</div>
            <li><a href="backup.php" class="nav-link text-white-50 hover-white"><i class="fas fa-database"></i> Database Backup</a></li>
            <li><a href="settings.php" class="nav-link text-white-50 hover-white"><i class="fas fa-sliders-h"></i> Configuration</a></li>
        </ul>
    </div>
</aside>

<main class="main-content">
    
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-bold text-dark mb-1">Administrative Overview</h4>
            <p class="text-muted small mb-0">Welcome to the Joseph Sarwuan Tarka University Admin Portal.</p>
        </div>
        <button class="btn btn-success shadow-sm" data-bs-toggle="modal" data-bs-target="#createUserModal">
            <i class="fas fa-user-plus me-2"></i>Add New Staff
        </button>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="card stat-card h-100 p-3 bg-white">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="text-muted text-uppercase small fw-bold mb-1">Pending Requests</h6>
                        <h2 class="fw-bold mb-0 text-dark"><?= $stats['pending'] ?></h2>
                    </div>
                    <div class="icon-circle bg-warning bg-opacity-25 text-warning">
                        <i class="fas fa-clock fa-lg"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stat-card h-100 p-3 bg-white">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="text-muted text-uppercase small fw-bold mb-1">Active Staff</h6>
                        <h2 class="fw-bold mb-0 text-dark"><?= $stats['staff'] ?></h2>
                    </div>
                    <div class="icon-circle bg-success bg-opacity-10 text-success">
                        <i class="fas fa-chalkboard-teacher fa-lg"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stat-card h-100 p-3 bg-white">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="text-muted text-uppercase small fw-bold mb-1">Publications</h6>
                        <h2 class="fw-bold mb-0 text-dark"><?= $stats['pubs'] ?></h2>
                    </div>
                    <div class="icon-circle bg-primary bg-opacity-10 text-primary">
                        <i class="fas fa-book fa-lg"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card stat-card h-100 p-3 bg-white">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="text-muted text-uppercase small fw-bold mb-1">System Users</h6>
                        <h2 class="fw-bold mb-0 text-dark"><?= $stats['users'] ?></h2>
                    </div>
                    <div class="icon-circle bg-info bg-opacity-10 text-info">
                        <i class="fas fa-users-cog fa-lg"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-lg-8">
            <div class="card table-card h-100 bg-white">
                <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 fw-bold">Recent Profile Updates</h5>
                    <a href="pending_requests.php" class="btn btn-sm btn-outline-success">View All</a>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th class="ps-4">Staff Member</th>
                                <th>Change Type</th>
                                <th>Date Submitted</th>
                                <th>Status</th>
                                <th class="text-end pe-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while($row = $stmt->fetch()): ?>
                            <tr>
                                <td class="ps-4">
                                    <div class="d-flex align-items-center">
                                        <div class="rounded-circle bg-light d-flex justify-content-center align-items-center me-2 text-muted fw-bold border" style="width:35px; height:35px; font-size:12px;">
                                            <?= substr($row['first_name'] ?? 'U', 0, 1) . substr($row['last_name'] ?? 'U', 0, 1) ?>
                                        </div>
                                        <div>
                                            <div class="fw-bold text-dark small"><?= htmlspecialchars(($row['first_name'] ?? 'Unknown') . ' ' . ($row['last_name'] ?? '')) ?></div>
                                            <div class="text-muted" style="font-size: 0.75rem;"><?= $row['staff_number'] ?? 'No ID' ?></div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark border fw-normal">
                                        Update <?= ucfirst($row['entity_name']) ?>
                                    </span>
                                </td>
                                <td class="small text-muted"><?= date('M d, Y', strtotime($row['timestamp'])) ?></td>
                                <td><span class="badge bg-warning text-dark text-uppercase" style="font-size: 0.65rem;">Pending</span></td>
                                <td class="text-end pe-4">
                                    <button class="btn btn-sm btn-light border" title="Review"><i class="fas fa-eye text-primary"></i></button>
                                </td>
                            </tr>
                            <?php endwhile; ?>
                            
                            <?php if($stmt->rowCount() == 0): ?>
                            <tr>
                                <td colspan="5" class="text-center py-5">
                                    <img src="https://cdn-icons-png.flaticon.com/512/7486/7486747.png" width="60" class="mb-3 opacity-50" alt="No data">
                                    <p class="text-muted small">No pending requests at the moment.</p>
                                </td>
                            </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="col-lg-4">
            
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body">
                    <h6 class="fw-bold mb-3 text-dark">Quick Actions</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-outline-success text-start" data-bs-toggle="modal" data-bs-target="#createDeptModal">
                            <i class="fas fa-plus-circle me-2"></i> New Department
                        </button>
                        <button class="btn btn-outline-primary text-start">
                            <i class="fas fa-file-export me-2"></i> Export Staff List (CSV)
                        </button>
                        <button class="btn btn-outline-dark text-start">
                            <i class="fas fa-envelope me-2"></i> Broadcast Email
                        </button>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm bg-dark text-white">
                <div class="card-body">
                    <h6 class="fw-bold mb-3"><i class="fas fa-server me-2"></i> System Status</h6>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between small mb-1">
                            <span>Database Connection</span>
                            <span class="text-success">Stable</span>
                        </div>
                        <div class="progress" style="height: 4px;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: 100%"></div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <div class="d-flex justify-content-between small mb-1">
                            <span>Storage Usage</span>
                            <span>45%</span>
                        </div>
                        <div class="progress" style="height: 4px;">
                            <div class="progress-bar bg-warning" role="progressbar" style="width: 45%"></div>
                        </div>
                    </div>
                    
                    <div class="mt-4 pt-3 border-top border-secondary">
                        <small class="text-white-50">Last Backup: Today, 04:00 AM</small>
                    </div>
                </div>
            </div>

        </div>
    </div>

</main>

<div class="modal fade" id="createUserModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Add New Staff</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p>Form to create user goes here...</p>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> -->