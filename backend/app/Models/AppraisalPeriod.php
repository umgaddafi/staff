<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalPeriod extends Model
{
    use HasFactory;

    protected $table = 'appraisal_periods';

    protected $fillable = [
        'year_label',
        'start_date',
        'end_date',
        'status',
    ];

    public function evaluations()
    {
        return $this->hasMany(AppraisalEvaluation::class, 'appraisal_period_id');
    }
}
