<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LegacyPortfolioService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function portal(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->getAdminPortalData(
                $request->only(['search', 'department_id', 'rank_id', 'role']),
                (string) $request->query('request_search', '')
            )
        );
    }

    public function createStaff(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'pf_number' => ['nullable', 'string', 'max:50'],
            'staff_number' => ['nullable', 'string', 'max:50'],
            'department_id' => ['required', 'integer'],
            'rank_id' => ['required', 'integer'],
        ]);

        return response()->json(
            $service->createStaffAccount($payload)
        );
    }
    public function updateStaff(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'other_name' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'pf_number' => ['nullable', 'string', 'max:50'],
            'staff_number' => ['nullable', 'string', 'max:50'],
            'category' => ['nullable', 'in:SENIOR,JUNIOR'],
            'department' => ['nullable', 'string', 'max:150'],
            'rank' => ['nullable', 'string', 'max:150'],
            'department_id' => ['nullable', 'integer'],
            'rank_id' => ['nullable', 'integer'],
            'role' => ['nullable', 'in:Staff,Moderator,Admin'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        return response()->json(
            $service->updateStaffAccount($staffId, $payload)
        );
    }
    public function assignStaffRole(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'role' => ['required', 'in:Staff,Moderator,Admin'],
        ]);

        return response()->json(
            $service->assignStaffRole(
                (int) $request->session()->get('legacy_auth.userId', 0),
                $staffId,
                $payload['role']
            )
        );
    }

    public function deactivateStaffAccount(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->deactivateStaffAccount(
                (int) $request->session()->get('legacy_auth.userId', 0),
                $staffId
            )
        );
    }

    public function reactivateStaffAccount(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->reactivateStaffAccount(
                (int) $request->session()->get('legacy_auth.userId', 0),
                $staffId
            )
        );
    }

    public function forceStaffPasswordReset(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->forceStaffPasswordReset(
                (int) $request->session()->get('legacy_auth.userId', 0),
                $staffId
            )
        );
    }

    public function resendStaffInvite(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->resendStaffInvite(
                (int) $request->session()->get('legacy_auth.userId', 0),
                $staffId
            )
        );
    }

    public function unlockStaffAccount(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->unlockStaffAccount(
                (int) $request->session()->get('legacy_auth.userId', 0),
                $staffId
            )
        );
    }

    public function deleteStaff(int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteStaff($staffId);

        return response()->json([
            'message' => 'Staff record deleted successfully.',
        ]);
    }

    public function saveCollege(Request $request, LegacyPortfolioService $service, ?int $collegeId = null): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        return response()->json([
            'message' => $collegeId ? 'College updated successfully.' : 'College created successfully.',
            'item' => $service->saveCollege($collegeId, $payload['name']),
        ]);
    }

    public function deleteCollege(int $collegeId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteCollege($collegeId);

        return response()->json([
            'message' => 'College deleted successfully.',
        ]);
    }

    public function saveDepartment(Request $request, LegacyPortfolioService $service, ?int $departmentId = null): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'college_id' => ['required', 'integer'],
        ]);

        return response()->json([
            'message' => $departmentId ? 'Department updated successfully.' : 'Department created successfully.',
            'item' => $service->saveDepartment($departmentId, $payload['name'], (int) $payload['college_id']),
        ]);
    }

    public function deleteDepartment(int $departmentId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteDepartment($departmentId);

        return response()->json([
            'message' => 'Department deleted successfully.',
        ]);
    }

    public function saveRank(Request $request, LegacyPortfolioService $service, ?int $rankId = null): JsonResponse
    {
        $payload = $request->validate([
            'rank_name' => ['required', 'string', 'max:100'],
            'rank_level' => ['nullable', 'integer'],
        ]);

        return response()->json([
            'message' => $rankId ? 'Rank updated successfully.' : 'Rank created successfully.',
            'item' => $service->saveRank($rankId, $payload['rank_name'], (int) ($payload['rank_level'] ?? 0)),
        ]);
    }

    public function deleteRank(int $rankId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteRank($rankId);

        return response()->json([
            'message' => 'Rank deleted successfully.',
        ]);
    }

    public function requestHistory(int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->requestHistory($staffId)
        );
    }

    public function approveAllRequests(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $count = $service->approveAllRequests(
            (int) $request->session()->get('legacy_auth.userId', 0)
        );

        return response()->json([
            'message' => $count > 0 
                ? "Successfully approved {$count} pending request(s)." 
                : 'No pending requests found to approve.',
            'count' => $count,
        ]);
    }

    public function getStaffDocuments(int $id, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'staff' => $service->getStaffDetailsForAdmin($id),
            'documents' => $service->getStaffDocuments($id),
        ]);
    }

    public function requestDetail(int $logId, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->requestDetail($logId)
        );
    }

    public function decideRequest(Request $request, int $logId, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        $service->decideRequest(
            (int) $request->session()->get('legacy_auth.userId', 0),
            $logId,
            $payload['decision'],
            (string) ($payload['rejection_reason'] ?? '')
        );

        return response()->json([
            'message' => $payload['decision'] === 'approve'
                ? 'Request approved successfully.'
                : 'Request rejected successfully.',
        ]);
    }

    public function saveRolePermissions(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'permissions' => ['required', 'array'],
        ]);

        $saved = $service->saveRolePermissions($payload['permissions']);

        return response()->json([
            'message' => 'Role permissions saved successfully.',
            'rolePermissions' => $saved,
        ]);
    }

    public function getAuditSubmissions(LegacyPortfolioService $service): JsonResponse
    {
        return response()->json($service->getAuditSubmissions());
    }

    public function decideAuditSubmission(Request $request, int $auditStaffId, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'decision' => ['required', 'in:verify,reject,require_correction,pending'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json(
            $service->decideAuditSubmission(
                $auditStaffId,
                $payload['decision'],
                $payload['notes'] ?? null
            )
        );
    }

    public function decideAuditDocument(Request $request, int $documentId, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'decision' => ['required', 'in:legit,requires_correction,rejected'],
            'remark' => ['nullable', 'string'],
        ]);

        return response()->json(
            $service->decideAuditDocument(
                $documentId,
                $payload['decision'],
                $payload['remark'] ?? null
            )
        );
    }

    public function getAuditFileStream(Request $request, LegacyPortfolioService $service)
    {
        $path = $request->query('path', '');
        return $service->getAuditFileStream($path);
    }

    public function inviteAuditStaff(Request $request, LegacyPortfolioService $service)
    {
        $payload = $request->validate([
            'staff_ids' => ['nullable', 'array'],
            'staff_ids.*' => ['integer'],
            'date' => ['nullable', 'date'],
            'time' => ['nullable', 'string'],
            'venue' => ['nullable', 'string'],
        ]);

        return response()->json($service->inviteAuditStaff($payload));
    }

    public function getSystemSettings(LegacyPortfolioService $service): JsonResponse
    {
        return response()->json([
            'settings' => $service->getSystemSettings(),
        ]);
    }

    public function saveSystemSettings(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $settings = $request->input('settings', $request->all());
        $saved = $service->saveSystemSettings((array) $settings);

        return response()->json([
            'message' => 'System settings updated successfully.',
            'settings' => $saved,
        ]);
    }
}
