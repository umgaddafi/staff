<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payroll_batches', function (Blueprint $table) {
            $table->id();
            $table->integer('payroll_year');
            $table->string('payroll_month', 20); // e.g. 'August'
            $table->string('payroll_period', 30)->unique(); // e.g. 'August-2026'
            $table->string('original_file_name', 255);
            $table->string('file_path', 255)->nullable();
            $table->unsignedInteger('total_staff')->default(0);
            $table->decimal('total_earnings', 15, 2)->default(0.00);
            $table->decimal('total_deductions', 15, 2)->default(0.00);
            $table->decimal('total_net_salary', 15, 2)->default(0.00);
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->string('status', 20)->default('Published'); // Published, Draft, Archived
            $table->timestamps();
        });

        Schema::create('staff_payslips', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payroll_batch_id');
            $table->unsignedBigInteger('staff_id')->nullable(); // links to staff.staff_id
            $table->string('pf_number', 50)->index();
            $table->string('payroll_month', 20);
            $table->integer('payroll_year');
            $table->string('month_year_label', 30); // e.g. 'August-2026'
            $table->json('employee_particulars'); // name, department, designation, scale, level, step, bank, acct, pfa, pin, paypoint
            $table->json('incomes'); // [{ item, amount, om }]
            $table->json('deductions'); // [{ item, amount, om }]
            $table->decimal('total_earnings', 15, 2);
            $table->decimal('total_deductions', 15, 2);
            $table->decimal('net_salary', 15, 2);
            $table->timestamps();

            $table->foreign('payroll_batch_id')->references('id')->on('payroll_batches')->onDelete('cascade');
            $table->index(['payroll_year', 'payroll_month']);
            $table->unique(['payroll_batch_id', 'pf_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_payslips');
        Schema::dropIfExists('payroll_batches');
    }
};
