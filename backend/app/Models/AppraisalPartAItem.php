<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalPartAItem extends Model
{
    use HasFactory;

    protected $table = 'appraisal_part_a_items';

    protected $fillable = [
        'evaluation_id',
        'category',
        'item_text',
        'item_subtype',
        'start_year',
        'end_year',
        'income_pa',
        'reason_for_leaving',
        'sort_order',
    ];

    public function evaluation()
    {
        return $this->belongsTo(AppraisalEvaluation::class, 'evaluation_id');
    }
}
