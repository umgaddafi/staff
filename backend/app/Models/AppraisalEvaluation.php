<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AppraisalEvaluation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'appraisal_evaluations';

    protected $fillable = [
        'appraisal_period_id',
        'staff_id',
        'supervisor_id',
        'department_id',
        'current_stage',
        'overall_status',
        'part_b_score',
        'department_recommendation',
        'final_decision',
        'submitted_part_a_at',
        'evaluated_part_b_at',
        'signed_part_c_at',
        'reviewed_part_d_at',
        'ratified_part_e_at',
    ];

    protected $casts = [
        'part_b_score' => 'decimal:2',
        'submitted_part_a_at' => 'datetime',
        'evaluated_part_b_at' => 'datetime',
        'signed_part_c_at' => 'datetime',
        'reviewed_part_d_at' => 'datetime',
        'ratified_part_e_at' => 'datetime',
    ];

    // Relationships
    public function period()
    {
        return $this->belongsTo(AppraisalPeriod::class, 'appraisal_period_id');
    }

    public function partA()
    {
        return $this->hasOne(AppraisalPartA::class, 'evaluation_id');
    }

    public function partAItems()
    {
        return $this->hasMany(AppraisalPartAItem::class, 'evaluation_id')->orderBy('sort_order');
    }

    public function partB()
    {
        return $this->hasOne(AppraisalPartB::class, 'evaluation_id');
    }

    public function partC()
    {
        return $this->hasOne(AppraisalPartC::class, 'evaluation_id');
    }

    public function partD()
    {
        return $this->hasOne(AppraisalPartD::class, 'evaluation_id');
    }

    public function partE()
    {
        return $this->hasOne(AppraisalPartE::class, 'evaluation_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AppraisalAuditLog::class, 'evaluation_id');
    }
}
