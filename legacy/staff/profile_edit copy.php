<?php
session_start();
require '../config/db.php';
// if (!isset($_SESSION['staff_id'])) { header("Location: ../login.php"); exit; }

$staff_id = $_SESSION['staff_id'];

// Fetch comprehensive staff data including Rank and Department names
$stmt = $pdo->prepare("
    SELECT s.*, r.rank_name, d.name as department_name 
    FROM staff s
    JOIN academic_rank r ON s.rank_id = r.rank_id
    JOIN department d ON s.department_id = d.department_id
    WHERE s.staff_id = ?
");
$stmt->execute([$staff_id]);
$user = $stmt->fetch();
?>
<?php if(isset($_GET['status'])): ?>
    <?php if($_GET['status'] == 'submitted'): ?>
        <div class="alert alert-info border-0 shadow-sm">
            <i class="fas fa-clock me-2"></i> Your changes have been submitted for admin approval.
        </div>
    <?php elseif($_GET['status'] == 'no_change'): ?>
        <div class="alert alert-warning border-0 shadow-sm">
            <i class="fas fa-info-circle me-2"></i> No changes were detected in your profile.
        </div>
    <?php endif; ?>
<?php endif; ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Edit Profile | Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/style.css"> <style>
        :root { --uni-navy: #0d2c56; --uni-gold: #c5a017; }
        body { background-color: #f8f9fa; font-family: 'Ubuntu', sans-serif; }
        .profile-header { background: white; border-bottom: 1px solid #e9ecef; padding: 2rem 0; margin-bottom: 2rem; }
        .avatar-upload { position: relative; max-width: 150px; margin: 0 auto 1rem; }
        .avatar-preview { width: 150px; height: 150px; border-radius: 100%; border: 4px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1); object-fit: cover; }
        .section-card { border: none; border-radius: 12px; transition: transform 0.2s; background: white; margin-bottom: 1.5rem; }
        .form-label { font-weight: 600; color: #495057; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-control:focus { border-color: var(--uni-gold); box-shadow: 0 0 0 0.2rem rgba(197, 160, 23, 0.1); }
        .sticky-top-offset { top: 20px; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
    

        <div class="col-lg-10 p-0">
            <header class="profile-header">
                <div class="container-fluid px-4">
                    <div class="d-flex align-items-center justify-content-between">
                        <div>
                            <h2 class="fw-bold mb-1">Personal Information</h2>
                        </div>
                        <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">
                            Staff ID: <?php echo $user['staff_number']; ?>
                        </span>
                    </div>
                </div>
            </header>

            <form action="./actions/update_profile_core.php" method="POST" enctype="multipart/form-data" class="container-fluid px-4 pb-5">
                <div class="row">
                    <div class="col-lg-3">
                        <div class="card section-card text-center p-4 sticky-top sticky-top-offset">
                            <div class="avatar-upload">
                                <img id="imagePreview" src="<?php echo $user['profile_photo'] ? '../uploads/'.$user['profile_photo'] : 'https://ui-avatars.com/api/?name='.urlencode($user['first_name']).'&background=0D2C56&color=fff&size=150'; ?>" class="avatar-preview">
                                <label for="photoUpload" class="btn btn-sm btn-dark position-absolute bottom-0 end-0 rounded-circle">
                                    <i class="fas fa-camera"></i>
                                </label>
                                <input type="file" id="photoUpload" name="profile_photo" hidden accept="image/*">
                            </div>
                            <h5 class="fw-bold mb-0"><?php echo $user['title'] . ' ' . $user['first_name'] . ' ' . $user['last_name']; ?></h5>
                            <p class="text-muted small mb-3"><?php echo $user['rank_name']; ?></p>
                            <hr>
                            <div class="text-start">
                                <label class="form-label d-block mb-1">Department</label>
                                <p class="small fw-semibold"><?php echo $user['department_name']; ?></p>
                                <label class="form-label d-block mb-1">Email Address</label>
                                <p class="small fw-semibold"><?php echo $user['email']; ?></p>
                            </div>
                            <!-- <button type="submit" class="btn btn-primary w-100 mt-3 shadow-sm">
                                <i class="fas fa-save me-2"></i> Save Changes
                            </button> -->
                            <button type="submit" name="submit_update" class="btn btn-primary mt-3 shadow-sm">
    <i class="fas fa-save me-2"></i> Save Changes
  </button>
                        </div>
                    </div>

                    <div class="col-lg-9">
                        <div class="card section-card p-4 shadow-sm">
                            <h6 class="fw-bold mb-4"><i class="fas fa-id-card text-primary me-2"></i> Identity & Personal Details</h6>
                            <div class="row g-3">
                                <div class="col-md-2">
                                    <label class="form-label">Title</label>
                                    <select name="title" class="form-select">
                                        <?php
                                        // Define the standard academic titles
                                        $titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Engr.', 'Arc.', 'Pharm.'];
                                        foreach ($titles as $t) {
                                            $selected = ($user['title'] == $t) ? 'selected' : '';
                                            echo "<option value=\"$t\" $selected>$t</option>";
                                        }
                                        ?>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">First Name</label>
                                    <input type="text" name="first_name" class="form-control" value="<?php echo $user['first_name']; ?>" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Middle Name</label>
                                    <input type="text" name="middle_name" class="form-control" value="<?php echo $user['middle_name']; ?>">
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Last Name</label>
                                    <input type="text" name="last_name" class="form-control" value="<?php echo $user['last_name']; ?>" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Gender</label>
                                    <select name="gender" class="form-select">
                                        <option value="Male" <?php if($user['gender'] == 'Male') echo 'selected'; ?>>Male</option>
                                        <option value="Female" <?php if($user['gender'] == 'Female') echo 'selected'; ?>>Female</option>
                                        <option value="Other" <?php if($user['gender'] == 'Other') echo 'selected'; ?>>Other</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Date of Birth</label>
                                    <input type="date" name="date_of_birth" class="form-control" value="<?php echo $user['date_of_birth']; ?>">
                                </div>
                            </div>
                        </div>

                        <div class="card section-card p-4 shadow-sm">
                            <h6 class="fw-bold mb-4"><i class="fas fa-map-marker-alt text-primary me-2"></i> Contact & Office Information</h6>
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">Phone Number</label>
                                    <input type="tel" name="phone" class="form-control" value="<?php echo $user['phone']; ?>" placeholder="+234...">
                                </div>
                                <div class="col-md-9">
                                    <label class="form-label">Office Location</label>
                                    <input type="text" name="office_location" class="form-control" value="<?php echo $user['office_location']; ?>" placeholder="e.g. Block A, Room 202">
                                </div>
                            </div>
                        </div>

                        <div class="card section-card p-4 shadow-sm">
                            <h6 class="fw-bold mb-4"><i class="fas fa-user-edit text-primary me-2"></i> Professional Biography</h6>
                            <div class="row g-3">
                                <div class="col-md-12">
                                    <textarea name="biography" class="form-control" rows="8" placeholder="Write a short academic summary..."><?php echo $user['biography']; ?></textarea>
                                    <div class="form-text mt-2">Summarize your research interests, teaching philosophy, and key achievements.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
    // Live Image Preview UX
    document.getElementById('photoUpload').onchange = function (evt) {
        const [file] = this.files;
        if (file) {
            document.getElementById('imagePreview').src = URL.createObjectURL(file);
        }
    }
</script>
</body>
</html>