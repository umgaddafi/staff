<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollBatch extends Model
{
    protected $table = 'payroll_batches';

    protected $fillable = [
        'payroll_year',
        'payroll_month',
        'payroll_period',
        'original_file_name',
        'file_path',
        'total_staff',
        'total_earnings',
        'total_deductions',
        'total_net_salary',
        'uploaded_by',
        'status',
    ];

    protected $casts = [
        'payroll_year' => 'integer',
        'total_staff' => 'integer',
        'total_earnings' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'total_net_salary' => 'decimal:2',
    ];

    public function payslips(): HasMany
    {
        return $this->hasMany(StaffPayslip::class, 'payroll_batch_id', 'id');
    }
}
