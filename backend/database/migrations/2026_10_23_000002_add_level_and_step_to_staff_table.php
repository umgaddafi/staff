<?php

use App\Support\LegacySchemaManager;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        LegacySchemaManager::ensureStaffIdCardColumnsSchema(DB::connection());
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe down: preserve columns to avoid accidental data loss
    }
};
