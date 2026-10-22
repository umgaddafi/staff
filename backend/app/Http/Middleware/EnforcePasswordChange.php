<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class EnforcePasswordChange
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ((bool) $request->session()->get('legacy_auth.forcePasswordChange', false)) {
            return new JsonResponse([
                'message' => 'Password update is required before you can continue.',
                'forcePasswordChange' => true,
            ], 423);
        }

        return $next($request);
    }
}
