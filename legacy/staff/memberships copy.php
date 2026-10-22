<?php
session_start();

require '../config/db.php';
// if (!isset($_SESSION['staff_id'])) { header("Location: ../login.php"); exit; }

$staff_id = $_SESSION['staff_id'];

// Handle Add Membership
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_membership'])) {
    $stmt = $pdo->prepare("INSERT INTO professional_membership (staff_id, body_name, membership_no, role) VALUES (?,?,?,?)");
    $stmt->execute([$staff_id, $_POST['body_name'], $_POST['membership_no'], $_POST['role']]);
    $_SESSION['msg'] = "Membership added successfully!";
    header("Location: memberships.php"); exit;
}

// Handle Delete
if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM professional_membership WHERE membership_id = ? AND staff_id = ?");
    $stmt->execute([$_GET['del'], $staff_id]);
    header("Location: memberships.php"); exit;
}

$memberships = $pdo->prepare("SELECT * FROM professional_membership WHERE staff_id = ? ORDER BY body_name ASC");
$memberships->execute([$staff_id]);
?>
<?php if(isset($_GET['status'])): ?>
    <div class="container mt-3">
        <?php if($_GET['status'] == 'submitted'): ?>
            <div class="alert alert-info border-0 shadow-sm">
                <i class="fas fa-clock me-2"></i> Membership details submitted for admin approval.
            </div>
        <?php elseif($_GET['status'] == 'delete_submitted'): ?>
            <div class="alert alert-warning border-0 shadow-sm">
                <i class="fas fa-user-shield me-2"></i> Removal request sent to admin for approval.
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Professional Memberships | Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --uni-navy: #0d2c56; --uni-gold: #c5a017; }
        body { background-color: #f4f7f6; font-family: 'Ubuntu', sans-serif; }
        .membership-card { border: none; border-radius: 12px; border-left: 4px solid var(--uni-gold); transition: 0.3s; }
        .membership-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.05); }
        .org-icon { width: 50px; height: 50px; background: #f0f4f8; color: var(--uni-navy); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .role-tag { background: rgba(13, 44, 86, 0.1); color: var(--uni-navy); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 4px 12px; border-radius: 50px; }
        .btn-navy { background: var(--uni-navy); color: white; border-radius: 8px; }
        .btn-navy:hover { background: #081d3a; color: white; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
     
        <main class="col-lg-10 p-4">
            <div class="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h2 class="fw-bold">Professional Memberships</h2>
                    <p class="text-muted">Affiliations with professional bodies and societies.</p>
                </div>
                <button class="btn btn-navy px-4 shadow-sm" data-bs-toggle="modal" data-bs-target="#addMembershipModal">
                    <i class="fas fa-certificate me-2"></i> Add Membership
                </button>
            </div>

            <?php if($memberships->rowCount() == 0): ?>
                <div class="card p-5 text-center border-0 shadow-sm rounded-4">
                    <img src="https://illustrations.popsy.co/blue/work-holiday.svg" style="width: 250px;" class="mx-auto mb-3">
                    <h4 class="text-muted">No memberships listed.</h4>
                    <p class="mb-4">Adding professional bodies increases your academic profile visibility.</p>
                </div>
            <?php endif; ?>

            <div class="row g-3">
                <?php while($m = $memberships->fetch()): ?>
                <div class="col-12">
                    <div class="card membership-card shadow-sm p-3">
                        <div class="d-flex align-items-center">
                            <div class="org-icon me-3">
                                <i class="fas fa-building-columns fa-lg"></i>
                            </div>
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-1">
                                    <h5 class="fw-bold mb-0 me-2"><?= htmlspecialchars($m['body_name']) ?></h5>
                                    <span class="role-tag"><?= $m['role'] ?: 'Member' ?></span>
                                </div>
                                <p class="text-muted small mb-0">
                                    <i class="fas fa-id-badge me-1"></i> ID: <?= htmlspecialchars($m['membership_no']) ?>
                                </p>
                            </div>
                            <div class="text-end">
                                <a href="./actions/update_memberships_core.php?del=<?= $m['membership_id'] ?>" 
                                    class="text-danger" 
                                    onclick="return confirm('Request removal of this membership?')">
                                    <i class="fas fa-trash-alt"></i>
                                </a>
                                <!-- <a href="?del=<?= $m['membership_id'] ?>" class="btn btn-outline-danger btn-sm border-0" onclick="return confirm('Remove this membership?')">
                                    <i class="fas fa-trash-alt"></i>
                                </a> -->
                            </div>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="addMembershipModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <!-- <form method="POST" class="modal-content border-0 shadow-lg"> -->
            <form action="actions/update_memberships_core.php" method="POST" class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white p-4">
                <h5 class="modal-title fw-bold">Register New Membership</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="mb-3">
                    <label class="form-label fw-bold">Professional Body Name</label>
                    <input type="text" name="body_name" class="form-control" placeholder="e.g. Nigerian Society of Engineers (NSE)" required>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Membership Number</label>
                        <input type="text" name="membership_no" class="form-control" placeholder="R.12345" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Current Role</label>
                        <input type="text" name="role" class="form-control" placeholder="e.g. Fellow, Member">
                    </div>
                </div>
            </div>
            <div class="modal-footer p-4 border-0">
                <button type="submit" name="add_membership" class="btn btn-navy w-100 py-2 fw-bold">Add to Profile</button>
            </div>
        </form>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>