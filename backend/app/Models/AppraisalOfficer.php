<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppraisalOfficer extends Model
{
    use HasFactory;

    protected $table = 'appraisal_officers';

    protected $fillable = [
        'user_id',
        'staff_id',
        'pf_number',
        'name',
        'email',
        'username',
        'phone',
        'role',
        'title',
        'designation',
        'department',
        'faculty',
        'password',
        'status',
        'signature_path',
        'notes',
    ];

    protected $hidden = [
        'password',
    ];

    /**
     * Scope query to active officers.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope query to a specific role.
     */
    public function scopeByRole($query, $role)
    {
        return $query->where('role', $role);
    }
}
