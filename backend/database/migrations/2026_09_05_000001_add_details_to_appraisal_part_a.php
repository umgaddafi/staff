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
        Schema::table('appraisal_part_a', function (Blueprint $table) {
            if (!Schema::hasColumn('appraisal_part_a', 'details')) {
                $table->longText('details')->nullable()->after('declaration_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appraisal_part_a', function (Blueprint $table) {
            if (Schema::hasColumn('appraisal_part_a', 'details')) {
                $table->dropColumn('details');
            }
        });
    }
};
