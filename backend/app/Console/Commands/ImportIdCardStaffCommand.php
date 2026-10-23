<?php

namespace App\Console\Commands;

use App\Support\LegacySchemaManager;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

class ImportIdCardStaffCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'staff:import-idcard {--create-accounts : Ensure user accounts are provisioned for all staff}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch and populate staff data from id_card database into university_portfolio staff table';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting staff data import from id_card database...');

        $db = DB::connection();
        LegacySchemaManager::ensureStaffIdCardColumnsSchema($db);

        // Check source database and table
        try {
            $totalSource = DB::table('id_card.staff')->count();
        } catch (Throwable $e) {
            $this->error('Failed to connect to id_card.staff table: ' . $e->getMessage());
            return Command::FAILURE;
        }

        $this->info("Found {$totalSource} records in id_card.staff.");

        // Cache existing departments
        $departments = DB::table('department')->get()->keyBy(function ($dept) {
            return strtolower(trim($dept->name));
        });

        // Ensure fallback college for unassigned departments
        $defaultCollegeId = DB::table('college')->where('name', 'Non-College Unit')->value('college_id') ?? 8;

        // Cache existing ranks
        $ranks = DB::table('ranks')->get()->keyBy(function ($rank) {
            return strtolower(trim($rank->name));
        });

        // Fetch source staff records in chunks
        $insertedCount = 0;
        $updatedCount = 0;
        $accountCount = 0;

        $sourceStaff = DB::table('id_card.staff')
            ->select([
                'pf_number',
                'first_name',
                'last_name',
                'other_name',
                'category',
                'email',
                'phone',
                'department',
                'rank',
                'passport',
                'signature',
            ])
            ->orderBy('id')
            ->cursor();

        $this->output->progressStart($totalSource);

        foreach ($sourceStaff as $row) {
            $pfNumber = trim((string) $row->pf_number);
            if ($pfNumber === '') {
                $this->output->progressAdvance();
                continue;
            }

            $firstName = trim((string) $row->first_name);
            $lastName = trim((string) $row->last_name);
            $otherName = !empty($row->other_name) ? trim((string) $row->other_name) : null;
            $rawCat = strtoupper(trim((string) $row->category));
            $category = in_array($rawCat, ['JUNIOR', 'SENIOR'], true) ? $rawCat : 'SENIOR';
            $email = !empty($row->email) && trim((string) $row->email) !== '' ? trim((string) $row->email) : null;
            $phone = !empty($row->phone) && trim((string) $row->phone) !== '' ? trim((string) $row->phone) : null;
            $deptString = !empty($row->department) ? trim((string) $row->department) : null;
            $rankString = !empty($row->rank) ? trim((string) $row->rank) : null;
            $passport = !empty($row->passport) ? trim((string) $row->passport) : null;
            $signature = !empty($row->signature) ? trim((string) $row->signature) : null;

            // Resolve department ID
            $departmentId = null;
            if ($deptString !== null && $deptString !== '') {
                $normDept = strtolower($deptString);
                if ($departments->has($normDept)) {
                    $departmentId = (int) $departments->get($normDept)->department_id;
                } else {
                    // Create new department
                    try {
                        $newDeptId = (int) DB::table('department')->insertGetId([
                            'name' => $deptString,
                            'college_id' => $defaultCollegeId,
                        ]);
                        $departments->put($normDept, (object) [
                            'department_id' => $newDeptId,
                            'name' => $deptString,
                            'college_id' => $defaultCollegeId,
                        ]);
                        $departmentId = $newDeptId;
                    } catch (Throwable) {
                        $departmentId = null;
                    }
                }
            }

            // Resolve rank ID
            $rankId = null;
            if ($rankString !== null && $rankString !== '') {
                $normRank = strtolower($rankString);
                if ($ranks->has($normRank)) {
                    $rankId = (int) $ranks->get($normRank)->id;
                } else {
                    // Determine category: Academic (1) vs Non-Academic (2)
                    $isAcademic = (bool) preg_match('/lecturer|professor|reader|graduate assistant/i', $rankString);
                    $staffCategoryId = $isAcademic ? 1 : 2;

                    try {
                        $newRankId = (int) DB::table('ranks')->insertGetId([
                            'name' => $rankString,
                            'staff_category_id' => $staffCategoryId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        $ranks->put($normRank, (object) [
                            'id' => $newRankId,
                            'name' => $rankString,
                            'staff_category_id' => $staffCategoryId,
                        ]);
                        $rankId = $newRankId;
                    } catch (Throwable) {
                        $rankId = null;
                    }
                }
            }

            // Check if staff already exists in university_portfolio.staff
            $existing = DB::table('staff')
                ->where('pf_number', $pfNumber)
                ->first();

            $staffId = null;

            if ($existing) {
                $updateData = [
                    'pf_number' => $pfNumber,
                    'first_name' => $firstName !== '' ? $firstName : $existing->first_name,
                    'last_name' => $lastName !== '' ? $lastName : $existing->last_name,
                    'other_name' => $otherName ?? $existing->other_name,
                    'category' => $category,
                    'email' => $existing->email ?? $email,
                    'phone' => $existing->phone ?? $phone,
                    'department' => $existing->department ?? $deptString,
                    'rank' => $existing->rank ?? $rankString,
                    'passport' => $existing->passport ?? $passport,
                    'signature' => $existing->signature ?? $signature,
                    'profile_photo' => $existing->profile_photo ?? $passport,
                    'department_id' => $existing->department_id ?? $departmentId,
                    'rank_id' => $existing->rank_id ?? $rankId,
                    'updated_at' => now(),
                ];

                DB::table('staff')->where('staff_id', $existing->staff_id)->update($updateData);
                $staffId = (int) $existing->staff_id;
                $updatedCount++;
            } else {
                $insertData = [
                    'pf_number' => $pfNumber,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'other_name' => $otherName,
                    'category' => $category,
                    'email' => $email,
                    'phone' => $phone,
                    'department' => $deptString,
                    'rank' => $rankString,
                    'passport' => $passport,
                    'signature' => $signature,
                    'profile_photo' => $passport,
                    'department_id' => $departmentId,
                    'rank_id' => $rankId,
                    'is_active' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $staffId = (int) DB::table('staff')->insertGetId($insertData);
                $insertedCount++;
            }

            // Ensure user_account exists with must_change_password = 1
            $account = DB::table('user_account')->where('staff_id', $staffId)->first();

            if (! $account) {
                // Generate clean username from PF number
                $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $pfNumber));
                if ($baseUsername === '') {
                    $baseUsername = strtolower($firstName . '.' . $lastName);
                }

                $username = $baseUsername;
                $counter = 1;
                while (DB::table('user_account')->where('username', $username)->exists()) {
                    $username = $baseUsername . $counter;
                    $counter++;
                }

                // For accounts requiring password change, use a pre-computed bcrypt hash for blazing fast bulk import.
                // First-time authentication verifies against phone or PF number dynamically.
                static $initialHash = null;
                if ($initialHash === null) {
                    $initialHash = Hash::make('JostumStaff@2026');
                }

                DB::table('user_account')->insert([
                    'staff_id' => $staffId,
                    'username' => $username,
                    'password' => $initialHash,
                    'role' => 'Staff',
                    'is_active' => 1,
                    'must_change_password' => 1,
                ]);

                $accountCount++;
            }

            $this->output->progressAdvance();
        }

        $this->output->progressFinish();

        $this->info("Import completed successfully!");
        $this->table(
            ['Metric', 'Count'],
            [
                ['New Staff Inserted', $insertedCount],
                ['Existing Staff Updated', $updatedCount],
                ['User Accounts Provisioned', $accountCount],
                ['Total Staff in Portfolio', DB::table('staff')->count()],
                ['Total Accounts in Portfolio', DB::table('user_account')->count()],
            ]
        );

        return Command::SUCCESS;
    }
}
