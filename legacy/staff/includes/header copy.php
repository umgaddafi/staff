<?php
ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Base URL helper for robust routing
$base_url = 'http://localhost/university-portfolio'; 

// Database connection for dynamic user data
require_once __DIR__ . '/../../config/db.php';

// Fetch real-time user data for the header
$header_user_id = $_SESSION['user_id'] ?? null;
$user_data = null;
if ($header_user_id) {
    $stmt = $pdo->prepare("SELECT s.first_name, s.last_name, s.profile_photo, s.title, ua.role 
                           FROM user_account ua 
                           LEFT JOIN staff s ON ua.staff_id = s.staff_id 
                           WHERE ua.user_id = ?");
    $stmt->execute([$header_user_id]);
    $user_data = $stmt->fetch();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Portfolio | University Portal</title>
    <link rel="stylesheet" href="<?= $base_url; ?>/assets/css/fonts.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --uni-navy: #0d2c56;
            --uni-gold: #c5a017;
            --glass-bg: rgba(255, 255, 255, 0.95);
        }
        
        body { 
            background-color: #f0f2f5; 
            font-family: 'Ubuntu', sans-serif; 
            color: #2d3436;
        }

        /* Modern Glass Navbar */
        .navbar-main {
            background: var(--uni-navy) !important;
            backdrop-filter: blur(10px);
            border-bottom: 3px solid var(--uni-gold);
            padding: 0.75rem 1.5rem;
        }

        .navbar-brand {
            font-weight: 800;
            letter-spacing: -0.5px;
            font-size: 1.4rem;
        }

        /* Profile Dropdown Styling */
        .user-profile-btn {
            background: rgba(255,255,255,0.1);
            border-radius: 50px;
            padding: 5px 15px 5px 5px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.2);
        }

        .user-profile-btn:hover {
            background: rgba(255,255,255,0.2);
        }

        .passport-img {
            width: 38px;
            height: 38px;
            object-fit: cover;
            border-radius: 50%;
            border: 2px solid var(--uni-gold);
        }

        .role-indicator {
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            background: var(--uni-gold);
            color: var(--uni-navy);
            padding: 2px 8px;
            border-radius: 4px;
        }

        /* Sidebar Refinement */
        .sidebar-modern {
            min-height: calc(100vh - 70px);
            background: white;
            box-shadow: 4px 0 15px rgba(0,0,0,0.03);
            z-index: 1000;
        }

        .dropdown-menu {
            border: none;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            border-radius: 12px;
            margin-top: 15px;
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark navbar-main sticky-top shadow-sm">
  <div class="container-fluid">
    <a class="navbar-brand d-flex align-items-center" href="<?= $base_url; ?>/staff/index.php">
        <div class="bg-white text-navy rounded-3 p-1 me-2" style="color: var(--uni-navy);">
            <i class="fas fa-graduation-cap"></i>
        </div>
        UniPortfolio
    </a>
    
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
      <i class="fas fa-bars"></i>
    </button>

    <div class="collapse navbar-collapse" id="navbarContent">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item ms-lg-4">
            <div class="input-group input-group-sm mt-1">
                <span class="input-group-text bg-transparent border-end-0 text-white-50"><i class="fas fa-search"></i></span>
                <input type="text" class="form-control bg-transparent border-start-0 text-white border-white-50" placeholder="Find faculty...">
            </div>
        </li>
      </ul>

      <div class="d-flex align-items-center">
        <?php if($user_data): ?>
            <div class="dropdown me-3">
                <a href="#" class="text-white-50 position-relative" data-bs-toggle="dropdown">
                    <i class="fas fa-bell fa-lg"></i>
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.5rem;">
                        3
                    </span>
                </a>
            </div>

            <div class="dropdown">
                <button class="btn btn-link user-profile-btn d-flex align-items-center text-decoration-none text-white dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <img src="<?= $user_data['profile_photo'] ? $base_url.'/uploads/passports/'.$user_data['profile_photo'] : 'https://ui-avatars.com/api/?name='.urlencode($user_data['first_name'].'+'.$user_data['last_name']).'&background=random'; ?>" 
                         class="passport-img me-2" alt="Passport">
                    <div class="text-start d-none d-sm-block">
                        <div class="fw-bold small lh-1"><?= htmlspecialchars($user_data['title'] . ' ' . $user_data['last_name']); ?></div>
                        <span class="role-indicator"><?= $user_data['role']; ?></span>
                    </div>
                </button>
                <ul class="dropdown-menu dropdown-menu-end p-2">
                    <li><h6 class="dropdown-header">Account Management</h6></li>
                    <li><a class="dropdown-item rounded-2" href="<?= $base_url; ?>/staff/profile_edit.php"><i class="fas fa-user-circle me-2 opacity-50"></i>My Profile</a></li>
                    <li><a class="dropdown-item rounded-2" href="<?= $base_url; ?>/staff/change_history.php"><i class="fas fa-history me-2 opacity-50"></i>Activity Log</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item rounded-2 text-danger fw-bold" href="<?= $base_url; ?>/logout.php"><i class="fas fa-sign-out-alt me-2"></i>Sign Out</a></li>
                </ul>
            </div>
        <?php else: ?>
            <a href="<?= $base_url; ?>/login.php" class="btn btn-gold btn-sm px-4 fw-bold">Login</a>
        <?php endif; ?>
      </div>
    </div>
  </div>
</nav>

<div class="container-fluid">
    <div class="row">









<!-- <?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Base URL helper to avoid broken links if you move the project
$base_url = 'http://localhost/university-portfolio'; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Academic Staff Portfolio</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background-color: #f8f9fa; }
        .sidebar { min-height: 100vh; background: #fff; border-right: 1px solid #dee2e6; }
        .card { border: none; margin-bottom: 20px; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
  <div class="container-fluid">
    <a class="navbar-brand fw-bold" href="#">
        <i class="fas fa-university me-2"></i>UniPortfolio
    </a>
    
    <div class="d-flex">
        <?php if(isset($_SESSION['user_id'])): ?>
            <span class="navbar-text text-white me-3">
                Welcome, <?php echo htmlspecialchars($_SESSION['username'] ?? 'User'); ?>
                <span class="badge bg-light text-dark ms-1"><?php echo $_SESSION['role']; ?></span>
            </span>
            <a href="<?php echo $base_url; ?>/logout.php" class="btn btn-outline-light btn-sm">Logout</a>
        <?php endif; ?>
    </div>
  </div>
</nav>

<div class="container-fluid">
    <div class="row"> -->
