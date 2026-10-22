<?php
// admin/manage_staff.php
// Fetch departments and ranks for the filter dropdowns
$depts = $pdo->query("SELECT * FROM department ORDER BY name ASC")->fetchAll();
$ranks = $pdo->query("SELECT * FROM academic_rank ORDER BY rank_level ASC")->fetchAll();
?>
<!-- <?php if (isset($_SESSION['msg'])): ?>
    <div class="alert alert-<?= $_SESSION['msg_type']; ?> alert-dismissible fade show border-0 shadow-sm mb-4" role="alert">
        <div class="d-flex align-items-center">
            <?php if ($_SESSION['msg_type'] == 'success'): ?>
                <i class="fas fa-check-circle me-2"></i>
            <?php else: ?>
                <i class="fas fa-exclamation-circle me-2"></i>
            <?php endif; ?>
            <div>
                <?= $_SESSION['msg']; ?>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    <?php 
        // Clear the message so it doesn't show again on manual refresh
        unset($_SESSION['msg']); 
        unset($_SESSION['msg_type']); 
    ?>
<?php endif; ?> -->
<?php if (isset($_SESSION['msg'])): ?>
    <div id="session-alert" class="alert alert-<?= $_SESSION['msg_type']; ?> alert-dismissible fade show border-0 shadow-sm mb-4" role="alert">
        <div class="d-flex align-items-center">
            <?php if ($_SESSION['msg_type'] == 'success'): ?>
                <i class="fas fa-check-circle me-2"></i>
            <?php else: ?>
                <i class="fas fa-exclamation-circle me-2"></i>
            <?php endif; ?>
            <div>
                <?= $_SESSION['msg']; ?>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>

    <script>
        // Wait for the document to be ready
        setTimeout(function() {
            let alertElement = document.getElementById('session-alert');
            if (alertElement) {
                // Use Bootstrap's built-in alert close method for a smooth fade out
                let bsAlert = new bootstrap.Alert(alertElement);
                bsAlert.close();
            }
        }, 5000); // 5000ms = 5 seconds
    </script>

    <?php 
        unset($_SESSION['msg']); 
        unset($_SESSION['msg_type']); 
    ?>
<?php endif; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold text-dark mb-0">Staff Directory</h4>
    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#createUserModal">
        <i class="fas fa-plus me-2"></i> Add New Staff
    </button>
</div>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold text-dark mb-0">Staff Directory</h4>
    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#createUserModal">
        <i class="fas fa-plus me-2"></i> Add New Staff
    </button>
