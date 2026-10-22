<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require '../config/db.php';

if (isset($_SESSION['user_id']) && (($_SESSION['role'] ?? '') === 'Staff')) {
    $mustStmt = $pdo->prepare("SELECT must_change_password FROM user_account WHERE user_id = ? LIMIT 1");
    $mustStmt->execute([$_SESSION['user_id']]);
    if ((int)$mustStmt->fetchColumn() === 1) {
        $_SESSION['force_reset'] = true;
        header("Location: ../auth/change_password.php");
        exit();
    }
}

// 1. Validate Request
$staff_id = isset($_GET['staff_id']) ? intval($_GET['staff_id']) : 0;
$mode = (isset($_GET['mode']) && $_GET['mode'] === 'private') ? 'private' : 'public';
$is_private_preview = ($mode === 'private');

if ($staff_id === 0 && isset($_SESSION['staff_id'])) {
    $staff_id = (int) $_SESSION['staff_id'];
}

if ($staff_id === 0 && isset($_SESSION['user_id'])) {
    $sid_stmt = $pdo->prepare("SELECT staff_id FROM user_account WHERE user_id = ? LIMIT 1");
    $sid_stmt->execute([$_SESSION['user_id']]);
    $staff_id = (int) ($sid_stmt->fetchColumn() ?: 0);
}

if ($staff_id === 0) {
    die("Error: No staff member specified.");
}

if ($is_private_preview) {
    if (!isset($_SESSION['user_id'])) {
        die("<div class='container mt-5 alert alert-danger'>Private preview requires login.</div>");
    }

    $viewer_role = $_SESSION['role'] ?? '';
    $viewer_staff_id = $_SESSION['staff_id'] ?? null;

    if ($viewer_role !== 'Admin' && (string)$viewer_staff_id !== (string)$staff_id) {
        die("<div class='container mt-5 alert alert-danger'>You can only preview your own portfolio.</div>");
    }
}

// 2. Fetch Core Staff Data
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
    die("<div class='container mt-5 alert alert-danger'>Staff profile not found.</div>");
}

// 3. Fetch Related Data Helper
function fetchData($pdo, $sql, $id) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
    return $stmt->fetchAll();
}

$qualifications = fetchData($pdo, "SELECT * FROM qualification WHERE staff_id = ? ORDER BY year_awarded DESC", $staff_id);
$research_areas = fetchData($pdo, "SELECT r.name FROM staff_research_area sra JOIN research_area r ON sra.research_area_id = r.research_area_id WHERE sra.staff_id = ?", $staff_id);
$publications   = fetchData($pdo, "SELECT p.* FROM staff_publication sp JOIN publication p ON sp.publication_id = p.publication_id WHERE sp.staff_id = ? ORDER BY p.year_published DESC", $staff_id);
$courses        = fetchData($pdo, "SELECT c.*, sc.session FROM staff_course sc JOIN course c ON sc.course_id = c.course_id WHERE sc.staff_id = ? ORDER BY sc.session DESC", $staff_id);
$supervision    = fetchData($pdo, "SELECT * FROM supervision WHERE staff_id = ? ORDER BY year_completed DESC", $staff_id);
$grants         = fetchData($pdo, "SELECT * FROM grant_project WHERE staff_id = ? ORDER BY start_year DESC", $staff_id);
$memberships    = fetchData($pdo, "SELECT * FROM professional_membership WHERE staff_id = ?", $staff_id);
$profiles       = fetchData($pdo, "SELECT * FROM external_profile WHERE staff_id = ?", $staff_id);

