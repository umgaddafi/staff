<?php
// admin/request_changes.php

// 1. Fetch all change logs with staff details
$sql = "SELECT cl.*, s.first_name, s.last_name 
        FROM change_log cl 
        LEFT JOIN user_account ua ON cl.user_id = ua.user_id
        LEFT JOIN staff s ON ua.staff_id = s.staff_id
        ORDER BY cl.timestamp DESC";
$stmt = $pdo->query($sql);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="fw-bold text-dark mb-1">Change Requests</h4>
        <p class="text-muted small mb-0">Monitor and manage all profile update submissions</p>
    </div>
</div>

<div class="card shadow-sm">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light">
                <tr>
                    <th class="ps-4 py-3 text-secondary text-uppercase small">Staff Member</th>
                    <th class="py-3 text-secondary text-uppercase small">Entity</th>
                    <th class="py-3 text-secondary text-uppercase small">Action</th>
                    <th class="py-3 text-secondary text-uppercase small">Date</th>
                    <th class="py-3 text-secondary text-uppercase small">Status</th>
                    <th class="text-end pe-4 py-3 text-secondary text-uppercase small">Operations</th>
                </tr>
            </thead>
            <tbody>
                <?php while($row = $stmt->fetch()): ?>
                <tr>
                    <td class="ps-4">
                        <div class="fw-bold text-dark"><?= htmlspecialchars($row['first_name'] . ' ' . $row['last_name']) ?></div>
                    </td>
                    <td class="text-capitalize"><?= htmlspecialchars($row['entity_name']) ?></td>
                    <td>
                        <span class="badge bg-opacity-10 <?= $row['action'] === 'UPDATE' ? 'bg-info text-info' : 'bg-danger text-danger' ?> border">
                            <?= htmlspecialchars($row['action']) ?>
                        </span>
                    </td>
                    <td class="text-muted small"><?= date('M d, Y', strtotime($row['timestamp'])) ?></td>
                    <td>
                        <?php 
                        $status_class = [
                            'Pending' => 'bg-warning text-dark',
                            'Approved' => 'bg-success',
                            'Rejected' => 'bg-danger'
                        ];
                        $current_status = $row['status'] ?? 'Pending';
                        ?>
                        <span class="badge <?= $status_class[$current_status] ?? 'bg-secondary' ?>">
                            <?= $current_status ?>
                        </span>
                    </td>
                    <td class="text-end pe-4">
                        <a href="?page=review&id=<?= $row['log_id'] ?>" class="btn btn-sm btn-light text-primary border shadow-sm">
                            <i class="fas fa-search me-1"></i> Details
                        </a>
                    </td>
                </tr>
                <?php endwhile; ?>
                
                <?php if ($stmt->rowCount() === 0): ?>
                <tr>
                    <td colspan="6" class="text-center py-5 text-muted">
                        <i class="fas fa-folder-open fa-3x mb-3 d-block opacity-25"></i>
                        No change requests found.
                    </td>
                </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>