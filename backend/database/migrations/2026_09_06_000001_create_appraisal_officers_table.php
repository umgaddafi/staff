<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appraisal_officers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('staff_id')->nullable()->index();
            $table->string('pf_number', 50)->nullable()->index();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('username', 100)->nullable();
            $table->string('phone', 50)->nullable();
            $table->enum('role', ['supervisor', 'dept_chairman', 'apc_chairman', 'admin'])->default('supervisor')->index();
            $table->string('title', 50)->nullable();
            $table->string('designation')->nullable();
            $table->string('department')->nullable()->index();
            $table->string('faculty')->nullable();
            $table->string('password')->nullable();
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active')->index();
            $table->string('signature_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Seed initial statutory university appraisal officers
        $now = now();
        $defaultPassword = Hash::make('password123');

        DB::table('appraisal_officers')->insert([
            [
                'pf_number' => 'PF/4011',
                'name' => 'Dr. Clement Alabi',
                'email' => 'supervisor@jostum.edu.ng',
                'username' => 'supervisor',
                'phone' => '+234 803 112 3456',
                'role' => 'supervisor',
                'title' => 'Dr.',
                'designation' => 'Lead Departmental Supervisor (Part B Evaluator)',
                'department' => 'Computer Science',
                'faculty' => 'Physical Sciences',
                'password' => $defaultPassword,
                'status' => 'active',
                'notes' => 'Authorized to perform Part B Supervisory performance scoring.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'pf_number' => 'PF/3102',
                'name' => 'Prof. Aminu Bello',
                'email' => 'hod@jostum.edu.ng',
                'username' => 'hod_cs',
                'phone' => '+234 802 987 6543',
                'role' => 'dept_chairman',
                'title' => 'Prof.',
                'designation' => 'Head of Department / Committee Chairman (Part D Reviewer)',
                'department' => 'Computer Science',
                'faculty' => 'Physical Sciences',
                'password' => $defaultPassword,
                'status' => 'active',
                'notes' => 'Authorized to submit Departmental A&P recommendations and committee minutes.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'pf_number' => 'PF/1004',
                'name' => 'Prof. J. O. Oladipo',
                'email' => 'apc@jostum.edu.ng',
                'username' => 'apc_chairman',
                'phone' => '+234 805 555 4321',
                'role' => 'apc_chairman',
                'title' => 'Prof.',
                'designation' => 'Central A&P Committee Chairman (Part E Ratifier)',
                'department' => 'Academic Planning & Quality Assurance',
                'faculty' => 'Central Administration',
                'password' => $defaultPassword,
                'status' => 'active',
                'notes' => 'Statutory officer for Central University A&PC final ratifications and promotion grants.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'pf_number' => 'PF/1001',
                'name' => 'Engr. D. K. Audu',
                'email' => 'admin@jostum.edu.ng',
                'username' => 'appraisal_admin',
                'phone' => '+234 809 123 7890',
                'role' => 'admin',
                'title' => 'Engr.',
                'designation' => 'Appraisal System Administrator & Academic Secretary',
                'department' => 'Academic Registry',
                'faculty' => 'Central Administration',
                'password' => $defaultPassword,
                'status' => 'active',
                'notes' => 'Central system administrator for sessions, periods, rules, and user assignments.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appraisal_officers');
    }
};
