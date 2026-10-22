<?php
require '../config/db.php';
//review_changes.php
// 1. Validate Input
$log_id = $_GET['id'] ?? 0;
if (!$log_id) {
    echo "<script>window.location.href='dashboard.php';</script>";
    exit;
}

// 2. Fetch Log + Requester Details (JOIN for better context)
$stmt = $pdo->prepare("
    SELECT cl.*, s.first_name, s.last_name, s.staff_number, s.profile_photo, ua.username
    FROM change_log cl
    LEFT JOIN user_account ua ON cl.user_id = ua.user_id
    LEFT JOIN staff s ON ua.staff_id = s.staff_id
    WHERE cl.log_id = ?
");
$stmt->execute([$log_id]);
$request = $stmt->fetch();

if (!$request) die("Request not found.");

// 3. Decode Payloads
$new_data = json_decode($request['change_payload'], true);
$entity_id = $request['entity_id'];
$entity_type = $request['entity_name'];

// 4. Fetch Current Live Data (If exists)
$current_data = [];
if ($entity_id) {
    // Dynamic table selection based on entity name (sanitized for safety)
    $allowed_tables = ['staff', 'publication', 'qualification', 'course', 'grant_project']; // Add your tables
    if (in_array($entity_type, $allowed_tables)) {
        $stmt2 = $pdo->prepare("SELECT * FROM $entity_type WHERE {$entity_type}_id = ?");
        $stmt2->execute([$entity_id]);
        $current_data = $stmt2->fetch();
    }
}
?>

<div class="container-fluid">
    <div class="row">
        
        <nav class="col-md-3 col-lg-2 d-md-block bg-dark sidebar collapse min-vh-100">
            <div class="position-sticky pt-3">
                <ul class="nav flex-column">
                    <li class="nav-item">
                        <a class="nav-link text-white" href="dashboard.php">
                            <i class="fas fa-home me-2"></i> Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active bg-primary text-white rounded" href="#">
                            <i class="fas fa-tasks me-2"></i> Review Changes
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white-50" href="#">
                            <i class="fas fa-users me-2"></i> Manage Staff
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white-50" href="#">
                            <i class="fas fa-cogs me-2"></i> Settings
                        </a>
                    </li>
                </ul>
            </div>
        </nav>

        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 bg-light pb-5">
            
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-4 pb-2 mb-4 border-bottom">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb mb-1">
                            <li class="breadcrumb-item"><a href="dashboard.php">Dashboard</a></li>
                            <li class="breadcrumb-item active" aria-current="page">Review Request #<?= $request['log_id'] ?></li>
                        </ol>
                    </nav>
                    <h1 class="h2 text-dark">Review Change Request</h1>
                </div>
                <div class="btn-toolbar mb-2 mb-md-0">
                    <a href="dashboard.php" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card shadow-sm border-0 mb-4">
                        <div class="card-header bg-white fw-bold py-3">
                            <i class="fas fa-user-circle me-2 text-primary"></i> Requester Info
                        </div>
                        <div class="card-body text-center pt-4">
                            <img src="<?= $request['profile_photo'] ? '../uploads/'.$request['profile_photo'] : 'https://ui-avatars.com/api/?name='.urlencode($request['first_name']).'&background=random' ?>" 
                                 class="rounded-circle mb-3 border" width="80" height="80">
                            <h5 class="mb-0"><?= htmlspecialchars($request['first_name'] . ' ' . $request['last_name']) ?></h5>
                            <small class="text-muted"><?= htmlspecialchars($request['staff_number']) ?></small>
                            <hr>
                            <div class="d-flex justify-content-between text-start small">
                                <span class="text-muted">Username:</span>
                                <span class="fw-bold"><?= htmlspecialchars($request['username']) ?></span>
                            </div>
                            <div class="d-flex justify-content-between text-start small mt-2">
                                <span class="text-muted">Date Submitted:</span>
                                <span class="fw-bold"><?= date('M d, Y h:i A', strtotime($request['timestamp'])) ?></span>
                            </div>
                        </div>
                    </div>

                    <div class="card shadow-sm border-0">
                        <div class="card-body">
                            <h6 class="text-muted text-uppercase small fw-bold mb-3">Change Context</h6>
                            <div class="d-flex align-items-center mb-3">
                                <div class="bg-light p-2 rounded me-3 text-primary">
                                    <i class="fas fa-database fa-lg"></i>
                                </div>
                                <div>
                                    <small class="text-muted d-block">Target Entity</small>
                                    <span class="fw-bold text-capitalize"><?= $request['entity_name'] ?></span>
                                </div>
                            </div>
                            <div class="d-flex align-items-center mb-3">
                                <div class="bg-light p-2 rounded me-3 text-<?= $request['action'] == 'DELETE' ? 'danger' : 'success' ?>">
                                    <i class="fas fa-exchange-alt fa-lg"></i>
                                </div>
                                <div>
                                    <small class="text-muted d-block">Action Type</small>
                                    <span class="badge bg-<?= $request['action'] == 'DELETE' ? 'danger' : ($request['action'] == 'UPDATE' ? 'info' : 'success') ?>">
                                        <?= $request['action'] ?>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                            <span class="fw-bold"><i class="fas fa-table me-2 text-primary"></i> Data Comparison</span>
                            <span class="badge bg-warning text-dark"><i class="fas fa-clock"></i> Pending Approval</span>
                        </div>
                        
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th class="ps-4" style="width: 25%;">Field Name</th>
                                            <th style="width: 35%;">Current Live Data</th>
                                            <th style="width: 40%;" class="table-primary border-primary border-bottom-0">Proposed Change</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($new_data as $key => $new_val): 
                                            // Formatting Field Names
                                            $field_label = ucwords(str_replace('_', ' ', $key));
                                            
                                            // Get Old Value safely
                                            // $old_val = $current_data[$key] ?? '<em class="text-muted">N/A</em>';
                                            $old_val = $current_data[$key] ?? null;
                                            // Highlight logic: Is it actually different?
                                            $is_diff = ($old_val != $new_val);
                                            $row_class = $is_diff ? 'bg-soft-warning' : '';
                                        ?>
                                        <tr class="<?= $row_class ?>">
                                            <td class="ps-4 fw-medium text-secondary"><?= $field_label ?></td>
                                            
                                            <!-- <td class="text-muted">
                                                <?= empty($old_val) && $old_val !== '0' ? '<em class="small text-muted">Empty</em>' : htmlspecialchars(substr($old_val, 0, 100)) . (strlen($old_val)>100 ? '...' : '') ?>
                                            </td> -->
                                            <td class="text-muted">
                                                <?php if (empty($old_val) || $old_val === '<em class="text-muted">N/A</em>'): ?>
                                                    <span class="small text-muted">N/A</span>
                                                <?php else: ?>
                                                    <?= htmlspecialchars(substr($old_val, 0, 100)) . (strlen($old_val) > 100 ? '...' : '') ?>
                                                <?php endif; ?>
                                            </td>
                                            
                                            <td class="<?= $is_diff ? 'fw-bold text-dark bg-opacity-10 bg-primary' : '' ?>">
                                                <?php if($is_diff): ?>
                                                    <i class="fas fa-pen-fancy text-primary small me-1"></i>
                                                <?php endif; ?>
                                                <?= empty($new_val) && $new_val !== '0' ? '<em class="small text-muted">Empty</em>' : htmlspecialchars($new_val) ?>
                                            </td>
                                        </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="card-footer bg-white p-4 border-top">
                            <form action="actions/admin_approve_core.php" method="POST" class="d-flex justify-content-end gap-2">
                                <input type="hidden" name="log_id" value="<?= $request['log_id'] ?>">
                                
                                <button type="button" class="btn btn-outline-secondary px-4" onclick="history.back()">Cancel</button>
                                
                                <button type="submit" name="action" value="reject" 
                                        class="btn btn-outline-danger px-4"
                                        onclick="return confirm('Are you sure you want to reject this change? This cannot be undone.');">
                                    <i class="fas fa-times me-2"></i> Reject
                                </button>
                                
                                <button type="submit" name="action" value="approve" 
                                        class="btn btn-success px-5 shadow-sm fw-bold">
                                    <i class="fas fa-check me-2"></i> Approve & Publish
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

            </div> </main>
    </div>
</div>

<?php require '../includes/footer.php'; ?>












<!-- <?php
require '../config/db.php';
$log_id = $_GET['id'];

// 1. Fetch the log
$stmt = $pdo->prepare("SELECT * FROM change_log WHERE log_id = ?");
$stmt->execute([$log_id]);
$log = $stmt->fetch();

// 2. Decode the pending changes
$new_data = json_decode($log['change_payload'], true);

// 3. Fetch the CURRENT live data to compare
$stmt2 = $pdo->prepare("SELECT * FROM staff WHERE staff_id = ?");
$stmt2->execute([$log['entity_id']]);
$current_data = $stmt2->fetch();
?>

<div class="container">
    <h3>Review Request #<?php echo $log['log_id']; ?></h3>
    
    <table class="table table-bordered">
        <thead>
            <tr>
                <th>Field</th>
                <th>Current Live Data</th>
                <th class="table-warning">Proposed Change</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($new_data as $key => $value): ?>
            <tr>
                <td><?php echo ucfirst(str_replace('_', ' ', $key)); ?></td>
                <td><?php echo htmlspecialchars($current_data[$key]); ?></td>
                <td class="fw-bold"><?php echo htmlspecialchars($value); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <form action="../actions/admin_approve_core.php" method="POST">
        <input type="hidden" name="log_id" value="<?php echo $log['log_id']; ?>">
        <button type="submit" name="action" value="approve" class="btn btn-success">Approve & Publish</button>
        <button type="submit" name="action" value="reject" class="btn btn-danger">Reject</button>
    </form>
</div> -->