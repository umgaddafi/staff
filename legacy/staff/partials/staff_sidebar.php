<aside class="col-lg-2 offcanvas-lg offcanvas-start bg-dark text-white h-100 position-fixed" 
       tabindex="-1" 
       id="sidebarMenu" 
       aria-labelledby="sidebarMenuLabel"
       style="z-index: 1045; top: 0; padding-top: 70px; overflow-y: auto; transition: transform 0.3s ease-in-out;">
  
  <div class="offcanvas-header d-lg-none border-bottom border-secondary">
    <h5 class="offcanvas-title fw-bold" id="sidebarMenuLabel">
        <i class="fas fa-bars me-2"></i>Menu
    </h5>
    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" aria-label="Close"></button>
  </div>

  <div class="offcanvas-body p-3 p-lg-0">
      <ul class="nav nav-pills flex-column gap-0 mb-5">
        
        <li class="nav-item mb-2">
          <a href="dashboard.php" class="nav-link active bg-gradient d-flex align-items-center py-2">
            <i class="fas fa-chart-line me-3 fa-fw"></i> Dashboard
          </a>
        </li>

        <li class="text-white-50 small fw-bold mt-2 mb-1 ps-3 text-uppercase section-header">Profile</li>
        <li>
            <a href="profile_edit.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-user me-3 fa-fw"></i> Personal Info
            </a>
        </li>
        <li>
            <a href="qualifications.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-graduation-cap me-3 fa-fw"></i> Qualifications
            </a>
        </li>
        <li>
            <a href="research_areas.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-flask me-3 fa-fw"></i> Research Areas
            </a>
        </li>

        <li class="text-white-50 small fw-bold mt-2 mb-1 ps-3 text-uppercase section-header">Academics</li>
        <li>
            <a href="publications.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-book me-3 fa-fw"></i> Publications
            </a>
        </li>
        <li>
            <a href="courses.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-chalkboard me-3 fa-fw"></i> Courses
            </a>
        </li>
        <li>
            <a href="supervision.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-user-graduate me-3 fa-fw"></i> Supervision
            </a>
        </li>
        <li>
            <a href="grants.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-hand-holding-usd me-3 fa-fw"></i> Grants
            </a>
        </li>

        <li class="text-white-50 small fw-bold mt-2 mb-1 ps-3 text-uppercase section-header">Professional</li>
        <li>
            <a href="memberships.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-id-badge me-3 fa-fw"></i> Memberships
            </a>
        </li>
        <li>
            <a href="external_profiles.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-link me-3 fa-fw"></i> External Links
            </a>
        </li>

        <li class="text-white-50 small fw-bold mt-2 mb-1 ps-3 text-uppercase section-header">System</li>
        <li>
            <a href="change_history.php" class="nav-link text-white-50 hover-white py-1">
                <i class="fas fa-history me-3 fa-fw"></i> History Log
            </a>
        </li>

      </ul>
  </div>
  
  <style>
      /* CSS for Sidebar Aesthetics */
      .section-header {
          font-size: 0.65rem !important; /* Smaller header text */
          letter-spacing: 1px;
      }
      .nav-link {
          font-size: 0.9rem; /* Slightly smaller link text */
      }
      .hover-white:hover { 
          color: #fff !important; 
          background: rgba(255,255,255,0.1); 
          border-radius: 4px; 
      }
      .nav-link.active { 
          background-color: var(--uni-gold); 
          color: #000 !important; 
          font-weight: 600; 
          border-radius: 4px; 
      }
      
      /* Desktop Sidebar Positioning Fix */
      @media (min-width: 992px) {
          aside.col-lg-2 {
              top: 56px; /* Reduced from 70px to match a tighter navbar if needed */
              height: calc(100vh - 56px);
              padding-top: 1rem !important; /* Reduce top padding inside sidebar */
          }
      }
      /* Mobile Offcanvas Full Height */
      @media (max-width: 991.98px) {
          aside { padding-top: 0 !important; z-index: 1050 !important; }
      }
  </style>
</aside>




