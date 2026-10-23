<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AppraisalController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\StaffController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
    ]);
});

Route::any('/jostum-api/{any}', function (\Illuminate\Http\Request $request, $any) {
    $url = 'https://jostumservices.com/api/' . $any;
    
    // We only forward the request body and method.
    // If we forward all headers, we might send an invalid Host or Origin header that breaks the target API.
    $options = [];
    if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
        $options['body'] = $request->getContent();
        $options['headers'] = ['Content-Type' => $request->header('Content-Type')];
    }
    
    $response = \Illuminate\Support\Facades\Http::send($request->method(), $url, $options);

    return response($response->body(), $response->status())
        ->header('Content-Type', $response->header('Content-Type') ?? 'application/json');
})->where('any', '.*');

Route::prefix('api')->group(function (): void {
    Route::get('/bootstrap', [AuthController::class, 'bootstrap']);

    Route::prefix('appraisal')->group(function (): void {
        Route::get('/submissions', [AppraisalController::class, 'index']);
        Route::post('/submit-part-a', [AppraisalController::class, 'submitPartA']);
        Route::post('/evaluate-part-b/{id}', [AppraisalController::class, 'evaluatePartB']);
        Route::post('/sign-part-c/{id}', [AppraisalController::class, 'signPartC']);
        Route::post('/review-part-d/{id}', [AppraisalController::class, 'reviewPartD']);
        Route::post('/ratify-part-e/{id}', [AppraisalController::class, 'ratifyPartE']);
        Route::get('/signatures', [AppraisalController::class, 'getSignatures']);
        Route::post('/signature', [AppraisalController::class, 'updateSignature']);
        Route::get('/settings', [AppraisalController::class, 'getSettings']);
        Route::post('/settings', [AppraisalController::class, 'updateSettings']);
        Route::get('/users', [AppraisalController::class, 'getUsers']);
        Route::post('/users', [AppraisalController::class, 'createUser']);
        Route::put('/users/{id}', [AppraisalController::class, 'updateUser']);
        Route::patch('/users/{id}/status', [AppraisalController::class, 'toggleUserStatus']);
        Route::post('/users/{id}/reset-password', [AppraisalController::class, 'resetUserPassword']);
        Route::delete('/users/{id}', [AppraisalController::class, 'deleteUser']);
        Route::get('/export-report', [AppraisalController::class, 'exportReport']);
        Route::get('/analytics-summary', [AppraisalController::class, 'analyticsSummary']);
    });

    Route::prefix('payroll')->group(function (): void {
        Route::get('/template', [PayrollController::class, 'downloadTemplate']);
        Route::post('/upload', [PayrollController::class, 'uploadBatch']);
        Route::get('/batches', [PayrollController::class, 'getBatches']);
        Route::delete('/batches/{id}', [PayrollController::class, 'deleteBatch']);
        Route::get('/periods', [PayrollController::class, 'getStaffPeriods']);
        Route::get('/payslip', [PayrollController::class, 'getStaffPayslip']);
    });

    // Aliases for admin and staff payslip routes
    Route::prefix('admin/payslips')->group(function (): void {
        Route::get('/template', [PayrollController::class, 'downloadTemplate']);
        Route::post('/upload', [PayrollController::class, 'uploadBatch']);
        Route::get('/batches', [PayrollController::class, 'getBatches']);
        Route::delete('/batches/{id}', [PayrollController::class, 'deleteBatch']);
    });

    Route::prefix('staff/payslips')->group(function (): void {
        Route::get('/periods', [PayrollController::class, 'getStaffPeriods']);
        Route::get('/slip', [PayrollController::class, 'getStaffPayslip']);
    });

    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/logout', [AuthController::class, 'logout'])->middleware('legacy.auth');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::get('/reset-password/{token}', [AuthController::class, 'validateResetToken']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
        Route::post('/change-password', [AuthController::class, 'changePassword'])->middleware('legacy.auth');
    });

    Route::prefix('public')->group(function (): void {
        Route::get('/audit/file', [AdminController::class, 'getAuditFileStream']);
        Route::get('/audit/submissions', [AdminController::class, 'getAuditSubmissions']);
        Route::post('/audit/submissions/{auditStaffId}/decide', [AdminController::class, 'decideAuditSubmission']);
        Route::post('/audit/documents/{documentId}/decide', [AdminController::class, 'decideAuditDocument']);
        Route::post('/audit/schedule/invite', [AdminController::class, 'inviteAuditStaff']);
        Route::get('/staff', [PublicController::class, 'directory']);
        Route::get('/staff/{staffId}', [PublicController::class, 'profile']);
    });

    Route::prefix('staff')
        ->middleware(['legacy.auth', 'legacy.role:Staff', 'legacy.password'])
        ->group(function (): void {
            Route::get('/portal', [StaffController::class, 'portal']);
            Route::post('/profile', [StaffController::class, 'updateProfile']);

            Route::post('/qualifications', [StaffController::class, 'createQualification']);
            Route::delete('/qualifications/{qualificationId}', [StaffController::class, 'deleteQualification']);

            Route::post('/research-areas', [StaffController::class, 'createResearchArea']);
            Route::delete('/research-areas/{researchAreaId}', [StaffController::class, 'deleteResearchArea']);

            Route::post('/publications', [StaffController::class, 'savePublication']);
            Route::delete('/publications/{publicationId}', [StaffController::class, 'deletePublication']);

            Route::post('/courses', [StaffController::class, 'linkCourse']);
            Route::delete('/courses', [StaffController::class, 'unlinkCourse']);

            Route::post('/grants', [StaffController::class, 'createGrant']);
            Route::delete('/grants/{projectId}', [StaffController::class, 'deleteGrant']);

            Route::post('/supervisions', [StaffController::class, 'createSupervision']);
            Route::delete('/supervisions/{supervisionId}', [StaffController::class, 'deleteSupervision']);

            Route::post('/memberships', [StaffController::class, 'createMembership']);
            Route::delete('/memberships/{membershipId}', [StaffController::class, 'deleteMembership']);

            Route::post('/external-profiles', [StaffController::class, 'createExternalProfile']);
            Route::delete('/external-profiles/{profileId}', [StaffController::class, 'deleteExternalProfile']);

            Route::post('/id-card/request', [StaffController::class, 'requestIdCard']);

            Route::get('/documents', [StaffController::class, 'getDocuments']);
            Route::post('/documents', [StaffController::class, 'uploadDocument']);
            Route::delete('/documents/{documentId}', [StaffController::class, 'deleteDocument']);

            Route::post('/notifications/read-all', [StaffController::class, 'markAllNotificationsRead']);
            Route::post('/notifications/{notificationId}/read', [StaffController::class, 'markNotificationRead']);
        });

    Route::prefix('admin')
        ->middleware(['legacy.auth', 'legacy.role:Admin,Moderator', 'legacy.password'])
        ->group(function (): void {
            Route::get('/portal', [AdminController::class, 'portal']);
            Route::post('/staff', [AdminController::class, 'createStaff']);
            Route::put('/staff/{staffId}', [AdminController::class, 'updateStaff']);
            Route::get('/staff/{staffId}/documents', [AdminController::class, 'getStaffDocuments']);
            Route::post('/staff/{staffId}/role', [AdminController::class, 'assignStaffRole']);
            Route::post('/staff/{staffId}/deactivate', [AdminController::class, 'deactivateStaffAccount']);
            Route::post('/staff/{staffId}/reactivate', [AdminController::class, 'reactivateStaffAccount']);
            Route::post('/staff/{staffId}/force-password-reset', [AdminController::class, 'forceStaffPasswordReset']);
            Route::post('/staff/{staffId}/resend-invite', [AdminController::class, 'resendStaffInvite']);
            Route::post('/staff/{staffId}/unlock', [AdminController::class, 'unlockStaffAccount']);
            Route::delete('/staff/{staffId}', [AdminController::class, 'deleteStaff']);

            Route::post('/colleges', [AdminController::class, 'saveCollege']);
            Route::put('/colleges/{collegeId}', [AdminController::class, 'saveCollege']);
            Route::delete('/colleges/{collegeId}', [AdminController::class, 'deleteCollege']);

            Route::post('/departments', [AdminController::class, 'saveDepartment']);
            Route::put('/departments/{departmentId}', [AdminController::class, 'saveDepartment']);
            Route::delete('/departments/{departmentId}', [AdminController::class, 'deleteDepartment']);

            Route::post('/ranks', [AdminController::class, 'saveRank']);
            Route::put('/ranks/{rankId}', [AdminController::class, 'saveRank']);
            Route::delete('/ranks/{rankId}', [AdminController::class, 'deleteRank']);

            Route::get('/requests/{staffId}', [AdminController::class, 'requestHistory']);
            Route::post('/requests/approve-all', [AdminController::class, 'approveAllRequests']);
            Route::get('/review/{logId}', [AdminController::class, 'requestDetail']);
            Route::post('/review/{logId}', [AdminController::class, 'decideRequest']);

            Route::post('/role-permissions', [AdminController::class, 'saveRolePermissions']);
            Route::get('/system-settings', [AdminController::class, 'getSystemSettings']);
            Route::post('/system-settings', [AdminController::class, 'saveSystemSettings']);

            Route::get('/audit/submissions', [AdminController::class, 'getAuditSubmissions']);
            Route::post('/audit/submissions/{auditStaffId}/decide', [AdminController::class, 'decideAuditSubmission']);
            Route::post('/audit/documents/{documentId}/decide', [AdminController::class, 'decideAuditDocument']);
            Route::post('/audit/schedule/invite', [AdminController::class, 'inviteAuditStaff']);
            Route::get('/audit/file', [AdminController::class, 'getAuditFileStream']);
        });
});
