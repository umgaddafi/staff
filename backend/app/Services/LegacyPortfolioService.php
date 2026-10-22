<?php

namespace App\Services;

use App\Support\LegacySchemaManager;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class LegacyPortfolioService
{
    private ConnectionInterface $db;

    public function __construct()
    {
        $this->db = DB::connection();

        LegacySchemaManager::ensureReviewAndNotificationSchema($this->db);
        LegacySchemaManager::ensurePasswordResetSchema($this->db);
        LegacySchemaManager::ensureStaffIdCardSchema($this->db);
        LegacySchemaManager::ensureRolePermissionsSchema($this->db);
        LegacySchemaManager::ensureStaffIdCardColumnsSchema($this->db);
    }

    public function getAuthenticatedUser(int $userId): ?array
    {
        $row = DB::table('user_account as ua')
            ->leftJoin('staff as s', 'ua.staff_id', '=', 's.staff_id')
            ->leftJoin('ranks as r', 's.rank_id', '=', 'r.id')
            ->leftJoin('department as d', 's.department_id', '=', 'd.department_id')
            ->leftJoin('college as c', 'd.college_id', '=', 'c.college_id')
            ->selectRaw(
                'ua.user_id, ua.staff_id, ua.username, ua.role, ua.is_active, ua.must_change_password,
                s.title, s.first_name, s.middle_name, s.other_name, s.last_name, s.email, s.phone,
                s.profile_photo, s.passport, s.signature, s.staff_number, s.pf_number, s.category,
                COALESCE(r.name, s.rank) as rank_name, COALESCE(d.name, s.department) as department_name, c.name as college_name'
            )
            ->where('ua.user_id', $userId)
            ->first();

        if (! $row) {
            return null;
        }

        return $this->mapUserSummary((array) $row);
    }

    public function login(string $username, string $password): ?array
    {
        $cleanIdentifier = trim($username);
        $cleanPassword = trim($password);

        if ($cleanIdentifier === '' || $cleanPassword === '') {
            return null;
        }

        $alphanumericIdentifier = preg_replace('/[^a-zA-Z0-9]/', '', $cleanIdentifier);

        // 1. Search user_account by Email or PF Number (and admin username for system administrators). Phone is not allowed as identifier.
        $query = DB::table('user_account as ua')
            ->leftJoin('staff as s', 'ua.staff_id', '=', 's.staff_id')
            ->where('ua.is_active', 1)
            ->where(function ($sub) use ($cleanIdentifier, $alphanumericIdentifier): void {
                $sub->where('ua.username', $cleanIdentifier)
                    ->orWhere('s.staff_number', $cleanIdentifier)
                    ->orWhere('s.pf_number', $cleanIdentifier)
                    ->orWhereRaw('LOWER(s.email) = ?', [strtolower($cleanIdentifier)]);

                if ($alphanumericIdentifier !== '') {
                    $sub->orWhereRaw("REPLACE(REPLACE(s.staff_number, '/', ''), '-', '') = ?", [$alphanumericIdentifier])
                        ->orWhereRaw("REPLACE(REPLACE(s.pf_number, '/', ''), '-', '') = ?", [$alphanumericIdentifier]);
                }
            })
            ->select('ua.*', 's.phone as staff_phone', 's.pf_number as staff_pf_number', 's.staff_number as staff_staff_number');

        $account = $query->first();

        if ($account) {
            // Check if regular password matches
            if (Hash::check($cleanPassword, (string) $account->password)) {
                return $this->getAuthenticatedUser((int) $account->user_id);
            }

            // If account has must_change_password = 1 (first-time login), allow registered phone number as initial password
            if ((int) $account->must_change_password === 1) {
                if ($this->verifyFirstTimeAlternativePassword($account, $cleanIdentifier, $cleanPassword)) {
                    return $this->getAuthenticatedUser((int) $account->user_id);
                }
            }

            return null;
        }

        // 2. If no user_account was found, look up staff table directly by Email or PF Number (for on-the-fly provisioning)
        $staffQuery = DB::table('staff as s')
            ->where('s.is_active', 1)
            ->where(function ($sub) use ($cleanIdentifier, $alphanumericIdentifier): void {
                $sub->where('s.staff_number', $cleanIdentifier)
                    ->orWhere('s.pf_number', $cleanIdentifier)
                    ->orWhereRaw('LOWER(s.email) = ?', [strtolower($cleanIdentifier)]);

                if ($alphanumericIdentifier !== '') {
                    $sub->orWhereRaw("REPLACE(REPLACE(s.staff_number, '/', ''), '-', '') = ?", [$alphanumericIdentifier])
                        ->orWhereRaw("REPLACE(REPLACE(s.pf_number, '/', ''), '-', '') = ?", [$alphanumericIdentifier]);
                }
            });

        $staff = $staffQuery->first();

        if ($staff) {
            $mockAccount = (object) [
                'staff_phone' => $staff->phone,
                'staff_pf_number' => $staff->pf_number ?? $staff->staff_number,
                'staff_staff_number' => $staff->staff_number ?? $staff->pf_number,
                'password' => '',
            ];

            if ($this->verifyFirstTimeAlternativePassword($mockAccount, $cleanIdentifier, $cleanPassword)) {
                $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string) ($staff->pf_number ?? $staff->staff_number)));
                if ($baseUsername === '') {
                    $baseUsername = strtolower(trim($staff->first_name . '.' . $staff->last_name));
                }

                $username = $baseUsername;
                $counter = 1;
                while (DB::table('user_account')->where('username', $username)->exists()) {
                    $username = $baseUsername . $counter;
                    $counter++;
                }

                $userId = (int) DB::table('user_account')->insertGetId([
                    'staff_id' => $staff->staff_id,
                    'username' => $username,
                    'password' => Hash::make($cleanPassword),
                    'role' => 'Staff',
                    'is_active' => 1,
                    'must_change_password' => 1,
                ]);

                return $this->getAuthenticatedUser($userId);
            }
        }

        return null;
    }

    private function normalizePhoneNumber(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($digits, '234') && strlen($digits) >= 12) {
            $digits = '0' . substr($digits, 3);
        }
        return $digits;
    }

    private function phoneMatches(string $inputPhone, ?string $staffPhone): bool
    {
        if ($staffPhone === null || $staffPhone === '') {
            return false;
        }

        $inputDigits = $this->normalizePhoneNumber($inputPhone);
        if (strlen($inputDigits) < 7) {
            return false;
        }

        $staffDigits = $this->normalizePhoneNumber($staffPhone);
        if (strlen($staffDigits) < 7) {
            // Also check multiple phones separated by ; or /
            $parts = preg_split('/[;\/,]+/', $staffPhone);
            foreach ($parts as $part) {
                $partDigits = $this->normalizePhoneNumber(trim($part));
                if (strlen($partDigits) >= 7 && (
                    $inputDigits === $partDigits ||
                    substr($inputDigits, -10) === substr($partDigits, -10)
                )) {
                    return true;
                }
            }
            return false;
        }

        if ($inputDigits === $staffDigits) {
            return true;
        }

        return substr($inputDigits, -10) === substr($staffDigits, -10);
    }

    private function verifyFirstTimeAlternativePassword(object $account, string $identifier, string $password): bool
    {
        $staffPhone = (string) ($account->staff_phone ?? '');

        // 1. Password matches staff phone
        if ($staffPhone !== '' && $this->phoneMatches($password, $staffPhone)) {
            return true;
        }

        // 2. Password matches staff PF number
        $pf1 = strtoupper(trim((string) ($account->staff_pf_number ?? '')));
        $pf2 = strtoupper(trim((string) ($account->staff_staff_number ?? '')));
        $cleanPassword = strtoupper(preg_replace('/[^A-Z0-9]/', '', $password));
        $cleanPf1 = preg_replace('/[^A-Z0-9]/', '', $pf1);
        $cleanPf2 = preg_replace('/[^A-Z0-9]/', '', $pf2);

        if ($cleanPassword !== '' && ($cleanPassword === $cleanPf1 || $cleanPassword === $cleanPf2)) {
            return true;
        }

        // 3. Default placeholder password check
        if (! empty($account->password) && Hash::check($password, (string) $account->password)) {
            return true;
        }

        return false;
    }

    public function updatePassword(int $userId, string $newPassword): array
    {
        DB::table('user_account')
            ->where('user_id', $userId)
            ->update([
                'password' => Hash::make($newPassword),
                'must_change_password' => 0,
            ]);

        $user = $this->getAuthenticatedUser($userId);

        if (! $user) {
            throw new RuntimeException('Unable to reload the authenticated user.');
        }

        return $user;
    }

    public function requestPasswordReset(string $email, string $baseUrl): bool
    {
        $email = trim(Str::lower($email));

        if ($email === '') {
            return true;
        }

        $user = DB::table('user_account as ua')
            ->join('staff as s', 'ua.staff_id', '=', 's.staff_id')
            ->select('ua.user_id', 'ua.username', 's.first_name', 's.last_name', 's.email')
            ->whereRaw('LOWER(s.email) = ?', [$email])
            ->where('ua.is_active', 1)
            ->first();

        if (! $user) {
            return true;
        }

        $token = $this->createPasswordResetToken((int) $user->user_id);
        $resetUrl = rtrim($baseUrl, '/') . '/reset-password/' . urlencode($token);
        $fullName = trim(((string) $user->first_name) . ' ' . ((string) $user->last_name));

        if ($fullName === '') {
            $fullName = (string) $user->username;
        }

        return $this->sendPasswordResetEmail((string) $user->email, $fullName, $resetUrl);
    }

    public function validateResetToken(string $token): array
    {
        return $this->resolvePasswordResetToken($token);
    }

    public function resetPassword(string $token, string $newPassword): bool
    {
        $tokenData = $this->resolvePasswordResetToken($token);

        if (empty($tokenData['user_id']) || empty($tokenData['reset_id'])) {
            return false;
        }

        DB::transaction(function () use ($tokenData, $newPassword): void {
            DB::table('user_account')
                ->where('user_id', (int) $tokenData['user_id'])
                ->update([
                    'password' => Hash::make($newPassword),
                    'must_change_password' => 0,
                ]);

            DB::table('password_reset_token')
                ->where('reset_id', (int) $tokenData['reset_id'])
                ->update([
                    'used_at' => Carbon::now(),
                ]);
        });

        return true;
    }

    public function publicDirectory(array $filters = []): array
    {
        $query = DB::table('staff as s')
            ->leftJoin('ranks as r', 's.rank_id', '=', 'r.id')
            ->leftJoin('staff_categories as sc', 'r.staff_category_id', '=', 'sc.id')
            ->leftJoin('department as d', 's.department_id', '=', 'd.department_id')
            ->leftJoin('college as c', 'd.college_id', '=', 'c.college_id')
            ->selectRaw(
                "s.staff_id, COALESCE(s.pf_number, s.staff_number, '') as pf_number, CONCAT(COALESCE(s.title, ''), ' ', s.first_name, ' ', s.last_name) as name,
                COALESCE(r.name, s.rank, 'Staff Member') as role, COALESCE(sc.name, s.category, 'Uncategorized') as category, COALESCE(r.id, 9999) as rank_level_value,
                COALESCE(d.name, s.department, 'General') as department, COALESCE(c.name, 'University') as faculty, IFNULL(COALESCE(s.profile_photo, s.passport), '') as profile_photo"
            )
            ->where('s.is_active', 1);

        $search = trim((string) ($filters['search'] ?? ''));
        $faculty = trim((string) ($filters['faculty'] ?? ''));
        $department = trim((string) ($filters['department'] ?? ''));

        if ($search !== '') {
            $query->where(function ($subQuery) use ($search): void {
                $subQuery
                    ->where('s.first_name', 'like', '%' . $search . '%')
                    ->orWhere('s.last_name', 'like', '%' . $search . '%')
                    ->orWhere('s.email', 'like', '%' . $search . '%')
                    ->orWhere('s.staff_number', 'like', '%' . $search . '%')
                    ->orWhere('s.pf_number', 'like', '%' . $search . '%')
                    ->orWhere('s.phone', 'like', '%' . $search . '%')
                    ->orWhere('s.department', 'like', '%' . $search . '%')
                    ->orWhere('s.rank', 'like', '%' . $search . '%');
            });
        }

        if ($faculty !== '') {
            $query->where('c.name', $faculty);
        }

        if ($department !== '') {
            $query->where('d.name', $department);
        }

        $items = $query
            ->orderByRaw("
                CASE 
                    WHEN UPPER(REPLACE(REPLACE(COALESCE(s.pf_number, s.staff_number, ''), '/', ''), ',', '')) = 'PF0583' THEN 1
                    WHEN UPPER(REPLACE(REPLACE(COALESCE(s.pf_number, s.staff_number, ''), '/', ''), ',', '')) = 'PF1229' THEN 2
                    WHEN UPPER(REPLACE(REPLACE(COALESCE(s.pf_number, s.staff_number, ''), '/', ''), ',', '')) = 'PF2365' THEN 3
                    WHEN UPPER(REPLACE(REPLACE(COALESCE(s.pf_number, s.staff_number, ''), '/', ''), ',', '')) = 'PF1466' THEN 4
                    ELSE 5
                END
            ")
            ->orderBy('rank_level_value')
            ->orderBy('s.staff_id')
            ->get()
            ->map(fn ($item) => [
                'staffId' => (int) $item->staff_id,
                'pfNumber' => trim((string) $item->pf_number),
                'name' => trim((string) $item->name),
                'role' => (string) $item->role,
                'category' => (string) $item->category,
                'department' => (string) $item->department,
                'faculty' => (string) $item->faculty,
                'profilePhotoUrl' => $this->fileUrl('uploads/' . ltrim((string) $item->profile_photo, '/')),
            ])
            ->values()
            ->all();

        return [
            'items' => $items,
            'filters' => [
                'faculties' => DB::table('college')->orderBy('name')->pluck('name')->all(),
                'departments' => DB::table('department')->orderBy('name')->pluck('name')->all(),
                'ranks' => DB::table('ranks')->orderBy('id')->pluck('name')->all(),
                'categories' => DB::table('staff_categories')->orderBy('id')->pluck('name')->all(),
            ],
        ];
    }

    public function publicProfile(int $staffId, bool $includePending = false, ?int $viewerUserId = null): array
    {
        $profile = $this->fetchProfileBundle($staffId);

        if ($includePending && $viewerUserId) {
            $profile = $this->applyPendingChanges($profile, $viewerUserId);
        }

        return $profile;
    }

    public function getStaffPortalData(int $userId): array
    {
        $user = $this->getAuthenticatedUser($userId);

        if (! $user || empty($user['staffId'])) {
            throw new RuntimeException('The authenticated account is not linked to a staff profile.');
        }

        $staffId = (int) $user['staffId'];
        $profile = $this->fetchProfileBundle($staffId);
        $history = $this->fetchUserHistory($userId);
        $notifications = $this->fetchNotifications($userId, 12);

        $publicationsCount = DB::table('staff_publication')->where('staff_id', $staffId)->count();
        $supervisionCount = DB::table('supervision')->where('staff_id', $staffId)->count();
        $activeGrantCount = DB::table('grant_project')
            ->where('staff_id', $staffId)
            ->where(function ($query): void {
                $query->whereNull('end_year')->orWhere('end_year', '>=', (int) date('Y'));
            })
            ->count();
        $verifiedLogsCount = DB::table('change_log')
            ->where('user_id', $userId)
            ->where('status', 'Approved')
            ->count();

        return [
            'user' => $user,
            'dashboard' => [
                'stats' => [
                    ['key' => 'publications', 'label' => 'Publications', 'value' => $publicationsCount],
                    ['key' => 'supervisions', 'label' => 'Supervisions', 'value' => $supervisionCount],
                    ['key' => 'grants', 'label' => 'Active Grants', 'value' => $activeGrantCount],
                    ['key' => 'verifiedLogs', 'label' => 'Verified Logs', 'value' => $verifiedLogsCount],
                ],
                'recentActivity' => array_slice($history, 0, 5),
            ],
            'profile' => $profile,
            'idCard' => [
                'latestRequest' => $this->fetchLatestIdCardRequest($staffId),
                'recentRequests' => $this->fetchIdCardRequests($staffId),
            ],
            'history' => $history,
            'notifications' => [
                'items' => $notifications,
                'unreadCount' => DB::table('staff_notification')->where('user_id', $userId)->where('is_read', 0)->count(),
            ],
            'referenceData' => [
                'ranks' => DB::table('ranks')->orderBy('name')->get()->map(fn ($row) => [
                    'id' => (int) $row->id,
                    'name' => (string) $row->name,
                    'level' => (int) $row->id,
                ])->all(),
                'courses' => DB::table('course')->orderBy('course_code')->get()->map(fn ($row) => [
                    'id' => (int) $row->course_id,
                    'code' => (string) $row->course_code,
                    'title' => (string) $row->course_title,
                    'level' => (int) ($row->level ?? 0),
                ])->all(),
                'platforms' => ['ORCID', 'Google Scholar', 'Scopus', 'ResearchGate'],
            ],
            'rolePermissions' => $this->getRolePermissions(),
            'systemSettings' => $this->getSystemSettings(),
        ];
    }

    public function getAdminPortalData(array $staffFilters = [], string $requestSearch = ''): array
    {
        return [
            'dashboard' => $this->adminDashboard(),
            'staff' => $this->listStaff($staffFilters),
            'colleges' => $this->listColleges(),
            'departments' => $this->listDepartments(),
            'ranks' => $this->listRanks(),
            'requests' => $this->requestsSummary($requestSearch),
            'rolePermissions' => $this->getRolePermissions(),
            'systemSettings' => $this->getSystemSettings(),
        ];
    }

    public function getSystemSettings(): array
    {
        $defaults = [
            'enable_appraisal_in_staff_sidebar' => false,
            'enable_audit_in_staff_sidebar' => false,
            'institution_name' => 'Federal University of Health Sciences, Otukpo',
            'portal_title' => 'Academic Staff Profile & Portfolio Management System',
            'academic_session' => '2024/2025',
            'support_email' => 'support@fuhso.edu.ng',
            'support_phone' => '+234 803 000 0000',
            'allow_public_directory' => true,
            'allow_cv_download' => true,
        ];

        try {
            DB::statement('CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(190) NOT NULL PRIMARY KEY,
                setting_value TEXT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');

            $rows = DB::table('system_settings')->get();
            $settings = [];
            foreach ($rows as $row) {
                $val = json_decode((string) $row->setting_value, true);
                $settings[(string) $row->setting_key] = $val !== null ? $val : $row->setting_value;
            }
            return array_merge($defaults, $settings);
        } catch (\Throwable $e) {
            $file = storage_path('app/system_settings.json');
            if (file_exists($file)) {
                $fromFile = json_decode(file_get_contents($file), true) ?? [];
                return array_merge($defaults, $fromFile);
            }
            return $defaults;
        }
    }

    public function saveSystemSettings(array $settings): array
    {
        try {
            DB::statement('CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(190) NOT NULL PRIMARY KEY,
                setting_value TEXT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');

            foreach ($settings as $key => $value) {
                $key = trim((string) $key);
                if ($key === '') {
                    continue;
                }
                $encodedValue = is_string($value) ? $value : json_encode($value);
                DB::table('system_settings')->updateOrInsert(
                    ['setting_key' => $key],
                    ['setting_value' => $encodedValue, 'updated_at' => now()]
                );
            }
        } catch (\Throwable $e) {
            $file = storage_path('app/system_settings.json');
            $dir = dirname($file);
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            $existing = file_exists($file) ? json_decode(file_get_contents($file), true) ?? [] : [];
            file_put_contents($file, json_encode(array_merge($existing, $settings)));
        }

        return $this->getSystemSettings();
    }

    public function getRolePermissions(): array
    {
        $rows = DB::table('role_permissions')->get();
        $result = [];
        foreach ($rows as $row) {
            $perms = json_decode((string) $row->permissions, true);
            $result[(string) $row->role_key] = is_array($perms) ? $perms : [];
        }
        return $result;
    }

    public function saveRolePermissions(array $permissions): array
    {
        foreach ($permissions as $roleKey => $perms) {
            $roleKey = trim((string) $roleKey);
            if ($roleKey === '') {
                continue;
            }
            DB::table('role_permissions')->updateOrInsert(
                ['role_key' => $roleKey],
                ['permissions' => json_encode($perms), 'updated_at' => now()]
            );
        }
        return $this->getRolePermissions();
    }


    public function updateProfile(int $userId, int $staffId, array $data, ?UploadedFile $profilePhoto = null): array
    {
        $current = (array) DB::table('staff')->where('staff_id', $staffId)->first();

        if (! $current) {
            throw new RuntimeException('Staff profile not found.');
        }

        $requestedRankId = (int) ($data['rank_id'] ?? 0);
        if ($requestedRankId > 0 && ! DB::table('ranks')->where('id', $requestedRankId)->exists()) {
            throw new RuntimeException('The selected academic rank is invalid.');
        }

        $directFields = [
            'title' => trim((string) ($data['title'] ?? '')),
            'first_name' => trim((string) ($data['first_name'] ?? '')),
            'middle_name' => trim((string) ($data['middle_name'] ?? '')),
            'last_name' => trim((string) ($data['last_name'] ?? '')),
            'gender' => trim((string) ($data['gender'] ?? '')),
            'date_of_birth' => ! empty($data['date_of_birth']) ? (string) $data['date_of_birth'] : null,
            'phone' => trim((string) ($data['phone'] ?? '')),
            'office_location' => trim((string) ($data['office_location'] ?? '')),
            'biography' => trim((string) ($data['biography'] ?? '')),
        ];

        $changes = [];
        foreach ($directFields as $field => $value) {
            $currentValue = $current[$field] ?? null;
            if ((string) ($currentValue ?? '') !== (string) ($value ?? '')) {
                $changes[$field] = $value;
            }
        }

        if ($profilePhoto) {
            $changes['profile_photo'] = $this->storeImageUpload($profilePhoto, 'uploads', 'staff_' . $staffId . '_');
        }

        $rankChangeRequested = $requestedRankId > 0 && $requestedRankId !== (int) ($current['rank_id'] ?? 0);

        if ($changes === [] && ! $rankChangeRequested) {
            throw new RuntimeException('No changes were detected.');
        }

        DB::transaction(function () use ($changes, $userId, $staffId, $rankChangeRequested, $requestedRankId): void {
            if ($changes !== []) {
                $changes['updated_at'] = now();
                DB::table('staff')->where('staff_id', $staffId)->update($changes);
                $this->createChangeLog($userId, 'staff', $staffId, $changes, 'UPDATE', 'Approved');
            }

            if ($rankChangeRequested) {
                $this->createChangeLog($userId, 'staff', $staffId, ['rank_id' => $requestedRankId], 'UPDATE', 'Pending');
            }
        });

        return [
            'message' => $rankChangeRequested
                ? 'Profile updated. Rank change has been submitted for admin approval.'
                : 'Profile updated successfully.',
        ];
    }

    public function createQualificationRequest(int $userId, int $staffId, array $data, UploadedFile $evidenceFile): void
    {
        $payload = [
            'staff_id' => $staffId,
            'degree' => trim((string) ($data['degree'] ?? '')),
            'field_of_study' => trim((string) ($data['field'] ?? '')),
            'institution' => trim((string) ($data['institution'] ?? '')),
            'country' => trim((string) ($data['country'] ?? '')),
            'year_awarded' => (int) ($data['year'] ?? 0),
            'evidence_file' => $this->storeEvidenceUpload($evidenceFile, 'qualification_' . $staffId . '_'),
        ];

        $this->createChangeLog($userId, 'qualification', $staffId, $payload, 'CREATE', 'Pending');
    }

    public function deleteQualificationRequest(int $userId, int $staffId, int $qualificationId): void
    {
        $qualification = (array) DB::table('qualification')
            ->where('qualification_id', $qualificationId)
            ->where('staff_id', $staffId)
            ->first();

        if (! $qualification) {
            throw new RuntimeException('Qualification not found.');
        }

        $this->createChangeLog($userId, 'qualification', $qualificationId, $qualification, 'DELETE', 'Pending');
    }

    public function createResearchAreaRequest(int $userId, int $staffId, string $areaName): void
    {
        $areaName = trim($areaName);
        if ($areaName === '') {
            throw new RuntimeException('Research area name is required.');
        }

        $this->createChangeLog($userId, 'research_area', $staffId, ['name' => $areaName], 'CREATE', 'Pending');
    }

    public function deleteResearchAreaRequest(int $userId, int $staffId, int $researchAreaId): void
    {
        $row = DB::table('staff_research_area as sra')
            ->join('research_area as ra', 'sra.research_area_id', '=', 'ra.research_area_id')
            ->where('sra.staff_id', $staffId)
            ->where('sra.research_area_id', $researchAreaId)
            ->select('ra.name')
            ->first();

        if (! $row) {
            throw new RuntimeException('Research area not found.');
        }

        $this->createChangeLog(
            $userId,
            'research_area',
            $staffId,
            ['research_area_id' => $researchAreaId, 'name' => (string) $row->name],
            'DELETE',
            'Pending'
        );
    }

    public function upsertPublication(int $userId, int $staffId, array $data, ?int $publicationId = null): void
    {
        $payload = [
            'title' => trim((string) ($data['title'] ?? '')),
            'publication_type' => trim((string) ($data['type'] ?? 'Journal')),
            'journal_or_venue' => trim((string) ($data['venue'] ?? '')),
            'publisher' => trim((string) ($data['publisher'] ?? 'N/A')),
            'year_published' => (int) ($data['year'] ?? date('Y')),
            'doi' => trim((string) ($data['doi'] ?? '')),
            'url' => trim((string) ($data['url'] ?? '')),
        ];

        DB::transaction(function () use ($userId, $staffId, $payload, $publicationId): void {
            if ($publicationId) {
                $exists = DB::table('staff_publication')
                    ->where('staff_id', $staffId)
                    ->where('publication_id', $publicationId)
                    ->exists();

                if (! $exists) {
                    throw new RuntimeException('Publication not found.');
                }

                DB::table('publication')->where('publication_id', $publicationId)->update($payload);
                $this->createChangeLog($userId, 'publication', $publicationId, $payload, 'UPDATE', 'Approved');

                return;
            }

            $publicationId = (int) DB::table('publication')->insertGetId($payload);
            DB::table('staff_publication')->insert([
                'staff_id' => $staffId,
                'publication_id' => $publicationId,
                'author_order' => 1,
            ]);
            $this->createChangeLog($userId, 'publication', $publicationId, $payload, 'CREATE', 'Approved');
        });
    }

    public function deletePublication(int $userId, int $staffId, int $publicationId): void
    {
        $publication = (array) DB::table('publication as p')
            ->join('staff_publication as sp', 'p.publication_id', '=', 'sp.publication_id')
            ->where('sp.staff_id', $staffId)
            ->where('p.publication_id', $publicationId)
            ->select('p.*')
            ->first();

        if (! $publication) {
            throw new RuntimeException('Publication not found.');
        }

        DB::transaction(function () use ($userId, $staffId, $publicationId, $publication): void {
            DB::table('staff_publication')
                ->where('staff_id', $staffId)
                ->where('publication_id', $publicationId)
                ->delete();

            $remainingLinks = DB::table('staff_publication')->where('publication_id', $publicationId)->count();
            if ($remainingLinks === 0) {
                DB::table('publication')->where('publication_id', $publicationId)->delete();
            }

            $this->createChangeLog($userId, 'publication', $publicationId, $publication, 'DELETE', 'Approved');
        });
    }

    public function linkCourse(int $userId, int $staffId, int $courseId, string $session): void
    {
        $session = trim($session);

        if ($courseId <= 0 || $session === '') {
            throw new RuntimeException('Course and session are required.');
        }

        $inserted = DB::table('staff_course')->insertOrIgnore([
            'staff_id' => $staffId,
            'course_id' => $courseId,
            'session' => $session,
        ]);

        if ($inserted === 0) {
            throw new RuntimeException('This course is already linked for the selected session.');
        }

        $this->createChangeLog($userId, 'staff_course', $staffId, [
            'course_id' => $courseId,
            'session' => $session,
        ], 'CREATE', 'Approved');
    }

    public function unlinkCourse(int $userId, int $staffId, int $courseId, string $session): void
    {
        $deleted = DB::table('staff_course')
            ->where('staff_id', $staffId)
            ->where('course_id', $courseId)
            ->where('session', $session)
            ->delete();

        if ($deleted === 0) {
            throw new RuntimeException('Course link not found.');
        }

        $this->createChangeLog($userId, 'staff_course', $staffId, [
            'course_id' => $courseId,
            'session' => $session,
        ], 'DELETE', 'Approved');
    }

    public function addGrant(int $userId, int $staffId, array $data): void
    {
        $payload = [
            'staff_id' => $staffId,
            'title' => trim((string) ($data['title'] ?? '')),
            'sponsor' => trim((string) ($data['sponsor'] ?? '')),
            'amount' => (float) preg_replace('/[^0-9.]/', '', (string) ($data['amount'] ?? '0')),
            'start_year' => (int) ($data['start'] ?? date('Y')),
            'end_year' => (int) ($data['end'] ?? date('Y')),
        ];

        $grantId = (int) DB::table('grant_project')->insertGetId($payload);
        $this->createChangeLog($userId, 'grant_project', $grantId, $payload, 'CREATE', 'Approved');
    }

    public function deleteGrant(int $userId, int $staffId, int $projectId): void
    {
        $grant = (array) DB::table('grant_project')
            ->where('project_id', $projectId)
            ->where('staff_id', $staffId)
            ->first();

        if (! $grant) {
            throw new RuntimeException('Grant record not found.');
        }

        DB::table('grant_project')
            ->where('project_id', $projectId)
            ->where('staff_id', $staffId)
            ->delete();

        $this->createChangeLog($userId, 'grant_project', $projectId, $grant, 'DELETE', 'Approved');
    }

    public function addSupervision(int $userId, int $staffId, array $data): void
    {
        $payload = [
            'staff_id' => $staffId,
            'student_name' => trim((string) ($data['student'] ?? '')),
            'degree' => trim((string) ($data['degree'] ?? 'MSc')),
            'thesis_title' => trim((string) ($data['title'] ?? '')),
            'status' => trim((string) ($data['status'] ?? 'Ongoing')),
            'year_started' => (int) ($data['start'] ?? date('Y')),
            'year_completed' => ! empty($data['end']) ? (int) $data['end'] : null,
        ];

        $supervisionId = (int) DB::table('supervision')->insertGetId($payload);
        $this->createChangeLog($userId, 'supervision', $supervisionId, $payload, 'CREATE', 'Approved');
    }

    public function deleteSupervision(int $userId, int $staffId, int $supervisionId): void
    {
        $row = (array) DB::table('supervision')
            ->where('supervision_id', $supervisionId)
            ->where('staff_id', $staffId)
            ->first();

        if (! $row) {
            throw new RuntimeException('Supervision record not found.');
        }

        DB::table('supervision')
            ->where('supervision_id', $supervisionId)
            ->where('staff_id', $staffId)
            ->delete();

        $this->createChangeLog($userId, 'supervision', $supervisionId, $row, 'DELETE', 'Approved');
    }

    public function createMembershipRequest(int $userId, int $staffId, array $data, UploadedFile $evidenceFile): void
    {
        $payload = [
            'staff_id' => $staffId,
            'body_name' => trim((string) ($data['body_name'] ?? '')),
            'membership_no' => trim((string) ($data['membership_no'] ?? '')),
            'role' => trim((string) ($data['role'] ?? '')),
            'evidence_file' => $this->storeEvidenceUpload($evidenceFile, 'membership_' . $staffId . '_'),
        ];

        $this->createChangeLog($userId, 'professional_membership', $staffId, $payload, 'CREATE', 'Pending');
    }

    public function deleteMembershipRequest(int $userId, int $staffId, int $membershipId): void
    {
        $membership = (array) DB::table('professional_membership')
            ->where('membership_id', $membershipId)
            ->where('staff_id', $staffId)
            ->first();

        if (! $membership) {
            throw new RuntimeException('Membership not found.');
        }

        $this->createChangeLog($userId, 'professional_membership', $membershipId, $membership, 'DELETE', 'Pending');
    }

    public function createExternalProfileRequest(int $userId, int $staffId, array $data): void
    {
        $platform = trim((string) ($data['platform'] ?? ''));
        if (! in_array($platform, ['ORCID', 'Google Scholar', 'Scopus', 'ResearchGate'], true)) {
            throw new RuntimeException('The selected platform is invalid.');
        }

        $payload = [
            'staff_id' => $staffId,
            'platform' => $platform,
            'profile_url' => trim((string) ($data['url'] ?? '')),
        ];

        $this->createChangeLog($userId, 'external_profile', $staffId, $payload, 'CREATE', 'Pending');
    }

    public function deleteExternalProfileRequest(int $userId, int $staffId, int $profileId): void
    {
        $profile = (array) DB::table('external_profile')
            ->where('profile_id', $profileId)
            ->where('staff_id', $staffId)
            ->first();

        if (! $profile) {
            throw new RuntimeException('External profile not found.');
        }

        $this->createChangeLog($userId, 'external_profile', $profileId, $profile, 'DELETE', 'Pending');
    }

    public function markNotificationRead(int $userId, int $notificationId): void
    {
        DB::table('staff_notification')
            ->where('notification_id', $notificationId)
            ->where('user_id', $userId)
            ->update([
                'is_read' => 1,
                'read_at' => now(),
            ]);
    }

    public function markAllNotificationsRead(int $userId): void
    {
        DB::table('staff_notification')
            ->where('user_id', $userId)
            ->where('is_read', 0)
            ->update([
                'is_read' => 1,
                'read_at' => now(),
            ]);
    }

    public function submitIdCardRequest(int $userId, int $staffId, array $data): array
    {
        $requestType = trim((string) ($data['request_type'] ?? 'Replacement'));
        $reason = trim((string) ($data['reason'] ?? ''));

        if ($reason === '') {
            throw new RuntimeException('Please provide the reason for this ID card request.');
        }

        $requestedAt = Carbon::now();

        $requestId = (int) DB::table('staff_id_card_request')->insertGetId([
            'user_id' => $userId,
            'staff_id' => $staffId,
            'request_type' => $requestType,
            'reason' => $reason,
            'status' => 'Pending',
            'requested_at' => $requestedAt,
            'created_at' => $requestedAt,
            'updated_at' => $requestedAt,
        ]);

        DB::table('staff_notification')->insert([
            'user_id' => $userId,
            'log_id' => null,
            'title' => 'ID Card Request Submitted',
            'message' => "Your {$requestType} ID card request is now pending review.",
            'target_url' => '/staff/id-card',
            'is_read' => 0,
        ]);

        return $this->fetchLatestIdCardRequest($staffId) ?? [
            'requestId' => $requestId,
            'requestType' => $requestType,
            'reason' => $reason,
            'status' => 'Pending',
            'adminComment' => '',
            'requestedAt' => $requestedAt->toDateTimeString(),
            'processedAt' => null,
        ];
    }

    public function createStaffAccount(array $data): array
    {
        $firstName = trim((string) ($data['first_name'] ?? ''));
        $lastName = trim((string) ($data['last_name'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $staffNumber = trim((string) ($data['staff_number'] ?? ''));
        $departmentId = (int) ($data['department_id'] ?? 0);
        $rankId = (int) ($data['rank_id'] ?? 0);

        if ($firstName === '' || $lastName === '' || $email === '' || $staffNumber === '' || $departmentId <= 0 || $rankId <= 0) {
            throw new RuntimeException('Please complete all required staff fields.');
        }

        $duplicate = DB::table('staff')
            ->where('email', $email)
            ->orWhere('staff_number', $staffNumber)
            ->exists();

        if ($duplicate) {
            throw new RuntimeException('A staff member with this email or staff number already exists.');
        }

        $username = $this->generateUniqueUsername($firstName, $lastName);
        $temporaryPassword = $this->generateTemporaryPassword();

        DB::transaction(function () use ($staffNumber, $firstName, $lastName, $email, $departmentId, $rankId, $username, $temporaryPassword): void {
            $staffId = (int) DB::table('staff')->insertGetId([
                'staff_number' => $staffNumber,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'department_id' => $departmentId,
                'rank_id' => $rankId,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('user_account')->insert([
                'staff_id' => $staffId,
                'username' => $username,
                'password' => Hash::make($temporaryPassword),
                'role' => 'Staff',
                'is_active' => 1,
                'must_change_password' => 1,
            ]);
        });

        $emailSent = $this->sendNewAccountEmail(
            $email,
            trim($firstName . ' ' . $lastName),
            $username,
            $temporaryPassword,
            rtrim((string) config('app.frontend_url'), '/') . '/login'
        );

        return [
            'message' => $emailSent
                ? 'Staff account created and credentials emailed successfully.'
                : 'Staff account created, but email delivery failed. Share the temporary credentials manually.',
            'username' => $username,
            'temporaryPassword' => $emailSent ? null : $temporaryPassword,
        ];
    }

    public function updateStaffAccount(int $staffId, array $data): array
    {
        $staff = DB::table('staff')->where('staff_id', $staffId)->first();
        if (! $staff) {
            throw new RuntimeException('Staff record not found.');
        }

        $firstName = trim((string) ($data['first_name'] ?? $staff->first_name));
        $lastName = trim((string) ($data['last_name'] ?? $staff->last_name));
        $otherName = array_key_exists('other_name', $data) ? trim((string) $data['other_name']) : $staff->other_name;
        $pfNumber = array_key_exists('pf_number', $data) && trim((string) $data['pf_number']) !== ''
            ? trim((string) $data['pf_number'])
            : (trim((string) ($data['staff_number'] ?? '')) !== '' ? trim((string) $data['staff_number']) : ($staff->pf_number ?? $staff->staff_number));
        $email = array_key_exists('email', $data) ? trim((string) $data['email']) : $staff->email;
        $phone = array_key_exists('phone', $data) ? trim((string) $data['phone']) : $staff->phone;

        $category = array_key_exists('category', $data) && in_array(strtoupper(trim((string) $data['category'])), ['SENIOR', 'JUNIOR'], true)
            ? strtoupper(trim((string) $data['category']))
            : ($staff->category ?? 'SENIOR');

        $deptString = array_key_exists('department', $data) ? trim((string) $data['department']) : $staff->department;
        $rankString = array_key_exists('rank', $data) ? trim((string) $data['rank']) : $staff->rank;
        $deptId = isset($data['department_id']) && (int) $data['department_id'] > 0 ? (int) $data['department_id'] : $staff->department_id;
        $rankId = isset($data['rank_id']) && (int) $data['rank_id'] > 0 ? (int) $data['rank_id'] : $staff->rank_id;

        $updateData = [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'other_name' => $otherName !== '' ? $otherName : null,
            'middle_name' => $otherName !== '' ? $otherName : null,
            'pf_number' => $pfNumber,
            'staff_number' => $pfNumber,
            'category' => $category,
            'email' => $email !== '' ? $email : null,
            'phone' => $phone !== '' ? $phone : null,
            'department' => $deptString !== '' ? $deptString : null,
            'rank' => $rankString !== '' ? $rankString : null,
            'department_id' => $deptId,
            'rank_id' => $rankId,
            'updated_at' => now(),
        ];

        DB::table('staff')->where('staff_id', $staffId)->update($updateData);

        // Update linked user_account if role or is_active is specified
        $account = DB::table('user_account')->where('staff_id', $staffId)->first();
        if ($account) {
            $accountUpdates = [];
            if (isset($data['role']) && in_array($data['role'], ['Staff', 'Moderator', 'Admin'], true)) {
                $accountUpdates['role'] = $data['role'];
            }
            if (isset($data['is_active'])) {
                $accountUpdates['is_active'] = (int) $data['is_active'];
            }
            if (! empty($accountUpdates)) {
                DB::table('user_account')->where('user_id', (int) $account->user_id)->update($accountUpdates);
            }
        } elseif (isset($data['role']) && in_array($data['role'], ['Staff', 'Moderator', 'Admin'], true)) {
            $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string) $pfNumber));
            if ($baseUsername === '') {
                $baseUsername = strtolower($firstName . '.' . $lastName);
            }
            $username = $baseUsername;
            $counter = 1;
            while (DB::table('user_account')->where('username', $username)->exists()) {
                $username = $baseUsername . $counter;
                $counter++;
            }
            $initPass = $phone !== '' ? $phone : '12345678';
            DB::table('user_account')->insert([
                'staff_id' => $staffId,
                'username' => $username,
                'password' => Hash::make($initPass),
                'role' => $data['role'],
                'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : 1,
                'must_change_password' => 1,
            ]);
        }

        return [
            'message' => 'Staff information updated successfully.',
            'item' => $this->fetchStaffAccessItem($staffId),
        ];
    }

    public function assignStaffRole(int $adminUserId, int $staffId, string $role): array
    {
        $role = trim($role);
        if (! in_array($role, ['Staff', 'Moderator', 'Admin'], true)) {
            throw new RuntimeException('The selected role is invalid.');
        }

        $staff = $this->fetchStaffIdentity($staffId);
        $account = $this->fetchStaffAccount($staffId);

        if ($account) {
            $this->assertCanManageAccount($adminUserId, (int) $account['user_id']);
            $this->ensureAdminPortalCoverage((int) $account['user_id'], $role, (bool) $account['is_active']);

            DB::table('user_account')
                ->where('user_id', (int) $account['user_id'])
                ->update([
                    'role' => $role,
                ]);

            return [
                'message' => $account['role'] === $role
                    ? 'Role already assigned to this account.'
                    : 'Account role updated successfully.',
                'item' => $this->fetchStaffAccessItem($staffId),
            ];
        }

        $username = $this->generateUniqueUsername((string) $staff['first_name'], (string) $staff['last_name']);
        $temporaryPassword = $this->generateTemporaryPassword();

        DB::table('user_account')->insert([
            'staff_id' => $staffId,
            'username' => $username,
            'password' => Hash::make($temporaryPassword),
            'role' => $role,
            'is_active' => 1,
            'must_change_password' => 1,
        ]);

        $emailSent = $this->sendNewAccountEmail(
            (string) $staff['email'],
            trim(((string) $staff['first_name']) . ' ' . ((string) $staff['last_name'])),
            $username,
            $temporaryPassword,
            rtrim((string) config('app.frontend_url'), '/') . '/login'
        );

        return [
            'message' => $emailSent
                ? 'Account created, role assigned, and login credentials sent successfully.'
                : 'Account created and role assigned, but email delivery failed.',
            'item' => $this->fetchStaffAccessItem($staffId),
            'username' => $username,
            'temporaryPassword' => $emailSent ? null : $temporaryPassword,
        ];
    }

    public function deactivateStaffAccount(int $adminUserId, int $staffId): array
    {
        $account = $this->requireStaffAccount($staffId);
        $this->assertCanManageAccount($adminUserId, (int) $account['user_id']);
        $this->ensureAdminPortalCoverage((int) $account['user_id'], (string) $account['role'], false);

        DB::table('user_account')
            ->where('user_id', (int) $account['user_id'])
            ->update([
                'is_active' => 0,
            ]);

        return [
            'message' => 'Account deactivated successfully.',
            'item' => $this->fetchStaffAccessItem($staffId),
        ];
    }

    public function reactivateStaffAccount(int $adminUserId, int $staffId): array
    {
        $account = $this->requireStaffAccount($staffId);
        $this->assertCanManageAccount($adminUserId, (int) $account['user_id']);

        DB::table('user_account')
            ->where('user_id', (int) $account['user_id'])
            ->update([
                'is_active' => 1,
            ]);

        return [
            'message' => 'Account reactivated successfully.',
            'item' => $this->fetchStaffAccessItem($staffId),
        ];
    }

    public function forceStaffPasswordReset(int $adminUserId, int $staffId): array
    {
        $staff = DB::table('staff')->where('staff_id', $staffId)->first();
        if (! $staff) {
            throw new RuntimeException('Staff record not found.');
        }

        $phone = trim((string) ($staff->phone ?? ''));
        $digits = preg_replace('/[^0-9]/', '', $phone);
        $resetPassword = $digits !== '' ? $phone : '12345678';

        $account = $this->fetchStaffAccount($staffId);

        if (! $account) {
            $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string) ($staff->pf_number ?? $staff->staff_number)));
            if ($baseUsername === '') {
                $baseUsername = strtolower(trim($staff->first_name . '.' . $staff->last_name));
            }
            $username = $baseUsername;
            $counter = 1;
            while (DB::table('user_account')->where('username', $username)->exists()) {
                $username = $baseUsername . $counter;
                $counter++;
            }
            DB::table('user_account')->insert([
                'staff_id' => $staffId,
                'username' => $username,
                'password' => Hash::make($resetPassword),
                'role' => 'Staff',
                'is_active' => 1,
                'must_change_password' => 1,
            ]);
        } else {
            $this->assertCanManageAccount($adminUserId, (int) $account['user_id']);

            DB::table('user_account')
                ->where('user_id', (int) $account['user_id'])
                ->update([
                    'password' => Hash::make($resetPassword),
                    'must_change_password' => 1,
                    'is_active' => 1,
                ]);
        }

        return [
            'message' => $digits !== ''
                ? "Password has been reset to staff phone number ({$phone}). Staff will be required to change their password on next login."
                : "Password reset enforced. Staff will be required to change their password on next login.",
            'item' => $this->fetchStaffAccessItem($staffId),
        ];
    }

    public function resendStaffInvite(int $adminUserId, int $staffId): array
    {
        $account = $this->requireStaffAccount($staffId);
        $this->assertCanManageAccount($adminUserId, (int) $account['user_id']);

        $temporaryPassword = $this->generateTemporaryPassword();

        DB::table('user_account')
            ->where('user_id', (int) $account['user_id'])
            ->update([
                'password' => Hash::make($temporaryPassword),
                'must_change_password' => 1,
                'is_active' => 1,
            ]);

        $emailSent = $this->sendNewAccountEmail(
            (string) ($account['email'] ?? ''),
            trim(((string) ($account['first_name'] ?? '')) . ' ' . ((string) ($account['last_name'] ?? ''))),
            (string) ($account['username'] ?? ''),
            $temporaryPassword,
            rtrim((string) config('app.frontend_url'), '/') . '/login'
        );

        return [
            'message' => $emailSent
                ? 'Invite resent successfully with refreshed login credentials.'
                : 'Invite refreshed, but email delivery failed.',
            'item' => $this->fetchStaffAccessItem($staffId),
            'username' => (string) ($account['username'] ?? ''),
            'temporaryPassword' => $emailSent ? null : $temporaryPassword,
        ];
    }

    public function unlockStaffAccount(int $adminUserId, int $staffId): array
    {
        $account = $this->requireStaffAccount($staffId);
        $this->assertCanManageAccount($adminUserId, (int) $account['user_id']);

        DB::table('user_account')
            ->where('user_id', (int) $account['user_id'])
            ->update([
                'is_active' => 1,
                'must_change_password' => 1,
            ]);

        return [
            'message' => 'Account unlocked. Sign-in access has been restored and a password update will be required.',
            'item' => $this->fetchStaffAccessItem($staffId),
        ];
    }

    public function deleteStaff(int $staffId): void
    {
        DB::transaction(function () use ($staffId): void {
            DB::table('user_account')->where('staff_id', $staffId)->delete();
            $deleted = DB::table('staff')->where('staff_id', $staffId)->delete();

            if ($deleted === 0) {
                throw new RuntimeException('Staff record not found.');
            }
        });
    }

    public function saveCollege(?int $collegeId, string $name): array
    {
        $name = trim($name);
        if ($name === '') {
            throw new RuntimeException('College name is required.');
        }

        if ($collegeId) {
            DB::table('college')->where('college_id', $collegeId)->update(['name' => $name]);
        } else {
            $collegeId = (int) DB::table('college')->insertGetId(['name' => $name]);
        }

        $row = DB::table('college')->where('college_id', $collegeId)->first();

        return [
            'id' => (int) $row->college_id,
            'name' => (string) $row->name,
        ];
    }

    public function deleteCollege(int $collegeId): void
    {
        DB::table('college')->where('college_id', $collegeId)->delete();
    }

    public function saveDepartment(?int $departmentId, string $name, int $collegeId): array
    {
        $name = trim($name);
        if ($name === '' || $collegeId <= 0) {
            throw new RuntimeException('Department name and college are required.');
        }

        if ($departmentId) {
            DB::table('department')->where('department_id', $departmentId)->update([
                'name' => $name,
                'college_id' => $collegeId,
            ]);
        } else {
            $departmentId = (int) DB::table('department')->insertGetId([
                'name' => $name,
                'college_id' => $collegeId,
            ]);
        }

        $row = DB::table('department as d')
            ->leftJoin('college as c', 'd.college_id', '=', 'c.college_id')
            ->where('d.department_id', $departmentId)
            ->select('d.department_id', 'd.name as department_name', 'd.college_id', 'c.name as college_name')
            ->first();

        return [
            'id' => (int) $row->department_id,
            'name' => (string) $row->department_name,
            'collegeId' => (int) $row->college_id,
            'collegeName' => (string) ($row->college_name ?? ''),
        ];
    }

    public function deleteDepartment(int $departmentId): void
    {
        DB::table('department')->where('department_id', $departmentId)->delete();
    }

    public function saveRank(?int $rankId, string $name, int $level): array
    {
        $name = trim($name);
        if ($name === '') {
            throw new RuntimeException('Rank name is required.');
        }

        if ($rankId) {
            DB::table('ranks')->where('id', $rankId)->update([
                'name' => $name,
                'updated_at' => now(),
            ]);
        } else {
            $rankId = (int) DB::table('ranks')->insertGetId([
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $row = DB::table('ranks')->where('id', $rankId)->first();

        return [
            'id' => (int) $row->id,
            'name' => (string) $row->name,
            'level' => (int) $row->id,
        ];
    }

    public function deleteRank(int $rankId): void
    {
        DB::table('ranks')->where('id', $rankId)->delete();
    }

    public function requestHistory(int $staffId): array
    {
        $staff = DB::table('staff')
            ->select('staff_id', 'first_name', 'last_name', 'staff_number')
            ->where('staff_id', $staffId)
            ->first();

        if (! $staff) {
            throw new RuntimeException('Staff record not found.');
        }

        $logs = DB::table('change_log as cl')
            ->join('user_account as ua', 'cl.user_id', '=', 'ua.user_id')
            ->where('ua.staff_id', $staffId)
            ->orderByDesc('cl.timestamp')
            ->select('cl.*', 'ua.username')
            ->get()
            ->map(function ($log) use ($staffId) {
                $data = (array) $log;
                $data['comparison'] = $this->buildRequestComparison($data, $staffId);

                return $data;
            })
            ->all();

        return [
            'staff' => [
                'staffId' => (int) $staff->staff_id,
                'name' => trim($staff->first_name . ' ' . $staff->last_name),
                'staffNumber' => (string) $staff->staff_number,
            ],
            'logs' => $logs,
        ];
    }

    public function requestDetail(int $logId): array
    {
        $log = DB::table('change_log as cl')
            ->leftJoin('user_account as ua', 'cl.user_id', '=', 'ua.user_id')
            ->leftJoin('staff as s', 'ua.staff_id', '=', 's.staff_id')
            ->where('cl.log_id', $logId)
            ->select('cl.*', 'ua.username', 's.staff_id', 's.first_name', 's.last_name', 's.staff_number', 's.profile_photo')
            ->first();

        if (! $log) {
            throw new RuntimeException('Request not found.');
        }

        $data = (array) $log;
        $data['comparison'] = $this->buildRequestComparison($data, (int) ($log->staff_id ?? 0));

        return [
            'staff' => $this->mapStaffAccessRow((object) $staffRow),
            'log' => $this->mapAuditLogDetailRow((object) $logRow),
        ];
    }

    public function approveAllRequests(int $adminUserId): void
    {
        $pendingLogs = DB::table('audit_log')
            ->where('status', 'Pending')
            ->get();

        foreach ($pendingLogs as $log) {
            $this->decideRequest($adminUserId, (int) $log->log_id, 'approve', '');
        }
    }

    public function decideRequest(int $adminUserId, int $logId, string $decision, string $rejectionReason): void
    {
        $log = (array) DB::table('change_log')->where('log_id', $logId)->first();

        if (! $log) {
            throw new RuntimeException('Request not found.');
        }

        if (($log['status'] ?? '') !== 'Pending') {
            throw new RuntimeException('This request has already been processed.');
        }

        if ($decision === 'reject') {
            if (trim($rejectionReason) === '') {
                throw new RuntimeException('A rejection reason is required.');
            }

            $update = ['status' => 'Rejected'];
            if (LegacySchemaManager::columnExists($this->db, 'change_log', 'admin_comment')) {
                $update['admin_comment'] = trim($rejectionReason);
            }

            DB::table('change_log')->where('log_id', $logId)->update($update);
            $log['log_id'] = $logId;
            $this->createDecisionNotification($log, 'Rejected', $rejectionReason);

            return;
        }

        DB::transaction(function () use ($logId, $log): void {
            $this->applyPendingRequest($log);

            $update = ['status' => 'Approved'];
            if (LegacySchemaManager::columnExists($this->db, 'change_log', 'admin_comment')) {
                $update['admin_comment'] = null;
            }

            DB::table('change_log')->where('log_id', $logId)->update($update);
        });

        $log['log_id'] = $logId;
        $this->createDecisionNotification($log, 'Approved');
        $this->sendApprovalDecisionEmail($log);
    }

    private function adminDashboard(): array
    {
        return [
            'stats' => [
                'pending' => DB::table('change_log')->where('status', 'Pending')->count(),
                'staff' => DB::table('staff')->where('is_active', 1)->count(),
                'publications' => DB::table('publication')->count(),
            ],
            'pendingQueue' => DB::table('change_log as cl')
                ->leftJoin('user_account as ua', 'cl.user_id', '=', 'ua.user_id')
                ->leftJoin('staff as s', 'ua.staff_id', '=', 's.staff_id')
                ->where('cl.status', 'Pending')
                ->orderBy('cl.timestamp')
                ->limit(5)
                ->select('cl.log_id', 'cl.entity_name', 'cl.action', 'cl.timestamp', 's.first_name', 's.last_name')
                ->get()
                ->map(fn ($row) => [
                    'logId' => (int) $row->log_id,
                    'entityName' => (string) $row->entity_name,
                    'action' => (string) $row->action,
                    'timestamp' => (string) $row->timestamp,
                    'staffName' => trim(((string) $row->first_name) . ' ' . ((string) $row->last_name)),
                ])
                ->all(),
        ];
    }

    private function listStaff(array $filters = []): array
    {
        $query = DB::table('staff as s')
            ->leftJoin('department as d', 's.department_id', '=', 'd.department_id')
            ->leftJoin('ranks as r', 's.rank_id', '=', 'r.id')
            ->leftJoin('user_account as ua', 's.staff_id', '=', 'ua.staff_id')
            ->select(
                's.staff_id',
                's.staff_number',
                's.pf_number',
                's.first_name',
                's.last_name',
                's.other_name',
                's.category',
                's.email',
                's.phone',
                's.department as raw_department',
                's.rank as raw_rank',
                's.passport',
                's.signature',
                's.profile_photo',
                's.department_id',
                's.rank_id',
                'd.name as department_name',
                'r.name as rank_name',
                'ua.user_id as account_user_id',
                'ua.username',
                'ua.role',
                'ua.is_active as account_is_active',
                'ua.must_change_password'
            );

        $search = trim((string) ($filters['search'] ?? ''));
        $departmentId = (int) ($filters['department_id'] ?? 0);
        $rankId = (int) ($filters['rank_id'] ?? 0);
        $role = trim((string) ($filters['role'] ?? ''));

        if ($search !== '') {
            $query->where(function ($subQuery) use ($search): void {
                $subQuery
                    ->where('s.first_name', 'like', '%' . $search . '%')
                    ->orWhere('s.last_name', 'like', '%' . $search . '%')
                    ->orWhere('s.other_name', 'like', '%' . $search . '%')
                    ->orWhere('s.email', 'like', '%' . $search . '%')
                    ->orWhere('s.pf_number', 'like', '%' . $search . '%')
                    ->orWhere('s.staff_number', 'like', '%' . $search . '%')
                    ->orWhere('s.phone', 'like', '%' . $search . '%');
            });
        }

        if ($departmentId > 0) {
            $query->where('s.department_id', $departmentId);
        }

        if ($rankId > 0) {
            $query->where('s.rank_id', $rankId);
        }

        if ($role === 'NULL') {
            $query->whereNull('ua.role');
        } elseif ($role !== '') {
            $query->where('ua.role', $role);
        }

        return [
            'items' => $query
                ->orderByDesc('s.created_at')
                ->get()
                ->map(fn ($row) => $this->mapStaffAccessRow($row))
                ->all(),
            'filters' => [
                'departments' => $this->listDepartments(),
                'ranks' => $this->listRanks(),
                'categories' => $this->listStaffCategories(),
            ],
        ];
    }

    private function listColleges(): array
    {
        return DB::table('college')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->college_id,
                'name' => (string) $row->name,
            ])
            ->all();
    }

    private function listDepartments(): array
    {
        return DB::table('department as d')
            ->leftJoin('college as c', 'd.college_id', '=', 'c.college_id')
            ->orderBy('d.name')
            ->select('d.department_id', 'd.name as department_name', 'd.college_id', 'c.name as college_name')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->department_id,
                'name' => (string) $row->department_name,
                'collegeId' => (int) $row->college_id,
                'collegeName' => (string) ($row->college_name ?? ''),
            ])
            ->all();
    }

    private function listRanks(): array
    {
        return DB::table('ranks')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => (string) $row->name,
                'level' => (int) $row->id,
                'category_id' => (int) $row->staff_category_id,
            ])
            ->all();
    }

    private function listStaffCategories(): array
    {
        return DB::table('staff_categories')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => (string) $row->name,
            ])
            ->all();
    }

    private function requestsSummary(string $search = ''): array
    {
        $query = DB::table('change_log as cl')
            ->join('user_account as ua', 'cl.user_id', '=', 'ua.user_id')
            ->join('staff as s', 'ua.staff_id', '=', 's.staff_id')
            ->selectRaw(
                's.staff_id, s.first_name, s.last_name, s.staff_number,
                COUNT(cl.log_id) as total_requests,
                SUM(CASE WHEN cl.status = "Pending" THEN 1 ELSE 0 END) as pending_requests,
                MAX(cl.timestamp) as last_request_at'
            )
            ->groupBy('s.staff_id', 's.first_name', 's.last_name', 's.staff_number')
            ->orderByDesc('last_request_at');

        if ($search !== '') {
            $query->where(function ($subQuery) use ($search): void {
                $subQuery
                    ->where('s.first_name', 'like', '%' . $search . '%')
                    ->orWhere('s.last_name', 'like', '%' . $search . '%')
                    ->orWhere('s.staff_number', 'like', '%' . $search . '%');
            });
        }

        return $query->get()->map(fn ($row) => [
            'staffId' => (int) $row->staff_id,
            'name' => trim($row->first_name . ' ' . $row->last_name),
            'staffNumber' => (string) $row->staff_number,
            'totalRequests' => (int) $row->total_requests,
            'pendingRequests' => (int) $row->pending_requests,
            'lastRequestAt' => (string) $row->last_request_at,
        ])->all();
    }

    private function fetchProfileBundle(int $staffId): array
    {
        $staff = DB::table('staff as s')
            ->leftJoin('ranks as r', 's.rank_id', '=', 'r.id')
            ->leftJoin('department as d', 's.department_id', '=', 'd.department_id')
            ->leftJoin('college as c', 'd.college_id', '=', 'c.college_id')
            ->where('s.staff_id', $staffId)
            ->where('s.is_active', 1)
            ->selectRaw(
                's.*, r.name as rank_name, d.name as department_name, c.name as college_name'
            )
            ->first();

        if (! $staff) {
            throw new RuntimeException('Staff profile not found.');
        }

        return [
            'staff' => $this->normalizeStaffProfile((array) $staff),
            'qualifications' => DB::table('qualification')->where('staff_id', $staffId)->orderByDesc('year_awarded')->get()->map(function ($row) {
                $data = (array) $row;
                $data['evidence_url'] = $this->evidenceUrl($data['evidence_file'] ?? null);

                return $data;
            })->all(),
            'researchAreas' => DB::table('staff_research_area as sra')
                ->join('research_area as ra', 'sra.research_area_id', '=', 'ra.research_area_id')
                ->where('sra.staff_id', $staffId)
                ->orderBy('ra.name')
                ->select('ra.research_area_id', 'ra.name')
                ->get()
                ->map(fn ($row) => [
                    'research_area_id' => (int) $row->research_area_id,
                    'name' => (string) $row->name,
                ])
                ->all(),
            'publications' => DB::table('staff_publication as sp')
                ->join('publication as p', 'sp.publication_id', '=', 'p.publication_id')
                ->where('sp.staff_id', $staffId)
                ->orderByDesc('p.year_published')
                ->select('p.*', 'sp.author_order')
                ->get()
                ->map(fn ($row) => (array) $row)
                ->all(),
            'courses' => DB::table('staff_course as sc')
                ->join('course as c', 'sc.course_id', '=', 'c.course_id')
                ->where('sc.staff_id', $staffId)
                ->orderByDesc('sc.session')
                ->orderBy('c.course_code')
                ->select('sc.staff_id', 'sc.course_id', 'sc.session', 'c.course_code', 'c.course_title', 'c.level')
                ->get()
                ->map(fn ($row) => (array) $row)
                ->all(),
            'supervisions' => DB::table('supervision')->where('staff_id', $staffId)->orderByDesc('year_started')->get()->map(fn ($row) => (array) $row)->all(),
            'grants' => DB::table('grant_project')->where('staff_id', $staffId)->orderByDesc('start_year')->get()->map(fn ($row) => (array) $row)->all(),
            'memberships' => DB::table('professional_membership')->where('staff_id', $staffId)->orderBy('body_name')->get()->map(function ($row) {
                $data = (array) $row;
                $data['evidence_url'] = $this->evidenceUrl($data['evidence_file'] ?? null);

                return $data;
            })->all(),
            'externalProfiles' => DB::table('external_profile')->where('staff_id', $staffId)->get()->map(fn ($row) => (array) $row)->all(),
        ];
    }

    private function normalizeStaffProfile(array $staff): array
    {
        $staff['profile_photo_url'] = $this->fileUrl('uploads/' . ltrim((string) ($staff['profile_photo'] ?? ''), '/'));
        $staff['full_name'] = trim(((string) ($staff['title'] ?? '')) . ' ' . ((string) ($staff['first_name'] ?? '')) . ' ' . ((string) ($staff['last_name'] ?? '')));

        return $staff;
    }

    private function applyPendingChanges(array $profile, int $userId): array
    {
        $pendingLogs = DB::table('change_log')
            ->where('user_id', $userId)
            ->where('status', 'Pending')
            ->orderBy('log_id')
            ->get()
            ->map(fn ($row) => (array) $row)
            ->all();

        foreach ($pendingLogs as $log) {
            $entity = (string) ($log['entity_name'] ?? '');
            $action = (string) ($log['action'] ?? '');
            $entityId = (int) ($log['entity_id'] ?? 0);
            $payload = $this->decodePayload($log['change_payload'] ?? null);

            if ($entity === 'staff' && $action === 'UPDATE') {
                foreach ($payload as $key => $value) {
                    $profile['staff'][$key] = $value;
                }
                $profile['staff'] = $this->normalizeStaffProfile($profile['staff']);
                continue;
            }

            if ($entity === 'publication') {
                if ($action === 'CREATE' || $action === 'UPDATE') {
                    $profile['publications'][] = array_merge(['publication_id' => 0], $payload);
                } elseif ($action === 'DELETE') {
                    $profile['publications'] = array_values(array_filter(
                        $profile['publications'],
                        fn ($item) => (string) ($item['publication_id'] ?? '') !== (string) $entityId
                    ));
                }
                continue;
            }

            if ($entity === 'qualification') {
                if ($action === 'CREATE' || $action === 'UPDATE') {
                    $payload['evidence_url'] = $this->evidenceUrl($payload['evidence_file'] ?? null);
                    $profile['qualifications'][] = array_merge(['qualification_id' => 0], $payload);
                } elseif ($action === 'DELETE') {
                    $profile['qualifications'] = array_values(array_filter(
                        $profile['qualifications'],
                        fn ($item) => (string) ($item['qualification_id'] ?? '') !== (string) $entityId
                    ));
                }
                continue;
            }

            if ($entity === 'grant_project') {
                if ($action === 'CREATE' || $action === 'UPDATE') {
                    $profile['grants'][] = array_merge(['project_id' => 0], $payload);
                } elseif ($action === 'DELETE') {
                    $profile['grants'] = array_values(array_filter(
                        $profile['grants'],
                        fn ($item) => (string) ($item['project_id'] ?? '') !== (string) $entityId
                    ));
                }
                continue;
            }

            if ($entity === 'supervision') {
                if ($action === 'CREATE' || $action === 'UPDATE') {
                    $profile['supervisions'][] = array_merge(['supervision_id' => 0], $payload);
                } elseif ($action === 'DELETE') {
                    $profile['supervisions'] = array_values(array_filter(
                        $profile['supervisions'],
                        fn ($item) => (string) ($item['supervision_id'] ?? '') !== (string) $entityId
                    ));
                }
                continue;
            }

            if ($entity === 'professional_membership') {
                if ($action === 'CREATE' || $action === 'UPDATE') {
                    $payload['evidence_url'] = $this->evidenceUrl($payload['evidence_file'] ?? null);
                    $profile['memberships'][] = array_merge(['membership_id' => 0], $payload);
                } elseif ($action === 'DELETE') {
                    $profile['memberships'] = array_values(array_filter(
                        $profile['memberships'],
                        fn ($item) => (string) ($item['membership_id'] ?? '') !== (string) $entityId
                    ));
                }
                continue;
            }

            if ($entity === 'external_profile') {
                if ($action === 'CREATE' || $action === 'UPDATE') {
                    $profile['externalProfiles'][] = array_merge(['profile_id' => 0], $payload);
                } elseif ($action === 'DELETE') {
                    $profile['externalProfiles'] = array_values(array_filter(
                        $profile['externalProfiles'],
                        fn ($item) => (string) ($item['profile_id'] ?? '') !== (string) $entityId
                    ));
                }
                continue;
            }

            if ($entity === 'research_area') {
                if (($action === 'CREATE' || $action === 'UPDATE') && ! empty($payload['name'])) {
                    $profile['researchAreas'][] = [
                        'research_area_id' => 0,
                        'name' => (string) $payload['name'],
                    ];
                } elseif ($action === 'DELETE') {
                    $target = (string) ($payload['name'] ?? '');
                    $profile['researchAreas'] = array_values(array_filter(
                        $profile['researchAreas'],
                        fn ($item) => (string) ($item['name'] ?? '') !== $target
                    ));
                }
                continue;
            }

            if ($entity === 'staff_course') {
                if ($action === 'CREATE' || $action === 'UPDATE') {
                    $course = DB::table('course')->where('course_id', (int) ($payload['course_id'] ?? 0))->first();
                    if ($course) {
                        $profile['courses'][] = [
                            'staff_id' => (int) $profile['staff']['staff_id'],
                            'course_id' => (int) $course->course_id,
                            'session' => (string) ($payload['session'] ?? ''),
                            'course_code' => (string) $course->course_code,
                            'course_title' => (string) $course->course_title,
                            'level' => (int) ($course->level ?? 0),
                        ];
                    }
                } elseif ($action === 'DELETE') {
                    $profile['courses'] = array_values(array_filter($profile['courses'], function ($item) use ($payload): bool {
                        return ! (
                            (string) ($item['course_id'] ?? '') === (string) ($payload['course_id'] ?? '')
                            && (string) ($item['session'] ?? '') === (string) ($payload['session'] ?? '')
                        );
                    }));
                }
            }
        }

        return $profile;
    }

    private function fetchUserHistory(int $userId): array
    {
        return DB::table('change_log')
            ->where('user_id', $userId)
            ->orderByDesc('timestamp')
            ->get()
            ->map(function ($row) {
                $data = (array) $row;
                $data['entity_label'] = $this->entityLabel((string) ($data['entity_name'] ?? ''));
                $data['comparison'] = $this->buildRequestComparison($data);

                return $data;
            })
            ->all();
    }

    private function fetchNotifications(int $userId, int $limit = 8): array
    {
        return DB::table('staff_notification')
            ->where('user_id', $userId)
            ->orderByDesc('notification_id')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'notificationId' => (int) $row->notification_id,
                'title' => (string) $row->title,
                'message' => (string) ($row->message ?? ''),
                'targetUrl' => (string) $row->target_url,
                'isRead' => (bool) $row->is_read,
                'createdAt' => (string) $row->created_at,
            ])
            ->all();
    }

    private function fetchIdCardRequests(int $staffId, int $limit = 5): array
    {
        return DB::table('staff_id_card_request')
            ->where('staff_id', $staffId)
            ->orderByDesc('request_id')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => $this->mapIdCardRequest((array) $row))
            ->all();
    }

    private function fetchLatestIdCardRequest(int $staffId): ?array
    {
        $row = DB::table('staff_id_card_request')
            ->where('staff_id', $staffId)
            ->orderByDesc('request_id')
            ->first();

        return $row ? $this->mapIdCardRequest((array) $row) : null;
    }

    private function mapIdCardRequest(array $row): array
    {
        return [
            'requestId' => (int) ($row['request_id'] ?? 0),
            'requestType' => (string) ($row['request_type'] ?? 'Replacement'),
            'reason' => (string) ($row['reason'] ?? ''),
            'status' => (string) ($row['status'] ?? 'Pending'),
            'adminComment' => (string) ($row['admin_comment'] ?? ''),
            'requestedAt' => (string) ($row['requested_at'] ?? $row['created_at'] ?? ''),
            'processedAt' => ! empty($row['processed_at']) ? (string) $row['processed_at'] : null,
        ];
    }

    private function buildRequestComparison(array $log, int $staffId = 0): array
    {
        $payload = $this->decodePayload($log['change_payload'] ?? null);
        $current = $this->fetchCurrentEntityData(
            (string) ($log['entity_name'] ?? ''),
            (int) ($log['entity_id'] ?? 0),
            $staffId,
            $payload
        );

        $fields = [];
        foreach ($payload as $key => $value) {
            $oldValue = $current[$key] ?? null;
            $fields[] = [
                'field' => (string) $key,
                'label' => Str::headline((string) $key),
                'currentValue' => $oldValue,
                'currentDisplay' => $this->displayValue((string) $key, $oldValue),
                'currentUrl' => $key === 'evidence_file' ? $this->evidenceUrl($oldValue) : null,
                'proposedValue' => $value,
                'proposedDisplay' => $this->displayValue((string) $key, $value),
                'proposedUrl' => $key === 'evidence_file' ? $this->evidenceUrl($value) : null,
                'changed' => trim((string) ($oldValue ?? '')) !== trim((string) ($value ?? '')),
            ];
        }

        return [
            'payload' => $payload,
            'current' => $current,
            'fields' => $fields,
        ];
    }

    private function fetchCurrentEntityData(string $entity, int $entityId, int $staffId, array $payload): array
    {
        return match ($entity) {
            'staff' => (array) (DB::table('staff')->where('staff_id', $entityId > 0 ? $entityId : $staffId)->first() ?? []),
            'publication' => (array) (DB::table('publication')->where('publication_id', $entityId)->first() ?? []),
            'qualification' => (array) (DB::table('qualification')->where('qualification_id', $entityId)->first() ?? []),
            'grant_project' => (array) (DB::table('grant_project')->where('project_id', $entityId)->first() ?? []),
            'supervision' => (array) (DB::table('supervision')->where('supervision_id', $entityId)->first() ?? []),
            'external_profile' => (array) (DB::table('external_profile')->where('profile_id', $entityId)->first() ?? []),
            'professional_membership' => (array) (DB::table('professional_membership')->where('membership_id', $entityId)->first() ?? []),
            'research_area' => $this->currentResearchAreaData($payload),
            'staff_course' => $this->currentStaffCourseData($staffId, $payload),
            default => [],
        };
    }

    private function currentResearchAreaData(array $payload): array
    {
        $areaId = (int) ($payload['research_area_id'] ?? 0);
        if ($areaId > 0) {
            return (array) (DB::table('research_area')->where('research_area_id', $areaId)->first() ?? []);
        }

        if (! empty($payload['name'])) {
            return (array) (DB::table('research_area')->where('name', trim((string) $payload['name']))->first() ?? []);
        }

        return [];
    }

    private function currentStaffCourseData(int $staffId, array $payload): array
    {
        $courseId = (int) ($payload['course_id'] ?? 0);
        $session = trim((string) ($payload['session'] ?? ''));

        if ($courseId <= 0 || $session === '') {
            return [];
        }

        return (array) (
            DB::table('staff_course')
                ->where('staff_id', $staffId)
                ->where('course_id', $courseId)
                ->where('session', $session)
                ->first() ?? []
        );
    }

    private function applyPendingRequest(array $log): void
    {
        $payload = $this->decodePayload($log['change_payload'] ?? null);
        $entity = (string) ($log['entity_name'] ?? '');
        $action = (string) ($log['action'] ?? '');
        $entityId = (int) ($log['entity_id'] ?? 0);
        $userId = (int) ($log['user_id'] ?? 0);
        $staffId = $this->resolveStaffId($entityId, $userId, $payload);

        if ($entity === 'research_area') {
            $this->applyResearchAreaRequest($action, $staffId, $payload);

            return;
        }

        if ($entity === 'staff_course') {
            $this->applyStaffCourseRequest($action, $staffId, $payload);

            return;
        }

        if ($entity === 'publication') {
            $this->applyPublicationRequest($action, $staffId, $entityId, $payload);

            return;
        }

        if ($action === 'UPDATE') {
            $columns = [];
            foreach ($payload as $column => $value) {
                if (preg_match('/^[a-z0-9_]+$/i', (string) $column)) {
                    $columns[$column] = $value;
                }
            }

            if ($columns === []) {
                throw new RuntimeException('No valid fields found to update.');
            }

            $tableMap = [
                'staff' => ['table' => 'staff', 'pk' => 'staff_id'],
                'qualification' => ['table' => 'qualification', 'pk' => 'qualification_id'],
                'grant_project' => ['table' => 'grant_project', 'pk' => 'project_id'],
                'supervision' => ['table' => 'supervision', 'pk' => 'supervision_id'],
                'external_profile' => ['table' => 'external_profile', 'pk' => 'profile_id'],
                'professional_membership' => ['table' => 'professional_membership', 'pk' => 'membership_id'],
            ];

            if (! isset($tableMap[$entity])) {
                throw new RuntimeException('Unsupported entity update request.');
            }

            DB::table($tableMap[$entity]['table'])
                ->where($tableMap[$entity]['pk'], $entityId)
                ->update($columns);

            return;
        }

        if ($action === 'CREATE') {
            match ($entity) {
                'qualification' => DB::table('qualification')->insert($payload),
                'grant_project' => DB::table('grant_project')->insert($this->withStaffId($payload, $staffId)),
                'supervision' => DB::table('supervision')->insert($this->withStaffId($payload, $staffId)),
                'external_profile' => DB::table('external_profile')->insert($this->withStaffId($payload, $staffId)),
                'professional_membership' => DB::table('professional_membership')->insert($this->withStaffId($payload, $staffId)),
                'staff' => DB::table('staff')->where('staff_id', $entityId)->update($payload),
                default => throw new RuntimeException('Unsupported entity create request.'),
            };

            return;
        }

        if ($action === 'DELETE') {
            match ($entity) {
                'qualification' => DB::table('qualification')->where('qualification_id', $entityId)->delete(),
                'grant_project' => DB::table('grant_project')->where('project_id', $entityId)->delete(),
                'supervision' => DB::table('supervision')->where('supervision_id', $entityId)->delete(),
                'external_profile' => DB::table('external_profile')->where('profile_id', $entityId)->delete(),
                'professional_membership' => DB::table('professional_membership')->where('membership_id', $entityId)->delete(),
                'staff' => DB::table('staff')->where('staff_id', $entityId)->delete(),
                default => throw new RuntimeException('Unsupported entity delete request.'),
            };

            return;
        }

        throw new RuntimeException('Unsupported change request action.');
    }

    private function applyResearchAreaRequest(string $action, int $staffId, array $payload): void
    {
        if ($staffId <= 0) {
            throw new RuntimeException('Cannot determine the staff owner for this research area request.');
        }

        if ($action === 'CREATE' || $action === 'UPDATE') {
            $name = trim((string) ($payload['name'] ?? ''));
            if ($name === '') {
                throw new RuntimeException('Research area name is required.');
            }

            $areaId = (int) (DB::table('research_area')->where('name', $name)->value('research_area_id') ?? 0);
            if ($areaId <= 0) {
                $areaId = (int) DB::table('research_area')->insertGetId(['name' => $name]);
            }

            DB::table('staff_research_area')->insertOrIgnore([
                'staff_id' => $staffId,
                'research_area_id' => $areaId,
            ]);

            return;
        }

        if ($action === 'DELETE') {
            $areaId = (int) ($payload['research_area_id'] ?? 0);
            if ($areaId <= 0 && ! empty($payload['name'])) {
                $areaId = (int) (DB::table('research_area')->where('name', trim((string) $payload['name']))->value('research_area_id') ?? 0);
            }

            if ($areaId > 0) {
                DB::table('staff_research_area')
                    ->where('staff_id', $staffId)
                    ->where('research_area_id', $areaId)
                    ->delete();
            }

            return;
        }

        throw new RuntimeException('Unsupported research area action.');
    }

    private function applyStaffCourseRequest(string $action, int $staffId, array $payload): void
    {
        if ($staffId <= 0) {
            throw new RuntimeException('Cannot determine the staff owner for this course request.');
        }

        $courseId = (int) ($payload['course_id'] ?? 0);
        $session = trim((string) ($payload['session'] ?? ''));

        if ($courseId <= 0 || $session === '') {
            throw new RuntimeException('Course ID and session are required for course requests.');
        }

        if ($action === 'CREATE' || $action === 'UPDATE') {
            DB::table('staff_course')->insertOrIgnore([
                'staff_id' => $staffId,
                'course_id' => $courseId,
                'session' => $session,
            ]);

            return;
        }

        if ($action === 'DELETE') {
            DB::table('staff_course')
                ->where('staff_id', $staffId)
                ->where('course_id', $courseId)
                ->where('session', $session)
                ->delete();

            return;
        }

        throw new RuntimeException('Unsupported course action.');
    }

    private function applyPublicationRequest(string $action, int $staffId, int $entityId, array $payload): void
    {
        if ($action === 'CREATE') {
            $publicationId = (int) DB::table('publication')->insertGetId([
                'title' => $payload['title'] ?? '',
                'publication_type' => $payload['publication_type'] ?? 'Journal',
                'journal_or_venue' => $payload['journal_or_venue'] ?? '',
                'publisher' => $payload['publisher'] ?? 'N/A',
                'year_published' => $payload['year_published'] ?? date('Y'),
                'doi' => $payload['doi'] ?? '',
                'url' => $payload['url'] ?? '',
            ]);

            if ($staffId <= 0) {
                throw new RuntimeException('Cannot determine the staff owner for this publication request.');
            }

            DB::table('staff_publication')->insert([
                'staff_id' => $staffId,
                'publication_id' => $publicationId,
                'author_order' => (int) ($payload['author_order'] ?? 1),
            ]);

            return;
        }

        if ($action === 'UPDATE') {
            DB::table('publication')
                ->where('publication_id', $entityId)
                ->update($payload);

            return;
        }

        if ($action === 'DELETE') {
            DB::table('staff_publication')->where('publication_id', $entityId)->delete();
            DB::table('publication')->where('publication_id', $entityId)->delete();

            return;
        }

        throw new RuntimeException('Unsupported publication action.');
    }

    private function withStaffId(array $payload, int $staffId): array
    {
        if (empty($payload['staff_id']) && $staffId > 0) {
            $payload['staff_id'] = $staffId;
        }

        return $payload;
    }

    private function resolveStaffId(int $entityId, int $userId, array $payload): int
    {
        if (! empty($payload['staff_id'])) {
            return (int) $payload['staff_id'];
        }

        if ($entityId > 0 && isset($payload['rank_id'])) {
            return $entityId;
        }

        if ($userId > 0) {
            return (int) (DB::table('user_account')->where('user_id', $userId)->value('staff_id') ?? 0);
        }

        return 0;
    }

    private function mapUserSummary(array $row): array
    {
        $middle = trim((string) ($row['middle_name'] ?? $row['other_name'] ?? ''));
        $fullName = trim(((string) ($row['title'] ?? '')) . ' ' . ((string) ($row['first_name'] ?? '')) . ' ' . ($middle !== '' ? $middle . ' ' : '') . ((string) ($row['last_name'] ?? '')));
        $photo = !empty($row['profile_photo']) ? $row['profile_photo'] : ($row['passport'] ?? '');

        return [
            'userId' => (int) ($row['user_id'] ?? 0),
            'staffId' => isset($row['staff_id']) ? (int) $row['staff_id'] : null,
            'username' => (string) ($row['username'] ?? ''),
            'role' => (string) ($row['role'] ?? ''),
            'isActive' => (bool) ($row['is_active'] ?? true),
            'forcePasswordChange' => (bool) ($row['must_change_password'] ?? false),
            'name' => $fullName !== '' ? $fullName : (string) ($row['username'] ?? 'User'),
            'email' => (string) ($row['email'] ?? ''),
            'phone' => (string) ($row['phone'] ?? ''),
            'staffNumber' => (string) ($row['staff_number'] ?? $row['pf_number'] ?? ''),
            'pfNumber' => (string) ($row['pf_number'] ?? $row['staff_number'] ?? ''),
            'category' => (string) ($row['category'] ?? ''),
            'departmentName' => (string) ($row['department_name'] ?? ''),
            'collegeName' => (string) ($row['college_name'] ?? ''),
            'rankName' => (string) ($row['rank_name'] ?? ''),
            'profilePhotoUrl' => $this->fileUrl('uploads/' . ltrim((string) $photo, '/')),
            'signatureUrl' => !empty($row['signature']) ? $this->fileUrl('uploads/' . ltrim((string) $row['signature'], '/')) : null,
        ];
    }

    private function mapStaffAccessRow(object $row): array
    {
        $hasAccount = $row->account_user_id !== null;
        $photo = !empty($row->profile_photo) ? $row->profile_photo : ($row->passport ?? null);
        $signature = !empty($row->signature) ? $row->signature : null;

        return [
            'staffId' => (int) $row->staff_id,
            'staffNumber' => (string) ($row->staff_number ?? $row->pf_number ?? ''),
            'pfNumber' => (string) ($row->pf_number ?? $row->staff_number ?? ''),
            'name' => trim(((string) $row->first_name) . ' ' . (!empty($row->other_name) ? trim((string) $row->other_name) . ' ' : '') . ((string) $row->last_name)),
            'firstName' => (string) $row->first_name,
            'lastName' => (string) $row->last_name,
            'otherName' => (string) ($row->other_name ?? ''),
            'category' => (string) ($row->category ?? 'SENIOR'),
            'email' => (string) ($row->email ?? ''),
            'phone' => (string) ($row->phone ?? ''),
            'department' => (string) ($row->raw_department ?? $row->department_name ?? ''),
            'departmentId' => (int) ($row->department_id ?? 0),
            'departmentName' => (string) ($row->department_name ?? $row->raw_department ?? ''),
            'rank' => (string) ($row->raw_rank ?? $row->rank_name ?? ''),
            'rankId' => (int) ($row->rank_id ?? 0),
            'rankName' => (string) ($row->rank_name ?? $row->raw_rank ?? ''),
            'profilePhotoUrl' => $photo ? $this->fileUrl('uploads/' . ltrim((string) $photo, '/')) : null,
            'signatureUrl' => $signature ? $this->fileUrl('uploads/' . ltrim((string) $signature, '/')) : null,
            'userId' => $hasAccount ? (int) $row->account_user_id : null,
            'username' => $hasAccount ? (string) ($row->username ?? '') : '',
            'role' => $row->role ? (string) $row->role : null,
            'hasAccount' => $hasAccount,
            'isActive' => $hasAccount ? (bool) ($row->account_is_active ?? false) : false,
            'forcePasswordChange' => $hasAccount ? (bool) ($row->must_change_password ?? false) : false,
        ];
    }

    private function fetchStaffAccessItem(int $staffId): array
    {
        $row = DB::table('staff as s')
            ->leftJoin('department as d', 's.department_id', '=', 'd.department_id')
            ->leftJoin('ranks as r', 's.rank_id', '=', 'r.id')
            ->leftJoin('user_account as ua', 's.staff_id', '=', 'ua.staff_id')
            ->select(
                's.staff_id',
                's.staff_number',
                's.pf_number',
                's.first_name',
                's.last_name',
                's.other_name',
                's.category',
                's.email',
                's.phone',
                's.department as raw_department',
                's.rank as raw_rank',
                's.passport',
                's.signature',
                's.profile_photo',
                's.department_id',
                's.rank_id',
                'd.name as department_name',
                'r.name as rank_name',
                'ua.user_id as account_user_id',
                'ua.username',
                'ua.role',
                'ua.is_active as account_is_active',
                'ua.must_change_password'
            )
            ->where('s.staff_id', $staffId)
            ->first();

        if (! $row) {
            throw new RuntimeException('Staff record not found.');
        }

        return $this->mapStaffAccessRow($row);
    }

    private function fetchStaffIdentity(int $staffId): array
    {
        $row = DB::table('staff')
            ->select('staff_id', 'first_name', 'last_name', 'email')
            ->where('staff_id', $staffId)
            ->first();

        if (! $row) {
            throw new RuntimeException('Staff record not found.');
        }

        return (array) $row;
    }

    private function fetchStaffAccount(int $staffId): ?array
    {
        $row = DB::table('user_account as ua')
            ->leftJoin('staff as s', 'ua.staff_id', '=', 's.staff_id')
            ->select(
                'ua.user_id',
                'ua.staff_id',
                'ua.username',
                'ua.role',
                'ua.is_active',
                'ua.must_change_password',
                's.first_name',
                's.last_name',
                's.email'
            )
            ->where('ua.staff_id', $staffId)
            ->first();

        return $row ? (array) $row : null;
    }

    private function requireStaffAccount(int $staffId): array
    {
        $account = $this->fetchStaffAccount($staffId);

        if (! $account) {
            throw new RuntimeException('This staff record does not yet have a linked user account.');
        }

        return $account;
    }

    private function generateUniqueUsername(string $firstName, string $lastName): string
    {
        $baseUsername = Str::lower(preg_replace('/[^A-Za-z0-9]/', '', $firstName) . '.' . preg_replace('/[^A-Za-z0-9]/', '', $lastName));
        $baseUsername = trim($baseUsername, '.');
        if ($baseUsername === '') {
            $baseUsername = 'staff.user';
        }

        $username = $baseUsername;
        $counter = 1;

        while (DB::table('user_account')->where('username', $username)->exists()) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        return $username;
    }

    private function generateTemporaryPassword(): string
    {
        return substr(str_shuffle('abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'), 0, 10);
    }

    private function assertCanManageAccount(int $adminUserId, int $targetUserId): void
    {
        if ($adminUserId > 0 && $adminUserId === $targetUserId) {
            throw new RuntimeException('Use another administrator account to manage your own access settings.');
        }
    }

    private function ensureAdminPortalCoverage(int $targetUserId, string $nextRole, bool $nextIsActive): void
    {
        $current = DB::table('user_account')
            ->select('role', 'is_active')
            ->where('user_id', $targetUserId)
            ->first();

        if (! $current) {
            return;
        }

        $adminRoles = ['Admin', 'Moderator'];
        $currentlyCoversPortal = in_array((string) $current->role, $adminRoles, true) && (bool) $current->is_active;
        $nextCoversPortal = in_array($nextRole, $adminRoles, true) && $nextIsActive;

        if (! $currentlyCoversPortal || $nextCoversPortal) {
            return;
        }

        $remaining = DB::table('user_account')
            ->whereIn('role', $adminRoles)
            ->where('is_active', 1)
            ->where('user_id', '<>', $targetUserId)
            ->count();

        if ($remaining === 0) {
            throw new RuntimeException('At least one active Admin or Moderator account must remain.');
        }
    }

    private function createChangeLog(
        int $userId,
        string $entityName,
        int $entityId,
        array $payload,
        string $action,
        string $status
    ): int {
        return (int) DB::table('change_log')->insertGetId([
            'user_id' => $userId,
            'entity_name' => $entityName,
            'entity_id' => $entityId,
            'change_payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'action' => $action,
            'status' => $status,
        ]);
    }

    private function createDecisionNotification(array $log, string $status, string $adminComment = ''): void
    {
        $userId = (int) ($log['user_id'] ?? 0);
        if ($userId <= 0) {
            return;
        }

        $entity = (string) ($log['entity_name'] ?? '');
        $action = strtoupper((string) ($log['action'] ?? 'UPDATE'));
        $statusUpper = strtoupper($status);

        $title = $statusUpper === 'APPROVED' ? 'Update Approved' : 'Update Rejected';
        $message = "Your {$action} request for " . $this->entityLabel($entity) . " was {$statusUpper}.";

        if ($statusUpper === 'REJECTED' && trim($adminComment) !== '') {
            $message .= ' Reason: ' . trim($adminComment);
        }

        DB::table('staff_notification')->insert([
            'user_id' => $userId,
            'log_id' => (int) ($log['log_id'] ?? 0),
            'title' => $title,
            'message' => $message,
            'target_url' => '/staff/history?focusLog=' . (int) ($log['log_id'] ?? 0),
            'is_read' => 0,
        ]);
    }

    private function sendApprovalDecisionEmail(array $log): void
    {
        $userId = (int) ($log['user_id'] ?? 0);
        if ($userId <= 0) {
            return;
        }

        $user = $this->getAuthenticatedUser($userId);
        if (! $user) {
            return;
        }

        $email = trim((string) ($user['email'] ?? ''));
        if ($email === '') {
            return;
        }

        $name = trim((string) ($user['name'] ?? 'Staff Member'));
        $action = strtoupper((string) ($log['action'] ?? 'UPDATE'));
        $entityLabel = $this->entityLabel((string) ($log['entity_name'] ?? 'record'));
        $requestLabel = match ($action) {
            'CREATE' => 'add',
            'DELETE' => 'remove',
            default => 'update',
        };
        $historyUrl = rtrim((string) config('app.frontend_url'), '/') . '/staff/history?focusLog=' . (int) ($log['log_id'] ?? 0);
        $subject = 'JOSTUM Change Request Approved';

        try {
            Mail::html(
                <<<HTML
                <div style="font-family: Ubuntu, sans-serif; line-height: 1.6; color: #2d2d2d;">
                    <h2 style="margin-bottom: 8px;">Change Request Approved</h2>
                    <p>Hello {$name},</p>
                    <p>Your request to {$requestLabel} your {$entityLabel} has been approved by an administrator.</p>
                    <p>A notification has also been added to your staff portal.</p>
                    <p>
                        <a href="{$historyUrl}" style="display: inline-block; background: #5b3a29; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">
                            View Approval History
                        </a>
                    </p>
                    <p style="font-size: 12px; color: #6b7280;">JOSTUM ICT Directorate</p>
                </div>
                HTML,
                function ($message) use ($email, $name, $subject): void {
                    $message->to($email, $name)->subject($subject);
                }
            );
        } catch (Throwable $exception) {
            Log::warning('Approval decision email delivery failed.', [
                'user_id' => $userId,
                'email' => $email,
                'log_id' => (int) ($log['log_id'] ?? 0),
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function entityLabel(string $entity): string
    {
        return [
            'staff' => 'profile',
            'qualification' => 'qualification',
            'professional_membership' => 'membership',
            'grant_project' => 'grant',
            'supervision' => 'supervision',
            'external_profile' => 'web profile',
            'research_area' => 'research area',
            'staff_course' => 'course',
            'course' => 'course',
            'publication' => 'publication',
        ][$entity] ?? str_replace('_', ' ', $entity);
    }

    private function decodePayload(mixed $payload): array
    {
        if (is_array($payload)) {
            return $payload;
        }

        $decoded = json_decode((string) $payload, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function displayValue(string $key, mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if ($key === 'rank_id') {
            $name = DB::table('ranks')->where('id', (int) $value)->value('name');

            return (string) ($name ?: $value);
        }

        return (string) $value;
    }

    private function storeImageUpload(UploadedFile $file, string $directory, string $prefix): string
    {
        return $this->storeUpload(
            $file,
            $directory,
            $prefix,
            ['jpg', 'jpeg', 'png', 'webp'],
            ['image/jpeg', 'image/png', 'image/webp'],
            5 * 1024 * 1024
        );
    }

    private function storeEvidenceUpload(UploadedFile $file, string $prefix): string
    {
        return $this->storeUpload(
            $file,
            'uploads/evidence',
            $prefix,
            ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
            ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
            8 * 1024 * 1024
        );
    }

    private function storeUpload(
        UploadedFile $file,
        string $directory,
        string $prefix,
        array $allowedExtensions,
        array $allowedMimes,
        int $maxBytes
    ): string {
        $extension = Str::lower((string) $file->getClientOriginalExtension());
        $mime = (string) $file->getMimeType();

        if (! in_array($extension, $allowedExtensions, true) || ! in_array($mime, $allowedMimes, true)) {
            throw new RuntimeException('The uploaded file type is not allowed.');
        }

        if ($file->getSize() > $maxBytes) {
            throw new RuntimeException('The uploaded file is too large.');
        }

        $targetDirectory = public_path(trim($directory, '/'));
        if (! is_dir($targetDirectory) && ! mkdir($targetDirectory, 0777, true) && ! is_dir($targetDirectory)) {
            throw new RuntimeException('The upload directory could not be created.');
        }

        if (! is_writable($targetDirectory)) {
            @chmod($targetDirectory, 0777);
        }

        $filename = $prefix . time() . '.' . $extension;
        $file->move($targetDirectory, $filename);

        return $filename;
    }

    private function createPasswordResetToken(int $userId): string
    {
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        DB::table('password_reset_token')
            ->where('user_id', $userId)
            ->whereNull('used_at')
            ->update([
                'used_at' => now(),
            ]);

        DB::table('password_reset_token')->insert([
            'user_id' => $userId,
            'token_hash' => $tokenHash,
            'expires_at' => now()->addHour(),
        ]);

        return $rawToken;
    }

    private function resolvePasswordResetToken(string $rawToken): array
    {
        if (trim($rawToken) === '') {
            return [];
        }

        $row = DB::table('password_reset_token as prt')
            ->join('user_account as ua', 'prt.user_id', '=', 'ua.user_id')
            ->leftJoin('staff as s', 'ua.staff_id', '=', 's.staff_id')
            ->where('prt.token_hash', hash('sha256', $rawToken))
            ->select('prt.reset_id', 'prt.user_id', 'prt.expires_at', 'prt.used_at', 'ua.username', 's.first_name', 's.last_name')
            ->first();

        if (! $row) {
            return [];
        }

        if (! empty($row->used_at) || Carbon::parse((string) $row->expires_at)->isPast()) {
            return [];
        }

        return [
            'reset_id' => (int) $row->reset_id,
            'user_id' => (int) $row->user_id,
            'expires_at' => (string) $row->expires_at,
            'username' => (string) $row->username,
            'first_name' => (string) ($row->first_name ?? ''),
            'last_name' => (string) ($row->last_name ?? ''),
        ];
    }

    private function sendPasswordResetEmail(string $email, string $name, string $resetUrl): bool
    {
        try {
            Mail::html(
                <<<HTML
                <div style="font-family: Ubuntu, sans-serif; line-height: 1.6; color: #2d2d2d;">
                    <h2 style="margin-bottom: 8px;">Password Reset Request</h2>
                    <p>We received a request to reset your Academic Portfolio password.</p>
                    <p>
                        <a href="{$resetUrl}" style="display: inline-block; background: #5b3a29; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">
                            Reset Password
                        </a>
                    </p>
                    <p>This link expires in 1 hour and can be used once.</p>
                    <p>If you did not request this, you can ignore this email.</p>
                    <p style="font-size: 12px; color: #6b7280;">JOSTUM ICT Directorate</p>
                </div>
                HTML,
                function ($message) use ($email, $name): void {
                    $message->to($email, $name)->subject('JOSTUM Password Reset Link');
                }
            );

            return true;
        } catch (Throwable $exception) {
            Log::warning('Password reset email delivery failed.', [
                'email' => $email,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    private function sendNewAccountEmail(string $email, string $name, string $username, string $temporaryPassword, string $loginUrl): bool
    {
        try {
            Mail::html(
                <<<HTML
                <div style="font-family: Ubuntu, sans-serif; background-color: #f4f4f4; padding: 40px 10px; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
                        <div style="background-color: #1a5f7a; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">JOSTUM-PG</h1>
                            <p style="color: #d1e8f0; margin: 5px 0 0; font-size: 14px;">Academic Portfolio System</p>
                        </div>
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin-top: 0;">Welcome, {$name}!</h2>
                            <p style="color: #555555;">A new staff account has been provisioned for you. Use the credentials below to access your portal and begin managing your academic profile.</p>
                            <div style="background-color: #f9f9f9; border-left: 4px solid #1a5f7a; padding: 20px; margin: 25px 0;">
                                <p style="margin: 0; font-size: 14px; color: #777;">Login Credentials:</p>
                                <p style="margin: 10px 0; font-size: 16px;"><strong>Username:</strong> <span style="color: #1a5f7a;">{$username}</span></p>
                                <p style="margin: 0; font-size: 16px;"><strong>Temp Password:</strong> <span style="color: #1a5f7a;">{$temporaryPassword}</span></p>
                            </div>
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="{$loginUrl}" style="background-color: #1a5f7a; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                    Login to Staff Portal
                                </a>
                            </div>
                            <p style="color: #e63946; font-size: 13px; margin-top: 30px; font-style: italic;">
                                For security reasons, you will be prompted to change this password immediately upon your first login.
                            </p>
                        </div>
                    </div>
                </div>
                HTML,
                function ($message) use ($email, $name): void {
                    $message->to($email, $name)->subject('Access Your Academic Portfolio Account');
                }
            );

            return true;
        } catch (Throwable $exception) {
            Log::warning('New staff account email delivery failed.', [
                'email' => $email,
                'username' => $username,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    private function evidenceUrl(mixed $filename): ?string
    {
        $file = trim((string) ($filename ?? ''));

        return $file !== ''
            ? rtrim((string) config('app.url'), '/') . '/uploads/evidence/' . rawurlencode($file)
            : null;
    }

    private function fileUrl(string $relativePath): ?string
    {
        $relativePath = trim($relativePath);

        if ($relativePath === '' || $relativePath === 'uploads/') {
            return null;
        }

        $cleanPath = ltrim($relativePath, '/');
        while (str_starts_with($cleanPath, 'uploads/uploads/')) {
            $cleanPath = substr($cleanPath, 8);
        }

        return rtrim((string) config('app.url'), '/') . '/' . $cleanPath;
    }

    public function getAuditSubmissions(): array
    {
        try {
            $auditDb = 'jostum_staff_audit';

            // 1. Sync real university staff into audit database
            try {
                $realStaffRows = DB::table('staff as s')
                    ->leftJoin('department as d', 's.department_id', '=', 'd.department_id')
                    ->leftJoin('ranks as r', 's.rank_id', '=', 'r.id')
                    ->select('s.*', 'd.name as department_name', 'r.name as rank_name')
                    ->get();

                foreach ($realStaffRows as $rs) {
                    $auditDept = DB::table("{$auditDb}.departments")
                        ->where('name', $rs->department_name)
                        ->first();
                    if (! $auditDept && ! empty($rs->department_name)) {
                        $code = 'D' . $rs->department_id;
                        $deptId = DB::table("{$auditDb}.departments")->insertGetId([
                            'name' => $rs->department_name,
                            'code' => $code,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        $deptId = $auditDept ? $auditDept->id : 1;
                    }

                    $auditRank = DB::table("{$auditDb}.ranks")
                        ->where('name', $rs->rank_name)
                        ->first();
                    if (! $auditRank && ! empty($rs->rank_name)) {
                        $rankId = DB::table("{$auditDb}.ranks")->insertGetId([
                            'name' => $rs->rank_name,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        $rankId = $auditRank ? $auditRank->id : 1;
                    }

                    $existing = DB::table("{$auditDb}.staff")
                        ->where('pf_number', $rs->staff_number)
                        ->orWhere('email', $rs->email)
                        ->first();

                    if ($existing) {
                        DB::table("{$auditDb}.staff")
                            ->where('id', $existing->id)
                            ->update([
                                'pf_number' => $rs->staff_number,
                                'surname' => $rs->last_name ?: 'Staff',
                                'first_name' => $rs->first_name ?: 'Staff',
                                'other_name' => trim(($rs->title ? $rs->title . ' ' : '') . ($rs->middle_name ?: '')),
                                'phone' => $rs->phone,
                                'email' => $rs->email,
                                'department_id' => $deptId,
                                'rank_id' => $rankId,
                                'updated_at' => now(),
                            ]);
                    } else {
                        DB::table("{$auditDb}.staff")->insert([
                            'user_id' => null,
                            'pf_number' => $rs->staff_number,
                            'surname' => $rs->last_name ?: 'Staff',
                            'first_name' => $rs->first_name ?: 'Staff',
                            'other_name' => trim(($rs->title ? $rs->title . ' ' : '') . ($rs->middle_name ?: '')),
                            'phone' => $rs->phone,
                            'email' => $rs->email,
                            'department_id' => $deptId,
                            'rank_id' => $rankId,
                            'status_id' => 1, // Not Submitted
                            'created_at' => $rs->created_at ?: now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            } catch (Throwable $syncError) {
                // Ignore sync errors and continue reading
            }

            $submissions = DB::table("{$auditDb}.staff as s")
                ->leftJoin("{$auditDb}.departments as d", 's.department_id', '=', 'd.id')
                ->leftJoin("{$auditDb}.ranks as r", 's.rank_id', '=', 'r.id')
                ->leftJoin("{$auditDb}.verification_statuses as vs", 's.status_id', '=', 'vs.id')
                ->select(
                    's.id',
                    's.pf_number',
                    's.surname',
                    's.first_name',
                    's.other_name',
                    's.phone',
                    's.email',
                    's.passport_path',
                    's.status_id',
                    's.next_of_kin',
                    's.address',
                    's.submitted_at',
                    's.created_at',
                    's.updated_at',
                    'd.name as department_name',
                    'r.name as rank_name',
                    'vs.name as status_name'
                )
                ->orderBy('s.id', 'asc')
                ->get();

            $documentTypes = DB::table("{$auditDb}.document_types")->get()->keyBy('id');

            $allDocs = DB::table("{$auditDb}.staff_documents")
                ->get()
                ->groupBy('staff_id');

            $verifications = DB::table("{$auditDb}.document_verifications as dv")
                ->leftJoin("{$auditDb}.panel_members as pm", 'dv.panel_member_id', '=', 'pm.id')
                ->select('dv.*', 'pm.full_name as screener_name')
                ->orderBy('dv.id', 'desc')
                ->get()
                ->groupBy('staff_document_id');

            $result = $submissions->map(function ($sub) use ($allDocs, $documentTypes, $verifications) {
                $docs = ($allDocs->get($sub->id) ?? collect())->map(function ($doc) use ($documentTypes, $verifications) {
                    $docType = $documentTypes->get($doc->document_type_id);
                    $latestVer = ($verifications->get($doc->id) ?? collect())->first();

                    $fileUrl = url("/api/public/audit/file?path=" . urlencode($doc->file_path));

                    return [
                        'id' => $doc->id,
                        'document_type_id' => $doc->document_type_id,
                        'type_name' => $docType ? $docType->name : 'Document',
                        'file_path' => $doc->file_path,
                        'file_url' => $fileUrl,
                        'original_name' => $doc->original_filename ?? basename($doc->file_path),
                        'mime_type' => $doc->mime_type ?? (str_ends_with($doc->file_path, '.pdf') ? 'application/pdf' : 'image/jpeg'),
                        'file_size' => $doc->file_size ?? 0,
                        'decision' => $latestVer ? $latestVer->decision : 'pending',
                        'remark' => $latestVer ? $latestVer->remark : null,
                        'screener_name' => $latestVer ? $latestVer->screener_name : null,
                        'created_at' => $doc->created_at,
                    ];
                })->values();

                $mainStaff = DB::table('staff')
                    ->where('staff_number', $sub->pf_number)
                    ->orWhere('email', $sub->email)
                    ->first();

                $photoUrl = null;
                if ($mainStaff && $mainStaff->profile_photo && file_exists(public_path('uploads/' . ltrim((string) $mainStaff->profile_photo, '/')))) {
                    $photoUrl = $this->fileUrl('uploads/' . ltrim((string) $mainStaff->profile_photo, '/'));
                } elseif (!empty($sub->passport_path)) {
                    $photoUrl = url("/api/public/audit/file?path=" . urlencode($sub->passport_path));
                } else {
                    $idDoc = ($allDocs->get($sub->id) ?? collect())->first(function ($d) {
                        return in_array($d->document_type_id, [4, 5]) || str_contains(strtolower($d->file_path), 'passport') || str_contains(strtolower($d->file_path), 'id_card');
                    });
                    if ($idDoc) {
                        $photoUrl = url("/api/public/audit/file?path=" . urlencode($idDoc->file_path));
                    }
                }

                $category = (str_contains(strtolower($sub->rank_name ?? ''), 'lecturer') || str_contains(strtolower($sub->rank_name ?? ''), 'professor')) 
                    ? 'Teaching (Academic)' 
                    : 'Non-Teaching (Administrative)';

                $fullName = trim("{$sub->first_name} {$sub->other_name} {$sub->surname}");
                if ($mainStaff) {
                    $fullName = trim(($mainStaff->title ? $mainStaff->title . ' ' : '') . $mainStaff->first_name . ' ' . ($mainStaff->middle_name ? $mainStaff->middle_name . ' ' : '') . $mainStaff->last_name);
                }

                return [
                    'id' => $sub->id,
                    'pf_number' => $sub->pf_number,
                    'surname' => $sub->surname,
                    'first_name' => $sub->first_name,
                    'other_name' => $sub->other_name,
                    'full_name' => $fullName,
                    'phone' => $sub->phone,
                    'email' => $sub->email,
                    'next_of_kin' => $sub->next_of_kin,
                    'address' => $sub->address,
                    'department' => $sub->department_name ?? 'Not set',
                    'rank' => $sub->rank_name ?? 'Not set',
                    'category' => $category,
                    'status' => $sub->status_name ?? 'Not Submitted',
                    'status_id' => $sub->status_id,
                    'profile_completion' => 100,
                    'photo_url' => $photoUrl,
                    'documents' => $docs,
                    'submitted_at' => $sub->submitted_at ?? $sub->updated_at,
                ];
            });

            $totalStaff = DB::table("{$auditDb}.staff")->count();
            $totalSubmissions = $result->where('status', '!=', 'Not Submitted')->count();
            $notSubmittedCount = DB::table("{$auditDb}.staff")->where('status_id', 1)->count();
            $pendingCount = DB::table("{$auditDb}.staff")->where('status_id', 2)->count();
            $screenedCount = DB::table("{$auditDb}.staff")->whereIn('status_id', [3, 4, 5])->count();
            $verifiedCount = DB::table("{$auditDb}.staff")->where('status_id', 3)->count();
            $rejectedCount = DB::table("{$auditDb}.staff")->where('status_id', 4)->count();
            $correctionCount = DB::table("{$auditDb}.staff")->where('status_id', 5)->count();

            $totalDocs = DB::table("{$auditDb}.staff_documents")->count();
            $screenedDocs = DB::table("{$auditDb}.document_verifications")->distinct('staff_document_id')->count();
            $verifiedDocs = DB::table("{$auditDb}.document_verifications")->where('decision', 'legit')->count();
            $issueDocs = DB::table("{$auditDb}.document_verifications")->whereIn('decision', ['rejected', 'requires_correction'])->count();

            $panelMembers = DB::table("{$auditDb}.panel_members")->get();
            $panelMembersCount = $panelMembers->count();

            $recentScreened = DB::table("{$auditDb}.document_verifications as dv")
                ->leftJoin("{$auditDb}.staff_documents as sd", 'dv.staff_document_id', '=', 'sd.id')
                ->leftJoin("{$auditDb}.staff as s", 'sd.staff_id', '=', 's.id')
                ->select('s.pf_number', 's.first_name', 's.surname', 's.other_name', 'dv.decision', 'dv.created_at as screened_at')
                ->orderByDesc('dv.id')
                ->limit(5)
                ->get();

            $recentScreenedStaff = $recentScreened->map(function ($rs) {
                $name = trim("{$rs->first_name} {$rs->other_name} {$rs->surname}");
                $ms = DB::table('staff')->where('staff_number', $rs->pf_number)->first();
                if ($ms) {
                    $name = trim(($ms->title ? $ms->title . ' ' : '') . $ms->first_name . ' ' . ($ms->middle_name ? $ms->middle_name . ' ' : '') . $ms->last_name);
                }
                return [
                    'staff_name' => $name,
                    'pf_number' => $rs->pf_number,
                    'decision' => $rs->decision,
                    'screened_at' => (string) $rs->screened_at,
                ];
            })->all();

            $departments = DB::table('department')->orderBy('name')->pluck('name')->filter()->values();
            if ($departments->isEmpty()) {
                $departments = DB::table("{$auditDb}.departments")->pluck('name')->filter()->values();
            }

            return [
                'submissions' => $result,
                'departments' => $departments,
                'stats' => [
                    'total_staff' => $totalStaff,
                    'total_submissions' => $totalSubmissions,
                    'not_submitted' => $notSubmittedCount,
                    'pending_count' => $pendingCount,
                    'screened_count' => $screenedCount,
                    'verified_count' => $verifiedCount,
                    'rejected_count' => $rejectedCount,
                    'correction_count' => $correctionCount,
                    'panel_members' => $panelMembersCount,
                    'total_docs' => $totalDocs,
                    'screened_docs' => $screenedDocs,
                    'verified_docs' => $verifiedDocs,
                    'issue_docs' => $issueDocs,
                    'recent_screened_staff' => $recentScreenedStaff,
                ]
            ];
        } catch (Throwable $e) {
            return ['submissions' => [], 'stats' => [], 'error' => $e->getMessage()];
        }
    }

    public function decideAuditSubmission(int $auditStaffId, string $decision, ?string $notes = null): array
    {
        $auditDb = 'jostum_staff_audit';

        $statusMap = [
            'verify' => 3, // Verified
            'reject' => 4, // Rejected
            'require_correction' => 5, // Requires Correction
            'pending' => 2, // Pending
        ];

        $statusId = $statusMap[$decision] ?? 3;

        DB::table("{$auditDb}.staff")
            ->where('id', $auditStaffId)
            ->update([
                'status_id' => $statusId,
                'updated_at' => now(),
            ]);

        try {
            DB::table('audit_staff')
                ->where('id', $auditStaffId)
                ->update([
                    'status_id' => $statusId,
                    'updated_at' => now(),
                ]);
        } catch (Throwable $e) {}

        try {
            DB::table("{$auditDb}.staff_verifications")->insert([
                'staff_id' => $auditStaffId,
                'verified_by' => 1,
                'final_status_id' => $statusId,
                'remark' => $notes ?? "Updated by Admin/Panel Portal on " . now()->toDateTimeString(),
                'verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (Throwable $e) {}

        try {
            DB::table("{$auditDb}.audit_logs")->insert([
                'user_id' => 1,
                'action' => "DECISION_" . strtoupper($decision),
                'details' => "Staff ID {$auditStaffId} status updated to status_id {$statusId}. Notes: " . ($notes ?? 'N/A'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (Throwable $e) {}

        try {
            DB::table('appraisal_audit_logs')->insert([
                'staff_id' => $auditStaffId,
                'action' => "STAFF_AUDIT_" . strtoupper($decision),
                'performed_by' => 1,
                'details' => json_encode(['decision' => $decision, 'notes' => $notes, 'status_id' => $statusId]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (Throwable $e) {}

        return ['message' => 'Staff audit status updated successfully.', 'status_id' => $statusId];
    }

    public function decideAuditDocument(int $documentId, string $decision, ?string $remark = null): array
    {
        $auditDb = 'jostum_staff_audit';

        $doc = DB::table("{$auditDb}.staff_documents")->where('id', $documentId)->first();
        if (!$doc) {
            return ['error' => 'Document not found.'];
        }

        $isLegit = $decision === 'legit' ? 1 : 0;

        DB::table("{$auditDb}.document_verifications")->insert([
            'staff_document_id' => $documentId,
            'panel_member_id' => 1,
            'decision' => $decision,
            'is_legit' => $isLegit,
            'remark' => $remark,
            'verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $allStaffDocs = DB::table("{$auditDb}.staff_documents")->where('staff_id', $doc->staff_id)->pluck('id');
        $allVerifications = DB::table("{$auditDb}.document_verifications")
            ->whereIn('staff_document_id', $allStaffDocs)
            ->get()
            ->groupBy('staff_document_id');

        $decisions = [];
        foreach ($allStaffDocs as $dId) {
            $latest = ($allVerifications->get($dId) ?? collect())->sortByDesc('id')->first();
            if ($latest) {
                $decisions[] = $latest->decision;
            }
        }

        $newStatusId = 2; // Pending
        if (in_array('rejected', $decisions, true)) {
            $newStatusId = 4; // Rejected
        } elseif (in_array('requires_correction', $decisions, true)) {
            $newStatusId = 5; // Requires Correction
        } elseif (count($decisions) >= count($allStaffDocs) && count($allStaffDocs) > 0 && !in_array('pending', $decisions, true)) {
            $newStatusId = 3; // Verified
        }

        DB::table("{$auditDb}.staff")->where('id', $doc->staff_id)->update([
            'status_id' => $newStatusId,
            'updated_at' => now(),
        ]);

        return [
            'message' => 'Document decision saved successfully.',
            'staff_id' => $doc->staff_id,
            'status_id' => $newStatusId,
        ];
    }

    public function getAuditFileStream(string $relativePath)
    {
        $cleanPath = ltrim(urldecode($relativePath), '/');

        $possiblePaths = [
            "/opt/lampp/htdocs/audit-system/backend/storage/app/public/{$cleanPath}",
            "/opt/lampp/htdocs/audit-system/backend/public/storage/{$cleanPath}",
            "/opt/lampp/htdocs/university-portfolio/backend/storage/app/public/{$cleanPath}",
            "/opt/lampp/htdocs/university-portfolio/backend/public/uploads/{$cleanPath}",
        ];

        $foundFile = null;
        foreach ($possiblePaths as $fullPath) {
            if (file_exists($fullPath) && is_file($fullPath)) {
                $foundFile = $fullPath;
                break;
            }
        }

        if (!$foundFile) {
            abort(404, "Audit file not found: {$cleanPath}");
        }

        $mimeType = mime_content_type($foundFile) ?: 'application/octet-stream';
        return response()->file($foundFile, [
            'Content-Type' => $mimeType,
            'Access-Control-Allow-Origin' => '*',
        ]);
    }

    public function inviteAuditStaff(array $data): array
    {
        $auditDb = 'jostum_staff_audit';
        $staffIds = $data['staff_ids'] ?? [];
        $date = $data['date'] ?? now()->addDays(2)->format('Y-m-d');
        $time = $data['time'] ?? '10:00';
        $venue = $data['venue'] ?? 'Main Senate Chamber';

        $screeningDate = \Carbon\Carbon::parse($date)->format('Y-m-d');
        $screeningTime = \Carbon\Carbon::parse($time)->format('H:i');

        $message = "You are invited for audit screening on {$screeningDate} at {$screeningTime} - Venue: {$venue}.";

        if (empty($staffIds)) {
            $staff = DB::table("{$auditDb}.staff")->whereNull('archived_at')->get();
        } else {
            $staff = DB::table("{$auditDb}.staff")->whereIn('id', $staffIds)->whereNull('archived_at')->get();
        }

        $count = 0;
        foreach ($staff as $s) {
            DB::table("{$auditDb}.notifications")->insert([
                'staff_id' => $s->id,
                'user_id' => $s->user_id,
                'title' => 'Screening invitation',
                'message' => $message,
                'type' => 'screening_schedule',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $count++;
        }

        return [
            'success' => true,
            'message' => "Successfully queued {$count} screening invitation(s).",
            'count' => $count,
        ];
    }
}