if ($is_private_preview && isset($_SESSION['user_id'])) {
    $pending_stmt = $pdo->prepare("
        SELECT entity_name, entity_id, action, change_payload
        FROM change_log
        WHERE user_id = ? AND status = 'Pending'
        ORDER BY log_id ASC
    ");
    $pending_stmt->execute([$_SESSION['user_id']]);
    $pending_logs = $pending_stmt->fetchAll(PDO::FETCH_ASSOC);

    $course_cache = [];
    $course_by_id = function ($course_id) use ($pdo, &$course_cache) {
        if (isset($course_cache[$course_id])) {
            return $course_cache[$course_id];
        }
        $s = $pdo->prepare("SELECT course_id, course_code, course_title, level FROM course WHERE course_id = ? LIMIT 1");
        $s->execute([$course_id]);
        $row = $s->fetch(PDO::FETCH_ASSOC) ?: null;
        $course_cache[$course_id] = $row;
        return $row;
    };

    $removeById = function (&$rows, $id_key, $id_value) {
        $rows = array_values(array_filter($rows, function ($row) use ($id_key, $id_value) {
            return (string)($row[$id_key] ?? '') !== (string)$id_value;
        }));
    };

    foreach ($pending_logs as $log) {
        $entity = (string)($log['entity_name'] ?? '');
        $action = (string)($log['action'] ?? '');
        $entity_id = $log['entity_id'] ?? null;
        $payload = json_decode((string)($log['change_payload'] ?? ''), true);
        if (!is_array($payload)) {
            $payload = [];
        }

        if ($entity === 'staff' && $action === 'UPDATE') {
            foreach ($payload as $k => $v) {
                $staff[$k] = $v;
            }
            continue;
        }

        if ($entity === 'publication') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                $publications[] = array_merge([
                    'publication_id' => 0,
                    'title' => '',
                    'publication_type' => 'Journal',
                    'journal_or_venue' => '',
                    'publisher' => '',
                    'year_published' => date('Y'),
                    'doi' => '',
                    'url' => '',
                ], $payload);
            } elseif ($action === 'DELETE') {
                $removeById($publications, 'publication_id', $entity_id);
            }
            continue;
        }

        if ($entity === 'qualification') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                $qualifications[] = array_merge([
                    'qualification_id' => 0,
                    'degree' => '',
                    'field_of_study' => '',
                    'institution' => '',
                    'country' => '',
                    'year_awarded' => '',
                ], $payload);
            } elseif ($action === 'DELETE') {
                $removeById($qualifications, 'qualification_id', $entity_id);
            }
            continue;
        }

        if ($entity === 'grant_project') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                $grants[] = array_merge([
                    'project_id' => 0,
                    'title' => '',
                    'sponsor' => '',
                    'amount' => 0,
                    'start_year' => '',
                    'end_year' => '',
                ], $payload);
            } elseif ($action === 'DELETE') {
                $removeById($grants, 'project_id', $entity_id);
            }
            continue;
        }

        if ($entity === 'supervision') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                $supervision[] = array_merge([
                    'supervision_id' => 0,
                    'student_name' => '',
                    'degree' => '',
                    'thesis_title' => '',
                    'status' => '',
                    'year_started' => '',
                    'year_completed' => '',
                ], $payload);
            } elseif ($action === 'DELETE') {
                $removeById($supervision, 'supervision_id', $entity_id);
            }
            continue;
        }

        if ($entity === 'professional_membership') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                $memberships[] = array_merge([
                    'membership_id' => 0,
                    'body_name' => '',
                    'membership_no' => '',
                    'role' => '',
                ], $payload);
            } elseif ($action === 'DELETE') {
                $removeById($memberships, 'membership_id', $entity_id);
            }
            continue;
        }

        if ($entity === 'external_profile') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                $profiles[] = array_merge([
                    'profile_id' => 0,
                    'platform' => '',
                    'profile_url' => '',
                ], $payload);
            } elseif ($action === 'DELETE') {
                $removeById($profiles, 'profile_id', $entity_id);
            }
            continue;
        }

        if ($entity === 'research_area') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                if (!empty($payload['name'])) {
                    $research_areas[] = ['name' => $payload['name']];
                }
            } elseif ($action === 'DELETE') {
                $target = (string)($payload['name'] ?? '');
                $research_areas = array_values(array_filter($research_areas, function ($row) use ($target) {
                    return (string)($row['name'] ?? '') !== $target;
                }));
            }
            continue;
        }

        if ($entity === 'staff_course') {
            if ($action === 'CREATE' || $action === 'UPDATE') {
                $course_id = (int)($payload['course_id'] ?? 0);
                $course_info = $course_by_id($course_id);
                if ($course_info) {
                    $courses[] = array_merge($course_info, ['session' => (string)($payload['session'] ?? '')]);
                }
            } elseif ($action === 'DELETE') {
                $course_id = (string)($payload['course_id'] ?? '');
                $session = (string)($payload['session'] ?? '');
                $courses = array_values(array_filter($courses, function ($row) use ($course_id, $session) {
                    return !((string)($row['course_id'] ?? '') === $course_id && (string)($row['session'] ?? '') === $session);
                }));
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($staff['first_name'] . ' ' . $staff['last_name']) ?> - Portfolio</title>
    <link rel="icon" type="image/jpeg" href="../images/jostum.jpeg">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/fonts.css">
    
    <style>
        :root {
            --primary-color: #2c170f;
            --primary-deep: #1d0f0a;
            --primary-light: #efe7de;
            --accent-color: #c8a36b;
            --bg-color: #f4f7f6;
            --text-dark: #1f2937;
        }
        
        body { 
            font-family: 'Ubuntu', sans-serif; 
            background-color: var(--bg-color); 
            color: var(--text-dark);
            padding-bottom: 70px; /* Space for mobile nav */
        }

        /* --- HEADER STYLES --- */
        .profile-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-deep) 100%);
            color: white;
            padding: 3rem 0;
            margin-bottom: 2rem;
            position: relative;
            overflow: hidden;
        }
        
        /* Decorative background circle */
        .profile-header::before {
            content: ''; position: absolute; top: -50%; left: -10%; width: 50%; height: 200%;
            background: rgba(255,255,255,0.03); transform: rotate(15deg); pointer-events: none;
        }

        .profile-img-container {
            width: 140px; height: 140px;
            border-radius: 50%;
            border: 4px solid rgba(255,255,255,0.9);
            overflow: hidden;
            background: white;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            margin: 0 auto 1rem;
        }
        .profile-img { width: 100%; height: 100%; object-fit: cover; }
        
        .header-content { text-align: center; }
        .staff-name { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
        .staff-rank { font-size: 1rem; opacity: 0.9; margin-bottom: 0.25rem; }
        .staff-dept { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }

        /* --- BUTTONS & SOCIAL --- */
        .social-btn {
            width: 42px; height: 42px;
            border-radius: 50%;
            background: rgba(255,255,255,0.15);
            color: white;
            display: inline-flex; align-items: center; justify-content: center;
            margin: 0 4px;
            transition: all 0.3s ease;
            text-decoration: none; border: 1px solid rgba(255,255,255,0.1);
        }
        .social-btn:hover { background: white; color: var(--primary-color); transform: translateY(-3px); }

        /* --- CARDS & SECTIONS --- */
        .section-card {
            background: white;
            border-radius: 12px;
            border: none;
            box-shadow: 0 2px 15px rgba(0,0,0,0.03);
            margin-bottom: 1.5rem;
            padding: 1.5rem;
        }
        .section-title {
            font-size: 1.1rem; font-weight: 700; color: var(--primary-color);
            margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 2px solid #f0f0f0;
            display: flex; align-items: center;
        }
        .section-title i { margin-right: 10px; color: var(--accent-color); }
        .contact-icon { color: var(--primary-color); }
        .edu-year { color: var(--primary-color); }
        .btn-paper {
            border-color: var(--primary-color);
            color: var(--primary-color);
        }
        .btn-paper:hover,
        .btn-paper:focus {
            background: var(--primary-color);
            border-color: var(--primary-color);
            color: #fff;
        }
        .course-code {
            color: var(--primary-color);
        }

        /* --- CONTENT ITEMS --- */
        .pub-item { padding: 1rem; background: #fafafa; border-radius: 8px; margin-bottom: 1rem; border-left: 3px solid var(--primary-color); }
        .badge-soft { background-color: var(--primary-light); color: var(--primary-color); padding: 5px 10px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; margin-right: 5px; margin-bottom: 5px; display: inline-block; }
        
        /* Course List (Mobile First) */
        .course-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #eee; }
        .course-item:last-child { border-bottom: none; }
        
        /* --- NAVIGATION --- */
        /* Desktop Top Nav (Hidden on Mobile) */
        .desktop-nav {
            position: sticky; top: 0; z-index: 1020; background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 2rem; display: none;
        }
        .nav-link-desktop { color: #555; padding: 1rem 1.5rem; font-weight: 500; text-decoration: none; display: inline-block; border-bottom: 3px solid transparent; }
        .nav-link-desktop:hover, .nav-link-desktop.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }

        /* Mobile Bottom Nav (Hidden on Desktop) */
        .mobile-bottom-nav {
            position: fixed; bottom: 0; left: 0; width: 100%; background: white;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 1030; display: flex;
            justify-content: space-around; padding: 10px 0; border-top: 1px solid #eee;
        }
        .nav-item-mobile { text-align: center; color: #999; text-decoration: none; flex: 1; font-size: 0.75rem; }
        .nav-item-mobile i { display: block; font-size: 1.25rem; margin-bottom: 2px; }
        .nav-item-mobile.active { color: var(--primary-color); font-weight: 700; }

        /* --- DESKTOP SPECIFIC MEDIA QUERIES --- */
        @media (min-width: 992px) {
            body { padding-bottom: 0; }
            
            /* Header Transformation */
            .profile-header { padding: 4rem 0; text-align: left; }
            .header-content { text-align: left; display: flex; align-items: center; }
            .profile-img-container { margin: 0 2.5rem 0 0; width: 180px; height: 180px; flex-shrink: 0; }
            .social-container { margin-top: 1rem; justify-content: flex-start; }
            
            /* Navigation Swapping */
            .mobile-bottom-nav { display: none; }
            .desktop-nav { display: block; }
            
            /* Content Layout */
            .section-card { padding: 2rem; }
            .col-lg-4 .section-card { max-width: 360px; margin-left: auto; margin-right: auto; }
            .col-lg-8 .section-card { max-width: 840px; margin-left: auto; margin-right: auto; }
            
            /* Better Table for Desktop */
            .course-list-mobile { display: none; }
            .course-table-desktop { display: table; }
        }

        /* Helper for Table/List visibility */
        .course-table-desktop { display: none; width: 100%; }
        .course-list-mobile { display: block; }

    </style>
</head>
<body data-bs-spy="scroll" data-bs-target="#nav-spy" data-bs-offset="120">

    <nav class="desktop-nav" id="nav-spy">
        <div class="container">
            <div class="d-flex">
                <a href="#biography" class="nav-link-desktop active">Biography</a>
                <?php if($research_areas || $publications): ?><a href="#research" class="nav-link-desktop">Research</a><?php endif; ?>
                <?php if($courses): ?><a href="#teaching" class="nav-link-desktop">Teaching</a><?php endif; ?>
                <?php if($grants): ?><a href="#grants" class="nav-link-desktop">Grants</a><?php endif; ?>
            </div>
        </div>
    </nav>

    <header class="profile-header">
        <div class="container">
            <?php if ($is_private_preview): ?>
                <div class="alert alert-warning border-0 mb-4" role="alert" style="background: rgba(255,255,255,0.2); color: #fff;">
                    <i class="fas fa-user-shield me-2"></i>This is your private preview and may include pending changes not yet approved by admin.
                </div>
            <?php endif; ?>
            <div class="header-content">
                <div class="profile-img-container">
                    <img src="<?= !empty($staff['profile_photo']) ? '../uploads/'.$staff['profile_photo'] : 'https://ui-avatars.com/api/?name='.urlencode($staff['first_name'].'+'.$staff['last_name']).'&size=256&background=random' ?>" class="profile-img" alt="Profile">
                </div>
                <div class="flex-grow-1">
                    <h1 class="staff-name"><?= htmlspecialchars($staff['title'] . ' ' . $staff['first_name'] . ' ' . $staff['last_name']) ?></h1>
                    <div class="staff-rank"><?= htmlspecialchars($staff['rank_name']) ?></div>
                    <div class="staff-dept text-white-50 mb-3"><?= htmlspecialchars($staff['dept_name']) ?> &bull; <?= htmlspecialchars($staff['college_name']) ?></div>
                    
                    <div class="social-container">
                        <?php if($staff['email']): ?>
                            <a href="mailto:<?= htmlspecialchars($staff['email']) ?>" class="social-btn" title="Email"><i class="fas fa-envelope"></i></a>
                        <?php endif; ?>
                        <?php foreach($profiles as $prof): ?>
                            <?php 
                                $icon = 'fa-globe';
                                if(strpos($prof['platform'], 'Scholar') !== false) $icon = 'fa-google';
                                elseif(strpos($prof['platform'], 'Research') !== false) $icon = 'fa-flask';
                                elseif(strpos($prof['platform'], 'Linked') !== false) $icon = 'fa-linkedin-in';
                            ?>
                            <a href="<?= htmlspecialchars($prof['profile_url']) ?>" target="_blank" class="social-btn" title="<?= $prof['platform'] ?>">
                                <i class="fas <?= $icon ?>"></i>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <div class="container">
        <div class="row">
            
            <div class="col-lg-4 mb-4">
                <div class="sticky-lg-top" style="top: 100px; z-index: 1;">
                    
                    <div class="section-card">
                        <h5 class="fw-bold mb-3 small text-uppercase text-muted">Contact Details</h5>
                        <ul class="list-unstyled mb-0">
                            <li class="mb-2 d-flex"><i class="fas fa-envelope contact-icon mt-1 me-3"></i> <span><?= htmlspecialchars($staff['email']) ?></span></li>
                            <?php if($staff['phone']): ?>
                                <li class="mb-2 d-flex"><i class="fas fa-phone contact-icon mt-1 me-3"></i> <span><?= htmlspecialchars($staff['phone']) ?></span></li>
                            <?php endif; ?>
                            <?php if($staff['office_location']): ?>
                                <li class="mb-0 d-flex"><i class="fas fa-map-marker-alt contact-icon mt-1 me-3"></i> <span><?= htmlspecialchars($staff['office_location']) ?></span></li>
                            <?php endif; ?>
                        </ul>
                    </div>

                    <?php if($qualifications): ?>
                    <div class="section-card">
                        <div class="section-title"><i class="fas fa-graduation-cap"></i> Education</div>
                        <?php foreach($qualifications as $qual): ?>
                            <div class="mb-3 border-bottom pb-2 last-no-border">
                                <div class="fw-bold"><?= htmlspecialchars($qual['degree']) ?></div>
                                <div class="small text-muted"><?= htmlspecialchars($qual['institution']) ?></div>
                                <div class="small fw-bold edu-year"><?= $qual['year_awarded'] ?></div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="col-lg-8">
                
                <div id="biography" class="section-card">
                    <div class="section-title"><i class="fas fa-user-circle"></i> Biography</div>
                    <div class="text-secondary" style="line-height: 1.7;">
                        <?= !empty($staff['biography']) ? nl2br(htmlspecialchars($staff['biography'])) : '<em>No biography provided.</em>' ?>
                    </div>
                </div>

                <?php if($research_areas || $publications): ?>
                <div id="research" class="section-card">
                    <div class="section-title"><i class="fas fa-microscope"></i> Research</div>
                    
                    <?php if($research_areas): ?>
                        <div class="mb-4">
                            <?php foreach($research_areas as $area): ?>
                                <span class="badge-soft"><?= htmlspecialchars($area['name']) ?></span>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <?php if($publications): ?>
                        <h6 class="fw-bold mb-3 small text-uppercase text-muted">Selected Publications</h6>
                        <?php foreach($publications as $pub): ?>
                            <div class="pub-item">
                                <div class="fw-bold mb-1"><?= htmlspecialchars($pub['title']) ?></div>
                                <div class="small text-muted mb-2">
                                    <i class="far fa-newspaper me-1"></i> <?= htmlspecialchars($pub['journal_or_venue']) ?> 
                                    <span class="mx-1">&bull;</span> <?= $pub['year_published'] ?>
                                </div>
                                <?php if($pub['doi'] || $pub['url']): ?>
                                    <a href="<?= $pub['doi'] ? 'https://doi.org/'.$pub['doi'] : $pub['url'] ?>" class="btn btn-sm btn-paper py-0" target="_blank">View Paper</a>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
                <?php endif; ?>

                <?php if($courses): ?>
                <div id="teaching" class="section-card">
                    <div class="section-title"><i class="fas fa-chalkboard-teacher"></i> Teaching</div>
                    
                    <div class="course-list-mobile">
                        <?php foreach($courses as $course): ?>
                            <div class="course-item">
                                <div>
                                    <div class="fw-bold course-code"><?= htmlspecialchars($course['course_code']) ?></div>
                                    <div class="small"><?= htmlspecialchars($course['course_title']) ?></div>
                                </div>
                                <span class="badge bg-light text-dark border"><?= $course['level'] ?>L</span>
                            </div>
                        <?php endforeach; ?>
                    </div>

                    <table class="table table-hover course-table-desktop mb-0">
                        <thead class="table-light"><tr><th>Code</th><th>Title</th><th>Level</th><th>Session</th></tr></thead>
                        <tbody>
                        <?php foreach($courses as $course): ?>
                            <tr>
                                <td class="fw-bold course-code"><?= htmlspecialchars($course['course_code']) ?></td>
                                <td><?= htmlspecialchars($course['course_title']) ?></td>
                                <td><?= $course['level'] ?>L</td>
                                <td><?= htmlspecialchars($course['session']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>

                <?php if($grants): ?>
                <div id="grants" class="section-card">
                    <div class="section-title"><i class="fas fa-hand-holding-usd"></i> Grants</div>
                    <?php foreach($grants as $grant): ?>
                        <div class="mb-3 p-3 bg-light rounded border">
                            <div class="fw-bold"><?= htmlspecialchars($grant['title']) ?></div>
                            <div class="d-flex justify-content-between small text-muted mt-2">
                                <span><i class="fas fa-building me-1"></i> <?= htmlspecialchars($grant['sponsor']) ?></span>
                                <span><?= $grant['start_year'] ?> - <?= $grant['end_year'] ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

            </div> 
        </div> 
    </div>

    <nav class="mobile-bottom-nav">
        <a class="nav-item-mobile active" href="#biography"><i class="fas fa-user"></i> Bio</a>
        <?php if($research_areas || $publications): ?>
            <a class="nav-item-mobile" href="#research"><i class="fas fa-book-open"></i> Research</a>
        <?php endif; ?>
        <?php if($courses): ?>
            <a class="nav-item-mobile" href="#teaching"><i class="fas fa-chalkboard"></i> Teaching</a>
        <?php endif; ?>
        <?php if($grants): ?>
            <a class="nav-item-mobile" href="#grants"><i class="fas fa-coins"></i> Grants</a>
        <?php endif; ?>
    </nav>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Scroll spy logic for bottom nav active states
        const sections = document.querySelectorAll("div[id]");
        const mobileLinks = document.querySelectorAll(".mobile-bottom-nav .nav-item-mobile");
        
        window.onscroll = () => {
            let current = "";
            sections.forEach((section) => {
                const sectionTop = section.offsetTop;
                if (pageYOffset >= sectionTop - 200) {
                    current = section.getAttribute("id");
                }
            });
            mobileLinks.forEach((a) => {
                a.classList.remove("active");
                if (a.getAttribute("href").includes(current)) {
                    a.classList.add("active");
                }
            });
        };
    </script>
</body>
</html>
