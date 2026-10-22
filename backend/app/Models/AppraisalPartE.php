<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalPartE extends Model
{
    use HasFactory;

    protected $table = 'appraisal_part_e';

    protected $fillable = [
        'evaluation_id',
        'apc_chairman_id',
        'final_decision',
        'effective_date',
        'apc_remarks',
        'ratified_at',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'ratified_at' => 'datetime',
    ];

    public function evaluation()
    {
        return $this->belongsTo(AppraisalEvaluation::class, 'evaluation_id');
    }
}
