<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LegacyPortfolioService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function bootstrap(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $sessionUserId = (int) $request->session()->get('legacy_auth.userId', 0);
        $user = $sessionUserId > 0 ? $service->getAuthenticatedUser($sessionUserId) : null;

        if (! $user && $sessionUserId > 0) {
            $request->session()->forget('legacy_auth');
        }

        return response()->json([
            'appName' => config('app.name'),
            'appUrl' => config('app.url'),
            'frontendUrl' => config('app.frontend_url'),
            'user' => $user,
        ]);
    }

    public function login(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = $service->login($credentials['username'], $credentials['password']);

        if (! $user) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        $request->session()->put('legacy_auth', $user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'redirectTo' => $user['forcePasswordChange']
                ? '/security/update-password'
                : (in_array($user['role'], ['Admin', 'Moderator'], true) ? '/admin' : '/staff'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function forgotPassword(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $sent = $service->requestPasswordReset($payload['email'], (string) config('app.frontend_url'));

        if (! $sent) {
            return response()->json([
                'message' => 'Unable to send a reset email right now. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'If the email exists in the system, a reset link has been sent.',
        ]);
    }

    public function validateResetToken(string $token, LegacyPortfolioService $service): JsonResponse
    {
        $tokenData = $service->validateResetToken($token);

        if ($tokenData === []) {
            return response()->json([
                'message' => 'This reset link is invalid or expired.',
            ], 404);
        }

        return response()->json([
            'tokenValid' => true,
            'tokenData' => $tokenData,
        ]);
    }

    public function resetPassword(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'token' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $updated = $service->resetPassword($payload['token'], $payload['new_password']);

        if (! $updated) {
            return response()->json([
                'message' => 'This reset link is invalid or expired.',
            ], 404);
        }

        return response()->json([
            'message' => 'Password updated successfully. You can now log in.',
        ]);
    }

    public function changePassword(Request $request, LegacyPortfolioService $service): JsonResponse
    {
        $payload = $request->validate([
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $userId = (int) $request->session()->get('legacy_auth.userId', 0);
        $user = $service->updatePassword($userId, $payload['new_password']);

        $request->session()->put('legacy_auth', $user);

        return response()->json([
            'message' => 'Password updated successfully.',
            'user' => $user,
            'redirectTo' => in_array($user['role'], ['Admin', 'Moderator'], true) ? '/admin' : '/staff',
        ]);
    }
}
