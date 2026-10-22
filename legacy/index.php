<?php
require 'config/db.php';

// 1. Fetch Staff Data
$staff_query = "
    SELECT 
        s.staff_id,
        CONCAT(s.title, ' ', s.first_name, ' ', s.last_name) AS name,
        COALESCE(r.rank_name, 'Unassigned') AS role,
        COALESCE(r.rank_level, 9999) AS rank_level_value,
        d.name AS department,
        c.name AS faculty,
        IFNULL(s.profile_photo, 'default-avatar.png') AS img_file
    FROM staff s
    LEFT JOIN academic_rank r ON s.rank_id = r.rank_id
    JOIN department d ON s.department_id = d.department_id
    JOIN college c ON d.college_id = c.college_id
    WHERE s.is_active = 1
    ORDER BY rank_level_value ASC, s.staff_id ASC
";
$staff_data = $pdo->query($staff_query)->fetchAll();

// 2. Fetch Filters
$faculties = $pdo->query("SELECT DISTINCT name FROM college")->fetchAll(PDO::FETCH_COLUMN);
$departments = $pdo->query("SELECT DISTINCT name FROM department")->fetchAll(PDO::FETCH_COLUMN);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Academic Staff | Joseph Sarwuan Tarka University, Makurdi</title>
    <link rel="icon" type="image/jpeg" href="images/jostum.jpeg">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/fonts.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    
    <!-- <style>
        :root {
            /* JOSTUM Inspired Colors (Green/Gold/White) */
            --uni-green: #006837; 
            --uni-dark: #004d29;
            --uni-gold: #d4af37;
            --bg-surface: #f3f4f6;
            --text-dark: #1f2937;
            --card-radius: 8px;
        }

        body {
            font-family: 'Ubuntu', sans-serif;
            background-color: var(--bg-surface);
            color: #374151;
            overflow-x: hidden;
        }

        /* --- University Branding Header --- */
        .uni-header {
            background: #fff;
            border-bottom: 4px solid var(--uni-gold);
            padding: 10px 0;
        }
        .brand-wrapper {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .uni-logo {
            width: 60px;
            height: auto;
        }
        .uni-text h1 {
            font-family: 'Ubuntu', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--uni-green);
            margin: 0;
            line-height: 1.2;
            text-transform: uppercase;
        }
        .uni-text p {
            font-size: 0.8rem;
            color: #666;
            margin: 0;
            font-weight: 500;
        }

        /* --- Hero Section --- */
        .hero-section {
            background: linear-gradient(rgba(0, 104, 55, 0.9), rgba(0, 77, 41, 0.95)), url('campus-bg.jpg');
            background-size: cover;
            background-position: center;
            padding: 3rem 1rem 4rem;
            text-align: center;
            color: white;
        }
        .page-title {
            font-family: 'Ubuntu', sans-serif;
            font-size: clamp(1.8rem, 4vw, 3rem);
        }

        /* --- Filter Bar --- */
        .filter-container { margin-top: -30px; position: relative; z-index: 20; }
        .filter-bar {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        /* --- The Card Grid System (Expert Redesign) --- */
        
        /* Anchor wrapper makes the whole card clickable - essential for mobile UX */
        .card-link-wrapper {
            text-decoration: none;
            color: inherit;
            display: block;
            height: 100%;
        }

        .staff-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: var(--card-radius);
            overflow: hidden;
            height: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
        }

        .staff-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-color: var(--uni-gold);
        }

        /* Image Area */
        .img-container {
            width: 100%;
            aspect-ratio: 1 / 1; /* Perfect square for uniformity */
            overflow: hidden;
            background: #f0f0f0;
            position: relative;
        }
        
        .img-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s;
        }
        
        .staff-card:hover .img-container img { transform: scale(1.05); }

        /* Content Area */
        .card-body { padding: 12px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; }

        /* Typography */
        .staff-role {
            font-size: 0.7rem;
            text-transform: uppercase;
            color: var(--uni-gold);
            font-weight: 700;
            margin-bottom: 4px;
            display: block;
        }
        
        .staff-name {
            font-family: 'Ubuntu', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            color: var(--uni-dark);
            margin-bottom: 4px;
            line-height: 1.2;
            
            /* Truncate name to 2 lines max */
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .staff-dept {
            font-size: 0.75rem;
            color: #6b7280;
            line-height: 1.3;
            margin-bottom: 10px;
            
            /* Truncate dept to 2 lines */
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* Desktop Button */
        .btn-profile {
            margin-top: auto;
            background: var(--uni-dark);
            color: white;
            font-size: 0.8rem;
            padding: 6px 0;
            border-radius: 4px;
            width: 100%;
            display: block;
        }

        /* --- MOBILE OPTIMIZATIONS (3 Cards per row) --- */
        @media (max-width: 768px) {
            /* Tweak the grid gap for tight spaces */
            .row.g-3 { --bs-gutter-x: 0.5rem; --bs-gutter-y: 0.5rem; }
            
            /* Branding adjustment */
            .uni-text h1 { font-size: 0.9rem; }
            .uni-logo { width: 45px; }

            /* Card adjustments for tiny layout */
            .card-body { padding: 8px 4px; }
            
            .staff-role { font-size: 0.55rem; margin-bottom: 2px; }
            
            .staff-name { 
                font-size: 0.75rem; /* Small but readable */ 
                margin-bottom: 2px;
            }
            
            .staff-dept { display: none; } /* Hide Department on mobile grid to save space */
            
            .btn-profile { display: none; } /* Hide button, whole card is clickable */
            
            /* Visual cue that it's clickable */
            .staff-card::after {
                content: '\F285'; /* Bootstrap Icon chevron-right */
                font-family: 'bootstrap-icons';
                position: absolute;
                bottom: 5px;
                right: 5px;
                font-size: 10px;
                color: #ccc;
            }
        }
    </style> -->
    <style>
    :root {
        --uni-green: #006837; 
        --uni-dark: #004d29;
        --uni-gold: #d4af37;
        --bg-surface: #f3f4f6;
        --text-dark: #1f2937;
        --card-radius: 8px;
    }

    body {
        font-family: 'Ubuntu', sans-serif;
        background-color: var(--bg-surface);
        color: #374151;
        overflow-x: hidden;
    }

    /* --- Brand & Header Styles (Unchanged) --- */
    .uni-header { background: #fff; border-bottom: 4px solid var(--uni-gold); padding: 12px 0; }
    .brand-wrapper { display: flex; align-items: center; gap: 15px; }
    .uni-logo { width: 60px; height: auto; }
    .uni-text h1 { font-family: 'Ubuntu', sans-serif; font-size: 1.2rem; font-weight: 700; color: var(--uni-green); margin: 0; line-height: 1.2; text-transform: uppercase; }
    .uni-text p { font-size: 0.8rem; color: #666; margin: 0; font-weight: 500; }
    .hero-section {
        position: relative;
        overflow: hidden;
        isolation: isolate;
        padding: 3rem 1rem 4rem;
        color: white;
    }
    .hero-section .hero-bg-slides {
        position: absolute;
        inset: 0;
        z-index: 0;
    }
    .hero-section .hero-bg-slide {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0;
        transform: scale(1.03);
        animation: heroSlide 18s infinite;
    }
    .hero-section .hero-bg-slide:nth-child(1) { background-image: url('images/jostumgate.png'); animation-delay: 0s; }
    .hero-section .hero-bg-slide:nth-child(2) { background-image: url('images/jostumhall.png'); animation-delay: 6s; }
    .hero-section .hero-bg-slide:nth-child(3) { background-image: url('images/jostumstudents.png'); animation-delay: 12s; }
    .hero-section::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        background: rgba(0, 104, 55, 0.58);
    }
    .hero-section > .container {
        position: relative;
        z-index: 2;
    }
    @keyframes heroSlide {
        0% { opacity: 0; transform: scale(1.03); }
        8% { opacity: 1; transform: scale(1); }
        28% { opacity: 1; transform: scale(1); }
        36% { opacity: 0; transform: scale(1.03); }
        100% { opacity: 0; transform: scale(1.03); }
    }
    .page-title { font-family: 'Ubuntu', sans-serif; font-size: clamp(1.8rem, 4vw, 3rem); }
    .filter-container { margin-top: -30px; position: relative; z-index: 20; }
    .filter-bar { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header-meta { display: none; }
    .hero-subtitle { max-width: 520px; }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 10px; }
    .hero-badge { border: 1px solid rgba(255,255,255,0.35); padding: 6px 12px; border-radius: 999px; font-size: 0.75rem; letter-spacing: 0.4px; text-transform: uppercase; }
    .hero-card {
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(6px);
        border-radius: 14px;
        padding: 16px;
        height: 100%;
    }
    .hero-stat { font-size: 1.6rem; font-weight: 700; margin: 0; }
    .hero-label { font-size: 0.75rem; text-transform: uppercase; opacity: 0.85; letter-spacing: 0.6px; }

    @media (min-width: 992px) {
        .uni-header { padding: 18px 0; }
        .brand-wrapper { justify-content: center; }
        .brand-wrapper > .d-flex { width: 100%; justify-content: center; align-items: center; }
        .uni-logo { width: 72px; }
        .brand-wrapper .d-flex .uni-logo { margin-left: 14px; }
        .uni-text { text-align: center; }
        .uni-text h1 { font-size: 1.5rem; }
        .hero-section { padding: 4.5rem 1rem 5.5rem; }
    }

    /* --- Card Styles --- */
    .card-link-wrapper { text-decoration: none; color: inherit; display: block; height: 100%; }
    
    .staff-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: var(--card-radius);
        overflow: hidden;
        height: 100%;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .img-container { width: 100%; aspect-ratio: 1 / 1; overflow: hidden; background: #f0f0f0; }
    .img-container img { width: 100%; height: 100%; object-fit: cover; }

    .card-body { padding: 12px; text-align: center; flex-grow: 1; display: flex; flex-direction: column; }

    .staff-role { font-size: 0.7rem; text-transform: uppercase; color: var(--uni-gold); font-weight: 700; margin-bottom: 4px; display: block; }
    
    .staff-name {
        font-family: 'Ubuntu', sans-serif;
        font-size: 1rem;
        font-weight: 700;
        color: var(--uni-dark);
        margin-bottom: 6px;
        line-height: 1.2;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    .staff-dept { font-size: 0.75rem; color: #6b7280; line-height: 1.3; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    /* Button Styling */
    .btn-profile {
        margin-top: auto;
        background: var(--uni-dark);
        color: white;
        font-size: 0.8rem;
        padding: 6px 0;
        border-radius: 4px;
        width: 100%;
        display: block;
        text-align: center;
        font-weight: 500;
    }

    /* --- MOBILE UPDATES (2 Cards + Visible Button) --- */
    @media (max-width: 768px) {
        .uni-header { padding: 8px 0; }
        .brand-wrapper { justify-content: center; }
        .brand-wrapper > .d-flex {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 10px !important;
        }
        .uni-logo { width: 42px; }
        .uni-text { text-align: center; }
        .uni-text h1 {
            font-size: 0.78rem;
            line-height: 1.15;
        }
        .uni-text p { font-size: 0.72rem; }
        .hero-badges {
            flex-wrap: nowrap;
            justify-content: center;
            gap: 6px;
        }
        .hero-badge {
            font-size: 0.58rem;
            padding: 4px 8px;
            letter-spacing: 0.2px;
            white-space: nowrap;
        }
        .hero-cta {
            flex-wrap: nowrap !important;
            justify-content: center;
            gap: 8px !important;
        }
        .hero-cta .btn {
            white-space: nowrap;
            font-size: 0.78rem;
            padding-left: 0.8rem !important;
            padding-right: 0.8rem !important;
        }
        
        /* Reduce gutter (gap) between cards */
        .row.g-3 { --bs-gutter-x: 0.5rem; --bs-gutter-y: 0.5rem; }
        
        /* Adjust card internals for smaller width */
        .card-body { padding: 8px 6px; }
        .staff-role { font-size: 0.6rem; margin-bottom: 2px; }
        .staff-name { font-size: 0.69rem; margin-bottom: 0px; height: 34px; overflow: hidden; } /* Fixed height keeps buttons aligned */
        .staff-dept { display: none; } /* Hide dept to make room for button */
        
        /* Ensure Button is Visible and sized for touch */
        .btn-profile {
            display: block !important;
            font-size: 0.7rem;
            padding: 4px 0;
            margin-top: 0px;
        }
    }

    .landing-footer {
        background: #ffffff;
        border-top: 1px solid #e5e7eb;
        padding: 14px 0;
        margin-top: 1.5rem;
    }
    .landing-footer .footer-wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
    }
    .landing-footer .footer-login {
        color: var(--uni-dark);
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
    }
    .landing-footer .footer-login:hover { color: var(--uni-green); }
    .landing-footer .footer-copy {
        color: #6b7280;
        font-size: 0.88rem;
    }
</style>
</head>
<body>

    <header class="uni-header">
        <div class="container-fluid px-3 px-lg-5">
            <div class="brand-wrapper">
                <div class="d-flex align-items-center gap-3">
                    <img src="images/jostum.jpeg" alt="JOSTUM Logo" class="uni-logo">
                    <div class="uni-text">
                        <h1>Joseph Sarwuan Tarka University</h1>
                        <h1>Makurdi, Benue State</h1>
                        <p><i>Service and Excellence</i></p>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <div class="hero-section">
        <div class="hero-bg-slides" aria-hidden="true">
            <div class="hero-bg-slide"></div>
            <div class="hero-bg-slide"></div>
            <div class="hero-bg-slide"></div>
        </div>
        <div class="container">
            <div class="row align-items-center g-4">
                <div class="col-lg-7 text-center text-lg-start">
                    <h2 class="page-title mb-3">Academic Staff Directory</h2>
                    <p class="hero-subtitle mb-4 opacity-75">Explore our professors, researchers, and academic leaders across faculties and departments.</p>
                    <div class="hero-badges justify-content-center justify-content-lg-start mb-4">
                        <span class="hero-badge">Research</span>
                        <span class="hero-badge">Teaching</span>
                        <span class="hero-badge">Innovation</span>
                        <span class="hero-badge">Service</span>
                    </div>
                    <div class="hero-cta d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
                        <a href="#staffGrid" class="btn btn-light fw-semibold px-4">Browse Staff</a>
                        <a href="#filterTools" class="btn btn-outline-light fw-semibold px-4">Filter & Sort</a>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="row g-3">
                        <div class="col-6">
                            <div class="hero-card text-center">
                                <p class="hero-stat"><?= count($staff_data) ?></p>
                                <div class="hero-label">Active Staff</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="hero-card text-center">
                                <p class="hero-stat"><?= count($faculties) ?></p>
                                <div class="hero-label">Faculties</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="hero-card text-center">
                                <p class="hero-stat"><?= count($departments) ?></p>
                                <div class="hero-label">Departments</div>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="hero-card text-center">
                                <p class="hero-stat">24/7</p>
                                <div class="hero-label">Directory Access</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="container pb-5">
        
        <div class="filter-container" id="filterTools">
            <div class="filter-bar">
                <div class="row g-2">
                    <div class="col-12 col-md-4">
                        <input type="text" id="searchInput" class="form-control" placeholder="Search name or role...">
                    </div>
                    <div class="col-6 col-md-3">
                        <select id="facultyFilter" class="form-select">
                            <option value="all">All Faculties</option>
                            <?php foreach($faculties as $fac): ?>
                                <option value="<?php echo $fac; ?>"><?php echo $fac; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-6 col-md-3">
                        <select id="deptFilter" class="form-select">
                            <option value="all">All Depts</option>
                            <?php foreach($departments as $dept): ?>
                                <option value="<?php echo $dept; ?>"><?php echo $dept; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-2 d-none d-md-block">
                         <select id="sortFilter" class="form-select">
                            <option value="rank">By Rank</option>
                            <option value="alpha">A-Z</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- <div class="row row-cols-3 row-cols-md-3 row-cols-lg-4 g-3 mt-4" id="staffGrid">
            <?php foreach($staff_data as $staff): ?>
            <div class="col staff-item" 
                 data-name="<?php echo strtolower($staff['name']); ?>" 
                 data-role="<?php echo strtolower($staff['role']); ?>" 
                 data-faculty="<?php echo $staff['faculty']; ?>" 
                 data-dept="<?php echo $staff['department']; ?>"
                 data-rank-weight="<?php echo $staff['rank_weight']; ?>">
            
                <a href="profile.php?staff_id=<?php echo $staff['staff_id']; ?>" class="card-link-wrapper">
                    <div class="staff-card">
                        <div class="img-container">
                            <img src="uploads/<?php echo $staff['img_file']; ?>" alt="<?php echo $staff['name']; ?>" loading="lazy">
                        </div>
                        <div class="card-body">
                            <span class="staff-role"><?php echo $staff['role']; ?></span>
                            <h3 class="staff-name"><?php echo $staff['name']; ?></h3>
                            <div class="staff-dept"><?php echo $staff['department']; ?></div>
                            <div class="btn-profile">View Profile</div>
                        </div>
                    </div>
                </a>

            </div>
            <?php endforeach; ?>
        </div> -->
        <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mt-4" id="staffGrid">
    <?php foreach($staff_data as $staff): ?>
    <div class="col staff-item" 
            data-staff-id="<?php echo (int)$staff['staff_id']; ?>"
            data-name="<?php echo strtolower($staff['name']); ?>" 
            data-role="<?php echo strtolower($staff['role']); ?>" 
            data-faculty="<?php echo $staff['faculty']; ?>" 
            data-dept="<?php echo $staff['department']; ?>"
            data-rank-level="<?php echo (int)$staff['rank_level_value']; ?>">
    
        <a href="profile.php?staff_id=<?php echo $staff['staff_id']; ?>" class="card-link-wrapper">
            <div class="staff-card">
                <div class="img-container">
                    <img src="uploads/<?php echo $staff['img_file']; ?>" alt="<?php echo $staff['name']; ?>" loading="lazy">
                </div>
                <div class="card-body">
                    <span class="staff-role"><?php echo $staff['role']; ?></span>
                    <h3 class="staff-name"><?php echo $staff['name']; ?></h3>
                    <div class="staff-dept"><?php echo $staff['department']; ?></div>
                    <div class="btn-profile">View Profile</div>
                </div>
            </div>
        </a>

    </div>
    <?php endforeach; ?>
</div>

        <div id="noResults" class="text-center py-5 d-none">
            <p class="text-muted">No staff members found matching your criteria.</p>
        </div>

    </div>

    <footer class="landing-footer">
        <div class="container">
            <div class="footer-wrap">
                <div class="footer-copy">&copy; <?= date('Y') ?> JOSTUM ICT Directorate. All rights reserved.</div>
                <a class="footer-login" href="login.php">Staff Login</a>
            </div>
        </div>
    </footer>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('searchInput');
            const facultyFilter = document.getElementById('facultyFilter');
            const deptFilter = document.getElementById('deptFilter');
            const sortFilter = document.getElementById('sortFilter');
            const staffGrid = document.getElementById('staffGrid');
            const noResults = document.getElementById('noResults');
            
            let staffItems = Array.from(document.querySelectorAll('.staff-item'));

            // Filter Logic
            function filterStaff() {
                const query = searchInput.value.toLowerCase().trim();
                const fVal = facultyFilter.value;
                const dVal = deptFilter.value;
                let visibleCount = 0;

                staffItems.forEach(item => {
                    const name = item.dataset.name;
                    const role = item.dataset.role;
                    const faculty = item.dataset.faculty;
                    const dept = item.dataset.dept;

                    const matchesSearch = name.includes(query) || role.includes(query);
                    const matchesFaculty = (fVal === 'all' || faculty === fVal);
                    const matchesDept = (dVal === 'all' || dept === dVal);

                    if (matchesSearch && matchesFaculty && matchesDept) {
                        item.style.display = ''; // Reset to grid default
                        visibleCount++;
                    } else {
                        item.style.display = 'none';
                    }
                });
                noResults.classList.toggle('d-none', visibleCount > 0);
            }

            // Department Dependency Logic
            facultyFilter.addEventListener('change', function() {
                const selectedFaculty = this.value;
                const deptOptions = deptFilter.querySelectorAll('option');
                deptOptions.forEach(option => {
                    if (option.value === 'all') return;
                    const exists = staffItems.some(item => 
                        item.dataset.faculty === selectedFaculty && item.dataset.dept === option.value
                    );
                    option.style.display = (selectedFaculty === 'all' || exists) ? 'block' : 'none';
                });
                deptFilter.value = 'all';
                filterStaff();
            });

            // Sort Logic
            if(sortFilter) {
                sortFilter.addEventListener('change', () => {
                    const val = sortFilter.value;
                    staffItems.sort((a, b) => {
                        if (val === 'rank') {
                            const rankDiff = (parseInt(a.dataset.rankLevel, 10) || 9999) - (parseInt(b.dataset.rankLevel, 10) || 9999);
                            if (rankDiff !== 0) return rankDiff;
                            return (parseInt(a.dataset.staffId, 10) || 0) - (parseInt(b.dataset.staffId, 10) || 0);
                        }
                        return a.dataset.name.localeCompare(b.dataset.name);
                    }).forEach(item => staffGrid.appendChild(item));
                });
                // Keep default display ordered by rank immediately on first render.
                sortFilter.dispatchEvent(new Event('change'));
            }

            searchInput.addEventListener('input', filterStaff);
            deptFilter.addEventListener('change', filterStaff);
        });
    </script>
</body>
</html>











<!-- <?php include 'data.php'; ?>
<?php
require 'config/db.php';


// 1. Fetch Staff Data with Ranks and Departments
$staff_query = "
    SELECT 
        s.staff_id,
        CONCAT(s.title, ' ', s.first_name, ' ', s.last_name) AS name,
        r.rank_name AS role,
        COALESCE(r.rank_level, 9999) AS rank_level_value,
        d.name AS department,
        c.name AS faculty,
        IFNULL(s.profile_photo, 'default-avatar.png') AS img_file,
        CONCAT('profile.php?id=', s.staff_id) AS link
    FROM staff s
    LEFT JOIN academic_rank r ON s.rank_id = r.rank_id
    JOIN department d ON s.department_id = d.department_id
    JOIN college c ON d.college_id = c.college_id
    WHERE s.is_active = 1
    ORDER BY rank_level_value ASC, s.last_name ASC, s.first_name ASC
";
$staff_data = $pdo->query($staff_query)->fetchAll();

// 2. Fetch Unique Faculties for Filter
$faculties = $pdo->query("SELECT DISTINCT name FROM college")->fetchAll(PDO::FETCH_COLUMN);

// 3. Fetch Unique Departments for Filter
$departments = $pdo->query("SELECT DISTINCT name FROM department")->fetchAll(PDO::FETCH_COLUMN);

// 4. Rank Hierarchy (Optional: if you want to override the DB rank_level)
$rank_hierarchy = []; // Legacy placeholder; active sorting uses DB rank_level_value.
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Academic Staff Directory | Prestige University</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/fonts.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    
    <style>
        :root {
            --primary-dark: #0f172a; 
            --primary-blue: #1e3a8a;
            --accent-gold: #c29d59; 
            --bg-surface: #f8fafc;
            --text-heading: #1e293b;
            --card-radius: 12px;
        }

        body {
            font-family: 'Ubuntu', sans-serif;
            background-color: var(--bg-surface);
            color: #475569;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden; /* Prevent horizontal scroll on mobile */
        }

        /* --- Typography --- */
        h1, h2, h3, .serif-font { font-family: 'Ubuntu', sans-serif; }

        /* Responsive Typography */
        .page-title {
            font-weight: 700;
            color: white;
            /* Clamp font size: Min 2rem, Max 3.5rem */
            font-size: clamp(2rem, 5vw, 3.5rem); 
            line-height: 1.1;
        }

        .hero-subtitle {
            font-size: clamp(1rem, 2vw, 1.15rem);
            font-weight: 300;
            color: rgba(255,255,255,0.9);
            max-width: 600px;
            margin: 1rem auto 0;
        }

        /* --- Hero Section --- */
        .hero-section {
            background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-blue) 100%);
            padding: 4rem 1rem 5rem; /* Extra bottom padding for overlap */
            position: relative;
            text-align: center;
        }

        /* --- Filter Container --- */
        .filter-container {
            margin-top: -3.5rem; /* Desktop Overlap */
            position: relative;
            z-index: 10;
            padding: 0 1rem;
        }

        .filter-bar {
            background: white;
            padding: 1.5rem;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.02);
        }

        /* Input Styling */
        .custom-input-group { position: relative; }
        .custom-input-group i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            z-index: 5;
        }
        .form-control, .form-select {
            border: 1px solid #e2e8f0;
            padding: 0.8rem 1rem 0.8rem 2.8rem; /* Space for icon */
            border-radius: 8px;
            font-size: 16px; /* 16px prevents iOS zoom on focus */
            background-color: #f8fafc;
            height: 50px; /* Taller touch target for mobile */
        }
        .form-control:focus, .form-select:focus {
            background-color: white;
            border-color: var(--primary-blue);
            box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
        }
        .filter-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 0.4rem;
            font-weight: 600;
            display: block;
        }

        /* --- Staff Card --- */
        .staff-card {
            background: white;
            border-radius: var(--card-radius);
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
        }

        /* Hover effects - Desktop Only using media query */
        @media (hover: hover) {
            .staff-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
            .staff-card:hover { transform: translateY(-8px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
            .staff-card::after {
                content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px;
                background: var(--accent-gold); transform: scaleX(0); transition: transform 0.4s ease; transform-origin: left;
            }
            .staff-card:hover::after { transform: scaleX(1); }
        }

        .card-header-custom {
            padding: 2rem 1rem 1rem;
            text-align: center;
            background: linear-gradient(to bottom, #fff 50%, #fcfcfc 100%);
        }

        .img-avatar {
            width: 120px;
            height: 120px;
            object-fit: cover;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .card-body {
            padding: 0 1.5rem 1.5rem;
            text-align: center;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        .role-badge {
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--accent-gold);
            margin-bottom: 0.5rem;
        }

        .staff-name {
            font-size: 1.35rem;
            font-weight: 700;
            color: var(--text-heading);
            margin-bottom: 0.25rem;
        }

        .staff-meta {
            font-size: 0.9rem;
            color: #64748b;
            margin-bottom: 1.25rem;
        }

        .btn-view {
            margin-top: auto; /* Pushes button to bottom */
            background-color: white;
            color: var(--primary-blue);
            border: 1px solid #e2e8f0;
            padding: 0.75rem 1rem; /* Larger touch area */
            border-radius: 50px;
            font-weight: 600;
            width: 100%;
            transition: all 0.2s;
        }

        .btn-view:active, .btn-view:hover {
            background-color: var(--primary-blue);
            color: white;
            border-color: var(--primary-blue);
        }
        /* Outer container for the card */
.staff-card {
    background: white;
    padding: 12px; /* This creates the white space between the two borders */
    border: 1px solid #e0e0e0; /* Outer gray border */
    height: 100%;
    transition: transform 0.3s ease;
}

/* The Gold Inner Frame */
.card-inner-frame {
    border: 2px solid #c5a059; /* Your gold color */
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
    position: relative;
}

/* The Image Container with Chevron Shape */
.staff-image-box {
    position: relative;
    width: 100%;
    height: 250px;
    overflow: hidden;
    /* This creates the bottom triangle cut shown in your image */
    clip-path: polygon(0 0, 100% 0, 100% 88%, 50% 100%, 0 88%);
    margin-bottom: -15px; 
}

.staff-image-box img {
    width: 100%;
    height: 100%;
    object-fit: fit;
}

/* Text Content Area */
.card-content {
    padding: 25px 15px;
    text-align: center;
    flex-grow: 1;
}

.staff-name {
    font-family: 'Ubuntu', sans-serif;
    font-size: 1.6rem;
    font-weight: 600;
    color: #1a2a3a;
    margin-bottom: 4px;
}

.staff-rank-dept {
    font-family: 'Ubuntu', sans-serif;
    font-size: 1.15rem;
    color: #4a4a4a;
    margin-bottom: 25px;
}

/* The Navy Button */
.btn-view-profile {
    background-color: #1a2a3a; /* Dark navy from image */
    color: white !important;
    border: none;
    padding: 10px 24px;
    font-family: 'Ubuntu', sans-serif;
    font-size: 0.95rem;
    border-radius: 4px;
    text-decoration: none;
    display: inline-block;
    transition: opacity 0.2s;
}

.btn-view-profile:hover {
    opacity: 0.9;
}


        /* --- Mobile Optimizations --- */
        @media (max-width: 768px) {
            .hero-section { padding: 3rem 1rem 4rem; }
            
            .filter-container { margin-top: -2rem; }
            
            .filter-bar { padding: 1rem; }
            
            /* Hide advanced filters initially on mobile to save space */
            .mobile-filter-collapse { display: none; }
            .mobile-filter-collapse.show { display: block; animation: slideDown 0.3s ease-out; }
            
            .btn-toggle-filters {
                width: 100%;
                background: #f1f5f9;
                border: none;
                padding: 10px;
                border-radius: 8px;
                color: var(--primary-blue);
                font-weight: 600;
                margin-top: 10px;
                display: block !important; /* Force show on mobile */
            }
        }
        
        /* Utility for desktop hiding */
        .btn-toggle-filters { display: none; } 

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .fade-in { animation: fadeInUp 0.5s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    </style>
</head>
<body>

    <header class="hero-section">
        <div class="container">
            <h1 class="page-title">Academic Staff</h1>
            <p class="hero-subtitle">World-class research and teaching excellence.</p>
        </div>
    </header>

    <div class="container pb-5">
        
        <div class="filter-container">
            
        <div class="filter-bar">
    <div class="row g-3 align-items-end">
        
        <div class="col-12 col-md-3">
            <label class="filter-label">Search</label>
            <div class="custom-input-group">
                <i class="bi bi-search"></i>
                <input type="text" id="searchInput" class="form-control" placeholder="Search staff...">
            </div>
        </div>

        <div class="col-12 d-md-none">
            <button class="btn-toggle-filters" type="button" id="mobileFilterToggle">
                <i class="bi bi-sliders"></i> Filters & Sort
            </button>
        </div>

        <div id="filterGroup" class="col-12 col-md-9 mobile-filter-collapse d-md-block">
            <div class="row g-3">
                <div class="col-12 col-md-4">
                    <label class="filter-label">Faculty</label>
                    <div class="custom-input-group">
                        <i class="bi bi-building"></i>
                        <select id="facultyFilter" class="form-select">
                            <option value="all">All Faculties</option>
                            <?php foreach($faculties as $fac): ?>
                                <option value="<?php echo $fac; ?>"><?php echo $fac; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="col-12 col-md-4">
                    <label class="filter-label">Dept.</label>
                    <div class="custom-input-group">
                        <i class="bi bi-diagram-3"></i>
                        <select id="deptFilter" class="form-select">
                            <option value="all">All Departments</option>
                            <?php foreach($departments as $dept): ?>
                                <option value="<?php echo $dept; ?>"><?php echo $dept; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="col-12 col-md-4">
                    <label class="filter-label">Sort</label>
                    <div class="custom-input-group">
                        <i class="bi bi-sort-down"></i>
                        <select id="sortFilter" class="form-select">
                            <option value="rank">By Rank</option>
                            <option value="alpha">A - Z</option>
                        </select>
                    </div>
                </div>
            </div>
        </div> 
    </div>
</div>

        <div class="row g-3 g-lg-4 mt-4" id="staffGrid">
    <?php foreach($staff_data as $index => $staff): 
        // $rank_weight = isset($rank_hierarchy[$staff['role']]) ? $rank_hierarchy[$staff['role']] : 99;
        $rank_weight = (int)($staff['rank_level_value'] ?? 9999);
    ?>
    <div class="col-12 col-md-6 col-lg-4 staff-item fade-in" 
         style="animation-delay: <?php echo $index * 0.05; ?>s"
         data-name="<?php echo strtolower($staff['name']); ?>" 
         data-role="<?php echo strtolower($staff['role']); ?>" 
         data-faculty="<?php echo $staff['faculty']; ?>" 
         data-dept="<?php echo $staff['department']; ?>"
         data-rank-level="<?php echo $rank_weight; ?>">
    
        <div class="staff-card">
            <div class="card-inner-frame">
                <div class="staff-image-box">
    <img src="uploads/<?php echo $staff['img_file']; ?>" alt="<?php echo $staff['name']; ?>">
</div>
                <div class="card-content">
                    <span class="role-badge"><?php echo $staff['role']; ?></span>
                    
                    <h3 class="staff-name"><?php echo $staff['name']; ?></h3>
                    
                    <div class="staff-meta">
                        <div><?php echo $staff['department']; ?></div>
                    </div>
                    
                    <div class="mt-4">
                        <a href="profile.php?staff_id=<?php echo $staff['staff_id']; ?>" class="btn-view-profile">
                            View Profile
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endforeach; ?> </div>
        
        <div id="noResults" class="text-center py-5 d-none">
            <h4 class="text-muted">No staff found.</h4>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const facultyFilter = document.getElementById('facultyFilter');
    const deptFilter = document.getElementById('deptFilter');
    const sortFilter = document.getElementById('sortFilter');
    const staffGrid = document.getElementById('staffGrid');
    const noResults = document.getElementById('noResults');
    const mobileToggle = document.getElementById('mobileFilterToggle');
    const filterGroup = document.getElementById('filterGroup');

    let staffItems = Array.from(document.querySelectorAll('.staff-item'));

    // 1. DYNAMIC DEPT FILTERING (The "Secret Sauce")
    // This ensures that choosing "Science" hides "History" from the Dept dropdown
    facultyFilter.addEventListener('change', function() {
        const selectedFaculty = this.value;
        const deptOptions = deptFilter.querySelectorAll('option');

        deptOptions.forEach(option => {
            if (option.value === 'all') return;
            
            // Find if any staff member exists with this faculty AND this department
            const exists = staffItems.some(item => {
                return item.dataset.faculty === selectedFaculty && item.dataset.dept === option.value;
            });

            if (selectedFaculty === 'all' || exists) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });

        // Reset department selection if current selection becomes hidden
        deptFilter.value = 'all'; 
        filterStaff();
    });

    // 2. CORE FILTERING FUNCTION
    function filterStaff() {
        const query = searchInput.value.toLowerCase().trim();
        const fVal = facultyFilter.value;
        const dVal = deptFilter.value;
        let visibleCount = 0;

        staffItems.forEach(item => {
            // Use dataset for cleaner access
            const name = item.dataset.name;
            const role = item.dataset.role;
            const faculty = item.dataset.faculty;
            const dept = item.dataset.dept;

            const matchesSearch = name.includes(query) || role.includes(query);
            const matchesFaculty = (fVal === 'all' || faculty === fVal);
            const matchesDept = (dVal === 'all' || dept === dVal);

            if (matchesSearch && matchesFaculty && matchesDept) {
                item.classList.remove('d-none');
                visibleCount++;
            } else {
                item.classList.add('d-none');
            }
        });

        noResults.classList.toggle('d-none', visibleCount > 0);
    }

    // 3. SORTING
    function sortStaff() {
        const val = sortFilter.value;
        staffItems.sort((a, b) => {
            if (val === 'rank') {
                return (parseInt(a.dataset.rankLevel, 10) || 9999) - (parseInt(b.dataset.rankLevel, 10) || 9999);
            } else {
                return a.dataset.name.localeCompare(b.dataset.name);
            }
        }).forEach(item => staffGrid.appendChild(item));
    }

    // Event Listeners
    searchInput.addEventListener('input', filterStaff);
    deptFilter.addEventListener('change', filterStaff);
    sortFilter.addEventListener('change', sortStaff);
    
    // Mobile UI Toggle
    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            filterGroup.classList.toggle('show');
        });
    }

    // Initialize
    sortStaff();
});
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

</body>
</html> -->
