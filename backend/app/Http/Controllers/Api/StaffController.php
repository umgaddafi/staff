<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LegacyPortfolioService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class StaffController extends Controller
{
    public function portal(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->getStaffPortalData($this->userId($request))
        );
    }

    public function updateProfile(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'title' => ['nullable', 'string', 'max:20'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['nullable', 'in:Male,Female,Other'],
            'date_of_birth' => ['nullable', 'date'],
            'rank_id' => ['nullable', 'integer'],
            'phone' => ['nullable', 'string', 'max:30'],
            'office_location' => ['nullable', 'string', 'max:150'],
            'biography' => ['nullable', 'string'],
            'profile_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        return response()->json(
            $service->updateProfile(
                $this->userId($request),
                $this->staffId($request),
                $payload,
                $request->file('profile_photo')
            )
        );
    }

    public function createQualification(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'degree' => ['required', 'string', 'max:150'],
            'field' => ['required', 'string', 'max:150'],
            'institution' => ['required', 'string', 'max:200'],
            'country' => ['required', 'string', 'max:100'],
            'year' => ['required', 'integer'],
            'evidence_file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:8192'],
        ]);

        $service->createQualificationRequest(
            $this->userId($request),
            $this->staffId($request),
            $payload,
            $request->file('evidence_file')
        );

        return response()->json(['message' => 'Qualification submitted for verification.']);
    }

    public function deleteQualification(Request $request, int $qualificationId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteQualificationRequest($this->userId($request), $this->staffId($request), $qualificationId);

        return response()->json(['message' => 'Qualification removal submitted for review.']);
    }

    public function createResearchArea(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        $service->createResearchAreaRequest($this->userId($request), $this->staffId($request), $payload['name']);

        return response()->json(['message' => 'Research area submitted for review.']);
    }

    public function deleteResearchArea(Request $request, int $researchAreaId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteResearchAreaRequest($this->userId($request), $this->staffId($request), $researchAreaId);

        return response()->json(['message' => 'Research area removal submitted for review.']);
    }

    public function savePublication(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'publication_id' => ['nullable', 'integer'],
            'title' => ['required', 'string'],
            'type' => ['required', 'string', 'max:50'],
            'venue' => ['nullable', 'string', 'max:255'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'year' => ['required', 'integer'],
            'doi' => ['nullable', 'string', 'max:150'],
            'url' => ['nullable', 'url'],
        ]);

        $publicationId = ! empty($payload['publication_id']) ? (int) $payload['publication_id'] : null;
        $service->upsertPublication($this->userId($request), $this->staffId($request), $payload, $publicationId);

        return response()->json([
            'message' => $publicationId ? 'Publication updated successfully.' : 'Publication added successfully.',
        ]);
    }

    public function deletePublication(Request $request, int $publicationId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deletePublication($this->userId($request), $this->staffId($request), $publicationId);

        return response()->json(['message' => 'Publication removed successfully.']);
    }

    public function linkCourse(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'course_id' => ['required', 'integer'],
            'session' => ['required', 'string', 'max:20'],
        ]);

        $service->linkCourse($this->userId($request), $this->staffId($request), (int) $payload['course_id'], $payload['session']);

        return response()->json(['message' => 'Course linked successfully.']);
    }

    public function unlinkCourse(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'course_id' => ['required', 'integer'],
            'session' => ['required', 'string', 'max:20'],
        ]);

        $service->unlinkCourse($this->userId($request), $this->staffId($request), (int) $payload['course_id'], $payload['session']);

        return response()->json(['message' => 'Course unlinked successfully.']);
    }

    public function createGrant(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'title' => ['required', 'string'],
            'sponsor' => ['required', 'string', 'max:200'],
            'amount' => ['required', 'string'],
            'start' => ['required', 'integer'],
            'end' => ['required', 'integer'],
        ]);

        $service->addGrant($this->userId($request), $this->staffId($request), $payload);

        return response()->json(['message' => 'Grant added successfully.']);
    }

    public function deleteGrant(Request $request, int $projectId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteGrant($this->userId($request), $this->staffId($request), $projectId);

        return response()->json(['message' => 'Grant removed successfully.']);
    }

    public function createSupervision(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'student' => ['required', 'string', 'max:200'],
            'degree' => ['required', 'in:PGD,MSc,PhD'],
            'title' => ['nullable', 'string'],
            'status' => ['required', 'in:Ongoing,Completed'],
            'start' => ['required', 'integer'],
            'end' => ['nullable', 'integer'],
        ]);

        $service->addSupervision($this->userId($request), $this->staffId($request), $payload);

        return response()->json(['message' => 'Supervision record added successfully.']);
    }

    public function deleteSupervision(Request $request, int $supervisionId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteSupervision($this->userId($request), $this->staffId($request), $supervisionId);

        return response()->json(['message' => 'Supervision record removed successfully.']);
    }

    public function createMembership(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'body_name' => ['required', 'string', 'max:200'],
            'membership_no' => ['required', 'string', 'max:100'],
            'role' => ['nullable', 'string', 'max:150'],
            'evidence_file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:8192'],
        ]);

        $service->createMembershipRequest(
            $this->userId($request),
            $this->staffId($request),
            $payload,
            $request->file('evidence_file')
        );

        return response()->json(['message' => 'Membership submitted for verification.']);
    }

    public function deleteMembership(Request $request, int $membershipId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteMembershipRequest($this->userId($request), $this->staffId($request), $membershipId);

        return response()->json(['message' => 'Membership removal submitted for review.']);
    }

    public function createExternalProfile(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'platform' => ['required', 'string'],
            'url' => ['required', 'url'],
        ]);

        $service->createExternalProfileRequest($this->userId($request), $this->staffId($request), $payload);

        return response()->json(['message' => 'External profile submitted for review.']);
    }

    public function deleteExternalProfile(Request $request, int $profileId, LegacyPortfolioService $service): JsonResponse
    {
        $service->deleteExternalProfileRequest($this->userId($request), $this->staffId($request), $profileId);

        return response()->json(['message' => 'External profile removal submitted for review.']);
    }

    public function requestIdCard(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'request_type' => ['required', 'in:New Card,Replacement,Correction,Renewal'],
            'reason' => ['required', 'string', 'max:1500'],
        ]);

        $result = $service->submitIdCardRequest(
            $this->userId($request),
            $this->staffId($request),
            $payload
        );

        return response()->json([
            'message' => 'ID card request submitted successfully.',
            'request' => $result,
        ]);
    }

    public function markNotificationRead(Request $request, int $notificationId, LegacyPortfolioService $service): JsonResponse
    {
        $service->markNotificationRead($this->userId($request), $notificationId);

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllNotificationsRead(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $service->markAllNotificationsRead($this->userId($request));

        return response()->json(['message' => 'Notifications marked as read.']);
    }

    private function userId(Request $request): int
    {
        $userId = (int) $request->session()->get('legacy_auth.userId', 0);

        if ($userId <= 0) {
            throw new RuntimeException('Authentication is required.');
        }

        return $userId;
    }

    private function staffId(Request $request): int
    {
        $staffId = (int) $request->session()->get('legacy_auth.staffId', 0);

        if ($staffId <= 0) {
            throw new RuntimeException('This account is not linked to a staff profile.');
        }

        return $staffId;
    }
}
