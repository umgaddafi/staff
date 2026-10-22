<?php
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
    <link rel="icon" type="image/jpeg" href="<?= $base_url; ?>/images/jostum.jpeg">
    <link rel="stylesheet" href="<?= $base_url; ?>/assets/css/fonts.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background-color: #f8f9fa; font-family: 'Ubuntu', sans-serif; }
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
    <div class="row">
