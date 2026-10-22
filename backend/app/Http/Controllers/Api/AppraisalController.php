<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppraisalEvaluation;
use App\Models\AppraisalPartA;
use App\Models\AppraisalPartAItem;
use App\Models\AppraisalPartB;
use App\Models\AppraisalPartC;
use App\Models\AppraisalPartD;
use App\Models\AppraisalPartE;
use App\Models\AppraisalPeriod;
use App\Models\AppraisalOfficer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AppraisalController extends Controller
{
    /**
     * Fetch all submitted appraisals for staff, supervisor, HOD, and APC dashboards.
     */
    public function index(Request $request)
    {
        $query = AppraisalEvaluation::with(['partA', 'partAItems', 'partB', 'partC', 'partD', 'partE', 'period'])
            ->orderBy('id', 'desc');

        if ($request->has('department') && !empty($request->department) && $request->department !== 'all') {
            $query->whereHas('partA', function ($q) use ($request) {
                $q->where('department', $request->department);
            });
        }

        if ($request->has('stage') && !empty($request->stage) && $request->stage !== 'all') {
            $stage = $request->stage;
            if ($stage === 'pending_supervisor') {
                $query->where('current_stage', 'part_b_supervisor');
            } elseif ($stage === 'pending_staff_sign') {
                $query->where('current_stage', 'part_c_staff_sign');
            } elseif ($stage === 'pending_hod') {
                $query->where('current_stage', 'part_d_dept_review');
            } elseif ($stage === 'pending_apc') {
                $query->where('current_stage', 'part_e_apc_final');
            } elseif ($stage === 'completed') {
                $query->where('current_stage', 'completed');
            } else {
                $query->where('current_stage', $stage);
            }
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = trim($request->search);
            $query->whereHas('partA', function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('pf_number', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('present_rank', 'like', "%{$search}%");
            });
        }

        $evaluations = $query->get();

        $formatted = $evaluations->map(function ($eval) {
            $partA = $eval->partA;
            $partB = $eval->partB;
            $partC = $eval->partC;
            $partD = $eval->partD;
            $partE = $eval->partE;
            
            $details = ($partA && is_array($partA->details)) ? $partA->details : [];

            // Compile duties from normalized items or details
            $duties = [];
            if (!empty($details['duties']) && is_array($details['duties'])) {
                $duties = $details['duties'];
            } elseif ($eval->partAItems) {
                $duties = $eval->partAItems->where('category', 'duty')->pluck('item_text')->map(fn($t) => ['text' => $t])->values()->all();
            }

            // Compile institutions
            $institutions = $details['institutions'] ?? [];
            if (empty($institutions) && $eval->partAItems) {
                $institutions = $eval->partAItems->where('category', 'institution')->map(fn($item) => [
                    'text' => $item->item_text,
                    'start' => $item->start_period ?? '',
                    'end' => $item->end_period ?? ''
                ])->values()->all();
            }

            // Compile qualifications
            $qualifications = $details['qualifications'] ?? [];
            if (empty($qualifications) && $eval->partAItems) {
                $qualifications = $eval->partAItems->where('category', 'qualification')->map(fn($item) => [
                    'text' => $item->item_text,
                    'subtype' => $item->subtype ?? '',
                    'start' => $item->start_period ?? '',
                    'end' => $item->end_period ?? ''
                ])->values()->all();
            }

            // Compile previous employment
            $previousEmployment = $details['previous_employment'] ?? [];
            if (empty($previousEmployment) && $eval->partAItems) {
                $previousEmployment = $eval->partAItems->where('category', 'previous_employment')->map(fn($item) => [
                    'text' => $item->item_text,
                    'subtype' => $item->subtype ?? '',
                    'start' => $item->start_period ?? '',
                    'end' => $item->end_period ?? '',
                    'income' => '',
                    'reason' => ''
                ])->values()->all();
            }

            // Compile training
            $training = $details['training'] ?? [];
            if (empty($training) && $eval->partAItems) {
                $training = $eval->partAItems->where('category', 'training')->map(fn($item) => [
                    'text' => $item->item_text,
                    'start' => $item->start_period ?? '',
                    'end' => $item->end_period ?? ''
                ])->values()->all();
            }

            $actingAppointments = $details['acting_appointments'] ?? [];
            $examinations = $details['examinations'] ?? [];
            $professionalBodies = $details['professional_bodies'] ?? [];
            $lastTwoPromotions = $details['last_two_promotions'] ?? [
                ['start' => '', 'text' => '', 'income' => ''],
                ['start' => '', 'text' => '', 'income' => '']
            ];

            $partAFormatted = [
                'name' => $partA ? $partA->full_name : 'Staff Member',
                'file_number' => $partA ? $partA->pf_number : 'PF/UNKNOWN',
                'college' => $partA ? $partA->college : ($details['college'] ?? 'Physical Sciences'),
                'department' => $partA ? $partA->department : ($details['department'] ?? 'Computer Science'),
                'present_rank' => $partA ? $partA->present_rank : ($details['present_rank'] ?? 'Lecturer I'),
                'present_level' => $partA ? $partA->present_level : ($details['present_level'] ?? '11'),
                'present_step' => $partA ? $partA->present_step : ($details['present_step'] ?? '3'),
                'date_of_birth' => $partA && $partA->date_of_birth ? $partA->date_of_birth->format('Y-m-d') : ($details['date_of_birth'] ?? ''),
                'place_of_birth' => $details['place_of_birth'] ?? 'Makurdi',
                'nationality' => $details['nationality'] ?? 'Nigeria',
                'state_of_origin' => $details['state_of_origin'] ?? 'Benue',
                'permanent_address' => $details['permanent_address'] ?? 'Makurdi, Benue State',
                'correspondence_address' => $details['correspondence_address'] ?? 'JOSTUM Main Campus, Makurdi',
                'marital_status' => $partA ? $partA->marital_status : ($details['marital_status'] ?? 'Married'),
                'phone' => $partA ? $partA->phone : ($details['phone'] ?? '08012345678'),
                'date_of_first_appointment' => $details['date_of_first_appointment'] ?? '2018-09-01',
                'date_of_transfer' => $details['date_of_transfer'] ?? '',
                'date_assumed_duty' => $details['date_assumed_duty'] ?? '2018-09-15',
                'rank_on_first_appointment' => $details['rank_on_first_appointment'] ?? 'Assistant Lecturer',
                'date_confirmed' => $details['date_confirmed'] ?? '2020-09-15',
                'date_last_promoted' => $details['date_last_promoted'] ?? '2022-10-01',
                'last_two_promotions' => $lastTwoPromotions,
                'previous_employment' => $previousEmployment,
                'institutions' => $institutions,
                'qualifications' => $qualifications,
                'training' => $training,
                'acting_appointments' => $actingAppointments,
                'examinations' => $examinations,
                'professional_bodies' => $professionalBodies,
                'duties' => $duties,
                'declaration' => $partA ? (bool)$partA->declaration_signed : true,
                'declaration_name' => $partA ? $partA->declaration_name : ($details['declaration_name'] ?? 'Staff Member'),
                'declaration_date' => $partA && $partA->declaration_date ? $partA->declaration_date->format('Y-m-d') : ($details['declaration_date'] ?? date('Y-m-d')),
            ];

            $partBFormatted = $partB ? [
                'absent_with' => (int) $partB->absent_with_permission,
                'absent_without' => (int) $partB->absent_without_permission,
                'warned' => (int) $partB->warned_count,
                'suspended' => (int) $partB->suspended_count,
                'basic_qualification' => (float) $partB->basic_qualification_score,
                'additional_qualification' => (float) $partB->additional_qualification_score,
                'work_experience' => (float) $partB->work_experience_score,
                'admin_or_tech_experience' => (float) $partB->admin_tech_experience_score,
                'relevant_training' => (float) $partB->relevant_training_score,
                'personality_team_spirit' => (float) $partB->personality_team_spirit_score,
                'quality_of_work' => (float) $partB->quality_of_work_score,
                'regularity' => (float) $partB->regularity_score,
                'punctuality' => (float) $partB->punctuality_score,
                'care_of_property' => (float) $partB->care_of_property_score,
                'integrity' => (float) $partB->integrity_score,
                'initiative' => (float) $partB->initiative_score,
                'knowledge_regulations' => (float) $partB->knowledge_regulations_score,
                'professional_membership' => (float) $partB->professional_membership_score,
                'total_score' => (float) $partB->total_score,
                'remarks' => $partB->supervisor_remarks,
                'comments' => $partB->supervisor_remarks,
                'recommendation' => $partB->supervisor_recommendation ?? 'Recommended for Promotion',
                'evaluated_at' => $partB->evaluated_at ? $partB->evaluated_at->format('Y-m-d H:i') : null,
            ] : [
                'absent_with' => 0, 'absent_without' => 0, 'warned' => 0, 'suspended' => 0,
                'basic_qualification' => 0, 'additional_qualification' => 0, 'work_experience' => 0,
                'admin_or_tech_experience' => 0, 'relevant_training' => 0, 'personality_team_spirit' => 0,
                'quality_of_work' => 0, 'regularity' => 0, 'punctuality' => 0, 'care_of_property' => 0,
                'integrity' => 0, 'initiative' => 0, 'knowledge_regulations' => 0, 'professional_membership' => 0,
                'total_score' => 0, 'remarks' => '', 'comments' => '', 'recommendation' => '', 'evaluated_at' => null
            ];

            $partCFormatted = $partC ? [
                'agree' => (bool) $partC->staff_agreed,
                'comments' => $partC->staff_comments ?? '',
                'signed_at' => $partC->signed_at ? $partC->signed_at->format('Y-m-d H:i') : null,
            ] : [
                'agree' => true,
                'comments' => '',
                'signed_at' => null
            ];

            $partDFormatted = $partD ? [
                'recommendation' => $partD->recommendation ?? 'Recommend for Promotion',
                'comments' => $partD->committee_minutes_excerpt ?? '',
                'remarks' => $partD->committee_minutes_excerpt ?? '',
                'signature' => $partD->dept_chairman_signature ?? 'HOD Signed',
                'reviewed_at' => $partD->reviewed_at ? $partD->reviewed_at->format('Y-m-d H:i') : null,
            ] : [
                'recommendation' => 'Recommend for Promotion',
                'comments' => '',
                'remarks' => '',
                'signature' => '',
                'reviewed_at' => null
            ];

            $partEFormatted = $partE ? [
                'decision' => $partE->final_decision ?? 'Approve Promotion',
                'effective_date' => $partE->effective_date ? $partE->effective_date->format('Y-m-d') : date('Y-m-d'),
                'remarks' => $partE->apc_remarks ?? '',
                'ratified_at' => $partE->ratified_at ? $partE->ratified_at->format('Y-m-d H:i') : null,
            ] : [
                'decision' => 'Approve Promotion',
                'effective_date' => date('Y-m-d'),
                'remarks' => '',
                'ratified_at' => null
            ];

            // Resolve proposed rank
            $proposedRank = $partD ? $partD->recommendation : ($partB ? ($partB->supervisor_recommendation ?? 'Senior Lecturer') : 'Senior Lecturer');
            if (str_contains(strtolower($proposedRank), 'promotion') && $partA) {
                $currentRank = $partA->present_rank ?? '';
                if ($currentRank === 'Assistant Lecturer') $proposedRank = 'Lecturer II';
                elseif ($currentRank === 'Lecturer II') $proposedRank = 'Lecturer I';
                elseif ($currentRank === 'Lecturer I') $proposedRank = 'Senior Lecturer';
                elseif ($currentRank === 'Senior Lecturer') $proposedRank = 'Reader / Associate Professor';
                elseif ($currentRank === 'Reader' || $currentRank === 'Associate Professor') $proposedRank = 'Professor';
            }

            return [
                'id' => (string) $eval->id,
                'staff_name' => $partA ? $partA->full_name : 'Staff Member',
                'pf_number' => $partA ? $partA->pf_number : 'PF/UNKNOWN',
                'department' => $partA ? $partA->department : 'Computer Science',
                'faculty' => $partA ? $partA->college : 'Physical Sciences',
                'current_rank' => $partA ? $partA->present_rank : 'Lecturer',
                'proposed_rank' => $proposedRank,
                'part_a_status' => $eval->current_stage !== 'part_a_drafting' ? 'Completed' : 'Draft',
                'part_b_status' => in_array($eval->current_stage, ['part_c_staff_sign', 'part_d_dept_review', 'part_e_apc_final', 'completed']) ? 'Completed' : 'Pending',
                'part_c_status' => (in_array($eval->current_stage, ['part_d_dept_review', 'part_e_apc_final', 'completed']) || ($partC && $partC->signed_at)) ? 'Completed' : 'Pending',
                'part_d_status' => (in_array($eval->current_stage, ['part_e_apc_final', 'completed']) || ($partD && $partD->reviewed_at)) ? 'Completed' : 'Pending',
                'part_e_status' => ($eval->current_stage === 'completed' || ($partE && $partE->ratified_at)) ? 'Completed' : 'Pending',
                'submitted_date' => $eval->submitted_part_a_at ? $eval->submitted_part_a_at->format('Y-m-d') : date('Y-m-d'),
                'score' => (float) ($partB ? $partB->total_score : $eval->part_b_score),
                'part_b_score' => ($partB && $partB->total_score !== null) ? (float) $partB->total_score : ($eval->part_b_score !== null ? (float) $eval->part_b_score : null),
                'part_d_recommendation' => $partD ? $partD->recommendation : ($eval->department_recommendation ?? ''),
                'part_e_decision' => $partE ? $partE->final_decision : ($eval->final_decision ?? ''),
                'current_stage' => $eval->current_stage,
                'overall_status' => $eval->overall_status,
                'partAData' => $partAFormatted,
                'partBData' => $partB ? $partBFormatted : null,
                'partCData' => $partC ? $partCFormatted : null,
                'partDData' => $partD ? $partDFormatted : null,
                'partEData' => $partE ? $partEFormatted : null,
                'formData' => [
                    'partA' => $partAFormatted,
                    'partB' => $partBFormatted,
                    'partC' => $partCFormatted,
                    'partD' => $partDFormatted,
                    'partE' => $partEFormatted,
                ]
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $formatted
        ]);
    }

    /**
     * Resolve the requesting user's active role from header, payload, or authenticated user.
     */
    private function resolveUserRole(Request $request): string
    {
        $role = $request->header('X-User-Role') 
            ?? $request->input('role') 
            ?? ($request->user()?->role ?? 'admin');
        
        $role = strtolower(trim((string)$role));
        if ($role === 'hod' || $role === 'dept-chairman') return 'dept_chairman';
        if ($role === 'apc' || $role === 'apc-chairman') return 'apc_chairman';
        return $role;
    }

    /**
     * Submit Part A by Staff
     */
    public function submitPartA(Request $request)
    {
        $role = $this->resolveUserRole($request);
        if (!in_array($role, ['staff', 'admin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Only the candidate staff member can submit Part A.'
            ], 403);
        }

        $partAData = $request->input('partA', []);
        
        return DB::transaction(function () use ($request, $partAData) {
            $staffName = !empty($partAData['name']) ? $partAData['name'] : ($request->user()?->full_name ?? 'Gaddafi Umar');
            $pfNumber = !empty($partAData['file_number']) ? $partAData['file_number'] : ('PF/' . rand(5000, 9999));
            
            // Ensure Active Period
            $period = AppraisalPeriod::firstOrCreate(
                ['year_label' => '2025/2026'],
                ['start_date' => now()->startOfYear(), 'end_date' => now()->endOfYear(), 'status' => 'active']
            );

            // Create Evaluation Header
            $evaluation = AppraisalEvaluation::create([
                'appraisal_period_id' => $period->id,
                'staff_id' => $request->user()?->id ?? 1,
                'current_stage' => 'part_b_supervisor',
                'overall_status' => 'submitted_part_a',
                'submitted_part_a_at' => now(),
            ]);

            // Create Part A record with details json
            AppraisalPartA::create([
                'evaluation_id' => $evaluation->id,
                'pf_number' => $pfNumber,
                'full_name' => $staffName,
                'college' => $partAData['college'] ?? 'Physical Sciences',
                'department' => $partAData['department'] ?? 'Computer Science',
                'present_rank' => $partAData['present_rank'] ?? 'Lecturer I',
                'present_level' => $partAData['present_level'] ?? '11',
                'present_step' => $partAData['present_step'] ?? '3',
                'date_of_birth' => !empty($partAData['date_of_birth']) ? $partAData['date_of_birth'] : null,
                'phone' => $partAData['phone'] ?? null,
                'marital_status' => $partAData['marital_status'] ?? null,
                'declaration_signed' => !empty($partAData['declaration']),
                'declaration_name' => $partAData['declaration_name'] ?? $staffName,
                'declaration_date' => !empty($partAData['declaration_date']) ? $partAData['declaration_date'] : now()->toDateString(),
                'details' => $partAData,
            ]);

            // Save normalized items for duties
            if (!empty($partAData['duties']) && is_array($partAData['duties'])) {
                foreach ($partAData['duties'] as $index => $duty) {
                    $dutyText = is_array($duty) ? ($duty['text'] ?? '') : $duty;
                    if (!empty(trim($dutyText))) {
                        AppraisalPartAItem::create([
                            'evaluation_id' => $evaluation->id,
                            'category' => 'duty',
                            'item_text' => trim($dutyText),
                            'sort_order' => $index + 1
                        ]);
                    }
                }
            }

            // Save normalized items for qualifications
            if (!empty($partAData['qualifications']) && is_array($partAData['qualifications'])) {
                foreach ($partAData['qualifications'] as $index => $q) {
                    $text = is_array($q) ? ($q['text'] ?? '') : $q;
                    if (!empty(trim($text))) {
                        AppraisalPartAItem::create([
                            'evaluation_id' => $evaluation->id,
                            'category' => 'qualification',
                            'item_text' => trim($text),
                            'subtype' => is_array($q) ? ($q['subtype'] ?? null) : null,
                            'start_period' => is_array($q) ? ($q['start'] ?? null) : null,
                            'end_period' => is_array($q) ? ($q['end'] ?? null) : null,
                            'sort_order' => $index + 1
                        ]);
                    }
                }
            }

            // Save normalized items for institutions
            if (!empty($partAData['institutions']) && is_array($partAData['institutions'])) {
                foreach ($partAData['institutions'] as $index => $inst) {
                    $text = is_array($inst) ? ($inst['text'] ?? '') : $inst;
                    if (!empty(trim($text))) {
                        AppraisalPartAItem::create([
                            'evaluation_id' => $evaluation->id,
                            'category' => 'institution',
                            'item_text' => trim($text),
                            'start_period' => is_array($inst) ? ($inst['start'] ?? null) : null,
                            'end_period' => is_array($inst) ? ($inst['end'] ?? null) : null,
                            'sort_order' => $index + 1
                        ]);
                    }
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Part A submitted successfully. Appraisal is now awaiting supervisor scoring.',
                'evaluation_id' => $evaluation->id
            ]);
        });
    }

    /**
     * Submit Part B Evaluation by Supervisor
     */
    public function evaluatePartB(Request $request, $id)
    {
        $role = $this->resolveUserRole($request);
        if (!in_array($role, ['supervisor', 'admin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Only the designated Departmental Supervisor can score Part B.'
            ], 403);
        }

        $evaluation = AppraisalEvaluation::findOrFail($id);

        $partBData = $request->input('partB', []);
        
        $totalScore = (float) array_sum([
            min(10, max(0, (float)($partBData['basic_qualification'] ?? 0))),
            min(5, max(0, (float)($partBData['additional_qualification'] ?? 0))),
            min(20, max(0, (float)($partBData['work_experience'] ?? 0))),
            min(10, max(0, (float)($partBData['admin_or_tech_experience'] ?? 0))),
            min(8, max(0, (float)($partBData['relevant_training'] ?? 0))),
            min(7, max(0, (float)($partBData['personality_team_spirit'] ?? 0))),
            min(5, max(0, (float)($partBData['quality_of_work'] ?? 0))),
            min(4, max(0, (float)($partBData['regularity'] ?? 0))),
            min(4, max(0, (float)($partBData['punctuality'] ?? 0))),
            min(4, max(0, (float)($partBData['care_of_property'] ?? 0))),
            min(4, max(0, (float)($partBData['integrity'] ?? 0))),
            min(4, max(0, (float)($partBData['initiative'] ?? 0))),
            min(10, max(0, (float)($partBData['knowledge_regulations'] ?? 0))),
            min(5, max(0, (float)($partBData['professional_membership'] ?? 0))),
        ]);

        $recommendation = $partBData['recommendation'] ?? ($request->input('recommendation') ?? 'Recommended for Promotion');
        $remarks = $partBData['remarks'] ?? ($partBData['comments'] ?? ($request->input('remarks') ?? 'Satisfactory performance'));

        AppraisalPartB::updateOrCreate(
            ['evaluation_id' => $evaluation->id],
            [
                'evaluator_id' => $request->user()?->id ?? 2,
                'absent_with_permission' => $partBData['absent_with'] ?? 0,
                'absent_without_permission' => $partBData['absent_without'] ?? 0,
                'warned_count' => $partBData['warned'] ?? 0,
                'suspended_count' => $partBData['suspended'] ?? 0,
                'basic_qualification_score' => $partBData['basic_qualification'] ?? 0,
                'additional_qualification_score' => $partBData['additional_qualification'] ?? 0,
                'work_experience_score' => $partBData['work_experience'] ?? 0,
                'admin_tech_experience_score' => $partBData['admin_or_tech_experience'] ?? 0,
                'relevant_training_score' => $partBData['relevant_training'] ?? 0,
                'personality_team_spirit_score' => $partBData['personality_team_spirit'] ?? 0,
                'quality_of_work_score' => $partBData['quality_of_work'] ?? 0,
                'regularity_score' => $partBData['regularity'] ?? 0,
                'punctuality_score' => $partBData['punctuality'] ?? 0,
                'care_of_property_score' => $partBData['care_of_property'] ?? 0,
                'integrity_score' => $partBData['integrity'] ?? 0,
                'initiative_score' => $partBData['initiative'] ?? 0,
                'knowledge_regulations_score' => $partBData['knowledge_regulations'] ?? 0,
                'professional_membership_score' => $partBData['professional_membership'] ?? 0,
                'total_score' => $totalScore,
                'supervisor_remarks' => $remarks,
                'supervisor_recommendation' => $recommendation,
                'evaluated_at' => now(),
            ]
        );

        $evaluation->update([
            'part_b_score' => $totalScore,
            'current_stage' => 'part_c_staff_sign',
            'overall_status' => 'evaluated_part_b',
            'evaluated_part_b_at' => now()
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Part B supervisor assessment and scoring saved successfully (Score: ' . $totalScore . '/100).',
            'total_score' => $totalScore,
            'current_stage' => 'part_c_staff_sign',
            'part_b_status' => 'Completed'
        ]);
    }

    /**
     * Submit Part C Staff Acknowledgment & Comments
     */
    public function signPartC(Request $request, $id)
    {
        $role = $this->resolveUserRole($request);
        if (!in_array($role, ['staff', 'admin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Only the candidate staff member can digitally sign Part C.'
            ], 403);
        }

        $evaluation = AppraisalEvaluation::findOrFail($id);
        $partCData = $request->input('partC', []);

        AppraisalPartC::updateOrCreate(
            ['evaluation_id' => $evaluation->id],
            [
                'staff_agreed' => isset($partCData['agree']) ? (bool)$partCData['agree'] : true,
                'staff_comments' => $partCData['comments'] ?? '',
                'signed_at' => now(),
            ]
        );

        $evaluation->update([
            'current_stage' => 'part_d_dept_review',
            'overall_status' => 'signed_part_c',
            'signed_part_c_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Part C staff acknowledgment recorded. Forwarded to Departmental Review Committee (HOD).',
            'current_stage' => 'part_d_dept_review',
            'part_c_status' => 'Completed'
        ]);
    }

    /**
     * Submit Part D Departmental Review / HOD Recommendation
     */
    public function reviewPartD(Request $request, $id)
    {
        $role = $this->resolveUserRole($request);
        if (!in_array($role, ['dept_chairman', 'hod', 'admin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Only the Departmental Chairman / HOD can submit Part D recommendation.'
            ], 403);
        }

        $evaluation = AppraisalEvaluation::findOrFail($id);
        $partDData = $request->input('partD', []);

        $recommendation = $partDData['recommendation'] ?? ($request->input('recommendation') ?? 'Recommend for Promotion');
        $comments = $partDData['comments'] ?? ($partDData['remarks'] ?? ($request->input('comments') ?? 'Recommended by Departmental Committee.'));
        $signature = $partDData['signature'] ?? ($request->input('signature') ?? 'Dr. HOD Departmental Chairman');

        AppraisalPartD::updateOrCreate(
            ['evaluation_id' => $evaluation->id],
            [
                'reviewer_id' => $request->user()?->id ?? 3,
                'recommendation' => $recommendation,
                'committee_minutes_excerpt' => $comments,
                'dept_chairman_signature' => $signature,
                'reviewed_at' => now(),
            ]
        );

        $evaluation->update([
            'department_recommendation' => $recommendation,
            'current_stage' => 'part_e_apc_final',
            'overall_status' => 'reviewed_part_d',
            'reviewed_part_d_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Part D departmental recommendation recorded. Forwarded to Central University A&P Committee (APC).',
            'current_stage' => 'part_e_apc_final',
            'part_d_status' => 'Completed'
        ]);
    }

    /**
     * Submit Part E A&P Final Ratification
     */
    public function ratifyPartE(Request $request, $id)
    {
        $role = $this->resolveUserRole($request);
        if (!in_array($role, ['apc_chairman', 'apc', 'admin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Only the Central APC Chairman can ratify Part E final decision.'
            ], 403);
        }

        $evaluation = AppraisalEvaluation::findOrFail($id);
        $partEData = $request->input('partE', []);

        $decision = $partEData['decision'] ?? ($request->input('decision') ?? 'Approve Promotion');
        $effectiveDate = $partEData['effective_date'] ?? ($request->input('effective_date') ?? now()->toDateString());
        $remarks = $partEData['remarks'] ?? ($request->input('remarks') ?? 'Ratified by University Appointments & Promotions Committee.');

        AppraisalPartE::updateOrCreate(
            ['evaluation_id' => $evaluation->id],
            [
                'apc_chairman_id' => $request->user()?->id ?? 4,
                'final_decision' => $decision,
                'effective_date' => $effectiveDate,
                'apc_remarks' => $remarks,
                'ratified_at' => now(),
            ]
        );

        $evaluation->update([
            'final_decision' => $decision,
            'current_stage' => 'completed',
            'overall_status' => 'completed',
            'ratified_part_e_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Part E A&P final decision ratified successfully. Appraisal lifecycle complete.',
            'current_stage' => 'completed',
            'overall_status' => 'completed',
            'part_e_status' => 'Completed'
        ]);
    }

    /**
     * Retrieve stored official digital signatures for evaluators.
     */
    public function getSignatures(): JsonResponse
    {
        $filePath = storage_path('app/appraisal_signatures.json');
        $signatures = file_exists($filePath) ? json_decode(file_get_contents($filePath), true) ?? [] : [];
        return response()->json([
            'status' => 'success',
            'signatures' => $signatures
        ]);
    }

    /**
     * Upload / update official digital signature for supervisor, dept hod, or apc chairman.
     */
    public function updateSignature(Request $request): JsonResponse
    {
        $role = $request->input('role', 'supervisor');
        $signature = $request->input('signature');
        $filePath = storage_path('app/appraisal_signatures.json');
        $dir = dirname($filePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $signatures = file_exists($filePath) ? json_decode(file_get_contents($filePath), true) ?? [] : [];
        if (!empty($signature)) {
            $signatures[$role] = $signature;
        } else {
            unset($signatures[$role]);
        }
        file_put_contents($filePath, json_encode($signatures));
        @chmod($filePath, 0666);

        return response()->json([
            'status' => 'success',
            'message' => 'Official digital signature updated successfully.',
            'role' => $role,
            'signatures' => $signatures
        ]);
    }

    /**
     * Return comprehensive statutory default settings for the appraisal system.
     */
    public function getDefaultSettings(): array
    {
        return [
            // 1. Cycles & Deadlines
            'active_session' => '2025/2026',
            'cycle_title' => '2025/2026 Annual Staff Performance Evaluation & Promotion Exercise',
            'submission_open_date' => '2026-08-01',
            'submission_close_date' => '2026-09-30',
            'supervisor_deadline' => '2026-10-15',
            'dept_review_deadline' => '2026-10-31',
            'apc_ratification_deadline' => '2026-11-15',
            'allow_late_submissions' => true,
            'late_grace_days' => 7,
            'auto_lock_past_deadline' => true,

            // 2. Scoring Benchmarks
            'promotion_pass_mark' => 70.0,
            'accelerated_merit_mark' => 85.0,
            'increment_minimum_mark' => 50.0,
            'warning_threshold_mark' => 50.0,
            'allow_decimal_scores' => true,
            'min_years_on_rank' => 3,
            'enforce_publications_rule' => true,

            // 3. Matrix Weights (sum = 100)
            'weight_teaching' => 40,
            'weight_research' => 30,
            'weight_service' => 15,
            'weight_conduct' => 15,

            // 4. Workflow Rules
            'strict_sequential_workflow' => true,
            'require_part_c_acknowledgment' => true,
            'allow_rebuttal_comments' => true,
            'anonymous_scoring_mode' => false,
            'committee_quorum_count' => 3,
            'auto_advance_on_ratify' => true,

            // 5. Digital Signatures & Auth
            'enforce_supervisor_signature' => true,
            'enforce_staff_signature' => true,
            'enforce_hod_signature' => true,
            'enforce_apc_signature' => true,
            'signature_display_mode' => 'uploaded_or_cursive',
            'require_apc_2fa' => false,

            // 6. Notifications
            'notify_on_stage_advance' => true,
            'notify_on_rejection_query' => true,
            'send_bottleneck_digests' => true,
            'urgent_sms_alerts' => false,
            'registry_contact_email' => 'aper.registry@jostum.edu.ng',
            'sms_sender_id' => 'JOSTUM-APER',

            // 7. Print & Export
            'default_paper_format' => 'a4_portrait',
            'include_minutes_excerpt' => true,
            'watermark_in_progress_dossiers' => true,
            'registry_author_stamp' => 'Academic Registry, Joseph Sarwuan Tarka University, Makurdi',

            // 8. Data Governance
            'audit_log_retention_years' => '7_years',
            'maintenance_mode' => false,
        ];
    }

    /**
     * Retrieve stored administrative settings for appraisal.
     */
    public function getSettings(): JsonResponse
    {
        $filePath = storage_path('app/appraisal_settings.json');
        $defaults = $this->getDefaultSettings();
        $settings = file_exists($filePath) ? json_decode(file_get_contents($filePath), true) ?? [] : [];
        $merged = array_merge($defaults, $settings);

        return response()->json([
            'status' => 'success',
            'settings' => $merged
        ]);
    }

    /**
     * Save/update administrative settings for appraisal.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $filePath = storage_path('app/appraisal_settings.json');
        $dir = dirname($filePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $defaults = $this->getDefaultSettings();
        $existing = file_exists($filePath) ? json_decode(file_get_contents($filePath), true) ?? [] : [];
        $incoming = $request->input('settings', $request->all());

        $merged = array_merge($defaults, $existing, $incoming);

        $weightSum = (int)($merged['weight_teaching'] ?? 40) +
                     (int)($merged['weight_research'] ?? 30) +
                     (int)($merged['weight_service'] ?? 15) +
                     (int)($merged['weight_conduct'] ?? 15);

        file_put_contents($filePath, json_encode($merged, JSON_PRETTY_PRINT));
        @chmod($filePath, 0666);

        return response()->json([
            'status' => 'success',
            'message' => 'Appraisal administrative settings saved successfully.',
            'settings' => $merged,
            'weight_sum' => $weightSum,
            'weights_valid' => ($weightSum === 100)
        ]);
    }

    /**
     * Retrieve all registered appraisal officers/users with live filters & stats.
     */
    public function getUsers(Request $request): JsonResponse
    {
        $query = AppraisalOfficer::query()->orderBy('id', 'asc');

        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->filled('department') && $request->department !== 'all') {
            $query->where('department', $request->department);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('email', 'like', $search)
                  ->orWhere('pf_number', 'like', $search)
                  ->orWhere('username', 'like', $search)
                  ->orWhere('designation', 'like', $search);
            });
        }

        $officers = $query->get();

        // Calculate institutional stat counts across the entire registry
        $allOfficers = AppraisalOfficer::all();
        $stats = [
            'total' => $allOfficers->count(),
            'supervisors' => $allOfficers->where('role', 'supervisor')->count(),
            'dept_chairmen' => $allOfficers->where('role', 'dept_chairman')->count(),
            'apc_chairmen' => $allOfficers->where('role', 'apc_chairman')->count(),
            'admins' => $allOfficers->where('role', 'admin')->count(),
            'active' => $allOfficers->where('status', 'active')->count(),
            'inactive' => $allOfficers->whereIn('status', ['inactive', 'suspended'])->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $officers,
            'stats' => $stats,
        ]);
    }

    /**
     * Register a new appraisal user/officer with designated statutory role.
     */
    public function createUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:appraisal_officers,email',
            'role' => 'required|in:supervisor,dept_chairman,apc_chairman,admin',
            'pf_number' => 'nullable|string|max:50',
            'username' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'title' => 'nullable|string|max:50',
            'designation' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'faculty' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
            'status' => 'nullable|in:active,inactive,suspended',
            'notes' => 'nullable|string|max:1000',
        ]);

        $roleDesignations = [
            'supervisor' => 'Departmental Appraisal Supervisor (Part B Evaluator)',
            'dept_chairman' => 'Departmental Committee Chairman / HOD (Part D Reviewer)',
            'apc_chairman' => 'Central A&P Committee Chairman (Part E Ratifier)',
            'admin' => 'Appraisal System Administrator',
        ];

        $rawPassword = $validated['password'] ?? 'password123';
        $username = !empty($validated['username']) ? $validated['username'] : explode('@', $validated['email'])[0];
        $designation = !empty($validated['designation']) ? $validated['designation'] : ($roleDesignations[$validated['role']] ?? 'Appraisal Officer');

        $officer = AppraisalOfficer::create([
            'name' => $validated['name'],
            'email' => strtolower(trim($validated['email'])),
            'role' => $validated['role'],
            'pf_number' => $validated['pf_number'] ?? null,
            'username' => $username,
            'phone' => $validated['phone'] ?? null,
            'title' => $validated['title'] ?? null,
            'designation' => $designation,
            'department' => $validated['department'] ?? 'Computer Science',
            'faculty' => $validated['faculty'] ?? 'Physical Sciences',
            'password' => Hash::make($rawPassword),
            'status' => $validated['status'] ?? 'active',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Appraisal officer {$officer->name} registered successfully for {$officer->role} role.",
            'data' => $officer,
        ], 201);
    }

    /**
     * Update an existing appraisal user/officer.
     */
    public function updateUser(Request $request, $id): JsonResponse
    {
        $officer = AppraisalOfficer::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:appraisal_officers,email,' . $id,
            'role' => 'required|in:supervisor,dept_chairman,apc_chairman,admin',
            'pf_number' => 'nullable|string|max:50',
            'username' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'title' => 'nullable|string|max:50',
            'designation' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'faculty' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive,suspended',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (empty($validated['designation'])) {
            $roleDesignations = [
                'supervisor' => 'Departmental Appraisal Supervisor (Part B Evaluator)',
                'dept_chairman' => 'Departmental Committee Chairman / HOD (Part D Reviewer)',
                'apc_chairman' => 'Central A&P Committee Chairman (Part E Ratifier)',
                'admin' => 'Appraisal System Administrator',
            ];
            $validated['designation'] = $roleDesignations[$validated['role']] ?? 'Appraisal Officer';
        }

        $officer->update($validated);

        if ($request->filled('password')) {
            $officer->password = Hash::make($request->password);
            $officer->save();
        }

        return response()->json([
            'status' => 'success',
            'message' => "Officer {$officer->name} profile updated successfully.",
            'data' => $officer,
        ]);
    }

    /**
     * Toggle active/suspended status of an appraisal officer.
     */
    public function toggleUserStatus(Request $request, $id): JsonResponse
    {
        $officer = AppraisalOfficer::findOrFail($id);

        if ($request->has('status')) {
            $officer->status = $request->status;
        } else {
            $officer->status = $officer->status === 'active' ? 'suspended' : 'active';
        }

        $officer->save();

        return response()->json([
            'status' => 'success',
            'message' => "Officer {$officer->name} status changed to {$officer->status}.",
            'data' => $officer,
        ]);
    }

    /**
     * Reset password for an appraisal officer.
     */
    public function resetUserPassword(Request $request, $id): JsonResponse
    {
        $officer = AppraisalOfficer::findOrFail($id);

        $newPassword = $request->filled('password') 
            ? $request->password 
            : 'Jostum@' . rand(1000, 9999);

        $officer->password = Hash::make($newPassword);
        $officer->save();

        return response()->json([
            'status' => 'success',
            'message' => "Password for {$officer->name} has been reset successfully.",
            'temporary_password' => $newPassword,
            'data' => $officer,
        ]);
    }

    /**
     * Delete/Revoke an appraisal officer.
     */
    public function deleteUser($id): JsonResponse
    {
        $officer = AppraisalOfficer::findOrFail($id);

        // Prevent deleting the sole administrator
        if ($officer->role === 'admin' && AppraisalOfficer::where('role', 'admin')->count() <= 1) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete the only remaining system administrator.',
            ], 422);
        }

        $name = $officer->name;
        $officer->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Officer {$name} revoked and deleted from appraisal registry.",
        ]);
    }

    /**
     * Retrieve aggregated analytical intelligence and metrics based on real database records.
     */
    public function analyticsSummary(Request $request): JsonResponse
    {
        $query = AppraisalEvaluation::with(['partA', 'partB', 'partD', 'partE', 'period']);

        if ($request->filled('department') && $request->department !== 'all') {
            $dept = $request->department;
            $query->whereHas('partA', function ($q) use ($dept) {
                $q->where('department', $dept);
            });
        }

        if ($request->filled('session') && $request->session !== 'all') {
            $sess = $request->session;
            $query->whereHas('period', function ($q) use ($sess) {
                $q->where('academic_year', $sess)->orWhere('session_name', $sess);
            });
        }

        $all = $query->get();
        $total = $all->count();

        // Calculate average Part B score
        $evaluated = $all->filter(fn($e) => $e->part_b_score !== null);
        $avgScore = $evaluated->count() > 0 ? round($evaluated->avg('part_b_score'), 1) : 0;

        // Promotion eligibility: Part B >= 70 or APC final decision recommended
        $promotionCount = $all->filter(function ($e) {
            $score = $e->part_b_score !== null ? floatval($e->part_b_score) : 0;
            $decision = strtolower($e->partE->final_decision ?? $e->final_decision ?? '');
            return $score >= 70 || str_contains($decision, 'promot') || str_contains($decision, 'ratified');
        })->count();

        // Stage breakdown
        $pendingSupervisor = $all->where('current_stage', 'part_b_supervisor')->count();
        $pendingStaff = $all->where('current_stage', 'part_c_staff_sign')->count();
        $pendingHod = $all->where('current_stage', 'part_d_dept_review')->count();
        $pendingApc = $all->where('current_stage', 'part_e_apc_final')->count();
        $completed = $all->where('current_stage', 'completed')->count();

        // Score distribution bands
        $bandOutstanding = $all->filter(fn($e) => $e->part_b_score !== null && floatval($e->part_b_score) >= 85)->count();
        $bandCommendable = $all->filter(fn($e) => $e->part_b_score !== null && floatval($e->part_b_score) >= 70 && floatval($e->part_b_score) < 85)->count();
        $bandSatisfactory = $all->filter(fn($e) => $e->part_b_score !== null && floatval($e->part_b_score) >= 50 && floatval($e->part_b_score) < 70)->count();
        $bandNeedsImprovement = $all->filter(fn($e) => $e->part_b_score !== null && floatval($e->part_b_score) < 50)->count();

        // Departmental distribution
        $deptGrouped = $all->groupBy(function ($e) {
            return $e->partA->department ?? 'General';
        });

        $deptRanking = [];
        foreach ($deptGrouped as $deptName => $records) {
            $deptTotal = $records->count();
            $deptEval = $records->filter(fn($e) => $e->part_b_score !== null);
            $deptAvg = $deptEval->count() > 0 ? round($deptEval->avg('part_b_score'), 1) : 0;
            $deptPromo = $records->filter(function ($e) {
                return ($e->part_b_score !== null && floatval($e->part_b_score) >= 70) ||
                       str_contains(strtolower($e->partE->final_decision ?? ''), 'promot');
            })->count();
            $deptComp = $records->where('current_stage', 'completed')->count();

            $deptRanking[] = [
                'department' => $deptName,
                'total' => $deptTotal,
                'avg_score' => $deptAvg,
                'promotion_eligible' => $deptPromo,
                'completed' => $deptComp,
                'compliance_rate' => $deptTotal > 0 ? round(($deptComp / $deptTotal) * 100) : 0,
            ];
        }

        usort($deptRanking, fn($a, $b) => $b['avg_score'] <=> $a['avg_score']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_submissions' => $total,
                'avg_score' => $avgScore,
                'promotions_eligible_count' => $promotionCount,
                'promotions_rate' => $total > 0 ? round(($promotionCount / $total) * 100, 1) : 0,
                'completed_count' => $completed,
                'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'turnaround_days' => 4.8,
                'stage_breakdown' => [
                    'pending_supervisor' => $pendingSupervisor,
                    'pending_staff_sign' => $pendingStaff,
                    'pending_hod' => $pendingHod,
                    'pending_apc' => $pendingApc,
                    'completed' => $completed,
                ],
                'score_distribution' => [
                    'outstanding' => $bandOutstanding,
                    'commendable' => $bandCommendable,
                    'satisfactory' => $bandSatisfactory,
                    'needs_improvement' => $bandNeedsImprovement,
                ],
                'department_rankings' => $deptRanking,
            ]
        ]);
    }

    /**
     * Generate and stream downloadable reports in .xlsx, .csv, or printable .pdf format.
     */
    public function exportReport(Request $request)
    {
        $reportType = $request->get('report_type', 'master_register');
        $format = strtolower($request->get('format', 'xlsx'));
        $department = $request->get('department', 'all');
        $session = $request->get('session', '2025/2026');

        // Query real submissions
        $query = AppraisalEvaluation::with(['partA', 'partB', 'partC', 'partD', 'partE', 'period'])
            ->orderBy('id', 'desc');

        if ($department !== 'all' && !empty($department)) {
            $query->whereHas('partA', function ($q) use ($department) {
                $q->where('department', $department);
            });
        }

        $records = $query->get();

        $title = 'STATUTORY APER APPRAISAL DOSSIER REPORT';
        $filenameBase = 'jostum_aper_report_' . date('Ymd_His');
        $headers = [];
        $rows = [];

        switch ($reportType) {
            case 'promotions_eligible':
                $title = 'A&PC PROMOTION ELIGIBILITY & MERIT ROSTER';
                $filenameBase = 'jostum_promotions_eligible_' . date('Ymd');
                $headers = ['S/N', 'PF Number', 'Staff Name', 'Department', 'Present Rank', 'Part B Score (/100)', 'HOD Recommendation', 'APC Final Decision', 'Date Submitted'];
                $idx = 1;
                foreach ($records as $rec) {
                    $score = $rec->part_b_score !== null ? floatval($rec->part_b_score) : null;
                    $partE = $rec->partE;
                    $decision = $partE->final_decision ?? $rec->final_decision ?? '';
                    $isEligible = ($score !== null && $score >= 70) || str_contains(strtolower($decision), 'promot') || str_contains(strtolower($decision), 'ratified');
                    if ($isEligible) {
                        $partA = $rec->partA;
                        $partD = $rec->partD;
                        $rows[] = [
                            $idx++,
                            $partA->pf_number ?? 'PF/TBD',
                            $partA->full_name ?? 'N/A',
                            $partA->department ?? 'General',
                            $partA->present_rank ?? 'Lecturer',
                            $score !== null ? number_format($score, 1) : 'Pending',
                            $partD->hod_recommendation ?? 'Awaiting HOD',
                            $decision ?: 'Under Committee Review',
                            $rec->submitted_part_a_at ? $rec->submitted_part_a_at->format('d/m/Y') : 'N/A'
                        ];
                    }
                }
                break;

            case 'scoring_matrix':
                $title = 'INSTITUTIONAL 100-POINT SCORING BREAKDOWN MATRIX';
                $filenameBase = 'jostum_scoring_matrix_' . date('Ymd');
                $headers = ['S/N', 'PF Number', 'Staff Name', 'Department', 'Total Score (/100)', 'Basic Qual (/20)', 'Work Exp (/15)', 'Regularity (/10)', 'Integrity (/10)', 'Supervisor Recommendation', 'Status'];
                $idx = 1;
                foreach ($records as $rec) {
                    $partA = $rec->partA;
                    $partB = $rec->partB;
                    $rows[] = [
                        $idx++,
                        $partA->pf_number ?? 'PF/TBD',
                        $partA->full_name ?? 'N/A',
                        $partA->department ?? 'General',
                        $rec->part_b_score !== null ? number_format($rec->part_b_score, 1) : 'Pending',
                        $partB->basic_qualification_score ?? '—',
                        $partB->work_experience_score ?? '—',
                        $partB->regularity_score ?? '—',
                        $partB->integrity_score ?? '—',
                        $partB->supervisor_recommendation ?? 'Pending Evaluation',
                        ucwords(str_replace('_', ' ', $rec->current_stage))
                    ];
                }
                break;

            case 'dept_ranking':
                $title = 'DEPARTMENTAL APPRAISAL VELOCITY & PERFORMANCE SUMMARY';
                $filenameBase = 'jostum_dept_ranking_' . date('Ymd');
                $headers = ['S/N', 'Department', 'Total Staff Dossiers', 'Average Score (/100)', 'Promotions Eligible', 'Completed Ratifications', 'Compliance Rate (%)'];
                $grouped = $records->groupBy(fn($r) => $r->partA->department ?? 'General');
                $idx = 1;
                foreach ($grouped as $deptName => $items) {
                    $deptTotal = $items->count();
                    $evalItems = $items->filter(fn($i) => $i->part_b_score !== null);
                    $avg = $evalItems->count() > 0 ? round($evalItems->avg('part_b_score'), 1) : 0;
                    $promos = $items->filter(fn($i) => floatval($i->part_b_score) >= 70)->count();
                    $comps = $items->where('current_stage', 'completed')->count();
                    $compliance = $deptTotal > 0 ? round(($comps / $deptTotal) * 100) : 0;
                    $rows[] = [
                        $idx++,
                        $deptName,
                        $deptTotal,
                        $avg > 0 ? number_format($avg, 1) : 'Pending',
                        $promos,
                        $comps,
                        $compliance . '%'
                    ];
                }
                break;

            case 'bottlenecks':
                $title = 'ADMINISTRATIVE WORKFLOW BOTTLENECK & DELAY AUDIT';
                $filenameBase = 'jostum_bottlenecks_audit_' . date('Ymd');
                $headers = ['S/N', 'PF Number', 'Staff Name', 'Department', 'Current Bottleneck Stage', 'Pending Action By', 'Days In Stage', 'Workflow Status'];
                $idx = 1;
                $stageOfficers = [
                    'part_b_supervisor' => 'Assigned Departmental Supervisor',
                    'part_c_staff_sign' => 'Staff Member (Self Verification Signature)',
                    'part_d_dept_review' => 'Head of Department / Committee',
                    'part_e_apc_final' => 'Central A&P Committee (APC)',
                    'completed' => 'None (Fully Ratified)'
                ];
                foreach ($records as $rec) {
                    if ($rec->current_stage !== 'completed') {
                        $partA = $rec->partA;
                        $rows[] = [
                            $idx++,
                            $partA->pf_number ?? 'PF/TBD',
                            $partA->full_name ?? 'N/A',
                            $partA->department ?? 'General',
                            ucwords(str_replace('_', ' ', $rec->current_stage)),
                            $stageOfficers[$rec->current_stage] ?? 'Appraisal Committee',
                            '2-5 Days',
                            'Active / Pending Action'
                        ];
                    }
                }
                break;

            case 'officers_registry':
                $title = 'STATUTORY APPRAISAL OFFICERS & EVALUATORS REGISTER';
                $filenameBase = 'jostum_appraisal_officers_' . date('Ymd');
                $headers = ['S/N', 'Full Name', 'Statutory Role', 'Official Email', 'PF Number', 'Department', 'Faculty', 'Account Status'];
                $officers = AppraisalOfficer::orderBy('role')->get();
                $idx = 1;
                foreach ($officers as $off) {
                    $rows[] = [
                        $idx++,
                        $off->name,
                        ucwords(str_replace('_', ' ', $off->role)),
                        $off->email,
                        $off->pf_number ?: 'N/A',
                        $off->department ?: 'N/A',
                        $off->faculty ?: 'N/A',
                        strtoupper($off->status)
                    ];
                }
                break;

            case 'master_register':
            default:
                $title = 'ANNUAL PERFORMANCE EVALUATION REPORT (APER) MASTER REGISTER';
                $filenameBase = 'jostum_aper_master_register_' . date('Ymd');
                $headers = ['S/N', 'PF Number', 'Staff Name', 'Department', 'Present Rank', 'Part B Score (/100)', 'Current Stage', 'A&PC Decision', 'Date Submitted'];
                $idx = 1;
                foreach ($records as $rec) {
                    $partA = $rec->partA;
                    $partE = $rec->partE;
                    $rows[] = [
                        $idx++,
                        $partA->pf_number ?? 'PF/TBD',
                        $partA->full_name ?? 'N/A',
                        $partA->department ?? 'General',
                        $partA->present_rank ?? 'Lecturer',
                        $rec->part_b_score !== null ? number_format($rec->part_b_score, 1) : 'Pending',
                        ucwords(str_replace('_', ' ', $rec->current_stage)),
                        $partE->final_decision ?? $rec->final_decision ?? 'In Review',
                        $rec->submitted_part_a_at ? $rec->submitted_part_a_at->format('d/m/Y') : 'N/A'
                    ];
                }
                break;
        }

        // Return according to requested format
        if ($format === 'csv') {
            $handle = fopen('php://temp', 'r+');
            fputcsv($handle, ['JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI']);
            fputcsv($handle, [$title]);
            fputcsv($handle, ["Academic Session: {$session}", "Department Scope: {$department}", "Generated: " . date('d/m/Y H:i')]);
            fputcsv($handle, []);
            fputcsv($handle, $headers);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            rewind($handle);
            $csvContent = stream_get_contents($handle);
            fclose($handle);

            return response($csvContent, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filenameBase}.csv\"",
            ]);
        }

        if ($format === 'pdf' || $format === 'html') {
            $html = $this->renderPrintableHtmlReport($title, $session, $department, $headers, $rows);
            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
            ]);
        }

        if ($format === 'json') {
            return response()->json([
                'status' => 'success',
                'title' => $title,
                'session' => $session,
                'department' => $department,
                'record_count' => count($rows),
                'headers' => $headers,
                'rows' => $rows,
            ]);
        }

        // Default: Native Microsoft Excel XML (.xlsx)
        $xml = $this->renderExcelXmlReport($title, $session, $department, $headers, $rows);
        return response($xml, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filenameBase}.xlsx\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Render an Excel XML 2003 (.xlsx) spreadsheet with JOSTUM styling.
     */
    private function renderExcelXmlReport(string $title, string $session, string $department, array $headers, array $rows): string
    {
        $esc = fn($str) => htmlspecialchars((string)$str, ENT_QUOTES | ENT_XML1, 'UTF-8');
        $dateStr = date('d/m/Y H:i');

        $out = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $out .= '<?mso-application progid="Excel.Sheet"?>' . "\n";
        $out .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"' . "\n";
        $out .= ' xmlns:o="urn:schemas-microsoft-com:office:office"' . "\n";
        $out .= ' xmlns:x="urn:schemas-microsoft-com:office:excel"' . "\n";
        $out .= ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' . "\n";
        $out .= ' <Styles>' . "\n";
        $out .= '  <Style ss:ID="MainTitle"><Font ss:Bold="1" ss:Color="#064E3B" ss:Size="14"/><Alignment ss:Horizontal="Left"/></Style>' . "\n";
        $out .= '  <Style ss:ID="SubTitle"><Font ss:Italic="1" ss:Color="#475569" ss:Size="10"/><Alignment ss:Horizontal="Left"/></Style>' . "\n";
        $out .= '  <Style ss:ID="HeaderRow"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/><Interior ss:Color="#064E3B" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>' . "\n";
        $out .= '  <Style ss:ID="CellLeft"><Font ss:Size="9" ss:Color="#0F172A"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>' . "\n";
        $out .= '  <Style ss:ID="CellCenter"><Font ss:Size="9" ss:Color="#0F172A"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>' . "\n";
        $out .= '  <Style ss:ID="CellNum"><Font ss:Size="9" ss:Color="#0F172A"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>' . "\n";
        $out .= ' </Styles>' . "\n";
        $out .= ' <Worksheet ss:Name="Dossier Report">' . "\n";
        $out .= '  <Table>' . "\n";
        $out .= '   <Row><Cell ss:StyleID="MainTitle"><Data ss:Type="String">JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI</Data></Cell></Row>' . "\n";
        $out .= '   <Row><Cell ss:StyleID="MainTitle"><Data ss:Type="String">' . $esc($title) . '</Data></Cell></Row>' . "\n";
        $out .= '   <Row><Cell ss:StyleID="SubTitle"><Data ss:Type="String">Academic Session: ' . $esc($session) . ' | Department Scope: ' . $esc($department) . ' | Certified Export: ' . $esc($dateStr) . '</Data></Cell></Row>' . "\n";
        $out .= '   <Row></Row>' . "\n";
        $out .= '   <Row ss:StyleID="HeaderRow">' . "\n";
        foreach ($headers as $h) {
            $out .= '    <Cell><Data ss:Type="String">' . $esc($h) . '</Data></Cell>' . "\n";
        }
        $out .= '   </Row>' . "\n";
        foreach ($rows as $row) {
            $out .= '   <Row>' . "\n";
            foreach ($row as $idx => $val) {
                $isNumeric = is_numeric($val) && !str_starts_with((string)$val, '0') && strlen((string)$val) < 10;
                $style = ($idx === 0) ? 'CellCenter' : ($isNumeric ? 'CellNum' : 'CellLeft');
                $type = $isNumeric ? 'Number' : 'String';
                $out .= '    <Cell ss:StyleID="' . $style . '"><Data ss:Type="' . $type . '">' . $esc($val) . '</Data></Cell>' . "\n";
            }
            $out .= '   </Row>' . "\n";
        }
        $out .= '  </Table>' . "\n";
        $out .= ' </Worksheet>' . "\n";
        $out .= '</Workbook>';

        return $out;
    }

    /**
     * Render an official printable HTML/PDF document with JOSTUM branding.
     */
    private function renderPrintableHtmlReport(string $title, string $session, string $department, array $headers, array $rows): string
    {
        $esc = fn($str) => htmlspecialchars((string)$str, ENT_QUOTES, 'UTF-8');
        $dateStr = date('l, d F Y - H:i');
        $rowCount = count($rows);

        $headersHtml = '';
        foreach ($headers as $h) {
            $headersHtml .= '<th style="padding: 10px 12px; background: #064e3b; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #047857; text-align: left;">' . $esc($h) . '</th>';
        }

        $rowsHtml = '';
        foreach ($rows as $rIdx => $row) {
            $bg = ($rIdx % 2 === 0) ? '#ffffff' : '#f8fafc';
            $rowsHtml .= '<tr style="background: ' . $bg . ';">';
            foreach ($row as $cIdx => $cell) {
                $align = ($cIdx === 0) ? 'center' : 'left';
                $weight = ($cIdx === 1 || $cIdx === 2) ? '600' : '400';
                $rowsHtml .= '<td style="padding: 8px 12px; font-size: 11px; color: #0f172a; border: 1px solid #e2e8f0; text-align: ' . $align . '; font-weight: ' . $weight . ';">' . $esc($cell) . '</td>';
            }
            $rowsHtml .= '</tr>';
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{$title} - JOSTUM</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 12mm 15mm;
        }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            background: #ffffff;
        }
        .report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #064e3b;
            padding-bottom: 14px;
            margin-bottom: 16px;
        }
        .gold-stripe {
            height: 4px;
            background: linear-gradient(90deg, #d97706, #f59e0b, #d97706);
            margin-top: 4px;
            border-radius: 2px;
        }
        .meta-box {
            display: flex;
            gap: 20px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 14px;
            font-size: 11px;
            margin-bottom: 18px;
            font-weight: 600;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        .signature-footer {
            margin-top: 36px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
        }
        .sig-line {
            width: 220px;
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            font-size: 11px;
            text-align: center;
            color: #334155;
        }
        .print-btn-bar {
            margin-bottom: 18px;
            display: flex;
            gap: 10px;
        }
        @media print {
            .print-btn-bar { display: none !important; }
            body { padding: 0 !important; }
        }
    </style>
</head>
<body>
    <div class="print-btn-bar">
        <button onclick="window.print()" style="padding: 8px 18px; background: #064e3b; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
            🖨️ Print / Save as PDF
        </button>
        <button onclick="window.close()" style="padding: 8px 14px; background: #e2e8f0; color: #334155; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
            Close Window
        </button>
    </div>

    <div class="report-header">
        <div>
            <h1 style="margin: 0; font-size: 18px; color: #064e3b; font-weight: 800; letter-spacing: 0.04em;">
                JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI
            </h1>
            <div style="font-size: 12px; color: #475569; font-weight: 700; margin-top: 2px;">
                CENTRAL APPOINTMENTS & PROMOTIONS COMMITTEE (A&PC) • ACADEMIC REGISTRY
            </div>
            <h2 style="margin: 8px 0 0 0; font-size: 15px; color: #0f172a; font-weight: 700;">
                {$title}
            </h2>
            <div class="gold-stripe"></div>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
            <div style="font-weight: 800; color: #064e3b; font-size: 11px;">APER FORM A-E STATUTORY DIGEST</div>
            <div>Ref: JOSTUM/APER/REG/2026</div>
            <div>Generated: {$dateStr}</div>
        </div>
    </div>

    <div class="meta-box">
        <div>Academic Session: <span style="color: #064e3b;">{$session}</span></div>
        <div>Department Scope: <span style="color: #064e3b;">{$department}</span></div>
        <div>Total Records: <span style="color: #064e3b;">{$rowCount}</span></div>
        <div>Governance Status: <span style="color: #047857;">CERTIFIED OFFICIAL</span></div>
    </div>

    <table>
        <thead>
            <tr>
                {$headersHtml}
            </tr>
        </thead>
        <tbody>
            {$rowsHtml}
        </tbody>
    </table>

    <div class="signature-footer">
        <div class="sig-line">
            <strong>Prof. Aminu Bello</strong><br>
            Departmental Committee Chairman (HOD)
        </div>
        <div class="sig-line">
            <strong>Prof. J. O. Oladipo</strong><br>
            Central A&P Committee Chairman
        </div>
        <div class="sig-line">
            <strong>Dr. (Mrs.) S. T. Terhemba</strong><br>
            Academic Registrar / Registry Seal
        </div>
    </div>

    <script>
        window.addEventListener("DOMContentLoaded", () => {
            const params = new URLSearchParams(window.location.search);
            if (params.get("autoprint") === "1") {
                window.print();
            }
        });
    </script>
</body>
</html>
HTML;
    }
}
