<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Senior Database Architecture for APER (Annual Performance Evaluation Report) System.
     */
    public function up(): void
    {
        // 1. Appraisal Periods Table
        Schema::create('appraisal_periods', function (Blueprint $table) {
            $table->id();
            $table->string('year_label', 20)->comment('e.g. 2025/2026');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['draft', 'active', 'closed'])->default('active');
            $table->timestamps();
            
            $table->index(['status', 'year_label']);
        });

        // 2. Main Appraisal Evaluation Header Table
        Schema::create('appraisal_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appraisal_period_id')->constrained('appraisal_periods')->onDelete('cascade');
            $table->unsignedBigInteger('staff_id')->index()->comment('Foreign key to users table');
            $table->unsignedBigInteger('supervisor_id')->nullable()->index()->comment('Foreign key to supervisor user');
            $table->unsignedBigInteger('department_id')->nullable()->index();
            
            $table->enum('current_stage', [
                'part_a_drafting',
                'part_b_supervisor',
                'part_c_staff_sign',
                'part_d_dept_review',
                'part_e_apc_final',
                'completed'
            ])->default('part_a_drafting');

            $table->enum('overall_status', [
                'draft',
                'submitted_part_a',
                'evaluated_part_b',
                'signed_part_c',
                'reviewed_part_d',
                'ratified_part_e',
                'rejected'
            ])->default('draft');

            $table->decimal('part_b_score', 5, 2)->default(0.00);
            $table->string('department_recommendation')->nullable();
            $table->string('final_decision')->nullable();

            $table->timestamp('submitted_part_a_at')->nullable();
            $table->timestamp('evaluated_part_b_at')->nullable();
            $table->timestamp('signed_part_c_at')->nullable();
            $table->timestamp('reviewed_part_d_at')->nullable();
            $table->timestamp('ratified_part_e_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['staff_id', 'appraisal_period_id']);
            $table->index(['supervisor_id', 'current_stage']);
            $table->index(['department_id', 'current_stage']);
        });

        // 3. Part A: Staff Details & Declaration Table (1:1 with evaluation)
        Schema::create('appraisal_part_a', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->unique()->constrained('appraisal_evaluations')->onDelete('cascade');
            
            $table->string('pf_number', 50)->index();
            $table->string('full_name');
            $table->string('college')->nullable();
            $table->string('department')->nullable();
            $table->string('present_rank')->nullable();
            $table->string('present_level', 20)->nullable();
            $table->string('present_step', 20)->nullable();
            $table->decimal('salary_per_annum', 12, 2)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('marital_status', 20)->nullable();

            $table->boolean('declaration_signed')->default(false);
            $table->string('declaration_name')->nullable();
            $table->date('declaration_date')->nullable();

            $table->timestamps();
        });

        // 4. Part A Normalized Items (Duties, Qualifications, History, etc.)
        Schema::create('appraisal_part_a_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('appraisal_evaluations')->onDelete('cascade');
            
            $table->enum('category', [
                'duty',
                'qualification',
                'institution',
                'previous_employment',
                'training',
                'acting_appointment',
                'examination'
            ])->index();

            $table->text('item_text');
            $table->string('subtype', 100)->nullable()->comment('Degree e.g. B.Sc, M.Sc, PhD');
            $table->string('start_period', 50)->nullable();
            $table->string('end_period', 50)->nullable();
            $table->integer('sort_order')->default(0);

            $table->timestamps();

            $table->index(['evaluation_id', 'category']);
        });

        // 5. Part B: Supervisor Assessment & 100 Points Matrix Table (1:1 with evaluation)
        Schema::create('appraisal_part_b', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->unique()->constrained('appraisal_evaluations')->onDelete('cascade');
            $table->unsignedBigInteger('evaluator_id')->nullable()->index();

            // Discipline & Attendance Metrics
            $table->integer('absent_with_permission')->default(0);
            $table->integer('absent_without_permission')->default(0);
            $table->integer('warned_count')->default(0);
            $table->integer('suspended_count')->default(0);

            // 100 Points Evaluation Breakdown
            $table->decimal('basic_qualification_score', 4, 2)->default(0.00);
            $table->decimal('additional_qualification_score', 4, 2)->default(0.00);
            $table->decimal('work_experience_score', 4, 2)->default(0.00);
            $table->decimal('admin_tech_experience_score', 4, 2)->default(0.00);
            $table->decimal('relevant_training_score', 4, 2)->default(0.00);
            $table->decimal('personality_team_spirit_score', 4, 2)->default(0.00);
            $table->decimal('quality_of_work_score', 4, 2)->default(0.00);
            $table->decimal('regularity_score', 4, 2)->default(0.00);
            $table->decimal('punctuality_score', 4, 2)->default(0.00);
            $table->decimal('care_of_property_score', 4, 2)->default(0.00);
            $table->decimal('integrity_score', 4, 2)->default(0.00);
            $table->decimal('initiative_score', 4, 2)->default(0.00);
            $table->decimal('knowledge_regulations_score', 4, 2)->default(0.00);
            $table->decimal('professional_membership_score', 4, 2)->default(0.00);

            $table->decimal('total_score', 5, 2)->default(0.00);
            $table->text('supervisor_remarks')->nullable();
            $table->string('supervisor_recommendation')->nullable();
            $table->timestamp('evaluated_at')->nullable();

            $table->timestamps();
        });

        // 6. Part C: Staff Acknowledgment Table (1:1 with evaluation)
        Schema::create('appraisal_part_c', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->unique()->constrained('appraisal_evaluations')->onDelete('cascade');
            
            $table->boolean('staff_agreed')->default(true);
            $table->text('staff_comments')->nullable();
            $table->timestamp('signed_at')->nullable();

            $table->timestamps();
        });

        // 7. Part D: Departmental Review Table (1:1 with evaluation)
        Schema::create('appraisal_part_d', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->unique()->constrained('appraisal_evaluations')->onDelete('cascade');
            $table->unsignedBigInteger('reviewer_id')->nullable()->index();

            $table->enum('recommendation', [
                'approve_promotion',
                'approve_increment',
                'deferred',
                'not_recommended'
            ]);
            $table->text('committee_minutes_excerpt')->nullable();
            $table->string('dept_chairman_signature')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();
        });

        // 8. Part E: A&P Committee Final Decision Table (1:1 with evaluation)
        Schema::create('appraisal_part_e', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->unique()->constrained('appraisal_evaluations')->onDelete('cascade');
            $table->unsignedBigInteger('apc_chairman_id')->nullable()->index();

            $table->enum('final_decision', [
                'approve_promotion',
                'approve_increment',
                'deferred',
                'rejected'
            ]);
            $table->date('effective_date')->nullable();
            $table->text('apc_remarks')->nullable();
            $table->timestamp('ratified_at')->nullable();

            $table->timestamps();
        });

        // 9. Appraisal Audit Log Table
        Schema::create('appraisal_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('appraisal_evaluations')->onDelete('cascade');
            $table->unsignedBigInteger('actor_id')->index();
            $table->string('actor_role', 50);
            $table->string('action', 100);
            $table->string('previous_stage', 50)->nullable();
            $table->string('new_stage', 50)->nullable();
            $table->string('ip_address', 45)->nullable();
            
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appraisal_audit_logs');
        Schema::dropIfExists('appraisal_part_e');
        Schema::dropIfExists('appraisal_part_d');
        Schema::dropIfExists('appraisal_part_c');
        Schema::dropIfExists('appraisal_part_b');
        Schema::dropIfExists('appraisal_part_a_items');
        Schema::dropIfExists('appraisal_part_a');
        Schema::dropIfExists('appraisal_evaluations');
        Schema::dropIfExists('appraisal_periods');
    }
};
