<?php
// Note: session_start() and db connection are already handled in index.php
// We only fetch data here if it's not already globally available.
$staff_id = $_SESSION['staff_id'] ?? ($staff_id ?? null);
if (!$staff_id && isset($_SESSION['user_id'])) {
    $map_stmt = $pdo->prepare("SELECT staff_id FROM user_account WHERE user_id = ? LIMIT 1");
    $map_stmt->execute([$_SESSION['user_id']]);
    $staff_id = $map_stmt->fetchColumn() ?: null;
}

$rank_options = $pdo->query("SELECT rank_id, rank_name FROM academic_rank ORDER BY rank_level ASC, rank_name ASC")->fetchAll();

// Fetch comprehensive staff data
$user = false;
if ($staff_id) {
    $stmt = $pdo->prepare("
        SELECT s.*, r.rank_name, d.name as department_name 
        FROM staff s
        LEFT JOIN academic_rank r ON s.rank_id = r.rank_id
        LEFT JOIN department d ON s.department_id = d.department_id
        WHERE s.staff_id = ?
    ");
    $stmt->execute([$staff_id]);
    $user = $stmt->fetch();
}

if (!$user) {
    $user = [
        'profile_photo' => null,
        'title' => '',
        'first_name' => $_SESSION['username'] ?? '',
        'middle_name' => '',
        'last_name' => '',
        'rank_name' => 'Not Set',
        'rank_id' => null,
        'department_name' => 'Not Set',
        'email' => '',
        'gender' => '',
        'date_of_birth' => '',
        'phone' => '',
        'office_location' => '',
        'biography' => '',
    ];
}
?>

<style>
    .avatar-wrapper { position: relative; width: 120px; margin: 0 auto; }
    .avatar-edit-preview { 
        width: 120px; height: 120px; 
        border-radius: 50%; object-fit: cover; 
        border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .btn-edit-avatar {
        position: absolute; bottom: 5px; right: 5px;
        width: 32px; height: 32px; padding: 0;
        display: flex; align-items: center; justify-content: center;
    }
    .section-title {
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 10px;
        margin-bottom: 20px;
        color: var(--uni-navy);
        font-weight: 700;
        display: flex;
        align-items: center;
    }
    .section-title i { margin-right: 10px; color: var(--uni-gold); }
    .form-floating > .form-control:focus ~ label::after { background-color: transparent !important; }
</style>

<div class="row">
    <div class="col-12">
        <?php if(isset($_GET['status'])): ?>
            <?php
                $status = (string)$_GET['status'];
                $messages = [
                    'saved' => ['success', '<strong>Success!</strong> Your profile has been updated successfully.'],
                    'submitted' => ['success', '<strong>Success!</strong> Your profile has been updated successfully.'],
                    'saved_rank_pending' => ['success', '<strong>Saved.</strong> Profile updated. Rank change request has been submitted for admin approval.'],
                    'upload_error' => ['warning', '<strong>Upload failed.</strong> The selected image could not be uploaded.'],
                    'upload_size_error' => ['warning', '<strong>Upload failed.</strong> Image must be less than 5MB.'],
                    'upload_type_error' => ['warning', '<strong>Upload failed.</strong> Only JPG, PNG, or WEBP images are allowed.'],
                    'upload_dir_error' => ['warning', '<strong>Upload failed.</strong> Upload directory is not writable.'],
                    'upload_failed' => ['warning', '<strong>Upload failed.</strong> Could not save image file. Try again.'],
                    'error' => ['warning', '<strong>Error:</strong> Unable to save your update right now.'],
                    'invalid' => ['warning', '<strong>Notice:</strong> Invalid request received.'],
                ];
                $msg = $messages[$status] ?? ['warning', '<strong>Notice:</strong> No changes were detected in your data.'];
                $type = $msg[0];
                $text = $msg[1];
                $icon = $type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
            ?>
            <div class="alert alert-dismissible fade show border-0 shadow-sm alert-<?php echo $type; ?>" role="alert">
                <i class="fas <?php echo $icon; ?> me-2"></i>
                <?php echo $text; ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <form action="./actions/update_profile_core.php" method="POST" enctype="multipart/form-data">
            <div class="row g-4">
                
                <div class="col-lg-4 col-xl-3">
                    <div class="card border-0 shadow-sm text-center p-4 h-100">
                        <div class="avatar-wrapper mb-3">
                            <img id="imagePreview" 
                                 src="<?php echo !empty($user['profile_photo']) ? '../uploads/'.$user['profile_photo'] : 'https://ui-avatars.com/api/?name='.urlencode((string)($user['first_name'] ?: 'Staff')).'&background=0D2C56&color=fff&size=150'; ?>" 
                                 class="avatar-edit-preview">
                            <label for="photoUpload" class="btn btn-dark btn-edit-avatar rounded-circle shadow">
                                <i class="fas fa-camera"></i>
                            </label>
                            <input type="file" id="photoUpload" name="profile_photo" hidden accept="image/*">
                        </div>
                        
                        <h5 class="fw-bold mb-1"><?php echo htmlspecialchars(trim(($user['title'] ?? '') . ' ' . ($user['first_name'] ?? ''))); ?></h5>
                        <p class="text-muted small"><?php echo htmlspecialchars((string)($user['rank_name'] ?? 'Not Set')); ?></p>
                        
                        <div class="text-start mt-4">
                            <label class="small text-uppercase fw-bold text-muted mb-1" style="font-size: 0.7rem;">Primary Department</label>
                            <p class="small bg-light p-2 rounded"><?php echo htmlspecialchars((string)($user['department_name'] ?? 'Not Set')); ?></p>
                            
                            <label class="small text-uppercase fw-bold text-muted mb-1" style="font-size: 0.7rem;">Official Email</label>
                            <p class="small bg-light p-2 rounded text-truncate"><?php echo htmlspecialchars((string)($user['email'] ?? '')); ?></p>
                        </div>

                        <div class="d-grid mt-4">
                            <button type="submit" name="submit_update" class="btn btn-primary">
                                <i class="fas fa-save me-2"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8 col-xl-9">
                    <div class="card border-0 shadow-sm p-4">
                        
                        <h6 class="section-title"><i class="fas fa-user-circle"></i> Identity Details</h6>
                        <div class="row g-3 mb-4">
                            <div class="col-md-2">
                                <label class="form-label small fw-bold">Title</label>
                                <select name="title" class="form-select">
                                    <?php
                                    $titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Engr.', 'Arc.', 'Pharm.'];
                                    foreach ($titles as $t) {
                                        $selected = ($user['title'] == $t) ? 'selected' : '';
                                        echo "<option value=\"$t\" $selected>$t</option>";
                                    }
                                    ?>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold">First Name</label>
                                <input type="text" name="first_name" class="form-control" value="<?php echo htmlspecialchars((string)($user['first_name'] ?? '')); ?>" required>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold">Middle Name</label>
                                <input type="text" name="middle_name" class="form-control" value="<?php echo htmlspecialchars((string)($user['middle_name'] ?? '')); ?>">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">Last Name</label>
                                <input type="text" name="last_name" class="form-control" value="<?php echo htmlspecialchars((string)($user['last_name'] ?? '')); ?>" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Gender</label>
                                <select name="gender" class="form-select">
                                    <option value="Male" <?php if($user['gender'] == 'Male') echo 'selected'; ?>>Male</option>
                                    <option value="Female" <?php if($user['gender'] == 'Female') echo 'selected'; ?>>Female</option>
                                    <option value="Other" <?php if($user['gender'] == 'Other') echo 'selected'; ?>>Other</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Date of Birth</label>
                                <input type="date" name="date_of_birth" class="form-control" value="<?php echo htmlspecialchars((string)($user['date_of_birth'] ?? '')); ?>">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label small fw-bold">Academic Rank</label>
                                <select name="rank_id" class="form-select">
                                    <option value="">Select rank</option>
                                    <?php foreach ($rank_options as $rank): ?>
                                        <option value="<?= (int)$rank['rank_id'] ?>" <?= ((string)($user['rank_id'] ?? '') === (string)$rank['rank_id']) ? 'selected' : '' ?>>
                                            <?= htmlspecialchars($rank['rank_name']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <div class="form-text">Rank changes require admin approval before they appear publicly.</div>
                            </div>
                        </div>

                        <h6 class="section-title"><i class="fas fa-envelope-open-text"></i> Contact & Office</h6>
                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Phone Number</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fas fa-phone"></i></span>
                                    <input type="tel" name="phone" class="form-control" value="<?php echo htmlspecialchars((string)($user['phone'] ?? '')); ?>">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Office Location</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="fas fa-map-marker-alt"></i></span>
                                    <input type="text" name="office_location" class="form-control" value="<?php echo htmlspecialchars((string)($user['office_location'] ?? '')); ?>">
                                </div>
                            </div>
                        </div>

                        <h6 class="section-title"><i class="fas fa-pen-fancy"></i> Academic Biography</h6>
                        <div class="mb-2">
                            <textarea name="biography" class="form-control" rows="6" placeholder="Share your academic journey..."><?php echo htmlspecialchars((string)($user['biography'] ?? '')); ?></textarea>
                            <div class="form-text mt-2">
                                <i class="fas fa-lightbulb me-1"></i> Tip: Highlight research interests and key teaching philosophies.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>
</div>

<script>
    // Live Image Preview UX
    document.getElementById('photoUpload').onchange = function (evt) {
        const [file] = this.files;
        if (file) {
            document.getElementById('imagePreview').src = URL.createObjectURL(file);
        }
    }
</script>
