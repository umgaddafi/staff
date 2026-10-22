<div class="modal fade" id="deleteStaffModal" tabindex="-1" aria-labelledby="deleteStaffModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
            <div class="modal-header border-0 pt-4 px-4">
                <h5 class="modal-title fw-bold text-danger" id="deleteStaffModalLabel">
                    <i class="fas fa-exclamation-triangle me-2"></i> Confirm Deletion
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body px-4">
                <p class="text-muted">You are about to delete <span id="deleteStaffName" class="fw-bold text-dark"></span>.</p>
                <p class="small text-muted">This action is permanent and will remove all associated records for this staff member.</p>
                
                <input type="hidden" id="deleteStaffId">
            </div>
            <div class="modal-footer border-0 pb-4 px-4">
                <button type="button" class="btn btn-light px-4" data-bs-dismiss="modal">Cancel</button>
                <button type="button" id="confirmDeleteBtn" class="btn btn-danger px-4 shadow-sm">
                    Delete Staff
                </button>
            </div>
        </div>
    </div>
</div>