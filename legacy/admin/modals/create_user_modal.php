<div class="modal fade" id="createUserModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <form action="actions/create_user.php" method="POST">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">Onboard New Staff Member</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" name="first_name" class="form-control" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" name="last_name" class="form-control" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Email Address</label>
                            <input type="email" name="email" class="form-control" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Staff Number (ID)</label>
                            <input type="text" name="staff_number" class="form-control" placeholder="e.g. UNIV/2026/001" required>
                        </div>
                        
                        <div class="col-md-6">
                            <label class="form-label">Department</label>
                            <select name="department_id" class="form-select" required>
                                <?php
                                // Inline PHP to fetch depts or fetch before include
                                $depts = $pdo->query("SELECT * FROM department");
                                while($d = $depts->fetch()){
                                    echo "<option value='{$d['department_id']}'>{$d['name']}</option>";
                                }
                                ?>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Academic Rank</label>
                            <select name="rank_id" class="form-select" required>
                                <?php
                                $ranks = $pdo->query("SELECT * FROM academic_rank");
                                while($r = $ranks->fetch()){
                                    echo "<option value='{$r['rank_id']}'>{$r['rank_name']}</option>";
                                }
                                ?>
                            </select>
                        </div>
                    </div>
                    <div class="alert alert-info mt-3 small">
                        <i class="fas fa-info-circle"></i> A system-generated password will be emailed to the user. They will be forced to change it upon first login.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <!-- <button type="submit" name="create_user" class="btn btn-primary">Create Account & Send Email</button> -->
                    <button type="submit" id="submitBtn" name="create_user" class="btn btn-admin">
                        Create Account & Send Email
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('#createUserModal form');
    if (!form || form.dataset.loadingBound === '1') return;
    form.dataset.loadingBound = '1';

    form.addEventListener('submit', function() {
        const submitBtn = form.querySelector('#submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
        }

        const modal = document.getElementById('createUserModal');
        if (modal) {
            modal.setAttribute('aria-busy', 'true');
            modal.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
                btn.disabled = true;
            });
        }
    });
});
</script>
