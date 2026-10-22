<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LegacyPortfolioService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PublicController extends Controller
{
    public function directory(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        return response()->json(
            $service->publicDirectory($request->only(['search', 'faculty', 'department']))
        );
    }

    public function profile(Request $request, int $staffId, LegacyPortfolioService $service): JsonResponse
    {
        $includePending = filter_var($request->query('private', false), FILTER_VALIDATE_BOOL);

        if ($includePending) {
            $sessionUserId = (int) $request->session()->get('legacy_auth.userId', 0);
            $sessionRole = (string) $request->session()->get('legacy_auth.role', '');
            $sessionStaffId = (int) $request->session()->get('legacy_auth.staffId', 0);

            if ($sessionUserId <= 0 || (! in_array($sessionRole, ['Admin', 'Moderator'], true) && $sessionStaffId !== $staffId)) {
                return response()->json([
                    'message' => 'Private preview is only available to the owning staff member or an admin.',
                ], 403);
            }

            return response()->json(
                $service->publicProfile($staffId, true, $sessionUserId)
            );
        }

        return response()->json(
            $service->publicProfile($staffId)
        );
    }
}
