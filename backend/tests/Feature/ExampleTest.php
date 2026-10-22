<?php

namespace Tests\Feature;

use App\Services\LegacyPortfolioService;
use Mockery\MockInterface;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_backend_root_route_reports_api_status(): void
    {
        $response = $this->getJson('http://localhost/');

        $response
            ->assertOk()
            ->assertExactJson([
                'name' => config('app.name'),
                'status' => 'ok',
            ]);
    }

    public function test_bootstrap_returns_guest_state_without_an_authenticated_session(): void
    {
        $response = $this->getJson('http://localhost/api/bootstrap');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/json');

        $this->assertSame([
            'appName' => config('app.name'),
            'appUrl' => config('app.url'),
            'frontendUrl' => config('app.frontend_url'),
            'user' => null,
        ], json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR));
    }

    public function test_public_directory_endpoint_returns_service_payload(): void
    {
        $payload = [
            'items' => [
                [
                    'staffId' => 1,
                    'name' => 'Dr. Jane Smith',
                    'role' => 'Senior Lecturer',
                    'department' => 'Computer Science',
                    'faculty' => 'College of Science and Technology',
                    'profilePhotoUrl' => null,
                ],
            ],
            'filters' => [
                'faculties' => ['College of Science and Technology'],
                'departments' => ['Computer Science'],
            ],
        ];

        $this->mock(LegacyPortfolioService::class, function (MockInterface $mock) use ($payload): void {
            $mock->shouldReceive('publicDirectory')
                ->once()
                ->with([
                    'search' => 'Jane',
                    'faculty' => 'College of Science and Technology',
                    'department' => 'Computer Science',
                ])
                ->andReturn($payload);
        });

        $response = $this->getJson('http://localhost/api/public/staff?search=Jane&faculty=College%20of%20Science%20and%20Technology&department=Computer%20Science');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/json');

        $this->assertSame($payload, json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR));
    }

    public function test_public_profile_endpoint_returns_service_payload(): void
    {
        $payload = [
            'staff' => [
                'staff_id' => 1,
                'full_name' => 'Dr. Jane Smith',
                'profile_photo_url' => null,
            ],
            'qualifications' => [],
            'researchAreas' => [],
            'publications' => [],
            'courses' => [],
            'supervisions' => [],
            'grants' => [],
            'memberships' => [],
            'externalProfiles' => [],
        ];

        $this->mock(LegacyPortfolioService::class, function (MockInterface $mock) use ($payload): void {
            $mock->shouldReceive('publicProfile')
                ->once()
                ->with(1)
                ->andReturn($payload);
        });

        $response = $this->getJson('http://localhost/api/public/staff/1');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/json');

        $this->assertSame($payload, json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR));
    }
}
