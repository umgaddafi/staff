<?php 
session_start();
require '../config/db.php';
// require '../includes/header.php'; // Assuming this loads Bootstrap 5 and FontAwesome

// AUTH CHECK
// if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'Admin') {
//     header("Location: ../auth/login.php");
//     exit;
// }

// 1. Fetch Stats for KPI Cards
$stats = [
    'pending' => $pdo->query("SELECT COUNT(*) FROM change_log WHERE status = 'Pending'")->fetchColumn(),
    'staff'   => $pdo->query("SELECT COUNT(*) FROM staff WHERE is_active = 1")->fetchColumn(),
    'pubs'    => $pdo->query("SELECT COUNT(*) FROM publication")->fetchColumn()
];

// 2. Fetch Pending Queue
$stmt = $pdo->query("SELECT cl.*, s.first_name, s.last_name, s.profile_photo 
                     FROM change_log cl 
                     JOIN user_account ua ON cl.user_id = ua.user_id
                     JOIN staff s ON ua.staff_id = s.staff_id
                     WHERE cl.status = 'Pending' 
                     ORDER BY cl.timestamp ASC LIMIT 10");
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Dashboard | Academic Portfolio</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/admin.css"> </head>
<body>

<div class="container-fluid">
    <div class="row">
        <div class="col-md-2 sidebar p-4 d-none d-md-block">
            <div class="d-flex align-items-center mb-5">
                <i class="fas fa-university fa-2x text-white me-2"></i>
                <h5 class="text-white mb-0 fw-bold">JOSTUM</h5>
            </div>
            <ul class="nav flex-column">
                <li class="nav-item"><a href="dashboard.php" class="nav-link active"><i class="fas fa-th-large me-2"></i> Dashboard</a></li>
                <li class="nav-item"><a href="manage_staff.php" class="nav-link"><i class="fas fa-users me-2"></i> Staff Directory</a></li>
                <li class="nav-item"><a href="departments.php" class="nav-link"><i class="fas fa-building me-2"></i> Departments</a></li>
                <li class="nav-item"><a href="settings.php" class="nav-link"><i class="fas fa-cog me-2"></i> Settings</a></li>
                <li class="nav-item mt-5"><a href="../auth/logout.php" class="nav-link text-danger"><i class="fas fa-sign-out-alt me-2"></i> Logout</a></li>
            </ul>
        </div>

        <div class="col-md-10 p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold text-dark">Overview</h2>
                    <p class="text-muted">Welcome back, Admin.</p>
                </div>
                <div>
                    <button class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#createUserModal">
                        <i class="fas fa-plus me-1"></i> New User
                    </button>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card stat-card bg-white p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase mb-1">Pending Requests</h6>
                                <h3 class="fw-bold mb-0"><?php echo $stats['pending']; ?></h3>
                            </div>
                            <div class="icon-box bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
                                <i class="fas fa-clock fa-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card stat-card bg-white p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase mb-1">Active Staff</h6>
                                <h3 class="fw-bold mb-0"><?php echo $stats['staff']; ?></h3>
                            </div>
                            <div class="icon-box bg-info bg-opacity-10 text-info p-3 rounded-circle">
                                <i class="fas fa-chalkboard-teacher fa-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card stat-card bg-white p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="text-muted text-uppercase mb-1">Total Publications</h6>
                                <h3 class="fw-bold mb-0"><?php echo $stats['pubs']; ?></h3>
                            </div>
                            <div class="icon-box bg-success bg-opacity-10 text-success p-3 rounded-circle">
                                <i class="fas fa-book fa-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm">
                <div class="card-header bg-white py-3 border-0 d-flex justify-content-between">
                    <h5 class="mb-0 fw-bold">Recent Profile Updates</h5>
                    <a href="#" class="text-decoration-none small">View All</a>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light">
                            <tr>
                                <th class="ps-4">Staff Member</th>
                                <th>Date</th>
                                <th>Target Entity</th>
                                <th>Action</th>
                                <th>Status</th>
                                <th>Control</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while($row = $stmt->fetch()): ?>
                            <tr>
                                <td class="ps-4">
                                    <div class="d-flex align-items-center">
                                        <div class="avatar-sm bg-secondary rounded-circle me-2 d-flex justify-content-center align-items-center text-white" style="width:35px; height:35px;">
                                            <?php echo substr($row['first_name'],0,1) . substr($row['last_name'],0,1); ?>
                                        </div>
                                        <div>
                                            <div class="fw-bold text-dark"><?php echo htmlspecialchars($row['first_name'] . ' ' . $row['last_name']); ?></div>
                                            <div class="small text-muted">ID: <?php echo $row['user_id']; ?></div>
                                        </div>
                                    </div>
                                </td>
                                <td><?php echo date('M d, H:i', strtotime($row['timestamp'])); ?></td>
                                <td><?php echo ucfirst($row['entity_name']); ?></td>
                                <td><span class="badge bg-light text-dark border"><?php echo $row['action']; ?></span></td>
                                <td><span class="badge bg-warning text-dark">Pending</span></td>
                                <td>
                                    <a href="review_change.php?id=<?php echo $row['log_id']; ?>" class="btn btn-sm btn-outline-primary rounded-pill px-3">Review</a>
                                </td>
                            </tr>
                            <?php endwhile; ?>
                            <?php if($stmt->rowCount() == 0): ?>
                                <tr><td colspan="6" class="text-center py-4 text-muted">All caught up! No pending requests.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>


<?php include '../modals/create_user_modal.php'; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
    // If clicking the button still causes issues, you can trigger it manually:
    const myModal = new bootstrap.Modal(document.getElementById('createUserModal'), {
        keyboard: false
    });
    // Remove data-bs-toggle from the button if using this manual method
</script>
</body>
</html>

