<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalPartC extends Model
{
    use HasFactory;

    protected $table = 'appraisal_part_c';

    protected $fillable = [
        'evaluation_id',
        'staff_agreed',
        'staff_comments',
        'signed_at',
    ];

    protected $casts = [
        'staff_agreed' => 'boolean',
        'signed_at' => 'datetime',
    ];

    public function evaluation()
    {
        return $this->belongsTo(AppraisalEvaluation::class, 'evaluation_id');
    }
}