</div>
<div class="card mb-4 border-0 shadow-sm">
    <div class="card-body">
        <form id="staffFilterForm" class="row g-3">
            <div class="col-md-3">
                <label class="small fw-bold text-muted mb-1">Search Name/Email</label>
                <div class="input-group">
                    <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted"></i></span>
                    <input type="text" name="search" class="form-control border-0 bg-light ajax-input" placeholder="Search...">
                </div>
            </div>
            
            <div class="col-md-2">
                <label class="small fw-bold text-muted mb-1">Department</label>
                <select name="department_id" class="form-select border-0 bg-light ajax-input">
                    <option value="">All Depts</option>
                    <?php foreach($depts as $d): ?>
                        <option value="<?= $d['department_id'] ?>"><?= htmlspecialchars($d['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-2">
                <label class="small fw-bold text-muted mb-1">Rank</label>
                <select name="rank_id" class="form-select border-0 bg-light ajax-input">
                    <option value="">All Ranks</option>
                    <?php foreach($ranks as $r): ?>
                        <option value="<?= $r['rank_id'] ?>"><?= htmlspecialchars($r['rank_name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-3">
                <label class="small fw-bold text-muted mb-1">Role</label>
                <select name="role" class="form-select border-0 bg-light ajax-input">
                    <option value="">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Moderator">Moderator</option>
                    <option value="Staff">Staff</option>
                    <option value="NULL">No Account</option>
                </select>
            </div>

            <div class="col-md-2 d-flex align-items-end">
                <button type="button" onclick="resetFilters()" class="btn btn-outline-secondary w-100">Reset</button>
            </div>
        </form>
    </div>
</div>

<!-- <div class="card mb-4 border-0 shadow-sm">
    <div class="card-body">
        <form id="staffFilterForm" class="row g-3">
            <div class="col-md-4">
                <label class="small fw-bold text-muted mb-1">Search Name/Email</label>
                <div class="input-group">
                    <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted"></i></span>
                    <input type="text" name="search" class="form-control border-0 bg-light ajax-input" placeholder="Type to search...">
                </div>
            </div>
            
            <div class="col-md-3">
                <label class="small fw-bold text-muted mb-1">Department</label>
                <select name="department_id" class="form-select border-0 bg-light ajax-input">
                    <option value="">All Departments</option>
                    <?php foreach($depts as $d): ?>
                        <option value="<?= $d['department_id'] ?>"><?= htmlspecialchars($d['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-3">
                <label class="small fw-bold text-muted mb-1">Rank</label>
                <select name="rank_id" class="form-select border-0 bg-light ajax-input">
                    <option value="">All Ranks</option>
                    <?php foreach($ranks as $r): ?>
                        <option value="<?= $r['rank_id'] ?>"><?= htmlspecialchars($r['rank_name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-2 d-flex align-items-end">
                <button type="button" onclick="resetFilters()" class="btn btn-outline-secondary w-100">Reset</button>
            </div>
        </form>
    </div>
</div> -->

<!-- <div class="card shadow-sm border-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-secondary small text-uppercase">
                <tr>
                    <th class="ps-4 py-3">Name & Email</th>
                    <th class="py-3">Rank</th>
                    <th class="py-3">Department</th>
                    <th class="text-end pe-4 py-3">Actions</th>
                </tr>
            </thead>
            <tbody id="staffTableBody">
                </tbody>
        </table>
    </div>
</div> -->
<div class="card shadow-sm border-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light text-secondary small text-uppercase">
                <tr>
                    <th class="ps-4 py-3">Name & Email</th>
                    <th class="py-3">Role</th> <th class="py-3">Rank</th>
                    <th class="py-3">Department</th>
                    <th class="text-end pe-4 py-3">Actions</th>
                </tr>
            </thead>
            <tbody id="staffTableBody">
                </tbody>
        </table>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const filterForm = document.getElementById('staffFilterForm');
    const tableBody = document.getElementById('staffTableBody');

    function fetchStaff() {
        tableBody.style.opacity = '0.5';
        const params = new URLSearchParams(new FormData(filterForm)).toString();

        fetch(`fetch_staff.php?${params}`)
            .then(response => response.text())
            .then(data => {
                tableBody.innerHTML = data;
                tableBody.style.opacity = '1';
                attachDeleteListeners(); // Re-attach listeners to new rows
            });
    }

    // Trigger on change for selects or input for search box
    document.querySelectorAll('.ajax-input').forEach(el => {
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', fetchStaff);
    });

    window.resetFilters = function() {
        filterForm.reset();
        fetchStaff();
    };
    let deleteModal;
    // function attachDeleteListeners() {
    //     document.querySelectorAll('.delete-staff-btn').forEach(btn => {
    //         btn.onclick = function() {
    //             const id = this.dataset.id;
    //             if(confirm(`Delete ${this.dataset.name}?`)) {
    //                 fetch('actions/update_staff_core.php', {
    //                     method: 'POST',
    //                     headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    //                     body: `action=delete&staff_id=${id}`
    //                 })
    //                 .then(res => res.json())
    //                 .then(data => data.success ? fetchStaff() : alert(data.message));
    //             }
    //         };
    //     });
    // }

    // Initial load
    
    fetchStaff();
    function attachDeleteListeners() {
    document.querySelectorAll('.delete-staff-btn').forEach(btn => {
        btn.onclick = function() {
            const staffId = this.dataset.id;
            const staffName = this.dataset.name;

            Swal.fire({
                title: 'Delete Staff Member?',
                html: `You are about to permanently remove <b class="text-dark">${staffName}</b>.<br><span class="small text-muted">All associated records will be affected.</span>`,
                icon: 'warning',
                iconColor: '#dc3545',
                showCancelButton: true,
                confirmButtonText: 'Yes, Delete Permanently',
                cancelButtonText: 'Keep Record',
                reverseButtons: true,
                customClass: {
                    popup: 'uni-popup',
                    confirmButton: 'uni-confirm-button btn btn-danger',
                    cancelButton: 'uni-cancel-button btn btn-light',
                    title: 'uni-toast-title'
                },
                buttonsStyling: false, // Disables default SWAL2 button styles to use Bootstrap/Custom
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    return fetch('actions/update_staff_core.php', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: `action=delete&staff_id=${staffId}`
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');
                        return response.json();
                    })
                    .catch(error => {
                        Swal.showValidationMessage(`Request failed: ${error}`);
                    });
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    if (result.value.success) {
                        // Professional Toast notification for success
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true
                        });

                        Toast.fire({
                            icon: 'success',
                            title: 'Staff member deleted successfully'
                        });

                        fetchStaff(); // Refresh your AJAX table
                    } else {
                        Swal.fire({
                            title: 'Error!',
                            text: result.value.message,
                            icon: 'error',
                            confirmButtonColor: '#145928' // University Green
                        });
                    }
                }
            });
        };
    });
}

});
document.querySelector('#createUserModal form').addEventListener('submit', function(e) {
    const btn = document.getElementById('submitBtn');
    
    // 1. Prevent multiple clicks by disabling the button
    btn.disabled = true;
    
    // 2. Add a spinner and change text for visual feedback
    btn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Processing...
    `;
    
    // The form will now proceed to actions/create_user.php naturally.
});

function editStaff(id) {
    // Navigate to edit page or open modal
    window.location.href = `?page=edit_staff&id=${id}`;
}
</script>

<?php include 'modals/create_user_modal.php'; ?>
<?php include 'modals/delete_user_modal.php'; ?>