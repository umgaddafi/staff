<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header("Location: ../staff/staff_dashboard.php");
    exit;
}
require '../includes/header.php';
?>

<div class="container">
  <div class="row justify-content-center align-items-center vh-100">
    <div class="col-md-4">
      <div class="card shadow-lg border-0">
        <div class="card-body p-4">
          <h4 class="text-center fw-bold mb-3">Academic Portal Login</h4>

          <?php if(isset($_GET['error'])): ?>
            <div class="alert alert-danger">Invalid credentials</div>
          <?php endif; ?>

          <form method="POST" action="login_process.php">
            <div class="mb-3">
              <label>Username</label>
              <input name="username" class="form-control" required>
            </div>

            <div class="mb-3">
              <label>Password</label>
              <input name="password" type="password" class="form-control" required>
            </div>

            <button class="btn btn-primary w-100">
              <i class="fas fa-sign-in-alt"></i> Login
            </button>
          </form>

        </div>
      </div>
    </div>
  </div>
</div>

<?php require '../includes/footer.php'; ?>
