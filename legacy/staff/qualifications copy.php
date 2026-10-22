<?php
session_start();
require '../config/db.php';
// if (!isset($_SESSION['staff_id'])) { header("Location: ../login.php"); exit; }

$staff_id = $_SESSION['staff_id'];


// Handle Add Qualification
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_qual'])) {
    $stmt = $pdo->prepare("INSERT INTO qualification (staff_id, degree, field_of_study, institution, country, year_awarded) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$staff_id, $_POST['degree'], $_POST['field'], $_POST['institution'], $_POST['country'], $_POST['year']]);
    $_SESSION['msg'] = "Qualification added successfully!";
    header("Location: qualifications.php"); exit;
}

// Handle Delete
if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM qualification WHERE qualification_id = ? AND staff_id = ?");
    $stmt->execute([$_GET['del'], $staff_id]);
    header("Location: qualifications.php"); exit;
}

$quals = $pdo->prepare("SELECT * FROM qualification WHERE staff_id = ? ORDER BY year_awarded DESC");
$quals->execute([$staff_id]);
?>
<?php if(isset($_GET['status'])): ?>
    <div class="container mt-3">
        <?php if($_GET['status'] == 'submitted'): ?>
            <div class="alert alert-info border-0 shadow-sm">
                <i class="fas fa-clock me-2"></i> Your new qualification has been submitted for admin approval.
            </div>
        <?php elseif($_GET['status'] == 'delete_submitted'): ?>
            <div class="alert alert-warning border-0 shadow-sm">
                <i class="fas fa-exclamation-triangle me-2"></i> Removal request submitted. It will be hidden once approved by the admin.
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Academic Qualifications | Staff Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --uni-navy: #0d2c56; --uni-gold: #c5a017; }
        body { background-color: #f4f7f6; font-family: 'Ubuntu', sans-serif; }
        .main-content { background: #f8f9fa; min-height: 100vh; }
        .qual-card { border: none; border-radius: 15px; transition: all 0.3s ease; border-left: 5px solid var(--uni-navy); }
        .qual-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
        .degree-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(13, 44, 86, 0.1); color: var(--uni-navy); border-radius: 12px; }
        .year-badge { background: var(--uni-navy); color: white; padding: 5px 15px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; }
        .btn-primary { background-color: var(--uni-navy); border: none; }
        .btn-primary:hover { background-color: #081d3a; }
        .modal-header { background: var(--uni-navy); color: white; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
     

        <main class="col-lg-10 p-4 main-content">
            <div class="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h2 class="fw-bold text-dark mb-1">Academic Qualifications</h2>
                    <p class="text-muted">Manage your educational history and degrees.</p>
                </div>
                <button class="btn btn-primary px-4 py-2 shadow-sm" data-bs-toggle="modal" data-bs-target="#addModal">
                    <i class="fas fa-plus-circle me-2"></i> Add New Qualification
                </button>
            </div>

            <?php if($quals->rowCount() == 0): ?>
                <div class="text-center py-5">
                    <img src="https://illustrations.popsy.co/blue/graduating.svg" style="width: 200px;" class="mb-4">
                    <h4 class="text-muted">No qualifications found.</h4>
                    <p>Start by adding your most recent degree.</p>
                </div>
            <?php endif; ?>

            <div class="row g-4">
                <?php while($q = $quals->fetch()): ?>
                <div class="col-md-6">
                    <div class="card qual-card shadow-sm h-100">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between mb-3">
                                <div class="degree-icon">
                                    <i class="fas fa-graduation-cap fa-lg"></i>
                                </div>
                                <div class="text-end">
                                    <span class="year-badge"><?= $q['year_awarded'] ?></span>
                                    <div class="mt-2">
                                        <a href="./actions/update_qualifications_core.php?del=<?= $q['qualification_id'] ?>" 
                                            class="btn btn-link text-danger p-0 ms-2" 
                                            onclick="return confirm('Archive this qualification?')">
                                            <i class="fas fa-trash-alt"></i>
                                        </a>
                                        <!-- <a href="?del=<?= $q['qualification_id'] ?>" class="btn btn-link text-danger p-0 ms-2" onclick="return confirm('Archive this qualification?')">
                                            <i class="fas fa-trash-alt"></i>
                                        </a> -->
                                    </div>
                                </div>
                            </div>
                            
                            <h5 class="fw-bold mb-1 text-navy"><?= htmlspecialchars($q['degree']) ?></h5>
                            <p class="text-primary fw-semibold mb-3 small"><?= htmlspecialchars($q['field_of_study']) ?></p>
                            
                            <div class="pt-3 border-top mt-auto">
                                <div class="d-flex align-items-center text-muted small">
                                    <i class="fas fa-university me-2 text-gold"></i>
                                    <span><?= htmlspecialchars($q['institution']) ?></span>
                                </div>
                                <div class="d-flex align-items-center text-muted small mt-1">
                                    <i class="fas fa-globe-africa me-2 text-gold"></i>
                                    <span><?= htmlspecialchars($q['country']) ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="addModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <!-- <form method="POST" class="modal-content border-0 shadow-lg"> -->
        <form method="POST" action="actions/update_qualifications_core.php" class="modal-content border-0 shadow-lg">
            <div class="modal-header border-0 p-4">
                <h5 class="modal-title fw-bold"><i class="fas fa-award me-2"></i> Add Qualification</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Degree Level</label>
                        <select name="degree" class="form-select border-2" required>
                            <option value="" disabled selected>Select Level</option>
                            <option>PhD</option>
                            <option>M.Sc / M.Phil</option>
                            <option>B.Sc / B.Eng / B.A</option>
                            <option>PGD</option>
                            <option>HND / OND</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-bold small">Year Awarded</label>
                        <input type="number" name="year" class="form-control border-2" min="1950" max="<?= date('Y') ?>" placeholder="YYYY" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label fw-bold small">Field of Study</label>
                        <input type="text" name="field" class="form-control border-2" placeholder="e.g. Applied Computing" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label fw-bold small">Institution</label>
                        <input type="text" name="institution" class="form-control border-2" placeholder="University Name" required>
                    </div>
                  
                    <div class="col-12">
                        <label class="form-label fw-bold small">Country</label>
                        <select name="country" class="form-select border-2" required id="countrySelect">
                            <option value="" disabled selected>Select Country...</option>
                            <?php
                            // Fetch from API (cached for performance)
                            $apiUrl = "https://restcountries.com/v3.1/all?fields=name";
                            $response = file_get_contents($apiUrl);
                            $data = json_decode($response, true);

                            if ($data) {
                                // Sort countries alphabetically by common name
                                usort($data, function($a, $b) {
                                    return strcmp($a['name']['common'], $b['name']['common']);
                                });

                                foreach ($data as $c) {
                                    $name = $c['name']['common'];
                                    echo "<option value=\"$name\">$name</option>";
                                }
                            } else {
                                // Fallback if API is down
                                echo "<option value='Nigeria'>Nigeria</option>";
                            }
                            ?>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer border-0 p-4">
                <button type="button" class="btn btn-light px-4" data-bs-toggle="modal">Cancel</button>
                <button type="submit" name="add_qual" class="btn btn-primary px-4">Save Achievement</button>
            </div>
        </form>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
















<!-- <?php
require '../config/db.php';
require '../includes/header.php';
session_start();
$staff_id = $_SESSION['staff_id'];

// Handle Add
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_qual'])) {
    $stmt = $pdo->prepare("INSERT INTO qualification (staff_id, degree, field_of_study, institution, country, year_awarded) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$staff_id, $_POST['degree'], $_POST['field'], $_POST['institution'], $_POST['country'], $_POST['year']]);
    header("Location: qualifications.php"); exit;
}

// Handle Delete
if (isset($_GET['del'])) {
    $stmt = $pdo->prepare("DELETE FROM qualification WHERE qualification_id = ? AND staff_id = ?");
    $stmt->execute([$_GET['del'], $staff_id]);
    header("Location: qualifications.php"); exit;
}

$quals = $pdo->prepare("SELECT * FROM qualification WHERE staff_id = ? ORDER BY year_awarded DESC");
$quals->execute([$staff_id]);
?>

<div class="container-fluid">
    <div class="row">
        <?php include 'partials/staff_sidebar.php'; ?>
        <main class="col-lg-10 col-md-9 ms-auto p-4 bg-light">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 class="fw-bold text-dark">Academic Qualifications</h3>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addModal">
                    <i class="fas fa-plus"></i> Add Qualification
                </button>
            </div>

            <div class="row">
                <?php while($q = $quals->fetch()): ?>
                <div class="col-12 mb-3">
                    <div class="card border-0 shadow-sm hover-shadow">
                        <div class="card-body d-flex align-items-center">
                            <div class="bg-primary bg-opacity-10 text-primary rounded p-3 me-3">
                                <i class="fas fa-graduation-cap fa-2x"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h5 class="fw-bold mb-1"><?= htmlspecialchars($q['degree']) ?> <span class="text-muted fw-normal">in <?= htmlspecialchars($q['field_of_study']) ?></span></h5>
                                <p class="mb-0 text-secondary">
                                    <i class="fas fa-university me-1"></i> <?= htmlspecialchars($q['institution']) ?>, <?= htmlspecialchars($q['country']) ?>
                                </p>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-dark fs-6"><?= $q['year_awarded'] ?></span>
                                <a href="?del=<?= $q['qualification_id'] ?>" class="btn btn-sm btn-outline-danger ms-2" onclick="return confirm('Delete this qualification?')"><i class="fas fa-trash"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </main>
    </div>
</div>

<div class="modal fade" id="addModal" tabindex="-1">
    <div class="modal-dialog">
        <form method="POST" class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add Qualification</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3"><label>Degree (e.g. PhD)</label><input type="text" name="degree" class="form-control" required></div>
                <div class="mb-3"><label>Field of Study</label><input type="text" name="field" class="form-control" required></div>
                <div class="mb-3"><label>Institution</label><input type="text" name="institution" class="form-control" required></div>
                <div class="row">
                    <div class="col mb-3"><label>Country</label><input type="text" name="country" class="form-control" required></div>
                    <div class="col mb-3"><label>Year</label><input type="number" name="year" class="form-control" required></div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="submit" name="add_qual" class="btn btn-primary">Save Qualification</button>
            </div>
        </form>
    </div>
</div>
<?php require '../includes/footer.php'; ?> -->