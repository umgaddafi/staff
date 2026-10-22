<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require '../config/db.php';

// 1. Validate Request
$staff_id = isset($_GET['staff_id']) ? intval($_GET['staff_id']) : 0;

if ($staff_id === 0) {
    die("Error: No staff member specified.");
}

// 2. Fetch Core Staff Data (Joined with Rank, Dept, College)
$stmt = $pdo->prepare("
    SELECT s.*, r.rank_name, d.name AS dept_name, c.name AS college_name 
    FROM staff s
    LEFT JOIN academic_rank r ON s.rank_id = r.rank_id
    LEFT JOIN department d ON s.department_id = d.department_id
    LEFT JOIN college c ON d.college_id = c.college_id
    WHERE s.staff_id = ? AND s.is_active = 1
");
$stmt->execute([$staff_id]);
$staff = $stmt->fetch();

if (!$staff) {
    die("<div class='container mt-5 alert alert-danger'>Staff profile not found or inactive.</div>");
}

// 3. Fetch Related Data Helper Function
function fetchData($pdo, $sql, $id) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    return $stmt->fetchAll();
}

// Fetch all related tables
$qualifications = fetchData($pdo, "SELECT * FROM qualification WHERE staff_id = ? ORDER BY year_awarded DESC", $staff_id);
$research_areas = fetchData($pdo, "SELECT r.name FROM staff_research_area sra JOIN research_area r ON sra.research_area_id = r.research_area_id WHERE sra.staff_id = ?", $staff_id);
$publications   = fetchData($pdo, "SELECT p.* FROM staff_publication sp JOIN publication p ON sp.publication_id = p.publication_id WHERE sp.staff_id = ? ORDER BY p.year_published DESC", $staff_id);
$courses        = fetchData($pdo, "SELECT c.*, sc.session FROM staff_course sc JOIN course c ON sc.course_id = c.course_id WHERE sc.staff_id = ? ORDER BY sc.session DESC", $staff_id);
$supervision    = fetchData($pdo, "SELECT * FROM supervision WHERE staff_id = ? ORDER BY year_completed DESC", $staff_id);
$grants         = fetchData($pdo, "SELECT * FROM grant_project WHERE staff_id = ? ORDER BY start_year DESC", $staff_id);
$memberships    = fetchData($pdo, "SELECT * FROM professional_membership WHERE staff_id = ?", $staff_id);
$profiles       = fetchData($pdo, "SELECT * FROM external_profile WHERE staff_id = ?", $staff_id);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($staff['first_name'] . ' ' . $staff['last_name']) ?> - Academic Portfolio</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/fonts.css">
    
    <style>
        :root {
            --primary-color: #0d2d62; /* Academic Blue */
            --secondary-color: #f8f9fa;
            --accent-color: #d4a017; /* Gold/Bronze accent */
        }
        body { font-family: 'Ubuntu', sans-serif; background-color: #f4f6f9; color: #333; }
        
        /* Hero Section */
        .profile-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, #1a4b8e 100%);
            color: white;
            padding: 4rem 0 3rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .profile-img-container {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            border: 5px solid white;
            overflow: hidden;
            margin: 0 auto;
            background: white;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .profile-img { width: 100%; height: 100%; object-fit: cover; }
        
        /* Sticky Nav */
        .sticky-nav {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 2rem;
        }
        .nav-link { color: #555; font-weight: 500; padding: 1rem 1.5rem; }
        .nav-link.active { color: var(--primary-color); border-bottom: 3px solid var(--primary-color); }
        .nav-link:hover { color: var(--primary-color); }

        /* Content Cards */
        .section-card {
            background: white;
            border-radius: 8px;
            border: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.03);
            margin-bottom: 2rem;
            padding: 2rem;
        }
        .section-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #eee;
            display: flex;
            align-items: center;
        }
        .section-title i { margin-right: 10px; color: var(--accent-color); }

        /* Items */
        .timeline-item { border-left: 3px solid #e9ecef; padding-left: 20px; margin-bottom: 20px; position: relative; }
        .timeline-item::before {
            content: ''; position: absolute; left: -8px; top: 5px; width: 13px; height: 13px;
            background: var(--accent-color); border-radius: 50%;
        }
        .pub-item { margin-bottom: 1.2rem; padding-bottom: 1.2rem; border-bottom: 1px dashed #eee; }
        .pub-item:last-child { border-bottom: none; }
        .tag-badge { background-color: #eef2f7; color: var(--primary-color); padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; margin-right: 5px; display: inline-block; margin-bottom: 5px; }
        
        /* External Profiles */
        .social-link {
            width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1);
            display: inline-flex; align-items: center; justify-content: center;
            color: white; text-decoration: none; margin: 0 5px; transition: 0.3s;
        }
        .social-link:hover { background: rgba(255,255,255,0.3); color: white; transform: translateY(-3px); }
    </style>
</head>
<body data-bs-spy="scroll" data-bs-target="#navbar-example2" data-bs-offset="100" tabindex="0">

    <header class="profile-header text-center">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-12">
                    <div class="profile-img-container mb-3">
                        <img src="<?= !empty($staff['profile_photo']) ? '../uploads/'.$staff['profile_photo'] : 'https://ui-avatars.com/api/?name='.urlencode($staff['first_name'].'+'.$staff['last_name']).'&size=256&background=random' ?>" class="profile-img" alt="Profile">
                    </div>
                    <h1 class="fw-bold mb-1"><?= htmlspecialchars($staff['title'] . ' ' . $staff['first_name'] . ' ' . $staff['last_name']) ?></h1>
                    <p class="fs-5 opacity-75 mb-1"><?= htmlspecialchars($staff['rank_name']) ?></p>
                    <p class="small text-uppercase letter-spacing-2 mb-3">
                        <?= htmlspecialchars($staff['dept_name']) ?> &bull; <?= htmlspecialchars($staff['college_name']) ?>
                    </p>
                    
                    <div class="d-flex justify-content-center mb-4">
                        <?php foreach($profiles as $prof): ?>
                            <?php 
                                $icon = 'fa-globe';
                                if($prof['platform'] == 'Google Scholar') $icon = 'fa-google';
                                if($prof['platform'] == 'ResearchGate') $icon = 'fa-flask';
                                if($prof['platform'] == 'ORCID') $icon = 'fa-id-card';
                                if($prof['platform'] == 'Scopus') $icon = 'fa-book';
                            ?>
                            <a href="<?= htmlspecialchars($prof['profile_url']) ?>" target="_blank" class="social-link" title="<?= $prof['platform'] ?>">
                                <i class="fas <?= $icon ?>"></i>
                            </a>
                        <?php endforeach; ?>
                        <?php if($staff['email']): ?>
                            <a href="mailto:<?= htmlspecialchars($staff['email']) ?>" class="social-link" title="Email Me">
                                <i class="fas fa-envelope"></i>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <nav id="navbar-example2" class="sticky-nav d-none d-md-block">
        <div class="container">
            <ul class="nav nav-pills justify-content-center">
                <li class="nav-item"><a class="nav-link active" href="#biography">Biography</a></li>
                <?php if($research_areas || $publications): ?><li class="nav-item"><a class="nav-link" href="#research">Research</a></li><?php endif; ?>
                <?php if($courses || $supervision): ?><li class="nav-item"><a class="nav-link" href="#teaching">Teaching</a></li><?php endif; ?>
                <?php if($grants): ?><li class="nav-item"><a class="nav-link" href="#grants">Grants</a></li><?php endif; ?>
                <?php if($memberships): ?><li class="nav-item"><a class="nav-link" href="#service">Service</a></li><?php endif; ?>
            </ul>
        </div>
    </nav>

    <div class="container pb-5">
        <div class="row">
            
            <div class="col-lg-4 mb-4">
                
                <div class="section-card">
                    <h5 class="fw-bold mb-3">Contact Information</h5>
                    <ul class="list-unstyled">
                        <li class="mb-2"><i class="fas fa-envelope text-muted me-2"></i> <?= htmlspecialchars($staff['email']) ?></li>
                        <?php if($staff['phone']): ?>
                            <li class="mb-2"><i class="fas fa-phone text-muted me-2"></i> <?= htmlspecialchars($staff['phone']) ?></li>
                        <?php endif; ?>
                        <?php if($staff['office_location']): ?>
                            <li class="mb-2"><i class="fas fa-map-marker-alt text-muted me-2"></i> <?= htmlspecialchars($staff['office_location']) ?></li>
                        <?php endif; ?>
                    </ul>
                </div>

                <?php if($qualifications): ?>
                <div class="section-card">
                    <h5 class="fw-bold mb-3">Education</h5>
                    <?php foreach($qualifications as $qual): ?>
                        <div class="mb-3">
                            <div class="fw-bold"><?= htmlspecialchars($qual['degree']) ?></div>
                            <div class="small text-muted"><?= htmlspecialchars($qual['field_of_study']) ?></div>
                            <div class="small"><?= htmlspecialchars($qual['institution']) ?>, <?= htmlspecialchars($qual['country']) ?></div>
                            <div class="small text-muted"><?= $qual['year_awarded'] ?></div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
            </div>

            <div class="col-lg-8">
                
                <div id="biography" class="section-card">
                    <div class="section-title"><i class="fas fa-user"></i> Biography</div>
                    <p class="text-secondary" style="line-height: 1.8;">
                        <?= !empty($staff['biography']) ? nl2br(htmlspecialchars($staff['biography'])) : '<em>Biography not yet added.</em>' ?>
                    </p>
                </div>

                <?php if($research_areas || $publications): ?>
                <div id="research" class="section-card">
                    <div class="section-title"><i class="fas fa-microscope"></i> Research & Publications</div>
                    
                    <?php if($research_areas): ?>
                        <div class="mb-4">
                            <h6 class="fw-bold mb-2">Research Interests</h6>
                            <div>
                                <?php foreach($research_areas as $area): ?>
                                    <span class="tag-badge"><?= htmlspecialchars($area['name']) ?></span>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endif; ?>

                    <?php if($publications): ?>
                        <h6 class="fw-bold mb-3">Selected Publications</h6>
                        <?php foreach($publications as $pub): ?>
                            <div class="pub-item">
                                <div class="fw-bold"><?= htmlspecialchars($pub['title']) ?></div>
                                <div class="small text-muted mb-1">
                                    <span class="badge bg-light text-dark border"><?= $pub['publication_type'] ?></span> 
                                    <?= htmlspecialchars($pub['journal_or_venue']) ?> (<?= $pub['year_published'] ?>)
                                </div>
                                <?php if($pub['doi']): ?>
                                    <a href="https://doi.org/<?= htmlspecialchars($pub['doi']) ?>" class="small text-primary text-decoration-none" target="_blank"><i class="fas fa-link"></i> DOI: <?= htmlspecialchars($pub['doi']) ?></a>
                                <?php elseif($pub['url']): ?>
                                    <a href="<?= htmlspecialchars($pub['url']) ?>" class="small text-primary text-decoration-none" target="_blank"><i class="fas fa-link"></i> View Publication</a>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
                <?php endif; ?>

                <?php if($courses || $supervision): ?>
                <div id="teaching" class="section-card">
                    <div class="section-title"><i class="fas fa-chalkboard-teacher"></i> Teaching & Supervision</div>
                    
                    <?php if($courses): ?>
                        <h6 class="fw-bold mb-3">Courses Taught</h6>
                        <div class="table-responsive mb-4">
                            <table class="table table-sm table-borderless">
                                <thead class="text-muted small"><tr><th>Code</th><th>Title</th><th>Level</th></tr></thead>
                                <tbody>
                                <?php foreach($courses as $course): ?>
                                    <tr>
                                        <td class="fw-bold"><?= htmlspecialchars($course['course_code']) ?></td>
                                        <td><?= htmlspecialchars($course['course_title']) ?></td>
                                        <td><?= $course['level'] ?>L</td>
                                    </tr>
                                <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>

                    <?php if($supervision): ?>
                        <h6 class="fw-bold mb-3">Student Supervision</h6>
                        <?php foreach($supervision as $sup): ?>
                            <div class="timeline-item">
                                <div class="fw-bold"><?= htmlspecialchars($sup['student_name']) ?> <span class="badge bg-secondary rounded-pill small"><?= $sup['degree'] ?></span></div>
                                <div class="small text-muted fst-italic">"<?= htmlspecialchars($sup['thesis_title']) ?>"</div>
                                <div class="small mt-1">
                                    Status: <span class="text-<?= $sup['status'] == 'Completed' ? 'success' : 'warning' ?> fw-bold"><?= $sup['status'] ?></span> 
                                    (<?= $sup['year_started'] ?> - <?= $sup['year_completed'] ?? 'Present' ?>)
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
                
                <?php if($grants): ?>
                <div id="grants" class="section-card">
                    <div class="section-title"><i class="fas fa-hand-holding-usd"></i> Grants & Projects</div>
                    <?php foreach($grants as $grant): ?>
                        <div class="mb-3 pb-3 border-bottom">
                            <div class="fw-bold"><?= htmlspecialchars($grant['title']) ?></div>
                            <div class="d-flex justify-content-between small text-muted mt-1">
                                <span><i class="fas fa-building"></i> <?= htmlspecialchars($grant['sponsor']) ?></span>
                                <span><?= $grant['start_year'] ?> - <?= $grant['end_year'] ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

            </div> </div> </div> <footer class="bg-white text-center py-4 border-top mt-5">
        <div class="container">
            <p class="text-muted small mb-0">&copy; <?= date('Y') ?> Academic Portfolio System. All Information is property of the University.</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>