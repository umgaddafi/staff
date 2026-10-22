<?php

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
                    <!-- <td><button class="btn btn-sm btn-outline-dark">Review</button></td> -->
                    <td>
                        <a href="?page=review&id=<?= $row['log_id'] ?>" class="btn btn-sm btn-outline-dark">Review</a>
                    </td>
                </tr>
                <?php endwhile; ?>
                <?php if($pending_stmt->rowCount() == 0): ?>
                    <tr><td colspan="5" class="text-center py-4 text-muted">No pending items.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>