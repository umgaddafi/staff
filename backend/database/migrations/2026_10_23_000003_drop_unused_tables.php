<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop unused / redundant tables to eliminate duplicate schema confusion
        Schema::dropIfExists('users');
        Schema::dropIfExists('staffs');
        Schema::dropIfExists('colleges');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('change_history');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Tables were unused duplicates of user_account, staff, college, password_reset_token, and change_log
    }
};
