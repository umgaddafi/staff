<?php
// Session and DB connection are inherited from index.php
$user_id = $_SESSION['user_id'] ?? 0;

$logs = $pdo->prepare("SELECT cl.* FROM change_log cl WHERE cl.user_id = ? ORDER BY cl.timestamp DESC");
$logs->execute([$user_id]);

function formatEntity($name) {
    $map = [
        'staff' => 'Personal Profile',
        'qualification' => 'Academic Degree',
        'professional_membership' => 'Professional Body',
        'grant_project' => 'Research Grant',
        'supervision' => 'Student Supervision',
        'external_profile' => 'Digital Link',
        'research_area' => 'Research Area',
        'staff_course' => 'Course Assignment',
        'publication' => 'Publication',
    ];
    return $map[$name] ?? ucfirst((string)$name);
}
?>

<style>
    .history-item { border: none; border-radius: 12px; transition: 0.3s; background: #fff; margin-bottom: 1rem; }
    .history-item:hover { transform: translateX(5px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
    .action-icon { width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-approved { background: #d4edda; color: #155724; }
    .status-rejected { background: #f8d7da; color: #721c24; }
    .badge-status { padding: 6px 12px; border-radius: 50px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; }
    .timestamp { font-size: 0.85rem; color: #adb5bd; }
</style>

<div class="mb-4">
    <h2 class="fw-bold text-dark">Activity Log</h2>
    <p class="text-muted">Track the status of your profile updates and admin approvals.</p>
</div>

<?php if($logs->rowCount() == 0): ?>
    <div class="card p-5 text-center border-0 shadow-sm">
        <i class="fas fa-history fa-3x text-light mb-3"></i>
        <h5 class="text-muted">No recent activity.</h5>
        <p class="small">Changes you make to your profile will appear here.</p>
    </div>
<?php else: ?>
    <div class="history-list">
        <?php while($log = $logs->fetch()):
            $statusClass = 'status-' . strtolower((string)$log['status']);
            $icon = 'fa-edit';
            $iconColor = 'text-primary';

            if(($log['action'] ?? '') === 'CREATE') { $icon = 'fa-plus-circle'; $iconColor = 'text-success'; }
            if(($log['action'] ?? '') === 'DELETE') { $icon = 'fa-trash-alt'; $iconColor = 'text-danger'; }
        ?>
        <div class="card history-item shadow-sm">
            <div class="card-body p-3">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <div class="action-icon bg-light <?= $iconColor ?>">
                            <i class="fas <?= $icon ?>"></i>
                        </div>
                    </div>
                    <div class="col">
                        <h6 class="fw-bold mb-0">
                            <?= htmlspecialchars((string)$log['action']) ?>: <?= htmlspecialchars(formatEntity((string)$log['entity_name'])) ?>
                        </h6>
                        <span class="timestamp">
                            <i class="far fa-clock me-1"></i> <?= htmlspecialchars(date('d M Y, h:i A', strtotime((string)$log['timestamp']))) ?>
                        </span>
                    </div>
                    <div class="col-auto text-end">
                        <span class="badge-status <?= $statusClass ?>">
                            <?= htmlspecialchars((string)$log['status']) ?>
                        </span>
                    </div>
                </div>
                <?php if (!empty($log['admin_comment'])): ?>
                    <div class="mt-2 small text-muted">
                        <strong>Admin Note:</strong> <?= htmlspecialchars((string)$log['admin_comment']) ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php endwhile; ?>
    </div>
<?php endif; ?>
