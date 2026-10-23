import { useState, useEffect } from "react";
import { Check, ChevronRight, AlertCircle, FileText } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { PartAPrintLayout } from "./PartAPrintLayout.tsx";

const useAuth = () => ({ role: 'staff' });

const steps = [
  { id: "drafting", label: "Part A: Staff" },
  { id: "supervisor_assessment", label: "Part B: Supervisor" },
  { id: "staff_acknowledgment", label: "Part C: Staff Sign" },
  { id: "departmental_review", label: "Part D: Dept Review" },
  { id: "final_decision", label: "Part E: A&P Final" }
];

export default function EvaluationForm({ overrideRole, selectedStaffId }: { overrideRole?: string; selectedStaffId?: string | null }) {
  const auth = useAuth();
  const role = overrideRole || auth.role;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  let defaultState = "drafting";
  if (role === "supervisor") defaultState = "supervisor_assessment";
  else if (role === "dept_chairman" || role === "hod") defaultState = "departmental_review";
  else if (role === "apc_chairman" || role === "apc") defaultState = "final_decision";

  const initialUrlState = searchParams.get("state") || defaultState;
  const [urlState, setUrlState] = useState(initialUrlState);
  const staffId = searchParams.get("staffId");
  
  const absoluteCurrentIndex = steps.findIndex(s => s.id === urlState);
  
  // All 5 steps are accessible so every role can screen the complete dossier
  const visibleSteps = steps;
  const [activeTabId, setActiveTabId] = useState(initialUrlState);
  const [partAStage, setPartAStage] = useState(1);
  const partAStages = [{id:1, label:"Personal Details"}, {id:2, label:"Education"}, {id:3, label:"Employment History"}, {id:4, label:"Other Info"}];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalCompleted, setIsFinalCompleted] = useState(false);
  const [isDossierRatified, setIsDossierRatified] = useState(false);
  const [showRatifiedModal, setShowRatifiedModal] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<string>("part_a_drafting");
  const [partStatuses, setPartStatuses] = useState({
    partA: 'Draft',
    partB: 'Pending',
    partC: 'Pending',
    partD: 'Pending',
    partE: 'Pending'
  });
  const evaluationId = searchParams.get("id") || "1"; // Fallback to 1 for testing
  const [dbRanks, setDbRanks] = useState<{id: number, name: string}[]>([]);
  const [countriesData, setCountriesData] = useState<any[]>([]);
  const [availableStates, setAvailableStates] = useState<any[]>([]);
  const [supervisorQueue, setSupervisorQueue] = useState({ current: 0, total: 0, nextId: null as string | null });

  // Evaluator signatures (Supervisor, Dept HOD, APC Chairman)
  const [signatures, setSignatures] = useState<Record<string, string | null>>(() => {
    try {
      const stored = localStorage.getItem('appraisal_signatures');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleSigUpdate = (e: any) => {
      if (e?.detail?.role) {
        setSignatures(prev => ({ ...prev, [e.detail.role]: e.detail.signature }));
      }
    };
    window.addEventListener('appraisal_signature_updated', handleSigUpdate);
    return () => window.removeEventListener('appraisal_signature_updated', handleSigUpdate);
  }, []);

  useEffect(() => {
    api('/api/staff/ranks').then(res => setDbRanks(res.data)).catch(err => console.error("Could not load ranks", err));
    
    fetch("https://countriesnow.space/api/v0.1/countries/states")
      .then(res => res.json())
      .then(data => {
         if (!data.error) setCountriesData(data.data);
      })
      .catch(err => console.error("Could not fetch countries", err));

    // Fetch logged in staff details to populate Personal File Number, College, Department, Name etc.
    const fetchStaffDetails = async () => {
      try {
        let staffObj: any = null;
        let userObj: any = null;
        try {
          const overviewRes = await api.get('/staff/overview');
          staffObj = overviewRes?.data?.staff || overviewRes?.staff || overviewRes?.data;
          userObj = overviewRes?.data?.user || overviewRes?.user;
        } catch (e) {
          // Fallback to portal user
        }
        if (!staffObj || !staffObj.pf_number) {
          try {
            const portalRes = await api.get('/api/staff/portal');
            staffObj = portalRes?.profile?.staff || portalRes?.data?.profile?.staff || portalRes?.staff || staffObj;
            userObj = portalRes?.user || portalRes?.data?.user || userObj;
          } catch (e) {
            // Ignore
          }
        }
        const resolvedName = staffObj?.full_name || [staffObj?.first_name, staffObj?.other_name, staffObj?.last_name].filter(Boolean).join(' ') || userObj?.name || "Gaddafi Umar";
        const resolvedPF = staffObj?.pf_number || staffObj?.staffNumber || staffObj?.file_number || userObj?.staffId || "PF/5797";

        setFormData(prev => ({
          ...prev,
          partA: {
            ...prev.partA,
            name: prev.partA.name || resolvedName,
            file_number: prev.partA.file_number || resolvedPF,
            college: prev.partA.college || staffObj?.college_name || staffObj?.faculty_name || staffObj?.college?.name || (typeof staffObj?.college === 'string' ? staffObj.college : '') || "Physical Sciences",
            department: prev.partA.department || staffObj?.department_name || staffObj?.department?.name || (typeof staffObj?.department === 'string' ? staffObj.department : '') || "Computer Science",
            date_of_birth: prev.partA.date_of_birth || staffObj?.date_of_birth || "",
            phone: prev.partA.phone || staffObj?.phone || "",
            marital_status: prev.partA.marital_status || staffObj?.marital_status || "",
            present_rank: prev.partA.present_rank || staffObj?.rank_name || staffObj?.rank?.name || "Senior Lecturer",
            present_level: prev.partA.present_level || staffObj?.contiss_grade || staffObj?.present_level || "13",
            present_step: prev.partA.present_step || staffObj?.present_step || "1",
          }
        }));
      } catch (err) {
        console.error("Could not fetch staff details", err);
      }
    };
    fetchStaffDetails();
  }, []);

  useEffect(() => {
    const targetId = selectedStaffId || evaluationId;

    setIsFinalCompleted(false);

    const loadRealData = async () => {
      const dummyNames = ['Dr. Amina Bello', 'Mr. Terver Isaac Kange', 'Dr. Emmanuel Chinedu Okafor', 'Engr. Folashade Adebayo'];
      const dummyPFs = ['PF/4102', 'PF/5218', 'PF/3890', 'PF/2941'];
      const isDummy = (s: any) => !s || dummyNames.includes(s.staff_name) || dummyNames.includes(s.name) || dummyPFs.includes(s.pf_number);

      try {
        const res = await api.get('/api/appraisal/submissions');
        const rawList = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
        const dataList = rawList.filter((s: any) => !isDummy(s));

        let targetSub = null;
        if (targetId) {
          targetSub = dataList.find((s: any) => String(s.id) === String(targetId) || s.pf_number === targetId);
        } else {
          // If no specific staff/evaluation ID is targeted, look up the logged-in staff member's real submission
          let myPF = formData.partA.file_number;
          if (!myPF) {
            try {
              const overviewRes = await api.get('/staff/overview');
              const s = overviewRes?.data?.staff || overviewRes?.staff;
              if (s) myPF = s.pf_number || s.staffNumber || s.staff_number;
            } catch (e) {}
          }
          if (myPF) {
            targetSub = dataList.find((s: any) => s.pf_number === myPF);
          }
          if (!targetSub && dataList.length > 0) {
            targetSub = dataList[0];
          }
        }

        if (targetSub) {
          const isCompleted = targetSub.current_stage === 'completed' || 
                              targetSub.part_e_status === 'Completed' || 
                              targetSub.overall_status === 'completed' || 
                              Boolean(targetSub.partEData?.decision) ||
                              Boolean(targetSub.formData?.partE?.decision) ||
                              Boolean(targetSub.partE?.decision);
          if (isCompleted) {
            setIsFinalCompleted(true);
            setIsDossierRatified(true);
            setSubmissionStage('completed');
            setPartStatuses({
              partA: 'Completed',
              partB: 'Completed',
              partC: 'Completed',
              partD: 'Completed',
              partE: 'Completed'
            });
          } else {
            setIsFinalCompleted(false);
            setIsDossierRatified(false);
            setSubmissionStage(targetSub.current_stage || 'part_a_drafting');
            setPartStatuses({
              partA: targetSub.part_a_status || 'Draft',
              partB: targetSub.part_b_status || 'Pending',
              partC: targetSub.part_c_status || 'Pending',
              partD: targetSub.part_d_status || 'Pending',
              partE: targetSub.part_e_status || 'Pending'
            });
          }

          setFormData(prev => ({
            ...prev,
            partA: {
              ...prev.partA,
              ...(targetSub.partAData || {}),
              name: targetSub.staff_name || targetSub.partAData?.name || prev.partA.name,
              file_number: targetSub.pf_number || targetSub.partAData?.file_number || prev.partA.file_number,
              department: targetSub.department || targetSub.partAData?.department || prev.partA.department,
              college: targetSub.faculty || targetSub.partAData?.college || prev.partA.college,
              present_rank: targetSub.current_rank || targetSub.partAData?.present_rank || prev.partA.present_rank,
            },
            partB: targetSub.partBData ? {
              ...prev.partB,
              ...targetSub.partBData,
              remarks: targetSub.partBData.remarks || prev.partB.remarks,
              recommendation: targetSub.partBData.recommendation || prev.partB.recommendation,
            } : prev.partB,
            partC: targetSub.partCData ? {
              ...prev.partC,
              ...targetSub.partCData,
            } : prev.partC,
            partD: targetSub.partDData ? {
              ...prev.partD,
              ...targetSub.partDData,
              recommendation: targetSub.partDData.recommendation || targetSub.department_recommendation || prev.partD.recommendation,
              proposed_rank: targetSub.partDData.proposed_rank || targetSub.proposed_rank || prev.partD.proposed_rank,
              remarks: targetSub.partDData.remarks || targetSub.partDData.committee_minutes || prev.partD.remarks,
              signature: targetSub.partDData.signature || prev.partD.signature,
            } : (targetSub.proposed_rank || targetSub.department_recommendation ? {
              ...prev.partD,
              proposed_rank: targetSub.proposed_rank || prev.partD.proposed_rank,
              recommendation: targetSub.department_recommendation || prev.partD.recommendation,
            } : prev.partD),
            partE: targetSub.partEData ? {
              ...prev.partE,
              ...targetSub.partEData,
            } : prev.partE,
          }));

          if (targetSub.current_stage) {
            let stageState = targetSub.current_stage;
            if (stageState === 'part_a_drafting') stageState = 'drafting';
            else if (stageState === 'part_b_supervisor') stageState = 'supervisor_assessment';
            else if (stageState === 'part_c_staff_sign') stageState = 'staff_acknowledgment';
            else if (stageState === 'part_d_dept_review') stageState = 'departmental_review';
            else if (stageState === 'part_e_apc_final' || stageState === 'completed') stageState = 'final_decision';

            let preferredState = stageState;
            if (role === 'supervisor') preferredState = 'supervisor_assessment';
            else if (role === 'dept_chairman' || role === 'hod') preferredState = 'departmental_review';
            else if (role === 'apc_chairman' || role === 'apc') preferredState = 'final_decision';
            else if (role === 'staff' && stageState === 'part_c_staff_sign') preferredState = 'staff_acknowledgment';

            setUrlState(preferredState);
            setActiveTabId(preferredState);
          }
          return;
        }
      } catch (e) {
        console.warn("Could not fetch server submission", e);
      }

      // Local storage fallback (filtered for real submissions only)
      const storedSubmissions = localStorage.getItem('jostum_staff_appraisal_submissions');
      if (storedSubmissions) {
        try {
          const parsed = JSON.parse(storedSubmissions);
          const cleaned = Array.isArray(parsed) ? parsed.filter((s: any) => !isDummy(s)) : [];
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('jostum_staff_appraisal_submissions', JSON.stringify(cleaned));
          }

          let targetSub = null;
          if (targetId) {
            targetSub = cleaned.find((s: any) => String(s.id) === String(targetId) || s.pf_number === targetId);
          } else {
            let myPF = formData.partA.file_number;
            if (myPF) {
              targetSub = cleaned.find((s: any) => s.pf_number === myPF);
            }
            if (!targetSub && cleaned.length > 0) {
              targetSub = cleaned[0];
            }
          }

          if (targetSub) {
            const isCompleted = targetSub.current_stage === 'completed' || 
                                targetSub.part_e_status === 'Completed' || 
                                targetSub.overall_status === 'completed' || 
                                Boolean(targetSub.partEData?.decision) ||
                                Boolean(targetSub.formData?.partE?.decision) ||
                                Boolean(targetSub.partE?.decision);
            if (isCompleted) {
              setIsFinalCompleted(true);
              setIsDossierRatified(true);
              setSubmissionStage('completed');
              setPartStatuses({
                partA: 'Completed',
                partB: 'Completed',
                partC: 'Completed',
                partD: 'Completed',
                partE: 'Completed'
              });
            } else {
              setIsFinalCompleted(false);
              setIsDossierRatified(false);
              setSubmissionStage(targetSub.current_stage || 'part_a_drafting');
              setPartStatuses({
                partA: targetSub.part_a_status || 'Draft',
                partB: targetSub.part_b_status || 'Pending',
                partC: targetSub.part_c_status || 'Pending',
                partD: targetSub.part_d_status || 'Pending',
                partE: targetSub.part_e_status || 'Pending'
              });
            }
            if (targetSub.formData) {
              setFormData(targetSub.formData);
            }
            if (targetSub.current_stage) {
              let stageState = targetSub.current_stage;
              if (stageState === 'part_a_drafting') stageState = 'drafting';
              else if (stageState === 'part_b_supervisor') stageState = 'supervisor_assessment';
              else if (stageState === 'part_c_staff_sign') stageState = 'staff_acknowledgment';
              else if (stageState === 'part_d_dept_review') stageState = 'departmental_review';
              else if (stageState === 'part_e_apc_final' || stageState === 'completed') stageState = 'final_decision';

              let preferredState = stageState;
              if (role === 'supervisor') preferredState = 'supervisor_assessment';
              else if (role === 'dept_chairman' || role === 'hod') preferredState = 'departmental_review';
              else if (role === 'apc_chairman' || role === 'apc') preferredState = 'final_decision';
              else if (role === 'staff' && stageState === 'part_c_staff_sign') preferredState = 'staff_acknowledgment';

              setUrlState(preferredState);
              setActiveTabId(preferredState);
            }
            return;
          }
        } catch (e) {}
      }
      const singleData = localStorage.getItem(`jostum_appraisal_submitted_data_${targetId}`);
      if (singleData) {
        try {
          const parsed = JSON.parse(singleData);
          setFormData(parsed);
          if (parsed.partE?.decision) {
            setIsFinalCompleted(true);
          }
        } catch (e) {}
      }
    };

    loadRealData();
  }, [selectedStaffId, evaluationId]);

  // If the URL changes, update the tab
  useEffect(() => {
    if (visibleSteps.some(s => s.id === urlState)) {
      setActiveTabId(urlState);
    } else if (visibleSteps.length > 0) {
      setActiveTabId(visibleSteps[0].id);
    }
  }, [urlState, role]);

  const [formData, setFormData] = useState({
    partA: { 
      name: "", 
      file_number: "",
      college: "",
      department: "",
      date_of_birth: "",
      place_of_birth: "",
      nationality: "Nigeria",
      state_of_origin: "",
      permanent_address: "",
      correspondence_address: "",
      marital_status: "",
      phone: "",
      date_of_first_appointment: "",
      date_of_transfer: "",
      rank_on_first_appointment: "",
      date_assumed_duty: "",
      date_confirmed: "",
      date_last_promoted: "",
      present_rank: "",
      present_level: "",
      present_step: "",
      last_two_promotions: [{ start: "", text: "", income: "" }, { start: "", text: "", income: "" }],
      previous_employment: [],
      institutions: [],
      qualifications: [], 
      training: [],
      professional_bodies: [],
      duties: [{ text: "" }],
      acting_appointments: [],
      examinations: [],
      commissions: "",
      declaration: false,
      declaration_name: "",
      declaration_date: ""
    },
    partB: { 
      basic_qualification: 0, additional_qualification: 0, work_experience: 0, admin_or_tech_experience: 0,
      relevant_training: 0, personality_team_spirit: 0, quality_of_work: 0, regularity: 0, punctuality: 0,
      care_of_property: 0, integrity: 0, initiative: 0, knowledge_regulations: 0, professional_membership: 0,
      absent_with: 0, absent_without: 0, warned: 0, suspended: 0, recommendation: "", comments: ""
    },
    partC: { agree: true, comments: "" },
    partD: { recommendation: "Recommend for Promotion", remarks: "", proposed_rank: "", committee_minutes: "", signature: "" },
    partE: { decision: "Approve Promotion", effective_date: new Date().toISOString().split('T')[0], remarks: "", reference_no: "" }
  });

  const isEvaluator = ['supervisor', 'dept_chairman', 'hod', 'apc_chairman', 'apc', 'admin'].includes(role);
  const activeStepToJumpTo = urlState || (
    role === 'supervisor' ? 'supervisor_assessment' :
    (role === 'dept_chairman' || role === 'hod') ? 'departmental_review' :
    (role === 'apc_chairman' || role === 'apc') ? 'final_decision' : 'drafting'
  );
  
  const isRatified = isDossierRatified || isFinalCompleted || partStatuses.partE === 'Completed' || submissionStage === 'completed';

  const canEditPartA = role === 'staff' && !isRatified && partStatuses.partA !== 'Completed' && (submissionStage === 'part_a_drafting' || submissionStage === 'drafting' || !submissionStage);
  const canEditPartB = (role === 'supervisor' || role === 'admin') && !isRatified && (submissionStage === 'part_b_supervisor' || submissionStage === 'part_a_drafting' || !submissionStage || partStatuses.partB !== 'Completed');
  const canEditPartC = role === 'staff' && !isRatified && (submissionStage === 'part_c_staff_sign' || partStatuses.partB === 'Completed') && partStatuses.partC !== 'Completed';
  const canEditPartD = (role === 'dept_chairman' || role === 'hod' || role === 'admin') && !isRatified && (submissionStage === 'part_d_dept_review' || submissionStage === 'part_c_staff_sign' || !submissionStage) && partStatuses.partD !== 'Completed';
  const canEditPartE = (role === 'apc_chairman' || role === 'apc' || role === 'admin') && !isRatified && partStatuses.partE !== 'Completed';

  useEffect(() => {
     if (formData.partA.nationality) {
        const country = countriesData.find(c => c.name === formData.partA.nationality);
        setAvailableStates(country?.states || []);
     } else {
        setAvailableStates([]);
     }
  }, [formData.partA.nationality, countriesData]);

  type ArrayItem = { text: string; start: string; end: string; subtype?: string; title?: string; name?: string; occupation?: string; email?: string; phone?: string; reason?: string; income?: string; };

  const handlePartBScoreChange = (field: keyof typeof formData.partB, value: string, maxScore: number) => {
    let numValue = Number(value);
    if (numValue < 0) numValue = 0;
    if (numValue > maxScore) numValue = maxScore;
    setFormData({ ...formData, partB: { ...formData.partB, [field]: numValue } });
  };

  const handleArrayChange = (field: keyof typeof formData.partA, index: number, key: keyof ArrayItem, value: string) => {
    const newArray = [...(formData.partA[field] as ArrayItem[])];
    newArray[index] = { ...newArray[index], [key]: value };
    setFormData({ ...formData, partA: { ...formData.partA, [field]: newArray } });
  };

  const handleAddField = (field: keyof typeof formData.partA) => {
    setFormData({ ...formData, partA: { ...formData.partA, [field]: [...(formData.partA[field] as ArrayItem[]), { text: "", start: "", end: "", subtype: "", title: "", name: "", occupation: "", email: "", phone: "" }] } });
  };

  const handleRemoveField = (field: keyof typeof formData.partA, index: number) => {
    const newArray = [...(formData.partA[field] as ArrayItem[])];
    newArray.splice(index, 1);
    setFormData({ ...formData, partA: { ...formData.partA, [field]: newArray } });
  };

  const isPartAValid = () => {
    // Check mandatory digital signature declaration
    if (!formData.partA.declaration || !formData.partA.declaration_name?.trim() || !formData.partA.declaration_date) {
      return false;
    }
    
    // Check duties has at least 1 non-empty duty text
    const validDuties = formData.partA.duties.filter(d => d.text && d.text.trim().length > 0);
    if (validDuties.length === 0) return false;

    return true;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1960 + 1 }, (_, i) => currentYear - i);

  const calculatePartBTotal = (b: typeof formData.partB) => {
    return Number(b.basic_qualification) + Number(b.additional_qualification) + Number(b.work_experience) + 
           Number(b.admin_or_tech_experience) + Number(b.relevant_training) + Number(b.personality_team_spirit) + 
           Number(b.quality_of_work) + Number(b.regularity) + Number(b.punctuality) + Number(b.care_of_property) + 
           Number(b.integrity) + Number(b.initiative) + Number(b.knowledge_regulations) + Number(b.professional_membership);
  };

  const handleAction = async (part: string, message: string) => {
    setIsSubmitting(true);
    try {
      const targetId = selectedStaffId || evaluationId || "1";
      const updatedFormData = { ...formData };

      let realId = targetId;
      const apiHeaders = { 'X-User-Role': role };

      // Attempt backend API call
      if (part === "A") {
        try {
          const res = await api.post('/api/appraisal/submit-part-a', { partA: updatedFormData.partA, role }, { headers: apiHeaders });
          const createdId = res?.evaluation_id || res?.data?.evaluation_id;
          if (createdId) {
            realId = String(createdId);
          }
        } catch (e) {
          console.warn("Backend API sync fallback to local store", e);
        }
      } else if (part === "B") {
        try {
          await api.post(`/api/appraisal/evaluate-part-b/${realId}`, { partB: updatedFormData.partB, role }, { headers: apiHeaders });
        } catch (e) {
          console.warn("Backend API sync fallback to local store", e);
        }
      } else if (part === "C") {
        try {
          await api.post(`/api/appraisal/sign-part-c/${realId}`, { partC: updatedFormData.partC, role }, { headers: apiHeaders });
        } catch (e) {
          console.warn("Backend API sync fallback to local store", e);
        }
      } else if (part === "D") {
        try {
          await api.post(`/api/appraisal/review-part-d/${realId}`, { partD: updatedFormData.partD, role }, { headers: apiHeaders });
        } catch (e) {
          console.warn("Backend API sync fallback to local store", e);
        }
      } else if (part === "E") {
        try {
          await api.post(`/api/appraisal/ratify-part-e/${realId}`, { partE: updatedFormData.partE, role }, { headers: apiHeaders });
        } catch (e) {
          console.warn("Backend API sync fallback to local store", e);
        }
      }

      // Ensure name is present
      const staffFullName = updatedFormData.partA.name || "Gaddafi Umar";

      // 1. Save single form data for this staff
      localStorage.setItem(`jostum_appraisal_submitted_data_${realId}`, JSON.stringify(updatedFormData));

      // 2. Save/update in submissions roster list
      const storedSubmissions = localStorage.getItem('jostum_staff_appraisal_submissions');
      let rosterList: any[] = [];
      const dummyNames = ['Dr. Amina Bello', 'Mr. Terver Isaac Kange', 'Dr. Emmanuel Chinedu Okafor', 'Engr. Folashade Adebayo'];
      const dummyPFs = ['PF/4102', 'PF/5218', 'PF/3890', 'PF/2941'];
      const isLegacyDummy = (s: any) => !s || dummyNames.includes(s.staff_name) || dummyNames.includes(s.name) || dummyPFs.includes(s.pf_number);

      if (storedSubmissions) {
        try { 
          const parsed = JSON.parse(storedSubmissions); 
          rosterList = Array.isArray(parsed) ? parsed.filter((s: any) => !isLegacyDummy(s)) : [];
        } catch (e) {}
      }

      const existingIndex = rosterList.findIndex((s: any) => String(s.id) === String(realId));
      const score = calculatePartBTotal(updatedFormData.partB);
      
      const newSubmissionObj = {
        id: String(realId),
        staff_name: staffFullName,
        pf_number: updatedFormData.partA.file_number || 'PF/2024/099',
        department: updatedFormData.partA.department || 'Computer Science',
        faculty: updatedFormData.partA.college || 'Physical Sciences',
        current_rank: updatedFormData.partA.present_rank || 'Senior Lecturer',
        proposed_rank: updatedFormData.partD?.proposed_rank || updatedFormData.partD?.recommendation || 'Associate Professor',
        department_recommendation: updatedFormData.partD?.recommendation || 'Recommend for Promotion',
        part_a_status: 'Completed',
        part_b_status: (part === 'B' || part === 'C' || part === 'D' || part === 'E' || partStatuses.partB === 'Completed') ? 'Completed' : 'Pending',
        part_c_status: (part === 'C' || part === 'D' || part === 'E' || partStatuses.partC === 'Completed') ? 'Completed' : 'Pending',
        part_d_status: (part === 'D' || part === 'E' || partStatuses.partD === 'Completed') ? 'Completed' : 'Pending',
        part_e_status: part === 'E' ? 'Completed' : partStatuses.partE,
        current_stage: part === 'E' ? 'completed' : (part === 'D' ? 'part_e_apc_final' : (part === 'C' ? 'part_d_dept_review' : (part === 'B' ? 'part_c_staff_sign' : 'part_b_supervisor'))),
        overall_status: part === 'E' ? 'completed' : 'in_progress',
        submitted_date: new Date().toISOString().split('T')[0],
        score: score,
        part_b_score: score,
        part_d_recommendation: updatedFormData.partD?.recommendation || 'Recommend for Promotion',
        part_e_decision: updatedFormData.partE?.decision || (part === 'E' ? 'APPROVED FOR PROMOTION' : null),
        partAData: updatedFormData.partA,
        partBData: updatedFormData.partB,
        partCData: updatedFormData.partC,
        partDData: updatedFormData.partD,
        partEData: updatedFormData.partE,
        formData: updatedFormData
      };

      if (existingIndex >= 0) {
        rosterList[existingIndex] = { ...rosterList[existingIndex], ...newSubmissionObj };
      } else {
        rosterList.unshift(newSubmissionObj);
      }

      localStorage.setItem('jostum_staff_appraisal_submissions', JSON.stringify(rosterList));

      // Notify other components/tabs in real-time
      window.dispatchEvent(new Event('appraisal_submission_updated'));

      let nextState = "";
      if (part === "A") {
        setPartStatuses(prev => ({ ...prev, partA: 'Completed', partB: 'Pending' }));
        setSubmissionStage("part_b_supervisor");
        nextState = "supervisor_assessment";
      } else if (part === "B") {
        setPartStatuses(prev => ({ ...prev, partB: 'Completed', partC: 'Pending' }));
        setSubmissionStage("part_c_staff_sign");
        nextState = "staff_acknowledgment";
      } else if (part === "C") {
        setPartStatuses(prev => ({ ...prev, partC: 'Completed', partD: 'Pending' }));
        setSubmissionStage("part_d_dept_review");
        nextState = "departmental_review";
      } else if (part === "D") {
        setPartStatuses(prev => ({ ...prev, partD: 'Completed', partE: 'Pending' }));
        setSubmissionStage("part_e_apc_final");
        nextState = "final_decision";
      } else if (part === "E") {
        setIsDossierRatified(true);
        setIsFinalCompleted(true);
        setSubmissionStage('completed');
        setPartStatuses({
          partA: 'Completed',
          partB: 'Completed',
          partC: 'Completed',
          partD: 'Completed',
          partE: 'Completed'
        });
        setShowRatifiedModal(true);
      }

      if (nextState) {
        setUrlState(nextState);
        setActiveTabId(nextState);
      }
    } catch (error) {
      alert("Failed to submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 print:hidden">
      <div className="px-5 py-6 rounded-2xl bg-gradient-to-br from-emerald-800 via-teal-700 to-emerald-600 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-teal-900 opacity-20 rounded-full blur-xl"></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">Annual Performance Evaluation</h1>
          <p className="text-emerald-50 mt-2 text-xs md:text-base font-medium flex items-center gap-2">
            Status: <span className="font-bold text-white uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full shadow-inner">{isRatified ? 'COMPLETED & RATIFIED' : urlState.replace('_', ' ')}</span>
          </p>
        </div>
      </div>

      {/* Candidate Screening Dossier Summary Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-none">
              {(formData.partA.name || "U")[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base md:text-lg">{formData.partA.name || "Staff Candidate"}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">PF: {formData.partA.file_number || "N/A"}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {role === 'supervisor' ? 'Evaluator: Supervisor' : (role === 'dept_chairman' || role === 'hod') ? 'Evaluator: Dept HOD' : (role === 'apc_chairman' || role === 'apc') ? 'Evaluator: APC Chairman' : 'Role: Staff'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2.5 flex-wrap">
                <span><strong>Dept:</strong> {formData.partA.department || "Computer Science"}</span>
                <span>•</span>
                <span><strong>Faculty:</strong> {formData.partA.college || "Physical Sciences"}</span>
                <span>•</span>
                <span><strong>Current Rank:</strong> {formData.partA.present_rank || "Lecturer I"}</span>
                {formData.partD?.proposed_rank && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold"><strong>Proposed:</strong> {formData.partD.proposed_rank}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center flex-wrap">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Supervisor Score</span>
              <span className={`text-xl font-black ${calculatePartBTotal(formData.partB) >= 70 ? 'text-emerald-600' : calculatePartBTotal(formData.partB) >= 45 ? 'text-amber-600' : 'text-slate-400'}`}>
                {calculatePartBTotal(formData.partB)} <span className="text-xs font-bold text-slate-400">/ 100</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              title="Print APER Dossier"
            >
              <FileText className="w-3.5 h-3.5" />
              Print APER
            </button>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-0 ring-1 ring-slate-100 p-4 md:p-6 rounded-2xl shadow-md overflow-x-auto scrollbar-hide">
        <div className="flex items-center justify-between relative min-w-full md:min-w-[600px]">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full"></div>
          
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 rounded-full transition-all duration-500"
            style={{ width: visibleSteps.length > 1 ? `${isRatified ? 100 : (Math.max(0, visibleSteps.findIndex(s => s.id === activeTabId)) / (visibleSteps.length - 1)) * 100}%` : '100%' }}
          ></div>
          
          {visibleSteps.map((step, index) => {
            const stepAbsoluteIndex = steps.findIndex(s => s.id === step.id);
            
            const isCompleted = isRatified || (
              step.id === 'drafting' ? (partStatuses.partA === 'Completed' || stepAbsoluteIndex < absoluteCurrentIndex) :
              step.id === 'supervisor_assessment' ? (partStatuses.partB === 'Completed' || (stepAbsoluteIndex < absoluteCurrentIndex && partStatuses.partB !== 'Pending')) :
              step.id === 'staff_acknowledgment' ? (partStatuses.partC === 'Completed') :
              step.id === 'departmental_review' ? (partStatuses.partD === 'Completed') :
              step.id === 'final_decision' ? (partStatuses.partE === 'Completed' || isRatified) : false
            );
            const isCurrent = step.id === activeTabId && !isCompleted;
            const isClickable = isEvaluator || stepAbsoluteIndex <= absoluteCurrentIndex || isCompleted;
            
            return (
              <div 
                key={step.id} 
                className={`relative z-10 flex flex-col items-center gap-1 md:gap-2 bg-card px-1 md:px-2 cursor-pointer ${!isClickable ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (isClickable) {
                    setActiveTabId(step.id);
                    setUrlState(step.id);
                  }
                }}
              >
                <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-colors border-2 ${
                  isCompleted ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' :
                  isCurrent ? 'bg-background border-primary text-primary shadow-[0_0_0_4px_rgba(var(--primary),0.2)]' :
                  'bg-muted border-muted text-muted-foreground'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3 md:w-4 md:h-4 stroke-[3]" /> : index + 1}
                </div>
                <div className="flex flex-col items-center mt-1">
                  <span className={`text-[10px] md:text-sm font-semibold whitespace-nowrap ${isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-950 font-bold' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest mt-0.5 ${isCompleted ? 'text-emerald-600' : isCurrent ? 'text-primary' : 'text-muted-foreground/60'}`}>
                    {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* Form Content */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 md:p-6 min-h-[400px]">
        
        {/* PART A: STAFF DRAFTING */}
        {activeTabId === "drafting" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-border pb-3">
              <h3 className="text-lg md:text-xl font-bold text-emerald-900 flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>Part A (Non-Teaching Staff)</h3>
              {role === 'staff' && urlState === 'drafting' && (
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button"
                    className="text-xs border border-emerald-200 bg-white shadow-sm text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center gap-1.5"
                    onClick={() => window.print()}
                  >
                    <FileText size={14} /> Preview
                  </button>
                  <button 
                    type="button"
                    className="text-xs bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200 shadow-sm text-emerald-800 px-4 py-2 rounded-lg font-bold hover:from-emerald-200 hover:to-teal-200 transition-all flex items-center gap-1.5"
                    onClick={() => {
                      alert("Fetched latest CV from profile.");
                      // TODO: Actual API fetch here. For now, it just shows intent.
                    }}
                  >
                    ⟳ Populate from Profile CV
                  </button>
                </div>
              )}
            </div>
            
            {!canEditPartA && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-600 mb-4">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-none" />
                <span>
                  {role === 'staff' ? (
                    <span><strong>Part A Submitted & Locked:</strong> Your personal details have been submitted into the enterprise appraisal pipeline.</span>
                  ) : (
                    <span><strong>Candidate Screening Mode:</strong> Viewing staff details submitted by the candidate as <strong>{role.replace('_', ' ').toUpperCase()}</strong>. Editing is restricted to the candidate.</span>
                  )}
                </span>
              </div>
            )}
            
            <div className="flex w-full bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/60 mb-6 gap-1.5 shadow-inner">
              {partAStages.map(st => (
                <button 
                  type="button"
                  key={st.id}
                  className={`flex-1 px-1 md:px-4 py-2.5 font-bold text-[10px] sm:text-xs md:text-sm text-center leading-tight rounded-lg transition-all duration-300 ${partAStage === st.id ? 'bg-white shadow-md text-emerald-700 ring-1 ring-emerald-500/20 transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  onClick={() => setPartAStage(st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>
            
            {partAStage === 1 && (
            <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
              <h4 className="font-bold text-sm mb-4 text-emerald-800 flex items-center gap-2 border-b border-slate-100 pb-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 1. PERSONAL DATA</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-xs font-medium">Personal File Number</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.file_number || ''} onChange={e => setFormData({...formData, partA: {...formData.partA, file_number: e.target.value}})} disabled={!canEditPartA} placeholder="PF/0001" /></div>
                <div className="space-y-1"><label className="text-xs font-medium">College</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.college || ''} onChange={e => setFormData({...formData, partA: {...formData.partA, college: e.target.value}})} disabled={!canEditPartA} placeholder="College..." /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Department</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.department || ''} onChange={e => setFormData({...formData, partA: {...formData.partA, department: e.target.value}})} disabled={!canEditPartA} placeholder="Department..." /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Name</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.name} onChange={e => setFormData({...formData, partA: {...formData.partA, name: e.target.value}})} disabled={!canEditPartA} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Date of Birth</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.date_of_birth} onChange={e => setFormData({...formData, partA: {...formData.partA, date_of_birth: e.target.value}})} disabled={!canEditPartA} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Place of Birth</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.place_of_birth} onChange={e => setFormData({...formData, partA: {...formData.partA, place_of_birth: e.target.value}})} disabled={!canEditPartA} /></div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nationality</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.nationality} onChange={e => setFormData({...formData, partA: {...formData.partA, nationality: e.target.value, state_of_origin: ''}})} disabled={!canEditPartA}>
                    <option value="">Select Country</option>
                    {countriesData.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">State of Origin</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.state_of_origin} onChange={e => setFormData({...formData, partA: {...formData.partA, state_of_origin: e.target.value}})} disabled={!canEditPartA || availableStates.length === 0}>
                    <option value="">Select State</option>
                    {availableStates.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium">Permanent Home Address</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.permanent_address} onChange={e => setFormData({...formData, partA: {...formData.partA, permanent_address: e.target.value}})} disabled={!canEditPartA} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Correspondence Address</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.correspondence_address} onChange={e => setFormData({...formData, partA: {...formData.partA, correspondence_address: e.target.value}})} disabled={!canEditPartA} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Marital Status</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.marital_status} onChange={e => setFormData({...formData, partA: {...formData.partA, marital_status: e.target.value}})} disabled={!canEditPartA}>
                    <option>Married</option><option>Single</option><option>Widowed</option><option>Divorced</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium">Tel No(s)</label><input type="text" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.phone || ''} onChange={e => setFormData({...formData, partA: {...formData.partA, phone: e.target.value}})} disabled={!canEditPartA} placeholder="+234..." /></div>
                </div>
              </div>
            )}
            
            {(partAStage === 2 || partAStage === 3 || partAStage === 4) && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'institutions', title: 'EDUCATIONAL INSTITUTIONS ATTENDED WITH DATES', btn: 'Institution', hasDates: true, stage: 2 },
                { id: 'qualifications', title: 'QUALIFICATIONS OBTAINED WITH DATES', btn: 'Qualification', hasDates: true, dropdownOptions: ["FSLC", "WAEC", "NECO", "NABTEB", "NBAIS", "NCE", "OND", "ND", "HND", "B.Sc.", "B.A.", "B.Eng.", "B.Ed.", "LL.B.", "MBBS", "PGD", "MBA", "M.Sc.", "M.A.", "M.Eng.", "M.Ed.", "M.Phil.", "Ph.D."], stage: 2 },
                { id: 'previous_employment', title: 'PREVIOUS EMPLOYMENT HISTORY', btn: 'Employment', hasDates: true, stage: 3 },
                { id: 'duties', title: '14. Present Schedule of Duty (to be stated clearly and fully)', btn: 'Duty', hasDates: false, stage: 4 },
                { id: 'acting_appointments', title: '15. Have you held any acting appointment(s) during the period under review; if yes, in what position and for how long in each case?', btn: 'Appointment', hasDates: true, stage: 4 },
                { id: 'examinations', title: '16. Examinations taken (with results) during the period under review (state date).', btn: 'Examination', hasDates: true, stage: 4 },
                { id: 'training', title: '17. Name any training course/workshop/seminar attended during the period under review (please attach appropriate evidence).', btn: 'Course/Workshop', hasDates: true, stage: 4 }
              ].filter((s: any) => s.stage === partAStage).map(section => (
                <div key={section.id} className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all hover:shadow-md min-w-0 overflow-hidden">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-xs sm:text-sm text-emerald-800 flex items-center gap-2 truncate"><div className="w-2 h-2 rounded-full bg-emerald-500 flex-none"></div> {section.title}</h4>
                    {role === 'staff' && urlState === 'drafting' && section.id !== 'previous_employment' && (
                      <button onClick={() => handleAddField(section.id as any)} className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 uppercase tracking-wider transition-colors flex-none ml-2">+ Add</button>
                    )}
                  </div>
                  <div className="space-y-3 min-w-0">
                    {(formData.partA[section.id as keyof typeof formData.partA] as any[]).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 w-full min-w-0">
                        <span className="text-xs font-bold mt-1.5 w-4 flex-none text-right text-slate-400">{idx + 1}.</span>
                        <div className="flex-1 flex flex-col gap-2 min-w-0 w-full">
                          {((section as any).dropdownOptions || section.hasDates) && (
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0">
                              {(section as any).dropdownOptions && (
                                <select className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:flex-1 sm:min-w-0" value={item.subtype || ""} onChange={(e) => handleArrayChange(section.id as any, idx, 'subtype', e.target.value)} disabled={!canEditPartA}>
                                  <option value="">Select Qualification...</option>
                                  {(section as any).dropdownOptions.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                              )}
                              {section.hasDates && (
                                <div className={`flex items-center gap-1.5 w-full ${(section as any).dropdownOptions ? 'sm:w-auto sm:flex-none sm:ml-auto' : ''}`}>
                                  <select className={`px-2 py-1 text-xs border border-slate-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none ${(section as any).dropdownOptions ? 'flex-1 sm:w-[82px]' : 'flex-1 min-w-0'}`} value={item.start} onChange={(e) => handleArrayChange(section.id as any, idx, 'start', e.target.value)} disabled={!canEditPartA}>
                                    <option value="">Start Year</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                  </select>
                                  <span className="text-xs text-slate-400 font-bold flex-none">-</span>
                                  <select className={`px-2 py-1 text-xs border border-slate-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none ${(section as any).dropdownOptions ? 'flex-1 sm:w-[82px]' : 'flex-1 min-w-0'}`} value={item.end} onChange={(e) => handleArrayChange(section.id as any, idx, 'end', e.target.value)} disabled={!canEditPartA}>
                                    <option value="">End Year</option>
                                    <option value="Present">Present</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}
                          {section.id === 'previous_employment' ? (
                            <div className="w-full grid grid-cols-1 gap-2 min-w-0">
                              <input type="text" className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white shadow-sm outline-none" placeholder="Employer" value={item.text || ""} onChange={(e) => handleArrayChange('previous_employment', idx, 'text', e.target.value)} disabled={!canEditPartA} />
                              <input type="text" className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white shadow-sm outline-none" placeholder="Post Held" value={item.subtype || ""} onChange={(e) => handleArrayChange('previous_employment', idx, 'subtype', e.target.value)} disabled={!canEditPartA} />
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white shadow-sm outline-none" placeholder="Last Income p.a." value={item.income || ""} onChange={(e) => handleArrayChange('previous_employment', idx, 'income', e.target.value)} disabled={!canEditPartA} />
                                <input type="text" className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white shadow-sm outline-none" placeholder="Reason for Leaving" value={item.reason || ""} onChange={(e) => handleArrayChange('previous_employment', idx, 'reason', e.target.value)} disabled={!canEditPartA} />
                              </div>
                            </div>
                          ) : (
                            <textarea rows={2} className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-y" placeholder={(section as any).dropdownOptions ? `Enter course/discipline...` : `Enter ${section.btn.toLowerCase()} details...`} value={item.text} onChange={(e) => handleArrayChange(section.id as any, idx, 'text', e.target.value)} disabled={!canEditPartA} />
                          )}
                        </div>
                        {role === 'staff' && urlState === 'drafting' && section.id !== 'previous_employment' && (
                          <button onClick={() => handleRemoveField(section.id as any, idx)} className="text-slate-400 hover:text-red-500 font-bold text-base px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors leading-none flex-none ml-1" title="Remove field">×</button>
                        )}
                      </div>
                    ))}
                    {(formData.partA[section.id as keyof typeof formData.partA] as any[]).length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-2">No entries added.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
                 {partAStage === 3 && (
                  <div className="bg-muted/10 border border-border rounded-lg p-4 mt-6">
                    <h4 className="font-medium text-sm mb-3 text-primary uppercase">JOSTUM APPOINTMENT HISTORY</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-xs font-medium">7(a) Date of First Appointment</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.date_of_first_appointment} onChange={e => setFormData({...formData, partA: {...formData.partA, date_of_first_appointment: e.target.value}})} disabled={!canEditPartA} /></div>
                      <div className="space-y-1"><label className="text-xs font-medium">7(b) Date of Transfer of Service to JOSTUM</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.date_of_transfer} onChange={e => setFormData({...formData, partA: {...formData.partA, date_of_transfer: e.target.value}})} disabled={!canEditPartA} /></div>
                      <div className="space-y-1"><label className="text-xs font-medium">7(c) Date of Assumption of Duty in JOSTUM</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.date_assumed_duty} onChange={e => setFormData({...formData, partA: {...formData.partA, date_assumed_duty: e.target.value}})} disabled={!canEditPartA} /></div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">8. Rank on First Appointment in JOSTUM</label>
                        <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.rank_on_first_appointment} onChange={e => setFormData({...formData, partA: {...formData.partA, rank_on_first_appointment: e.target.value}})} disabled={!canEditPartA}>
                          <option value="">Select Rank</option>
                          {dbRanks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                          {dbRanks.length === 0 && <option value="Assistant Lecturer">Assistant Lecturer</option>}
                        </select>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-medium">9. Date of Confirmation of Appointment</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.date_confirmed} onChange={e => setFormData({...formData, partA: {...formData.partA, date_confirmed: e.target.value}})} disabled={!canEditPartA} /></div>
                      <div className="space-y-1"><label className="text-xs font-medium">10. Date of Last Promotion/Regrading/Conversion</label><input type="date" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.date_last_promoted} onChange={e => setFormData({...formData, partA: {...formData.partA, date_last_promoted: e.target.value}})} disabled={!canEditPartA} /></div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-medium">11. Present Rank</label>
                        <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.present_rank} onChange={e => setFormData({...formData, partA: {...formData.partA, present_rank: e.target.value}})} disabled={!canEditPartA}>
                          <option value="">Select Rank</option>
                          {dbRanks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                          {dbRanks.length === 0 && <option value="Senior Lecturer">Senior Lecturer</option>}
                        </select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium">12. Present Salary/CONTISS (Level & Step)</label>
                        <div className="flex gap-2 md:w-2/3">
                          <select className="w-1/2 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.present_level} onChange={e => setFormData({...formData, partA: {...formData.partA, present_level: e.target.value}})} disabled={!canEditPartA}>
                            <option value="">CONTISS Level</option>
                            {Array.from({length: 18}, (_, i) => i + 1).map(l => <option key={l} value={l}>CONTISS {l}</option>)}
                          </select>
                          <select className="w-1/2 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" value={formData.partA.present_step} onChange={e => setFormData({...formData, partA: {...formData.partA, present_step: e.target.value}})} disabled={!canEditPartA}>
                            <option value="">Step</option>
                            {Array.from({length: 15}, (_, i) => i + 1).map(s => <option key={s} value={s}>Step {s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-3 mt-2">
                        <label className="text-sm font-medium">13. Dates of Last two (2) Promotions:</label>
                        <div className="border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
                          {/* Desktop Header */}
                          <div className="hidden md:grid grid-cols-3 bg-muted/50 text-xs font-medium border-b border-border">
                            <div className="px-3 py-2.5">Date of Promotion</div>
                            <div className="px-3 py-2.5 border-l border-border">Position to which Promoted</div>
                            <div className="px-3 py-2.5 border-l border-border">Salary/Scale</div>
                          </div>
                          
                          {/* Promotion Rows */}
                          <div className="divide-y divide-border border-t border-border md:border-t-0">
                            {[0, 1].map((idx) => {
                              const promo = (formData.partA.last_two_promotions || [{ start: "", text: "", income: "" }, { start: "", text: "", income: "" }])[idx] || { start: "", text: "", income: "" };
                              return (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 bg-background divide-y md:divide-y-0 md:divide-x divide-border">
                                  <div className="relative p-0 flex flex-col justify-center">
                                    <label className="md:hidden text-[10px] font-bold text-muted-foreground uppercase px-3 pt-2 pb-0.5">Date of Promotion</label>
                                    <input type="date" className="w-full px-3 pb-2 md:py-2.5 bg-transparent outline-none focus:ring-inset focus:ring-1 focus:ring-primary focus:z-10" value={promo.start || ""} onChange={e => handleArrayChange('last_two_promotions', idx, 'start', e.target.value)} disabled={!canEditPartA} />
                                  </div>
                                  <div className="relative p-0 flex flex-col justify-center">
                                    <label className="md:hidden text-[10px] font-bold text-muted-foreground uppercase px-3 pt-2 pb-0.5">Position Promoted To</label>
                                    <input type="text" className="w-full px-3 pb-2 md:py-2.5 bg-transparent outline-none focus:ring-inset focus:ring-1 focus:ring-primary focus:z-10" value={promo.text || ""} onChange={e => handleArrayChange('last_two_promotions', idx, 'text', e.target.value)} disabled={!canEditPartA} />
                                  </div>
                                  <div className="relative p-0 flex flex-col justify-center">
                                    <label className="md:hidden text-[10px] font-bold text-muted-foreground uppercase px-3 pt-2 pb-0.5">Salary/Scale</label>
                                    <input type="text" className="w-full px-3 pb-2 md:py-2.5 bg-transparent outline-none focus:ring-inset focus:ring-1 focus:ring-primary focus:z-10" value={promo.income || ""} onChange={e => handleArrayChange('last_two_promotions', idx, 'income', e.target.value)} disabled={!canEditPartA} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                 )}
                 {partAStage === 4 && (
                   <div className="bg-muted/10 border border-border rounded-lg p-6 mt-6 shadow-sm">
                     <h4 className="font-bold text-base mb-4 text-primary border-b border-border pb-2">18. Certification by Staff:</h4>
                     <p className="text-sm font-medium mb-4 italic">I declare that the above information is true and correct.</p>
                     
                     <div className="flex flex-col gap-4 max-w-md">
                        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', width: '100%', cursor: 'pointer' }}>
                          <input type="checkbox" style={{ width: '18px', height: '18px', margin: 0, flexShrink: 0, cursor: 'pointer' }} className="rounded border-border text-primary focus:ring-primary" checked={formData.partA.declaration} onChange={e => setFormData({...formData, partA: {...formData.partA, declaration: e.target.checked}})} disabled={!canEditPartA} />
                          <span className="text-sm font-semibold select-none uppercase tracking-wide">I DIGITALLY SIGN THIS DOCUMENT.</span>
                        </label>

                       {formData.partA.declaration && (
                         <div className="space-y-3 mt-2 bg-background p-4 rounded border border-border/50">
                           <div className="space-y-1">
                             <label className="text-xs font-medium text-muted-foreground">Signature of Staff (Name)</label>
                             <input type="text" className="w-full px-3 py-2 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary focus:border-primary outline-none font-semibold text-primary/80" value={formData.partA.declaration_name} onChange={e => setFormData({...formData, partA: {...formData.partA, declaration_name: e.target.value}})} disabled={!canEditPartA} placeholder="Type your full name..." />
                           </div>
                           <div className="space-y-1">
                             <label className="text-xs font-medium text-muted-foreground">Date</label>
                             <input type="date" className="w-full px-3 py-2 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary focus:border-primary outline-none" value={formData.partA.declaration_date} onChange={e => setFormData({...formData, partA: {...formData.partA, declaration_date: e.target.value}})} disabled={!canEditPartA} />
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
            </>
            )}
            
            <div className="pt-6 flex justify-between items-center border-t border-border mt-6">
              {partAStage > 1 ? (
                <button 
                  type="button"
                  onClick={() => setPartAStage(s => s - 1)}
                  className="px-6 py-2.5 bg-white border border-slate-300 shadow-sm text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all whitespace-nowrap"
                >
                  Back
                </button>
              ) : <div></div>}

              {partAStage < 4 ? (
                <button 
                  type="button"
                  onClick={() => setPartAStage(s => s + 1)}
                  className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 shadow-md text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-600 hover:shadow-lg transition-all whitespace-nowrap"
                >
                  Next
                </button>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  {role === 'staff' && urlState === 'drafting' && !isPartAValid() && (
                    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-lg flex items-center gap-2 max-w-md">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
                      <span>Please check the <strong>digital signature</strong> box and enter your full name & date below to submit Part A.</span>
                    </div>
                  )}
                  {role === 'staff' && urlState === 'drafting' ? (
                      <button 
                        onClick={() => handleAction("A", "Part A Submitted successfully!")}
                        disabled={isSubmitting || !isPartAValid()}
                        className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-md text-white rounded-xl font-bold hover:from-emerald-700 hover:to-emerald-600 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                      >
                        {isSubmitting ? "Submitting..." : <><Check className="w-5 h-5"/> Submit Part A</>}
                      </button>
                    ) : activeTabId !== activeStepToJumpTo ? (
                      <button 
                        onClick={() => setActiveTabId(activeStepToJumpTo)}
                        className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 shadow-md text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-600 hover:shadow-lg transition-all flex items-center gap-2"
                      >
                      Continue to Active Step
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PART B: SUPERVISOR ASSESSMENT */}
        {activeTabId === "supervisor_assessment" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {role === 'supervisor' && (
              <div className="bg-muted/30 p-4 rounded-lg border border-border mb-6">
                <h4 className="font-semibold text-sm mb-2 text-primary uppercase tracking-wider">Staff Submitted Data</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Name</span>{formData.partA.name}</div>
                  <div><span className="text-muted-foreground block text-xs">Rank</span>{formData.partA.present_rank}</div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs">Schedule of Duties</span>
                    {formData.partA.duties.length > 0 ? (
                      <ul className="list-disc pl-4 mt-1">
                        {formData.partA.duties.map((duty, i) => (
                          <li key={i}>{duty.text}</li>
                        ))}
                      </ul>
                    ) : 'No duties reported.'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg md:text-xl font-semibold">
                  Part B: Supervisor Assessment
                </h3>
                {role === "supervisor" && supervisorQueue.total > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Candidate {supervisorQueue.current > 0 ? supervisorQueue.current : '?'} of {supervisorQueue.total}
                    </span>
                    {supervisorQueue.nextId ? (
                      <button 
                        type="button"
                        onClick={() => window.location.href = `/evaluation?id=${supervisorQueue.nextId}&state=supervisor_assessment`}
                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        Skip to Next Staff
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                        End of Queue
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-xs md:text-sm px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full font-medium flex items-center gap-2 w-fit">
                <AlertCircle className="w-4 h-4"/> Official 100 Points Matrix
              </span>
            </div>
            
            {!canEditPartB && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-600 mb-4">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-none" />
                <span>
                  {role === 'supervisor' || role === 'admin' ? (
                    <span><strong>Supervisory Assessment Submitted:</strong> The score matrix has been recorded and locked.</span>
                  ) : (
                    <span><strong>Evaluation Screening Mode:</strong> Viewing Supervisory Assessment scored by the departmental supervisor. Only the authorized supervisor can edit Part B scores.</span>
                  )}
                </span>
              </div>
            )}
            
            <div className="bg-muted/10 border border-border rounded-lg p-3 md:p-4 mb-6">
              <h4 className="font-medium text-xs md:text-sm mb-3">Attendance & Discipline History</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Absent w/ Permission</label>
                  <input type="number" min="0" className="w-full px-2 py-1 text-sm border rounded" value={formData.partB.absent_with} onChange={e => setFormData({...formData, partB: {...formData.partB, absent_with: Number(e.target.value)}})} disabled={!canEditPartB} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Absent w/o Permission</label>
                  <input type="number" min="0" className="w-full px-2 py-1 text-sm border rounded text-destructive" value={formData.partB.absent_without} onChange={e => setFormData({...formData, partB: {...formData.partB, absent_without: Number(e.target.value)}})} disabled={!canEditPartB} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Times Warned</label>
                  <input type="number" min="0" className="w-full px-2 py-1 text-sm border rounded text-destructive" value={formData.partB.warned} onChange={e => setFormData({...formData, partB: {...formData.partB, warned: Number(e.target.value)}})} disabled={!canEditPartB} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Times Suspended</label>
                  <input type="number" min="0" className="w-full px-2 py-1 text-sm border rounded text-destructive" value={formData.partB.suspended} onChange={e => setFormData({...formData, partB: {...formData.partB, suspended: Number(e.target.value)}})} disabled={!canEditPartB} />
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-x-auto mb-6 shadow-sm">
              <table className="w-full text-xs md:text-sm text-left">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-1 md:px-4 py-3 font-semibold text-primary w-8 md:w-12 text-center">#</th>
                    <th className="px-1 md:px-4 py-3 font-semibold text-primary">4. Assessment and Weighting</th>
                    <th className="px-1 md:px-4 py-3 font-semibold text-primary w-12 md:w-24 text-center">Max Score</th>
                    <th className="px-1 md:px-4 py-3 font-semibold text-primary w-16 md:w-32 text-center">Score Awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(a)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Possession of basic qualification for the post</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">10</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="10" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.basic_qualification || ""} onChange={e => handlePartBScoreChange('basic_qualification', e.target.value, 10)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(b)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Additional relevant qualification</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">5</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="5" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.additional_qualification || ""} onChange={e => handlePartBScoreChange('additional_qualification', e.target.value, 5)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(c)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Relevant Work Experience <span className="text-muted-foreground text-xs block">(2 points per year, max 10 years)</span></td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">20</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="20" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.work_experience || ""} onChange={e => handlePartBScoreChange('work_experience', e.target.value, 20)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(d)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Admin/Supervisory Experience OR Technical/Supervisory Experience</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">10</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="10" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.admin_or_tech_experience || ""} onChange={e => handlePartBScoreChange('admin_or_tech_experience', e.target.value, 10)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(e)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Additional relevant training within the appraisal period</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">8</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="8" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.relevant_training || ""} onChange={e => handlePartBScoreChange('relevant_training', e.target.value, 8)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(f)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Personality/Temperament/Comportment/Team Spirit</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">7</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="7" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.personality_team_spirit || ""} onChange={e => handlePartBScoreChange('personality_team_spirit', e.target.value, 7)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(g)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Quality of work produced</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">5</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="5" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.quality_of_work || ""} onChange={e => handlePartBScoreChange('quality_of_work', e.target.value, 5)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="bg-muted/10">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(h)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-bold" colSpan={3}>General attitude to work (20 Points Total):</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td></td>
                    <td className="px-1 md:px-4 py-1 md:py-2 pl-8 font-medium border-l-2 border-primary/20">i. Regularity</td>
                    <td className="px-1 md:px-4 py-1 md:py-2 text-center text-muted-foreground font-semibold">4</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="4" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.regularity || ""} onChange={e => handlePartBScoreChange('regularity', e.target.value, 4)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td></td>
                    <td className="px-1 md:px-4 py-1 md:py-2 pl-8 font-medium border-l-2 border-primary/20">ii. Punctuality</td>
                    <td className="px-1 md:px-4 py-1 md:py-2 text-center text-muted-foreground font-semibold">4</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="4" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.punctuality || ""} onChange={e => handlePartBScoreChange('punctuality', e.target.value, 4)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td></td>
                    <td className="px-1 md:px-4 py-1 md:py-2 pl-8 font-medium border-l-2 border-primary/20">iii. Care of University property</td>
                    <td className="px-1 md:px-4 py-1 md:py-2 text-center text-muted-foreground font-semibold">4</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="4" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.care_of_property || ""} onChange={e => handlePartBScoreChange('care_of_property', e.target.value, 4)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td></td>
                    <td className="px-1 md:px-4 py-1 md:py-2 pl-8 font-medium border-l-2 border-primary/20">iv. Integrity</td>
                    <td className="px-1 md:px-4 py-1 md:py-2 text-center text-muted-foreground font-semibold">4</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="4" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.integrity || ""} onChange={e => handlePartBScoreChange('integrity', e.target.value, 4)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td></td>
                    <td className="px-1 md:px-4 py-1 md:py-2 pl-8 font-medium border-l-2 border-primary/20">v. Initiative</td>
                    <td className="px-1 md:px-4 py-1 md:py-2 text-center text-muted-foreground font-semibold">4</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="4" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.initiative || ""} onChange={e => handlePartBScoreChange('initiative', e.target.value, 4)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(i)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Knowledge of University Regulations/Office procedure Or Laboratory/Workshop practice.</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">10</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="10" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.knowledge_regulations || ""} onChange={e => handlePartBScoreChange('knowledge_regulations', e.target.value, 10)} disabled={!canEditPartB} /></td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-medium">(j)</td>
                    <td className="px-1 md:px-4 py-2 md:py-3 font-medium">Membership of professional bodies <span className="text-muted-foreground text-xs">(minimum of two)</span></td>
                    <td className="px-1 md:px-4 py-2 md:py-3 text-center text-muted-foreground font-semibold">5</td>
                    <td className="px-1 md:px-4 py-1 md:py-2"><input type="number" max="5" min="0" className="w-full px-3 py-1.5 border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none text-center font-bold" value={formData.partB.professional_membership || ""} onChange={e => handlePartBScoreChange('professional_membership', e.target.value, 5)} disabled={!canEditPartB} /></td>
                  </tr>
                </tbody>
                <tfoot className="bg-primary/5 border-t-2 border-primary/20">
                  <tr>
                    <td colSpan={2} className="px-1 md:px-4 py-3 md:py-4 text-right font-bold text-primary uppercase tracking-wider text-xs md:text-sm">Total Score:</td>
                    <td className="px-1 md:px-4 py-3 md:py-4 text-center font-bold text-primary text-base md:text-lg">100</td>
                    <td className="px-1 md:px-4 py-3 md:py-4">
                      <div className={`text-center font-bold text-xl md:text-2xl px-1 md:px-3 py-1.5 rounded bg-background border ${calculatePartBTotal(formData.partB) >= 70 ? 'border-emerald-500 text-emerald-600' : calculatePartBTotal(formData.partB) >= 45 ? 'border-amber-500 text-amber-600' : 'border-destructive text-destructive'}`}>
                        {calculatePartBTotal(formData.partB)}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold">5. Recommendation</label>
                <select className="w-full px-3 py-2.5 border border-border rounded-md bg-background focus:ring-1 focus:ring-primary outline-none font-medium" value={formData.partB.recommendation} onChange={e => setFormData({...formData, partB: {...formData.partB, recommendation: e.target.value}})} disabled={!canEditPartB}>
                  <option value="">Select recommendation based on score...</option>
                  <option value="Warning/Not recommended for Annual Increment">Warning/Not recommended for Annual Increment (0%-34%)</option>
                  <option value="Recommended for normal Annual Increment">Recommended for normal Annual Increment (35%-44%)</option>
                  <option value="Recommended for Promotion">Recommended for Promotion (at least 45%-90%)</option>
                  <option value="Not due for promotion">Not due for promotion</option>
                </select>
                <p className="text-[11px] text-muted-foreground mt-1 px-1">Choose the appropriate recommendation corresponding to the staff's maturity and performance score.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold">6. General Comments</label>
                <textarea className="w-full px-3 py-2.5 border border-border rounded-md bg-background h-[85px] resize-y focus:ring-1 focus:ring-primary outline-none" placeholder="Enter general comments here..." value={formData.partB.comments} onChange={e => setFormData({...formData, partB: {...formData.partB, comments: e.target.value}})} disabled={!canEditPartB}></textarea>
              </div>
            </div>
            
            {canEditPartB ? (
              <div className="pt-4 flex justify-between items-center border-t border-border mt-6">
                <div className="text-sm font-bold flex items-center gap-2">
                  Calculated Score: 
                  <span className={`text-lg ${calculatePartBTotal(formData.partB) >= 70 ? 'text-emerald-500' : calculatePartBTotal(formData.partB) >= 45 ? 'text-amber-500' : 'text-destructive'}`}>
                    {calculatePartBTotal(formData.partB)}/100
                  </span>
                </div>
                <button 
                  onClick={() => handleAction("B", "Assessment submitted and forwarded to staff for acknowledgment!")}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? "Submitting..." : <><Check className="w-4 h-4"/> Submit Assessment & Forward</>}
                </button>
              </div>
            ) : isEvaluator ? (
              <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-border mt-6 bg-slate-50 p-4 rounded-xl">
                <div className="text-sm font-bold flex items-center gap-2">
                  Awarded Score: 
                  <span className={`text-lg font-extrabold ${calculatePartBTotal(formData.partB) >= 70 ? 'text-emerald-600' : calculatePartBTotal(formData.partB) >= 45 ? 'text-amber-600' : 'text-destructive'}`}>
                    {calculatePartBTotal(formData.partB)}/100
                  </span>
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    (Rec: <strong>{formData.partB.recommendation || 'Satisfactory'}</strong>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {signatures.supervisor ? (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <img src={signatures.supervisor} alt="Supervisor Signature" className="max-h-7 max-w-[100px] object-contain" />
                      <div className="text-[10px] text-slate-600 font-semibold leading-tight">
                        <span>Dr. Clement Alabi</span>
                        <span className="block text-emerald-700 font-bold">✓ Signed</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 font-serif italic font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200" style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, serif' }}>
                      ✍️ Dr. Clement Alabi
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* PART C: STAFF ACKNOWLEDGMENT */}
        {activeTabId === "staff_acknowledgment" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-semibold border-b border-border pb-3">Part C: Staff Acknowledgment</h3>
            
            {!canEditPartC && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-600 mb-4">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-none" />
                <span>
                  {role === 'staff' ? (
                    <span><strong>Staff Acknowledgment Signed:</strong> Your acknowledgment of the supervisory rating has been recorded.</span>
                  ) : (
                    <span><strong>Staff Response Screening:</strong> Viewing staff candidate's acknowledgment. Digital signing is reserved for the candidate.</span>
                  )}
                </span>
              </div>
            )}
            <div className="bg-muted/30 p-4 rounded-lg border border-border mb-6">
              <p className="text-sm text-muted-foreground">Please review the supervisor's assessment score. You must digitally sign your agreement or disagreement.</p>
              <div className="mt-4 flex items-center gap-6">
                <div className="text-2xl font-bold">Total Score: <span className="text-primary">{calculatePartBTotal(formData.partB)}/100</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium block">Do you agree with this assessment?</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border border-border rounded-md hover:bg-muted/50 transition-colors w-full">
                  <input type="radio" name="agreement" className="w-4 h-4 text-primary" 
                         checked={formData.partC.agree === true} onChange={() => setFormData({...formData, partC: {...formData.partC, agree: true}})}
                         disabled={!canEditPartC} />
                  <span className="font-medium">I Agree</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border border-border rounded-md hover:bg-muted/50 transition-colors w-full">
                  <input type="radio" name="agreement" className="w-4 h-4 text-destructive" 
                         checked={formData.partC.agree === false} onChange={() => setFormData({...formData, partC: {...formData.partC, agree: false}})}
                         disabled={!canEditPartC} />
                  <span className="font-medium">I Disagree</span>
                </label>
              </div>
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium text-muted-foreground">Reasons/Comments (Optional if Agree, Required if Disagree)</label>
                <textarea className="w-full px-3 py-2 border border-border rounded-md bg-background h-24" 
                          placeholder="Enter your comments..." 
                          value={formData.partC.comments || ""} onChange={e => setFormData({...formData, partC: {...formData.partC, comments: e.target.value}})}
                          disabled={!canEditPartC}></textarea>
              </div>
            </div>
            
            {canEditPartC ? (
              <div className="pt-4 flex justify-end border-t border-border mt-6">
                <button 
                  onClick={() => handleAction("C", "Acknowledgment signed successfully.")}
                  disabled={isSubmitting || (formData.partC.agree === false && !formData.partC.comments)}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? "Signing..." : <><Check className="w-4 h-4"/> Digitally Sign & Submit</>}
                </button>
              </div>
            ) : (
              <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-border mt-6 bg-slate-50 p-4 rounded-xl">
                <div className="text-xs font-semibold text-slate-700">
                  Staff Acknowledgment Status:{" "}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${formData.partC.agree !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {formData.partC.agree !== false ? 'Agreed with Supervisor Score' : 'Disagreed with Score'}
                  </span>
                  {formData.partC.comments && (
                    <p className="mt-1 text-slate-500 font-normal italic">"{formData.partC.comments}"</p>
                  )}
                </div>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5"/> Print Dossier (A-C)
                </button>
              </div>
            )}
          </div>
        )}

        {/* PART D: DEPT REVIEW */}
        {activeTabId === "departmental_review" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1 border-b border-border pb-3 mb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Part D: Departmental Review & Recommendation</h3>
                <span className="text-xs px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-full font-bold">
                  Departmental Committee
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The Departmental Appraisal Committee evaluates the candidate dossier, considers the supervisor's assessment, and formulates the official departmental recommendation.
              </p>
            </div>

            {!canEditPartD && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-600 mb-4">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-none" />
                <span>
                  {role === 'dept_chairman' || role === 'hod' || role === 'admin' ? (
                    <span><strong>Departmental Review Submitted:</strong> Committee minutes and recommendation forwarded to Central APC.</span>
                  ) : (
                    <span><strong>Departmental Screening Mode:</strong> Viewing departmental evaluation. Editing is reserved for the HOD / Committee Chairman.</span>
                  )}
                </span>
              </div>
            )}

            {/* Dossier screening summary for HOD */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Candidate Dossier Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Candidate Name:</span>
                  <span className="font-bold text-slate-800 text-sm">{formData.partA.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Present Rank:</span>
                  <span className="font-bold text-slate-800 text-sm">{formData.partA.present_rank || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Supervisor Score (Part B):</span>
                  <span className="font-black text-emerald-700 text-sm">{calculatePartBTotal(formData.partB)} / 100</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Supervisor Recommendation:</span>
                  <span className="font-semibold text-slate-700">{formData.partB.recommendation || "Satisfactory"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Staff Acknowledgment (Part C):</span>
                  <span className="font-semibold text-slate-700">
                    {formData.partC.agree !== false ? "Staff Agreed with Score" : "Staff Disagreed with Score"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Departmental Recommendation *</label>
                <select 
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
                  value={formData.partD.recommendation || "Recommend for Promotion"} 
                  onChange={e => setFormData({...formData, partD: {...formData.partD, recommendation: e.target.value}})}
                  disabled={!canEditPartD}
                >
                  <option value="Recommend for Promotion">Recommend for Promotion</option>
                  <option value="Recommend for Annual Increment Only">Recommend for Annual Increment Only</option>
                  <option value="Recommend for Confirmation of Appointment">Recommend for Confirmation of Appointment</option>
                  <option value="Not Recommended / Deferred">Not Recommended / Deferred</option>
                  <option value="Warning / Disciplinary Action">Warning / Disciplinary Action</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Proposed Rank / New Title *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
                  placeholder="e.g. Associate Professor / Senior Lecturer" 
                  value={formData.partD.proposed_rank || ""} 
                  onChange={e => setFormData({...formData, partD: {...formData.partD, proposed_rank: e.target.value}})}
                  disabled={!canEditPartD}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Excerpt of Committee Minutes & Justification *</label>
              <textarea 
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm resize-y h-24 focus:ring-2 focus:ring-primary/20 outline-none" 
                placeholder="Enter excerpt of Departmental Appraisal Committee meeting minutes, performance review findings, and justification for recommendation..." 
                value={formData.partD.remarks || formData.partD.committee_minutes || ""} 
                onChange={e => setFormData({...formData, partD: {...formData.partD, remarks: e.target.value, committee_minutes: e.target.value}})}
                disabled={!canEditPartD}
              ></textarea>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>HOD / Committee Chairman Signature Confirmation *</span>
                {signatures.dept_chairman ? (
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    ✓ Uploaded Official Signature Active
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Digital typed signature active)
                  </span>
                )}
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
                  placeholder="Full Name of HOD (e.g. Prof. Aminu Bello)" 
                  value={formData.partD.signature || "Prof. Aminu Bello"} 
                  onChange={e => setFormData({...formData, partD: {...formData.partD, signature: e.target.value}})}
                  disabled={!canEditPartD}
                />
                {signatures.dept_chairman && (
                  <div className="h-[42px] px-3 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-xs">
                    <img src={signatures.dept_chairman} alt="HOD Signature" className="max-h-7 max-w-[110px] object-contain" />
                  </div>
                )}
              </div>
            </div>
            
            {canEditPartD ? (
              <div className="pt-4 flex justify-end border-t border-border mt-6">
                <button 
                  onClick={() => handleAction("D", "Forwarded to Central A&P Committee (APC)")}
                  disabled={isSubmitting || !formData.partD.recommendation}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? "Forwarding..." : <><Check className="w-4 h-4"/> Submit Departmental Review & Forward to APC</>}
                </button>
              </div>
            ) : isEvaluator ? (
              <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-border mt-6 bg-slate-50 p-4 rounded-xl">
                <div className="text-xs font-semibold text-slate-700">
                  Dept Recommendation: <span className="font-bold text-sky-800">{formData.partD.recommendation || "Recommend for Promotion"}</span>
                  {formData.partD.proposed_rank && <span className="ml-2 text-slate-500">(Proposed: {formData.partD.proposed_rank})</span>}
                </div>
                <div className="flex items-center gap-2">
                  {signatures.dept_chairman ? (
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <img src={signatures.dept_chairman} alt="HOD Signature" className="max-h-6 max-w-[90px] object-contain" />
                      <span className="text-[10px] text-slate-600 font-bold">{formData.partD.signature || "Prof. Aminu Bello"}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 font-serif italic font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200" style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, serif' }}>
                      ✍️ {formData.partD.signature || "Prof. Aminu Bello"}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* PART E: A&P FINAL DECISION */}
        {activeTabId === "final_decision" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Part E: Appointments & Promotions Committee (APC) Final Decision</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Central University ratification of candidate promotion, annual increment, or confirmation of appointment.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
                Central APC Authority
              </span>
            </div>

            {!canEditPartE && !isRatified && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-600 mb-4">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-none" />
                <span>
                  <strong>Central APC Authority:</strong> Only the Central Appointments & Promotions Committee (APC) Chairman can record and ratify the final enterprise decision.
                </span>
              </div>
            )}

            {/* Dossier Review Summary for APC Chairman */}
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 space-y-3">
              <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Enterprise Evaluation Dossier Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Candidate Name:</span>
                  <span className="font-bold text-slate-800 text-sm">{formData.partA.name || "Dr. Staff Candidate"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Supervisor Score (Part B):</span>
                  <span className="font-black text-emerald-700 text-sm">{calculatePartBTotal(formData.partB)} / 100</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Dept Recommendation (Part D):</span>
                  <span className="font-bold text-sky-800 text-sm">{formData.partD.recommendation || "Recommend for Promotion"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Proposed Rank:</span>
                  <span className="font-extrabold text-emerald-800 text-sm">{formData.partD.proposed_rank || "Senior Lecturer"}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-xs text-slate-600">
                <span>Staff Agreement: <strong>{formData.partC.agree !== false ? "Agreed" : "Disagreed with Supervisor Assessment"}</strong></span>
                <span>Department: <strong>{formData.partA.department || "Computer Science"}</strong></span>
              </div>
            </div>

            {/* Official Enterprise Ratification Box */}
            {isRatified && (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-none shadow-sm">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                      Official A&P Ratification Completed
                      <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-900 text-xs font-black rounded-full uppercase tracking-wider">
                        Status: Completed
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      The Appointments & Promotions Committee has ratified this evaluation. All records are locked into university enterprise archives.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-200 text-xs items-center">
                  <div>
                    <span className="text-slate-500 font-medium block">Ratified Decision:</span>
                    <span className="font-extrabold text-emerald-900 text-sm">{formData.partE.decision}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Effective Date:</span>
                    <span className="font-bold text-slate-800 text-sm">{formData.partE.effective_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Ratified Signature:</span>
                    {signatures.apc_chairman ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img src={signatures.apc_chairman} alt="APC Chairman Signature" className="max-h-6 max-w-[90px] object-contain" />
                        <span className="text-[10px] font-bold text-emerald-900">Prof. J. O. Oladipo</span>
                      </div>
                    ) : (
                      <span className="font-serif italic font-bold text-slate-800 text-xs" style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, serif' }}>
                        ✍️ Prof. J. O. Oladipo
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Lifecycle:</span>
                    <span className="font-black text-emerald-700 text-sm">COMPLETED (100%)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Final Enterprise Decision *</label>
                <select 
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-600" 
                  value={formData.partE.decision || "Approve Promotion"} 
                  onChange={e => setFormData({...formData, partE: {...formData.partE, decision: e.target.value}})}
                  disabled={!canEditPartE || isRatified}
                >
                  <option value="Approve Promotion">Approve Promotion</option>
                  <option value="Approve Increment Only">Approve Increment Only</option>
                  <option value="Approve Confirmation of Appointment">Approve Confirmation of Appointment</option>
                  <option value="Defer Application for 1 Year">Defer Application for 1 Year</option>
                  <option value="Reject Application">Reject Application</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Effective Date of Ratification *</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-600" 
                  value={formData.partE.effective_date || new Date().toISOString().split('T')[0]} 
                  onChange={e => setFormData({...formData, partE: {...formData.partE, effective_date: e.target.value}})}
                  disabled={!canEditPartE || isRatified}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">APC Committee Remarks & Minute Reference *</label>
              <textarea 
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm resize-y h-24 focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-600" 
                placeholder="Enter APC minute reference (e.g. APC/MIN/2026/04/S.12) and official remarks on candidate ratification..." 
                value={formData.partE.remarks || ""} 
                onChange={e => setFormData({...formData, partE: {...formData.partE, remarks: e.target.value}})}
                disabled={!canEditPartE || isRatified}
              ></textarea>
            </div>

            {canEditPartE && !isRatified && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">APC Chairman Official Endorsement:</span>
                  <span className="text-slate-500">
                    Ratifying as <strong>Prof. J. O. Oladipo</strong> (Chairman, Appointments & Promotions Committee)
                  </span>
                </div>
                {signatures.apc_chairman ? (
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <img src={signatures.apc_chairman} alt="APC Chairman Signature" className="max-h-7 max-w-[100px] object-contain" />
                    <span className="text-[10px] font-bold text-emerald-700">✓ Uploaded Graphic</span>
                  </div>
                ) : (
                  <span className="font-serif italic font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200" style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, serif' }}>
                    ✍️ Digital Name Representation
                  </span>
                )}
              </div>
            )}
            
            {isRatified ? (
              <div className="pt-4 flex flex-wrap justify-between items-center gap-3 border-t border-border mt-6">
                <button 
                  type="button"
                  onClick={() => setShowRatifiedModal(true)}
                  className="px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4 text-emerald-600" /> View Ratification Certificate
                </button>
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-all flex items-center gap-2 shadow-sm text-xs"
                >
                  <FileText className="w-4 h-4" /> Print Ratified APER Dossier
                </button>
              </div>
            ) : canEditPartE ? (
              <div className="pt-4 flex justify-between items-center border-t border-border mt-6">
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Preview Full APER Report
                </button>
                <button 
                  onClick={() => handleAction("E", "Final Decision recorded and ratified into university system records.")}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Ratifying..." : <><Check className="w-4 h-4"/> Confirm & Ratify Enterprise Decision</>}
                </button>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </div>

    {/* Final Approval Confirmation Success Modal */}
    {showRatifiedModal && (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          
          <h3 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Final Decision Recorded!
          </h3>
          <p className="text-sm text-center text-slate-500 mb-6">
            The Appointments & Promotions Committee (A&P) decision has been officially ratified and locked into university system records.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-6 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Candidate Name:</span>
              <span className="font-bold text-slate-800">{formData.partA.name || "Dr. John Doe"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Final Decision:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                {formData.partE.decision}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Supervisor Score:</span>
              <span className="font-bold text-slate-800">{calculatePartBTotal(formData.partB)} / 100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Ratification Date:</span>
              <span className="font-medium text-slate-600">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Print APER Report
            </button>
            <button
              type="button"
              onClick={() => setShowRatifiedModal(false)}
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              Close & Done
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="hidden print:block aper-print-root">
      <PartAPrintLayout formData={formData} />
    </div>
    </>
  );
}
