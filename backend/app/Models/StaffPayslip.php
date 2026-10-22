<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffPayslip extends Model
{
    protected $table = 'staff_payslips';

    protected $fillable = [
        'payroll_batch_id',
        'staff_id',
        'pf_number',
        'payroll_month',
        'payroll_year',
        'month_year_label',
        'employee_particulars',
        'incomes',
        'deductions',
        'total_earnings',
        'total_deductions',
        'net_salary',
    ];

    protected $casts = [
        'payroll_year' => 'integer',
        'employee_particulars' => 'array',
        'incomes' => 'array',
        'deductions' => 'array',
        'total_earnings' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_salary' => 'decimal:2',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PayrollBatch::class, 'payroll_batch_id', 'id');
    }
}
