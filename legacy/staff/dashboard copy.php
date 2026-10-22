<?php 
require '../config/db.php';
require 'includes/header.php';

$staff_id = $_SESSION['staff_id'];

// Fetch Staff Details
$stmt = $pdo->prepare("
    SELECT s.*, r.rank_name, d.name AS department 
    FROM staff s
    JOIN academic_rank r ON s.rank_id = r.rank_id
    JOIN department d ON s.department_id = d.department_id
    WHERE s.staff_id = ?
");
$stmt->execute([$staff_id]);
$staff = $stmt->fetch();

// Pending Requests
$stmt2 = $pdo->prepare("
    SELECT COUNT(*) AS pending_count 
    FROM change_log 
    WHERE user_id = ? AND status = 'Pending'
");
$stmt2->execute([$_SESSION['user_id']]);
$pending = $stmt2->fetch();
?>

<div class="container-fluid">
  <div class="row">

    <?php include 'partials/staff_sidebar.php'; ?>

    <!-- ================= MAIN CONTENT ================= -->
    <main class="col-lg-10 col-md-9 ms-auto p-4">

      <h3 class="fw-bold mb-4">Dashboard Overview</h3>

      <!-- STAT CARDS -->
      <div class="row g-4 mb-4">
        
        <div class="col-md-4">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <h6 class="text-muted">Profile Status</h6>
              <h4 class="text-success">
                <i class="fas fa-check-circle"></i> Active 
              </h4>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <h6 class="text-muted">Pending Requests</h6>
              <h4 class="text-warning">
                <i class="fas fa-clock"></i> <?= $pending['pending_count'] ?>
              </h4>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card shadow-sm border-0 text-center">
            <div class="card-body">
              <h6 class="text-muted">Live Preview</h6>
              <a href="view_portfolio.php?staff_id=<?= $staff_id ?>" 
                 target="_blank"
                 class="btn btn-outline-primary mt-2">
                <i class="fas fa-eye"></i> View Profile
              </a>
            </div>
          </div>
        </div>

      </div>

      <!-- RECENT ACTIVITY -->
      <div class="card shadow-sm border-0">
        <div class="card-header bg-white fw-bold">
          Recent Activity
        </div>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Section</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <?php
              $logs = $pdo->prepare("
                  SELECT * FROM change_log 
                  WHERE user_id = ? 
                  ORDER BY timestamp DESC 
                  LIMIT 5
              ");
              $logs->execute([$_SESSION['user_id']]);
              while($row = $logs->fetch()):
              ?>
              <tr>
                <td><?= date('M d, Y', strtotime($row['timestamp'])) ?></td>
                <td><span class="badge bg-secondary"><?= $row['action'] ?></span></td>
                <td><?= ucfirst($row['entity_name']) ?></td>
                <td>
                  <span class="badge bg-<?= 
                    $row['status']=='Approved'?'success':
                    ($row['status']=='Rejected'?'danger':'warning') ?>">
                    <?= $row['status'] ?>
                  </span>
                </td>
              </tr>
              <?php endwhile; ?>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>
</div>

<?php require '../includes/footer.php'; ?>