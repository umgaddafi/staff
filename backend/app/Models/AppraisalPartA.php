<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalPartA extends Model
{
    use HasFactory;

    protected $table = 'appraisal_part_a';

    protected $fillable = [
        'evaluation_id',
        'pf_number',
        'full_name',
        'college',
        'department',
        'present_rank',
        'present_level',
        'present_step',
        'salary_per_annum',
        'date_of_birth',
        'phone',
        'marital_status',
        'declaration_signed',
        'declaration_name',
        'declaration_date',
        'details',
    ];

    protected $casts = [
        'declaration_signed' => 'boolean',
        'declaration_date' => 'date',
        'date_of_birth' => 'date',
        'salary_per_annum' => 'decimal:2',
        'details' => 'array',
    ];

    public function evaluation()
    {
        return $this->belongsTo(AppraisalEvaluation::class, 'evaluation_id');
    }
}
