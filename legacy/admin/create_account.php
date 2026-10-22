<?php
require '../config/db.php';
require '../includes/header.php';

/* Fetch staff without accounts */
$staff = $pdo->query("
    SELECT s.staff_id, CONCAT(s.first_name,' ',s.last_name) AS name
    FROM staff s
    LEFT JOIN user_account u ON s.staff_id = u.staff_id
    WHERE u.user_id IS NULL
")->fetchAll();
?>

<div class="container-fluid">
<div class="row">

<main class="col-lg-8 mx-auto p-4">
<h4 class="fw-bold mb-4">Create New User Account</h4>

<?php if(isset($_GET['success'])): ?>
<div class="alert alert-success">Account created successfully</div>
<?php endif; ?>

<form method="POST" action="create_account_process.php" class="card shadow-sm p-4">

  <div class="mb-3">
    <label class="fw-semibold">Account Type</label>
    <select name="role" class="form-control" required>
      <option value="">-- Select Role --</option>
      <option value="Admin">Admin</option>
      <option value="Moderator">Moderator</option>
      <option value="Staff">Staff</option>
    </select>
  </div>

  <div class="mb-3">
    <label class="fw-semibold">Link to Staff (Staff Only)</label>
    <select name="staff_id" class="form-control">
      <option value="">-- None (Admin / Moderator) --</option>
      <?php foreach($staff as $s): ?>
        <option value="<?= $s['staff_id'] ?>"><?= $s['name'] ?></option>
      <?php endforeach; ?>
    </select>
  </div>

  <div class="mb-3">
    <label class="fw-semibold">Username</label>
    <input name="username" class="form-control" required>
  </div>

  <div class="mb-3">
    <label class="fw-semibold">Temporary Password</label>
    <input type="password" name="password" class="form-control" required>
    <small class="text-muted">
      User will be advised to change this on first login
    </small>
  </div>

  <button class="btn btn-primary">
    <i class="fas fa-user-plus"></i> Create Account
  </button>

</form>
</main>

</div>
</div>

<?php require '../includes/footer.php'; ?>
