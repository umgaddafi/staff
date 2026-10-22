<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalPartD extends Model
{
    use HasFactory;

    protected $table = 'appraisal_part_d';

    protected $fillable = [
        'evaluation_id',
        'reviewer_id',
        'recommendation',
        'committee_minutes_excerpt',
        'dept_chairman_signature',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function evaluation()
    {
        return $this->belongsTo(AppraisalEvaluation::class, 'evaluation_id');
    }
}
