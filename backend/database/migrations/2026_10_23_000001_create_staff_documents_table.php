<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('staff_documents')) {
            Schema::create('staff_documents', function (Blueprint $table) {
                $table->id();
                $table->bigInteger('staff_id')->index();
                $table->string('document_type', 50)->index();
                $table->string('title')->nullable();
                $table->string('file_path');
                $table->string('original_filename')->nullable();
                $table->bigInteger('file_size')->default(0);
                $table->string('mime_type', 100)->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_documents');
    }
};