<!-- <aside class="col-lg-2 offcanvas-lg offcanvas-start bg-dark text-white h-100 position-fixed" 
       tabindex="-1" 
       id="sidebarMenu" 
       aria-labelledby="sidebarMenuLabel"
       style="z-index: 1045; top: 0; padding-top: 70px; overflow-y: auto; transition: transform 0.3s ease-in-out;">
  
  <div class="offcanvas-header d-lg-none border-bottom border-secondary">
    <h5 class="offcanvas-title fw-bold" id="sidebarMenuLabel">
        <i class="fas fa-bars me-2"></i>Menu
    </h5>
    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" aria-label="Close"></button>
  </div>

  <div class="offcanvas-body p-3 p-lg-0">
      <ul class="nav nav-pills flex-column gap-2 mb-5">
        
        <li class="nav-item">
          <a href="dashboard.php" class="nav-link active bg-gradient d-flex align-items-center">
            <i class="fas fa-chart-line me-3 fa-fw"></i> Dashboard
          </a>
        </li>

        <li class="text-white-50 small fw-bold mt-4 mb-2 ps-3 text-uppercase" style="font-size: 0.75rem; letter-spacing: 1px;">Profile</li>
        <li><a href="profile_edit.php" class="nav-link text-white-50 hover-white"><i class="fas fa-user me-3 fa-fw"></i> Personal Info</a></li>
        <li><a href="qualifications.php" class="nav-link text-white-50 hover-white"><i class="fas fa-graduation-cap me-3 fa-fw"></i> Qualifications</a></li>
        <li><a href="research_areas.php" class="nav-link text-white-50 hover-white"><i class="fas fa-flask me-3 fa-fw"></i> Research Areas</a></li>

        <li class="text-white-50 small fw-bold mt-4 mb-2 ps-3 text-uppercase" style="font-size: 0.75rem; letter-spacing: 1px;">Academics</li>
        <li><a href="publications.php" class="nav-link text-white-50 hover-white"><i class="fas fa-book me-3 fa-fw"></i> Publications</a></li>
        <li><a href="courses.php" class="nav-link text-white-50 hover-white"><i class="fas fa-chalkboard me-3 fa-fw"></i> Courses</a></li>
        <li><a href="supervision.php" class="nav-link text-white-50 hover-white"><i class="fas fa-user-graduate me-3 fa-fw"></i> Supervision</a></li>
        <li><a href="grants.php" class="nav-link text-white-50 hover-white"><i class="fas fa-hand-holding-usd me-3 fa-fw"></i> Grants</a></li>

        <li class="text-white-50 small fw-bold mt-4 mb-2 ps-3 text-uppercase" style="font-size: 0.75rem; letter-spacing: 1px;">Professional</li>
        <li><a href="memberships.php" class="nav-link text-white-50 hover-white"><i class="fas fa-id-badge me-3 fa-fw"></i> Memberships</a></li>
        <li><a href="external_profiles.php" class="nav-link text-white-50 hover-white"><i class="fas fa-link me-3 fa-fw"></i> External Links</a></li>

        <li class="text-white-50 small fw-bold mt-4 mb-2 ps-3 text-uppercase" style="font-size: 0.75rem; letter-spacing: 1px;">System</li>
        <li><a href="change_history.php" class="nav-link text-white-50 hover-white"><i class="fas fa-history me-3 fa-fw"></i> History Log</a></li>

      </ul>
  </div>
  
  <style>
      /* CSS for Sidebar Aesthetics */
      .hover-white:hover { color: #fff !important; background: rgba(255,255,255,0.1); border-radius: 6px; }
      .nav-link.active { background-color: var(--uni-gold); color: #000 !important; font-weight: 600; border-radius: 6px; }
      
      /* Desktop Sidebar Positioning Fix */
      @media (min-width: 992px) {
          aside.col-lg-2 {
              top: 70px; /* Height of Navbar */
              height: calc(100vh - 70px);
          }
      }
      /* Mobile Offcanvas Full Height */
      @media (max-width: 991.98px) {
          aside { padding-top: 0 !important; z-index: 1050 !important; }
      }
  </style>
</aside> -->







<!-- <aside class="col-lg-2 col-md-3 bg-dark text-white vh-100 position-fixed p-3">
  <ul class="nav nav-pills flex-column gap-1">

    <li class="nav-item">
      <a href="dashboard.php" class="nav-link active">
        <i class="fas fa-chart-line me-2"></i> Dashboard
      </a>
    </li>

    <li class="text-muted small mt-3">PROFILE</li>
    <li><a href="profile_edit.php" class="nav-link text-white"><i class="fas fa-user me-2"></i> Personal Info</a></li>
    <li><a href="qualifications.php" class="nav-link text-white"><i class="fas fa-graduation-cap me-2"></i> Qualifications</a></li>
    <li><a href="research_areas.php" class="nav-link text-white"><i class="fas fa-flask me-2"></i> Research Areas</a></li>

    <li class="text-muted small mt-3">ACADEMICS</li>
    <li><a href="publications.php" class="nav-link text-white"><i class="fas fa-book me-2"></i> Publications</a></li>
    <li><a href="courses.php" class="nav-link text-white"><i class="fas fa-chalkboard me-2"></i> Courses</a></li>
    <li><a href="supervision.php" class="nav-link text-white"><i class="fas fa-user-graduate me-2"></i> Supervision</a></li>
    <li><a href="grants.php" class="nav-link text-white"><i class="fas fa-hand-holding-usd me-2"></i> Grants</a></li>

    <li class="text-muted small mt-3">PROFESSIONAL</li>
    <li><a href="memberships.php" class="nav-link text-white"><i class="fas fa-id-badge me-2"></i> Memberships</a></li>
    <li><a href="external_profiles.php" class="nav-link text-white"><i class="fas fa-link me-2"></i> External Profiles</a></li>

    <li class="text-muted small mt-3">SYSTEM</li>
    <li><a href="change_history.php" class="nav-link text-white"><i class="fas fa-history me-2"></i> Change History</a></li>

  </ul>
</aside> -->
