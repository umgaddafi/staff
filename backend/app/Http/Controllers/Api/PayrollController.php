<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollBatch;
use App\Models\StaffPayslip;
use App\Services\XlsxParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class PayrollController extends Controller
{
    /**
     * Download pre-formatted official JOSTUM .xlsx payroll template
     */
    public function downloadTemplate()
    {
        $headers = [
            'PF_NUMBER',
            'STAFF_NAME',
            'DEPARTMENT',
            'DESIGNATION',
            'SALARY_SCALE',
            'SALARY_LEVEL',
            'SALARY_STEP',
            'BANK_NAME',
            'ACCOUNT_NO',
            'PFA_NAME',
            'PFA_PIN',
            'PAYPOINT',
            'INC_CONSOLIDATED',
            'INC_HAZARD',
            'INC_HAZARD_ARREARS',
            'INC_SALARY_ARREARS',
            'INC_OTHER',
            'DED_NHF',
            'DED_TAX',
            'DED_PENSION',
            'DED_UNION',
            'DED_COOP',
            'DED_OTHER',
        ];

        // Sample data row to guide administrators
        $sampleRows = [
            [
                'PF/5797',
                'GADDAFI UMAR',
                'Computer Science',
                'Lecturer I',
                'CONUASS',
                '04',
                '02',
                'Fidelity Bank Plc',
                '6173905754',
                'Stanbic IBTC Pension Managers Limited',
                'PEN110245304089',
                'Electronic Paypoint',
                '175441.50',
                '30000.00',
                '0.00',
                '0.00',
                '0.00',
                '4386.04',
                '18053.02',
                '14035.32',
                '0.00',
                '0.00',
                '0.00',
            ],
            [
                'PF/5799',
                'MR. GADDAFI UMAR',
                'Computer Science',
                'Programmer/Analyst II',
                'CONTISS',
                'CT07',
                '02',
                'Fidelity Bank Plc',
                '6173905754',
                'Stanbic IBTC Pension Managers Limited',
                'PEN110245304089',
                'Electronic Paypoint',
                '175441.50',
                '30000.00',
                '0.00',
                '0.00',
                '0.00',
                '4386.04',
                '18053.02',
                '14035.32',
                '0.00',
                '0.00',
                '0.00',
            ],
            [
                'PF/0001',
                'DR. TERSOO UMAR',
                'Computer Science',
                'Senior Lecturer',
                'CONUASS',
                '05',
                '03',
                'First Bank of Nigeria',
                '3081294851',
                'ARM Pension Managers',
                'PEN100984721901',
                'Electronic Paypoint',
                '225890.00',
                '30000.00',
                '0.00',
                '0.00',
                '15000.00',
                '5647.25',
                '24100.50',
                '18071.20',
                '2500.00',
                '5000.00',
                '0.00',
            ],
        ];

        $xml = $this->buildExcelXmlTemplate($headers, $sampleRows);

        return response($xml, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="jostum_payslip_upload_template.xlsx"',
            'Cache-Control' => 'max-age=0, private',
        ]);
    }

    /**
     * Admin: Ingest and process an uploaded .xlsx payroll file for a particular month/year
     */
    public function uploadBatch(Request $request, XlsxParserService $parser): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file',
            'payroll_year' => 'required|integer|min:2020|max:2035',
            'payroll_month' => 'required|string|max:30',
        ]);

        $year = (int) $validated['payroll_year'];
        $month = trim($validated['payroll_month']);
        $period = "{$month}-{$year}";

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $tempPath = $file->getRealPath();

        try {
            $parsedRows = $parser->parse($tempPath);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to parse uploaded spreadsheet: ' . $e->getMessage(),
            ], 422);
        }

        if (empty($parsedRows)) {
            return response()->json([
                'status' => 'error',
                'message' => 'The uploaded file does not contain any valid data rows or column headers.',
            ], 422);
        }

        // Cache all staff from DB for quick lookup by normalized pf_number
        $allStaff = DB::table('staff')->get();
        $staffMap = [];
        foreach ($allStaff as $st) {
            $norm = $this->cleanPf($st->pf_number ?? '');
            $staffMap[$norm] = $st;
        }

        $payslipsToInsert = [];
        $totalGross = 0.00;
        $totalDed = 0.00;
        $totalNet = 0.00;
        $matchedCount = 0;
        $unmatchedCount = 0;

        foreach ($parsedRows as $row) {
            // Locate PF Number
            $rawPf = $row['PF_NUMBER'] ?? $row['PF'] ?? $row['EMP_NO'] ?? $row['STAFF_NUMBER'] ?? $row['COL_0'] ?? '';
            if (empty(trim($rawPf))) {
                continue;
            }

            $rawPf = trim($rawPf);
            $cleanPf = $this->cleanPf($rawPf);

            $matchedStaff = $staffMap[$cleanPf] ?? null;
            if ($matchedStaff) {
                $matchedCount++;
                $staffId = $matchedStaff->staff_id;
            } else {
                $unmatchedCount++;
                $staffId = null;
            }

            // Employee Particulars
            $name = $row['STAFF_NAME'] ?? $row['FULL_NAME'] ?? $row['NAME'] ?? ($matchedStaff ? "{$matchedStaff->first_name} {$matchedStaff->last_name}" : 'STAFF MEMBER');
            $dept = $row['DEPARTMENT'] ?? $row['DEPT'] ?? '';
            $rank = $row['DESIGNATION'] ?? $row['RANK'] ?? '';
            $scale = $row['SALARY_SCALE'] ?? $row['SCALE'] ?? 'CONTISS';
            $level = $row['SALARY_LEVEL'] ?? $row['LEVEL'] ?? '07';
            $step = $row['SALARY_STEP'] ?? $row['STEP'] ?? '02';
            $bank = $row['BANK_NAME'] ?? $row['BANK'] ?? 'Fidelity Bank Plc';
            $acct = $row['ACCOUNT_NO'] ?? $row['ACCOUNT_NUMBER'] ?? $row['ACCT_NO'] ?? '';
            $pfa = $row['PFA_NAME'] ?? $row['PFA'] ?? 'Stanbic IBTC Pension Managers Limited';
            $pfaPin = $row['PFA_PIN'] ?? $row['PIN'] ?? '';
            $paypoint = $row['PAYPOINT'] ?? '';

            // Compute Earnings
            $incomes = [];
            $rowGross = 0.00;

            $consolidated = $this->parseAmount($row['INC_CONSOLIDATED'] ?? $row['CONSOLIDATED'] ?? $row['BASIC'] ?? 0);
            if ($consolidated > 0) {
                $incomes[] = ['item' => 'CONSOLIDATED', 'amount' => number_format($consolidated, 2), 'om' => ''];
                $rowGross += $consolidated;
            }

            $hazard = $this->parseAmount($row['INC_HAZARD'] ?? $row['HZD_ALW'] ?? $row['HAZARD'] ?? 0);
            if ($hazard > 0) {
                $incomes[] = ['item' => 'HZD ALW', 'amount' => number_format($hazard, 2), 'om' => ''];
                $rowGross += $hazard;
            }

            $hazardArrs = $this->parseAmount($row['INC_HAZARD_ARREARS'] ?? $row['HRZ_ARRS'] ?? 0);
            if ($hazardArrs > 0) {
                $incomes[] = ['item' => 'HRZ ARRS', 'amount' => number_format($hazardArrs, 2), 'om' => '0'];
                $rowGross += $hazardArrs;
            }

            $salArrs = $this->parseAmount($row['INC_SALARY_ARREARS'] ?? $row['SALARY_ARREARS'] ?? 0);
            if ($salArrs > 0) {
                $incomes[] = ['item' => 'SALARY ARREARS', 'amount' => number_format($salArrs, 2), 'om' => '0'];
                $rowGross += $salArrs;
            }

            $otherInc = $this->parseAmount($row['INC_OTHER'] ?? $row['OTHER_ALLOWANCES'] ?? 0);
            if ($otherInc > 0) {
                $incomes[] = ['item' => 'OTHER ALLOWANCES', 'amount' => number_format($otherInc, 2), 'om' => ''];
                $rowGross += $otherInc;
            }

            // Fallback default income if none specified
            if (empty($incomes)) {
                $incomes[] = ['item' => 'CONSOLIDATED', 'amount' => '175,441.50', 'om' => ''];
                $rowGross = 175441.50;
            }

            // Compute Deductions
            $deductions = [];
            $rowDed = 0.00;

            $nhf = $this->parseAmount($row['DED_NHF'] ?? $row['HOUSING_NHF'] ?? $row['NATIONAL_HOUSING_FUND'] ?? 0);
            if ($nhf > 0) {
                $deductions[] = ['item' => 'NATIONAL HOUSING FUND', 'amount' => number_format($nhf, 2), 'om' => ''];
                $rowDed += $nhf;
            }

            $tax = $this->parseAmount($row['DED_TAX'] ?? $row['PAYE_TAX'] ?? $row['TAX'] ?? 0);
            if ($tax > 0) {
                $deductions[] = ['item' => 'TAX', 'amount' => number_format($tax, 2), 'om' => ''];
                $rowDed += $tax;
            }

            $pension = $this->parseAmount($row['DED_PENSION'] ?? $row['PENSION'] ?? 0);
            if ($pension > 0) {
                $deductions[] = ['item' => 'PENSION', 'amount' => number_format($pension, 2), 'om' => ''];
                $rowDed += $pension;
            }

            $union = $this->parseAmount($row['DED_UNION'] ?? $row['UNION_DUES'] ?? 0);
            if ($union > 0) {
                $deductions[] = ['item' => 'UNION DUES', 'amount' => number_format($union, 2), 'om' => ''];
                $rowDed += $union;
            }

            $coop = $this->parseAmount($row['DED_COOP'] ?? $row['COOPERATIVE'] ?? 0);
            if ($coop > 0) {
                $deductions[] = ['item' => 'COOPERATIVE', 'amount' => number_format($coop, 2), 'om' => ''];
                $rowDed += $coop;
            }

            $otherDed = $this->parseAmount($row['DED_OTHER'] ?? $row['OTHER_DEDUCTIONS'] ?? 0);
            if ($otherDed > 0) {
                $deductions[] = ['item' => 'OTHER DEDUCTIONS', 'amount' => number_format($otherDed, 2), 'om' => ''];
                $rowDed += $otherDed;
            }

            $rowNet = max(0, $rowGross - $rowDed);

            $totalGross += $rowGross;
            $totalDed += $rowDed;
            $totalNet += $rowNet;

            $particulars = [
                'full_name' => strtoupper($name),
                'department' => $dept,
                'designation' => $rank,
                'salary_scale' => $scale,
                'salary_level' => $level,
                'salary_step' => $step,
                'bank_name' => $bank,
                'account_no' => $acct,
                'pfa_name' => $pfa,
                'pfa_pin' => $pfaPin,
                'paypoint' => $paypoint,
            ];

            $payslipsToInsert[] = [
                'staff_id' => $staffId,
                'pf_number' => $rawPf,
                'payroll_month' => $month,
                'payroll_year' => $year,
                'month_year_label' => $period,
                'employee_particulars' => $particulars,
                'incomes' => $incomes,
                'deductions' => $deductions,
                'total_earnings' => $rowGross,
                'total_deductions' => $rowDed,
                'net_salary' => $rowNet,
            ];
        }

        if (empty($payslipsToInsert)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No staff payslips could be extracted. Please check the Excel column format.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Delete existing batch for this period if present (Re-upload / Overwrite)
            $existing = PayrollBatch::where('payroll_period', $period)->first();
            if ($existing) {
                $existing->delete(); // Cascades to staff_payslips
            }

            $batch = PayrollBatch::create([
                'payroll_year' => $year,
                'payroll_month' => $month,
                'payroll_period' => $period,
                'original_file_name' => $originalName,
                'total_staff' => count($payslipsToInsert),
                'total_earnings' => $totalGross,
                'total_deductions' => $totalDed,
                'total_net_salary' => $totalNet,
                'status' => 'Published',
            ]);

            foreach ($payslipsToInsert as $p) {
                StaffPayslip::create(array_merge($p, ['payroll_batch_id' => $batch->id]));
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Successfully processed and published {$batch->total_staff} staff payslips for {$period}.",
                'batch' => $batch,
                'summary' => [
                    'total_staff' => count($payslipsToInsert),
                    'matched_staff' => $matchedCount,
                    'unmatched_staff' => $unmatchedCount,
                    'total_earnings' => number_format($totalGross, 2),
                    'total_deductions' => number_format($totalDed, 2),
                    'total_net_salary' => number_format($totalNet, 2),
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Payroll upload error: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Database persistence failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Admin: List all uploaded payroll batches
     */
    public function getBatches(): JsonResponse
    {
        $batches = PayrollBatch::orderBy('payroll_year', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'batches' => $batches,
        ]);
    }

    /**
     * Admin: Delete an uploaded payroll batch and all linked payslips
     */
    public function deleteBatch(int $id): JsonResponse
    {
        $batch = PayrollBatch::find($id);
        if (!$batch) {
            return response()->json(['status' => 'error', 'message' => 'Batch not found'], 404);
        }

        $period = $batch->payroll_period;
        $batch->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Payroll batch for {$period} has been deleted.",
        ]);
    }

    /**
     * Staff: Get available payroll periods for the authenticated staff member
     */
    public function getStaffPeriods(Request $request): JsonResponse
    {
        $pf = $this->resolveStaffPf($request);

        $query = StaffPayslip::select('payroll_year', 'payroll_month', 'month_year_label')
            ->distinct();

        if ($pf) {
            $clean = $this->cleanPf($pf);
            $query->where(function ($q) use ($pf, $clean) {
                $q->where('pf_number', $pf)
                  ->orWhere('pf_number', 'like', "%{$clean}%");
            });
        }

        $records = $query->orderBy('payroll_year', 'desc')->get();

        $periodsByYear = [];
        foreach ($records as $r) {
            $y = (string) $r->payroll_year;
            if (!isset($periodsByYear[$y])) {
                $periodsByYear[$y] = [];
            }
            if (!in_array($r->payroll_month, $periodsByYear[$y])) {
                $periodsByYear[$y][] = $r->payroll_month;
            }
        }

        // Also get all distinct published batch periods
        $allBatches = PayrollBatch::select('payroll_year', 'payroll_month')
            ->distinct()
            ->orderBy('payroll_year', 'desc')
            ->get();

        $availableYears = array_unique(array_merge(array_keys($periodsByYear), $allBatches->pluck('payroll_year')->map(fn($v) => (string)$v)->toArray()));
        if (empty($availableYears)) {
            $availableYears = [date('Y')];
        }
        rsort($availableYears);

        return response()->json([
            'status' => 'success',
            'available_years' => array_values($availableYears),
            'periods_by_year' => $periodsByYear,
            'total_slips_available' => $records->count(),
        ]);
    }

    /**
     * Staff: Retrieve exact payslip for a specific month and year
     */
    public function getStaffPayslip(Request $request): JsonResponse
    {
        $year = (int) $request->get('year', date('Y'));
        $month = trim($request->get('month', 'July'));
        $pf = $this->resolveStaffPf($request);

        $query = StaffPayslip::where('payroll_year', $year)
            ->where('payroll_month', $month);

        if ($pf) {
            $clean = $this->cleanPf($pf);
            $query->where(function ($q) use ($pf, $clean) {
                $q->where('pf_number', $pf)
                  ->orWhere('pf_number', 'like', "%{$clean}%");
            });
        }

        $slip = $query->first();

        if (!$slip) {
            // If not found by specific PF, check if any payslip exists for this period to give helpful message
            $anyInBatch = StaffPayslip::where('payroll_year', $year)->where('payroll_month', $month)->exists();
            return response()->json([
                'status' => 'not_found',
                'message' => $anyInBatch
                    ? "Payslip for {$month} {$year} was uploaded, but no record was matched for PF Number: {$pf}."
                    : "Payslip for {$month} {$year} has not yet been released by the Bursary Directorate.",
                'payslip' => null,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'payslip' => [
                'id' => $slip->id,
                'pf_number' => $slip->pf_number,
                'monthYear' => $slip->month_year_label,
                'payroll_month' => $slip->payroll_month,
                'payroll_year' => $slip->payroll_year,
                'particulars' => $slip->employee_particulars,
                'incomes' => $slip->incomes,
                'deductions' => $slip->deductions,
                'totalEarnings' => number_format($slip->total_earnings, 2),
                'totalDeductions' => number_format($slip->total_deductions, 2),
                'netSalary' => number_format($slip->net_salary, 2),
            ],
        ]);
    }

    /**
     * Admin: List staff payslips with filtering by period or staff search
     */
    public function getAdminPayslips(Request $request): JsonResponse
    {
        $year = $request->query('year');
        $month = $request->query('month');
        $search = trim((string) $request->query('search', ''));
        $page = max(1, (int) $request->query('page', 1));
        $perPage = max(5, min(100, (int) $request->query('per_page', 15)));

        $query = DB::table('staff_payslips as sp')
            ->leftJoin('staff as s', 'sp.staff_id', '=', 's.staff_id')
            ->select(
                'sp.id',
                'sp.payroll_batch_id',
                'sp.staff_id',
                'sp.pf_number',
                'sp.payroll_month',
                'sp.payroll_year',
                'sp.month_year_label',
                'sp.employee_particulars',
                'sp.total_earnings',
                'sp.total_deductions',
                'sp.net_salary',
                'sp.updated_at',
                's.first_name',
                's.other_name',
                's.last_name',
                's.department',
                's.rank'
            );

        if (!empty($year) && $year !== 'all') {
            $query->where('sp.payroll_year', $year);
        }

        if (!empty($month) && $month !== 'all') {
            $query->where('sp.payroll_month', $month);
        }

        if ($search !== '') {
            $cleanSearch = $this->cleanPf($search);
            $query->where(function ($q) use ($search, $cleanSearch) {
                $q->where('sp.pf_number', 'like', "%{$search}%")
                  ->orWhere('s.first_name', 'like', "%{$search}%")
                  ->orWhere('s.last_name', 'like', "%{$search}%")
                  ->orWhere('s.other_name', 'like', "%{$search}%")
                  ->orWhere('sp.employee_particulars', 'like', "%{$search}%");
                if ($cleanSearch !== '') {
                    $q->orWhereRaw("REPLACE(REPLACE(sp.pf_number, '/', ''), '-', '') LIKE ?", ["%{$cleanSearch}%"]);
                }
            });
        }

        $total = $query->count();
        $items = $query->orderByDesc('sp.payroll_year')
            ->orderByRaw("FIELD(sp.payroll_month, 'December','November','October','September','August','July','June','May','April','March','February','January')")
            ->orderByDesc('sp.id')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get()
            ->map(function ($row) {
                $particulars = json_decode($row->employee_particulars ?? '{}', true) ?: [];
                $staffName = $particulars['full_name'] ?? trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? ''));
                if (empty($staffName)) {
                    $staffName = $row->pf_number;
                }
                return [
                    'id' => (int) $row->id,
                    'payroll_batch_id' => $row->payroll_batch_id ? (int) $row->payroll_batch_id : null,
                    'staff_id' => $row->staff_id ? (int) $row->staff_id : null,
                    'pf_number' => (string) $row->pf_number,
                    'staff_name' => $staffName,
                    'department' => $particulars['department'] ?? ($row->department ?? 'N/A'),
                    'designation' => $particulars['designation'] ?? ($row->rank ?? 'N/A'),
                    'payroll_month' => (string) $row->payroll_month,
                    'payroll_year' => (string) $row->payroll_year,
                    'month_year_label' => (string) ($row->month_year_label ?? "{$row->payroll_month}-{$row->payroll_year}"),
                    'total_earnings' => (float) $row->total_earnings,
                    'total_deductions' => (float) $row->total_deductions,
                    'net_salary' => (float) $row->net_salary,
                    'updated_at' => (string) $row->updated_at,
                ];
            });

        // Get distinct available years and months in the database
        $availablePeriods = DB::table('staff_payslips')
            ->select('payroll_year', 'payroll_month')
            ->distinct()
            ->orderByDesc('payroll_year')
            ->get();

        return response()->json([
            'status' => 'success',
            'payslips' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int) ceil($total / $perPage),
            'available_periods' => $availablePeriods,
        ]);
    }

    /**
     * Admin: Get detailed payslip record
     */
    public function getAdminPayslipDetail(int $id): JsonResponse
    {
        $payslip = DB::table('staff_payslips as sp')
            ->leftJoin('staff as s', 'sp.staff_id', '=', 's.staff_id')
            ->where('sp.id', $id)
            ->select('sp.*', 's.first_name', 's.other_name', 's.last_name', 's.department as staff_department', 's.rank as staff_rank', 's.level', 's.step')
            ->first();

        if (!$payslip) {
            return response()->json(['status' => 'error', 'message' => 'Payslip record not found.'], 404);
        }

        $particulars = json_decode($payslip->employee_particulars ?? '{}', true) ?: [];
        $incomes = json_decode($payslip->incomes ?? '[]', true) ?: [];
        $deductions = json_decode($payslip->deductions ?? '[]', true) ?: [];

        return response()->json([
            'status' => 'success',
            'payslip' => [
                'id' => (int) $payslip->id,
                'payroll_batch_id' => $payslip->payroll_batch_id ? (int) $payslip->payroll_batch_id : null,
                'staff_id' => $payslip->staff_id ? (int) $payslip->staff_id : null,
                'pf_number' => (string) $payslip->pf_number,
                'payroll_month' => (string) $payslip->payroll_month,
                'payroll_year' => (string) $payslip->payroll_year,
                'month_year_label' => (string) $payslip->month_year_label,
                'employee_particulars' => $particulars,
                'incomes' => $incomes,
                'deductions' => $deductions,
                'total_earnings' => (float) $payslip->total_earnings,
                'total_deductions' => (float) $payslip->total_deductions,
                'net_salary' => (float) $payslip->net_salary,
                'created_at' => (string) $payslip->created_at,
                'updated_at' => (string) $payslip->updated_at,
            ],
        ]);
    }

    /**
     * Admin: Look up staff details by PF Number or Name to auto-populate payslip particulars
     */
    public function lookupStaffForPayslip(Request $request): JsonResponse
    {
        $query = trim((string) ($request->query('query') ?: $request->query('q', '')));
        if ($query === '') {
            return response()->json(['status' => 'success', 'staff' => []]);
        }

        $clean = $this->cleanPf($query);
        $staff = DB::table('staff as s')
            ->leftJoin('ranks as r', 's.rank_id', '=', 'r.id')
            ->leftJoin('department as d', 's.department_id', '=', 'd.department_id')
            ->where(function ($q) use ($query, $clean) {
                $q->where('s.pf_number', 'like', "%{$query}%")
                  ->orWhere('s.first_name', 'like', "%{$query}%")
                  ->orWhere('s.last_name', 'like', "%{$query}%")
                  ->orWhere('s.other_name', 'like', "%{$query}%")
                  ->orWhere('s.email', 'like', "%{$query}%");
                if ($clean !== '') {
                    $q->orWhereRaw("REPLACE(REPLACE(s.pf_number, '/', ''), '-', '') LIKE ?", ["%{$clean}%"]);
                }
            })
            ->select(
                's.staff_id',
                's.pf_number',
                's.first_name',
                's.other_name',
                's.last_name',
                's.email',
                's.department as legacy_department',
                's.rank as legacy_rank',
                'd.name as department_name',
                'r.name as rank_name',
                's.level',
                's.step'
            )
            ->limit(10)
            ->get()
            ->map(function ($s) {
                $name = trim("{$s->first_name} " . ($s->other_name ? "{$s->other_name} " : '') . "{$s->last_name}");
                return [
                    'staff_id' => (int) $s->staff_id,
                    'pf_number' => (string) $s->pf_number,
                    'full_name' => $name,
                    'department' => (string) ($s->department_name ?: $s->legacy_department ?: ''),
                    'designation' => (string) ($s->rank_name ?: $s->legacy_rank ?: ''),
                    'salary_level' => (string) ($s->level ?: ''),
                    'salary_step' => (string) ($s->step ?: ''),
                ];
            });

        return response()->json(['status' => 'success', 'staff' => $staff]);
    }

    /**
     * Admin: Add or update staff payslip details for a particular month and year
     */
    public function saveAdminPayslip(Request $request): JsonResponse
    {
        $id = $request->input('id') ? (int) $request->input('id') : null;
        $pfNumber = trim((string) $request->input('pf_number', ''));
        $payrollYear = trim((string) $request->input('payroll_year', ''));
        $payrollMonth = trim((string) $request->input('payroll_month', ''));

        if ($pfNumber === '' || $payrollYear === '' || $payrollMonth === '') {
            return response()->json([
                'status' => 'error',
                'message' => 'Staff PF Number, Payroll Year, and Payroll Month are required.',
            ], 422);
        }

        // Clean PF and look up staff record
        $clean = $this->cleanPf($pfNumber);
        $staff = DB::table('staff')
            ->where(function ($q) use ($pfNumber, $clean) {
                $q->where('pf_number', $pfNumber);
                if ($clean !== '') {
                    $q->orWhereRaw("REPLACE(REPLACE(pf_number, '/', ''), '-', '') = ?", [$clean]);
                }
            })
            ->first();

        $staffId = $staff ? (int) $staff->staff_id : (int) $request->input('staff_id', 0);
        $monthYearLabel = "{$payrollMonth}-{$payrollYear}";

        // Particulars
        $inputParticulars = (array) ($request->input('employee_particulars') ?: $request->input('particulars', []));
        $particulars = [
            'full_name' => trim((string) ($inputParticulars['full_name'] ?? ($staff ? trim("{$staff->first_name} {$staff->last_name}") : $pfNumber))),
            'department' => trim((string) ($inputParticulars['department'] ?? ($staff->department ?? ''))),
            'designation' => trim((string) ($inputParticulars['designation'] ?? ($staff->rank ?? ''))),
            'salary_scale' => trim((string) ($inputParticulars['salary_scale'] ?? 'CONUASS')),
            'salary_level' => trim((string) ($inputParticulars['salary_level'] ?? ($staff->level ?? ''))),
            'salary_step' => trim((string) ($inputParticulars['salary_step'] ?? ($staff->step ?? ''))),
            'bank_name' => trim((string) ($inputParticulars['bank_name'] ?? '')),
            'account_no' => trim((string) ($inputParticulars['account_no'] ?? '')),
            'pfa_name' => trim((string) ($inputParticulars['pfa_name'] ?? '')),
            'pfa_pin' => trim((string) ($inputParticulars['pfa_pin'] ?? ($inputParticulars['pension_pin'] ?? ''))),
            'paypoint' => trim((string) ($inputParticulars['paypoint'] ?? 'Electronic Paypoint')),
        ];

        // Process incomes
        $rawIncomes = (array) $request->input('incomes', []);
        $incomes = [];
        $totalEarnings = 0.00;
        foreach ($rawIncomes as $inc) {
            $item = trim((string) ($inc['item'] ?? ($inc['name'] ?? '')));
            if ($item === '') continue;
            $amt = $this->parseAmount($inc['amount'] ?? 0);
            $totalEarnings += $amt;
            $incomes[] = [
                'item' => strtoupper($item),
                'amount' => number_format($amt, 2, '.', ','),
                'om' => (string) ($inc['om'] ?? ''),
            ];
        }

        // Process deductions
        $rawDeductions = (array) $request->input('deductions', []);
        $deductions = [];
        $totalDeductions = 0.00;
        foreach ($rawDeductions as $ded) {
            $item = trim((string) ($ded['item'] ?? ($ded['name'] ?? '')));
            if ($item === '') continue;
            $amt = $this->parseAmount($ded['amount'] ?? 0);
            $totalDeductions += $amt;
            $deductions[] = [
                'item' => strtoupper($item),
                'amount' => number_format($amt, 2, '.', ','),
                'om' => (string) ($ded['om'] ?? ''),
            ];
        }

        $netSalary = $totalEarnings - $totalDeductions;

        // Upsert logic: If ID given or matching pf + month + year already exists
        $existing = null;
        if ($id) {
            $existing = DB::table('staff_payslips')->where('id', $id)->first();
        }
        if (!$existing) {
            $existing = DB::table('staff_payslips')
                ->where('pf_number', $pfNumber)
                ->where('payroll_month', $payrollMonth)
                ->where('payroll_year', (int) $payrollYear)
                ->first();
        }

        // Resolve or create payroll_batch_id
        $batchId = $existing && $existing->payroll_batch_id ? (int) $existing->payroll_batch_id : 0;
        if ($batchId <= 0) {
            $batch = DB::table('payroll_batches')
                ->where('payroll_month', $payrollMonth)
                ->where('payroll_year', (int) $payrollYear)
                ->first();

            if ($batch) {
                $batchId = (int) $batch->id;
            } else {
                $batchId = (int) DB::table('payroll_batches')->insertGetId([
                    'payroll_year' => (int) $payrollYear,
                    'payroll_month' => $payrollMonth,
                    'payroll_period' => $monthYearLabel,
                    'original_file_name' => "Manual_Entry_{$monthYearLabel}.xlsx",
                    'file_path' => null,
                    'total_staff' => 1,
                    'total_earnings' => $totalEarnings,
                    'total_deductions' => $totalDeductions,
                    'total_net_salary' => $netSalary,
                    'uploaded_by' => null,
                    'status' => 'Published',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $data = [
            'payroll_batch_id' => $batchId,
            'staff_id' => $staffId > 0 ? $staffId : null,
            'pf_number' => $pfNumber,
            'payroll_month' => $payrollMonth,
            'payroll_year' => (int) $payrollYear,
            'month_year_label' => $monthYearLabel,
            'employee_particulars' => json_encode($particulars, JSON_UNESCAPED_UNICODE),
            'incomes' => json_encode($incomes, JSON_UNESCAPED_UNICODE),
            'deductions' => json_encode($deductions, JSON_UNESCAPED_UNICODE),
            'total_earnings' => $totalEarnings,
            'total_deductions' => $totalDeductions,
            'net_salary' => $netSalary,
            'updated_at' => now(),
        ];

        if ($existing) {
            DB::table('staff_payslips')->where('id', $existing->id)->update($data);
            $savedId = (int) $existing->id;
            $actionWord = 'updated';
        } else {
            $data['created_at'] = now();
            $savedId = (int) DB::table('staff_payslips')->insertGetId($data);
            $actionWord = 'added';
        }

        // Recalculate batch statistics
        if ($batchId > 0) {
            $batchTotals = DB::table('staff_payslips')
                ->where('payroll_batch_id', $batchId)
                ->selectRaw('COUNT(*) as total_staff, SUM(total_earnings) as total_earnings, SUM(total_deductions) as total_deductions, SUM(net_salary) as total_net_salary')
                ->first();

            if ($batchTotals) {
                DB::table('payroll_batches')->where('id', $batchId)->update([
                    'total_staff' => (int) ($batchTotals->total_staff ?? 0),
                    'total_earnings' => (float) ($batchTotals->total_earnings ?? 0.00),
                    'total_deductions' => (float) ($batchTotals->total_deductions ?? 0.00),
                    'total_net_salary' => (float) ($batchTotals->total_net_salary ?? 0.00),
                    'updated_at' => now(),
                ]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Payslip for {$pfNumber} ({$payrollMonth} {$payrollYear}) was {$actionWord} successfully.",
            'payslip_id' => $savedId,
            'summary' => [
                'total_earnings' => number_format($totalEarnings, 2),
                'total_deductions' => number_format($totalDeductions, 2),
                'net_salary' => number_format($netSalary, 2),
            ],
        ]);
    }

    /**
     * Admin: Delete an individual staff payslip record
     */
    public function deleteAdminPayslip(int $id): JsonResponse
    {
        $payslip = DB::table('staff_payslips')->where('id', $id)->first();
        if (!$payslip) {
            return response()->json(['status' => 'error', 'message' => 'Payslip record not found.'], 404);
        }

        $batchId = (int) ($payslip->payroll_batch_id ?? 0);
        DB::table('staff_payslips')->where('id', $id)->delete();

        // Recalculate batch statistics
        if ($batchId > 0) {
            $batchTotals = DB::table('staff_payslips')
                ->where('payroll_batch_id', $batchId)
                ->selectRaw('COUNT(*) as total_staff, SUM(total_earnings) as total_earnings, SUM(total_deductions) as total_deductions, SUM(net_salary) as total_net_salary')
                ->first();

            if ($batchTotals && (int) $batchTotals->total_staff > 0) {
                DB::table('payroll_batches')->where('id', $batchId)->update([
                    'total_staff' => (int) $batchTotals->total_staff,
                    'total_earnings' => (float) $batchTotals->total_earnings,
                    'total_deductions' => (float) $batchTotals->total_deductions,
                    'total_net_salary' => (float) $batchTotals->total_net_salary,
                    'updated_at' => now(),
                ]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Payslip record was deleted successfully.',
        ]);
    }

    /**
     * Helper: Normalize PF Number for robust matching (e.g. 'PF/5797' -> 'PF5797')
     */
    protected function cleanPf(?string $pf): string
    {
        if (!$pf) return '';
        return preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($pf)));
    }

    /**
     * Helper: Resolve current staff PF number from session or query param
     */
    protected function resolveStaffPf(Request $request): string
    {
        if ($request->has('pf') && !empty($request->get('pf'))) {
            return trim($request->get('pf'));
        }

        $staffId = (int) $request->session()->get('legacy_auth.staffId', 0);
        if ($staffId > 0) {
            $staff = DB::table('staff')->where('staff_id', $staffId)->first();
            if ($staff && !empty($staff->pf_number)) {
                return $staff->pf_number;
            }
        }

        // Fallback: check authenticated user's email matching staff
        $userId = (int) $request->session()->get('legacy_auth.userId', 0);
        if ($userId > 0) {
            $user = DB::table('user_account')->where('user_id', $userId)->first();
            if ($user && !empty($user->email)) {
                $staff = DB::table('staff')->where('email', $user->email)->first();
                if ($staff && !empty($staff->pf_number)) {
                    return $staff->pf_number;
                }
            }
        }

        return 'PF/5797'; // Default production PF number
    }

    /**
     * Helper: Parse string currency amount to float
     */
    protected function parseAmount(mixed $val): float
    {
        if (is_numeric($val)) {
            return (float) $val;
        }
        if (!is_string($val)) {
            return 0.00;
        }
        $clean = preg_replace('/[^0-9.]/', '', $val);
        return (float) $clean;
    }

    /**
     * Helper: Generate Microsoft XML Spreadsheet 2003 template
     */
    protected function buildExcelXmlTemplate(array $headers, array $sampleRows): string
    {
        $headerXml = '';
        foreach ($headers as $h) {
            $headerXml .= '    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">' . htmlspecialchars($h, ENT_QUOTES | ENT_XML1, 'UTF-8') . '</Data></Cell>' . "\n";
        }

        $rowsXml = '';
        foreach ($sampleRows as $row) {
            $rowsXml .= '   <Row ss:Height="22">' . "\n";
            foreach ($row as $colVal) {
                $isNum = is_numeric(str_replace(',', '', (string)$colVal));
                $type = $isNum ? 'Number' : 'String';
                $style = $isNum ? 'NumberStyle' : 'DataStyle';
                $rowsXml .= '    <Cell ss:StyleID="' . $style . '"><Data ss:Type="' . $type . '">' . htmlspecialchars((string)$colVal, ENT_QUOTES | ENT_XML1, 'UTF-8') . '</Data></Cell>' . "\n";
            }
            $rowsXml .= '   </Row>' . "\n";
        }

        return '<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#047857"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#064E3B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataStyle">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="NumberStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9.5" ss:Color="#0F172A"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="PayrollMaster">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="90"/>
   <Column ss:Width="140"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="85"/>
   <Column ss:Width="70"/>
   <Column ss:Width="65"/>
   <Column ss:Width="130"/>
   <Column ss:Width="100"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="85"/>
   <Column ss:Width="85"/>
   <Column ss:Width="90"/>
   <Row ss:Height="26">
' . $headerXml . '   </Row>
' . $rowsXml . '  </Table>
 </Worksheet>
</Workbook>';
    }
}
