<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalPartB extends Model
{
    use HasFactory;

    protected $table = 'appraisal_part_b';

    protected $fillable = [
        'evaluation_id',
        'evaluator_id',
        'absent_with_permission',
        'absent_without_permission',
        'warned_count',
        'suspended_count',
        'basic_qualification_score',
        'additional_qualification_score',
        'work_experience_score',
        'admin_tech_experience_score',
        'relevant_training_score',
        'personality_team_spirit_score',
        'quality_of_work_score',
        'regularity_score',
        'punctuality_score',
        'care_of_property_score',
        'integrity_score',
        'initiative_score',
        'knowledge_regulations_score',
        'professional_membership_score',
        'total_score',
        'supervisor_remarks',
        'supervisor_recommendation',
        'evaluated_at',
    ];

    protected $casts = [
        'evaluated_at' => 'datetime',
        'total_score' => 'decimal:2',
    ];

    public function evaluation()
    {
        return $this->belongsTo(AppraisalEvaluation::class, 'evaluation_id');
    }
}
