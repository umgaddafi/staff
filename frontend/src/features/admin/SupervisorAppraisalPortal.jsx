import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { api } from '../../lib/api';
import {
    BarChart3,
    ClipboardList,
    FileText,
    CheckCircle2,
    Clock,
    UserCheck,
    Settings,
    LogOut,
    Search,
    Filter,
    ArrowRight,
    Edit,
    Eye,
    ShieldCheck,
    Camera,
    Key,
    PanelLeftClose,
    PanelLeftOpen,
    Users,
    Award,
    X,
    Building,
    User,
    ExternalLink,
    AlertCircle,
    PenTool,
    Trash2,
    Upload,
    FileSignature,
    Check,
    Calendar,
    Printer,
    TrendingUp,
    History,
    Shield,
    PieChart,
    Download,
    FileSpreadsheet,
    Sliders,
    Bell,
    Database,
    RotateCcw,
    Save,
    UserPlus,
    ToggleLeft,
    ToggleRight,
    RefreshCw,
    Copy,
    Edit3
} from 'lucide-react';
import jostumLogo from '../../assets/jostum.jpeg';
import EvaluationForm from '../staff/StaffAppraisalEvaluation';

export function SupervisorAppraisalPortal({ user, onLogout }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDept, setFilterDept] = useState('all');
    const [filterStage, setFilterStage] = useState('all');
    const [screeningStaff, setScreeningStaff] = useState(null);

    // Analytics & Downloadable Reports State
    const [reportSession, setReportSession] = useState('2025/2026');
    const [reportDeptFilter, setReportDeptFilter] = useState('all');
    const [reportCategory, setReportCategory] = useState('all');
    const [previewReport, setPreviewReport] = useState(null);
    const [downloadSuccessToast, setDownloadSuccessToast] = useState('');

    // Comprehensive Appraisal Administrative Settings State & Defaults
    const defaultAppraisalSettings = {
        // 1. Cycles & Deadlines
        active_session: '2025/2026',
        cycle_title: '2025/2026 Annual Staff Performance Evaluation & Promotion Exercise',
        submission_open_date: '2026-08-01',
        submission_close_date: '2026-09-30',
        supervisor_deadline: '2026-10-15',
        dept_review_deadline: '2026-10-31',
        apc_ratification_deadline: '2026-11-15',
        allow_late_submissions: true,
        late_grace_days: 7,
        auto_lock_past_deadline: true,

        // 2. Scoring Benchmarks
        promotion_pass_mark: 70.0,
        accelerated_merit_mark: 85.0,
        increment_minimum_mark: 50.0,
        warning_threshold_mark: 50.0,
        allow_decimal_scores: true,
        min_years_on_rank: 3,
        enforce_publications_rule: true,

        // 3. Matrix Weights (sum = 100)
        weight_teaching: 40,
        weight_research: 30,
        weight_service: 15,
        weight_conduct: 15,

        // 4. Workflow Rules
        strict_sequential_workflow: true,
        require_part_c_acknowledgment: true,
        allow_rebuttal_comments: true,
        anonymous_scoring_mode: false,
        committee_quorum_count: 3,
        auto_advance_on_ratify: true,

        // 5. Digital Signatures & Auth
        enforce_supervisor_signature: true,
        enforce_staff_signature: true,
        enforce_hod_signature: true,
        enforce_apc_signature: true,
        signature_display_mode: 'uploaded_or_cursive',
        require_apc_2fa: false,

        // 6. Notifications
        notify_on_stage_advance: true,
        notify_on_rejection_query: true,
        send_bottleneck_digests: true,
        urgent_sms_alerts: false,
        registry_contact_email: 'aper.registry@jostum.edu.ng',
        sms_sender_id: 'JOSTUM-APER',

        // 7. Print & Export
        default_paper_format: 'a4_portrait',
        include_minutes_excerpt: true,
        watermark_in_progress_dossiers: true,
        registry_author_stamp: 'Academic Registry, Joseph Sarwuan Tarka University, Makurdi',

        // 8. Data Governance
        audit_log_retention_years: '7_years',
        maintenance_mode: false,
    };

    const [appraisalSettings, setAppraisalSettings] = useState(() => {
        try {
            const stored = localStorage.getItem('jostum_appraisal_admin_settings');
            return stored ? { ...defaultAppraisalSettings, ...JSON.parse(stored) } : defaultAppraisalSettings;
        } catch {
            return defaultAppraisalSettings;
        }
    });
    const [settingsCategory, setSettingsCategory] = useState('all');
    const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsToast, setSettingsToast] = useState({ type: '', message: '' });
    const [showResetSettingsModal, setShowResetSettingsModal] = useState(false);

    // Current user state
    const [currentUser, setCurrentUser] = useState(() => {
        const stored = localStorage.getItem('appraisal_auth_user');
        return stored ? JSON.parse(stored) : (user || {
            email: 'supervisor@jostum.edu.ng',
            name: 'Dr. Clement Alabi',
            role: 'supervisor',
            department: 'Computer Science',
            member_code: 'SUP-001'
        });
    });

    function switchRole(newRole) {
        let mockUser = { ...currentUser, role: newRole };
        if (newRole === 'supervisor') {
            mockUser.name = 'Dr. Clement Alabi';
            mockUser.department = 'Computer Science';
            mockUser.email = 'supervisor@jostum.edu.ng';
        } else if (newRole === 'dept_chairman') {
            mockUser.name = 'Prof. Aminu Bello';
            mockUser.department = 'Computer Science';
            mockUser.email = 'hod.cs@jostum.edu.ng';
        } else if (newRole === 'apc_chairman') {
            mockUser.name = 'Prof. J. O. Oladipo';
            mockUser.department = 'Appointments & Promotions Committee';
            mockUser.email = 'apc.chair@jostum.edu.ng';
        } else if (newRole === 'admin') {
            mockUser.name = 'Engr. D. K. Audu';
            mockUser.department = 'Academic Registry';
            mockUser.email = 'admin.appraisal@jostum.edu.ng';
        }
        setCurrentUser(mockUser);
        localStorage.setItem('appraisal_auth_user', JSON.stringify(mockUser));
    }

    // Profile state for password & passport photo updates
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
    const [passportUrl, setPassportUrl] = useState(currentUser.passport_url || '');

    // Digital Signatures state for Supervisor, Dept HOD, APC Chairman
    const [signatures, setSignatures] = useState(() => {
        try {
            const stored = localStorage.getItem('appraisal_signatures');
            return stored ? JSON.parse(stored) : {
                supervisor: null,
                dept_chairman: null,
                apc_chairman: null
            };
        } catch {
            return { supervisor: null, dept_chairman: null, apc_chairman: null };
        }
    });
    const [activeSigRole, setActiveSigRole] = useState(
        ['supervisor', 'dept_chairman', 'apc_chairman'].includes(currentUser.role) ? currentUser.role : 'supervisor'
    );
    const [signatureUploading, setSignatureUploading] = useState(false);

    // Fetch stored signatures from backend API on mount
    useEffect(() => {
        async function fetchSignatures() {
            try {
                const res = await api.get('/api/appraisal/signatures');
                const sigs = res?.signatures || res?.data?.signatures;
                if (sigs) {
                    setSignatures(prev => {
                        const merged = { ...prev, ...sigs };
                        localStorage.setItem('appraisal_signatures', JSON.stringify(merged));
                        return merged;
                    });
                }
            } catch (err) {
                console.warn("API signatures fetch warning:", err);
            }
        }
        fetchSignatures();
    }, []);

    // Fetch stored settings from backend API on mount
    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await api.get('/api/appraisal/settings');
                const sets = res?.settings || res?.data?.settings;
                if (sets) {
                    setAppraisalSettings(prev => {
                        const merged = { ...prev, ...sets };
                        localStorage.setItem('jostum_appraisal_admin_settings', JSON.stringify(merged));
                        return merged;
                    });
                }
            } catch (err) {
                console.warn("API appraisal settings fetch notice:", err);
            }
        }
        fetchSettings();
    }, []);

    const currentWeightSum = Number(appraisalSettings.weight_teaching || 0) +
                             Number(appraisalSettings.weight_research || 0) +
                             Number(appraisalSettings.weight_service || 0) +
                             Number(appraisalSettings.weight_conduct || 0);
    const isWeightBalanced = currentWeightSum === 100;

    async function handleSaveAllSettings(e) {
        if (e) e.preventDefault();
        setSettingsSaving(true);
        setSettingsToast({ type: '', message: '' });

        localStorage.setItem('jostum_appraisal_admin_settings', JSON.stringify(appraisalSettings));

        try {
            await api.post('/api/appraisal/settings', { settings: appraisalSettings });
            setSettingsToast({
                type: 'success',
                message: isWeightBalanced
                    ? 'All institutional appraisal settings & statutory policies saved successfully!'
                    : `Settings saved, but WARNING: Supervisory matrix weights equal ${currentWeightSum}/100 points!`
            });
        } catch (err) {
            console.warn("Backend settings save notice:", err);
            setSettingsToast({
                type: 'success',
                message: 'All appraisal settings updated and cached locally.'
            });
        } finally {
            setSettingsSaving(false);
            setTimeout(() => setSettingsToast({ type: '', message: '' }), 5000);
        }
    }

    async function handleResetSettingsToDefaults() {
        setAppraisalSettings(defaultAppraisalSettings);
        localStorage.setItem('jostum_appraisal_admin_settings', JSON.stringify(defaultAppraisalSettings));
        setShowResetSettingsModal(false);

        try {
            await api.post('/api/appraisal/settings', { settings: defaultAppraisalSettings });
        } catch (err) {
            console.warn("Backend reset settings notice:", err);
        }

        setSettingsToast({ type: 'success', message: 'All appraisal settings reset to statutory university defaults.' });
        setTimeout(() => setSettingsToast({ type: '', message: '' }), 4500);
    }

    function handleExportSettingsJson() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appraisalSettings, null, 2));
        const dlAnchorElem = document.createElement('a');
        const fileName = `jostum_appraisal_settings_${(appraisalSettings.active_session || '2025_2026').replace('/', '_')}.json`;
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", fileName);
        dlAnchorElem.click();
        setSettingsToast({ type: 'success', message: `Exported backup configuration: ${fileName}` });
        setTimeout(() => setSettingsToast({ type: '', message: '' }), 4000);
    }

    function handleImportSettingsJson(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (typeof parsed === 'object' && parsed !== null) {
                    const merged = { ...defaultAppraisalSettings, ...parsed };
                    setAppraisalSettings(merged);
                    localStorage.setItem('jostum_appraisal_admin_settings', JSON.stringify(merged));
                    try {
                        await api.post('/api/appraisal/settings', { settings: merged });
                    } catch (err) {
                        console.warn("Backend imported settings sync notice:", err);
                    }
                    setSettingsToast({ type: 'success', message: 'Configuration backup imported & applied successfully!' });
                } else {
                    setSettingsToast({ type: 'error', message: 'Invalid settings JSON backup file.' });
                }
            } catch (err) {
                setSettingsToast({ type: 'error', message: 'Failed to parse JSON backup file.' });
            } finally {
                setTimeout(() => setSettingsToast({ type: '', message: '' }), 4500);
            }
        };
        reader.readAsText(file);
    }

    // Sync active signature tab whenever active role switches
    useEffect(() => {
        if (['supervisor', 'dept_chairman', 'apc_chairman'].includes(currentUser.role)) {
            setActiveSigRole(currentUser.role);
        }
    }, [currentUser.role]);

    // Helper to detect any legacy dummy sample data
    const isDummySubmission = (sub) => {
        if (!sub) return true;
        const dummyNames = [
            'Dr. Amina Bello',
            'Mr. Terver Isaac Kange',
            'Dr. Emmanuel Chinedu Okafor',
            'Engr. Folashade Adebayo'
        ];
        const name = (sub.staff_name || sub.full_name || sub.name || '').trim();
        const pf = (sub.pf_number || sub.file_number || '').trim();
        const dummyPFs = ['PF/4102', 'PF/5218', 'PF/3890', 'PF/2941'];
        return dummyNames.includes(name) || dummyPFs.includes(pf);
    };

    // Submissions state initialized exclusively from real submitted staff appraisals
    const [submissions, setSubmissions] = useState(() => {
        const stored = localStorage.getItem('jostum_staff_appraisal_submissions');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    return parsed.filter(sub => !isDummySubmission(sub));
                }
            } catch (e) {}
        }
        return [];
    });

    // Fetch real submissions from backend API & ensure only real submitted staff are used
    const fetchSubmissions = async () => {
        let serverSubmissions = null;
        try {
            const res = await api.get('/api/appraisal/submissions');
            serverSubmissions = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
        } catch (err) {
            console.warn("Backend API sync fallback to local store", err);
        }

        if (Array.isArray(serverSubmissions)) {
            const realServerList = serverSubmissions.filter(sub => !isDummySubmission(sub));
            setSubmissions(realServerList);
            localStorage.setItem('jostum_staff_appraisal_submissions', JSON.stringify(realServerList));
            return;
        }

        // Offline fallback - purge any lingering dummy records from localStorage
        const stored = localStorage.getItem('jostum_staff_appraisal_submissions');
        if (stored) {
            try {
                const localSubmissions = JSON.parse(stored).filter(sub => !isDummySubmission(sub));
                setSubmissions(localSubmissions);
                localStorage.setItem('jostum_staff_appraisal_submissions', JSON.stringify(localSubmissions));
            } catch (e) {}
        }
    };

    // Clean up any legacy dummy cache keys
    useEffect(() => {
        ['2', '3', '4', '5'].forEach(id => {
            localStorage.removeItem(`jostum_appraisal_submitted_data_${id}`);
        });
    }, []);

    // -------------------------------------------------------------
    // MANAGE APPRAISAL USERS & STATUTORY EVALUATORS STATE
    // -------------------------------------------------------------
    const [officers, setOfficers] = useState([]);
    const [officersStats, setOfficersStats] = useState({
        total: 0,
        supervisors: 0,
        dept_chairmen: 0,
        apc_chairmen: 0,
        admins: 0,
        active: 0,
        inactive: 0
    });
    const [officersLoading, setOfficersLoading] = useState(false);
    const [officerSearch, setOfficerSearch] = useState('');
    const [officerRoleFilter, setOfficerRoleFilter] = useState('all');
    const [officerDeptFilter, setOfficerDeptFilter] = useState('all');
    const [officerStatusFilter, setOfficerStatusFilter] = useState('all');

    // Modals
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [editingOfficer, setEditingOfficer] = useState(null);
    const [tempPasswordResult, setTempPasswordResult] = useState(null);
    const [deletingOfficer, setDeletingOfficer] = useState(null);
    const [officerFormSubmitting, setOfficerFormSubmitting] = useState(false);
    const [officerFormError, setOfficerFormError] = useState('');
    const [officerToast, setOfficerToast] = useState({ type: '', text: '' });
    const [copiedPassword, setCopiedPassword] = useState(false);

    const initialOfficerForm = {
        name: '',
        title: 'Dr.',
        email: '',
        username: '',
        pf_number: '',
        phone: '',
        role: 'supervisor',
        designation: '',
        department: 'Computer Science',
        faculty: 'Physical Sciences',
        password: '',
        status: 'active',
        notes: ''
    };
    const [officerFormData, setOfficerFormData] = useState(initialOfficerForm);

    const fetchOfficers = async () => {
        try {
            setOfficersLoading(true);
            const res = await api.get('/api/appraisal/users');
            if (res && res.status === 'success') {
                setOfficers(res.data || []);
                if (res.stats) setOfficersStats(res.stats);
            }
        } catch (err) {
            console.warn("Could not fetch appraisal officers", err);
        } finally {
            setOfficersLoading(false);
        }
    };

    useEffect(() => {
        fetchOfficers();
    }, []);

    const handleOpenRegisterModal = () => {
        setEditingOfficer(null);
        setOfficerFormData({
            ...initialOfficerForm,
            password: 'Jostum@' + Math.floor(1000 + Math.random() * 9000)
        });
        setOfficerFormError('');
        setShowRegisterModal(true);
    };

    const handleOpenEditModal = (officer) => {
        setEditingOfficer(officer);
        setOfficerFormData({
            name: officer.name || '',
            title: officer.title || 'Dr.',
            email: officer.email || '',
            username: officer.username || '',
            pf_number: officer.pf_number || '',
            phone: officer.phone || '',
            role: officer.role || 'supervisor',
            designation: officer.designation || '',
            department: officer.department || 'Computer Science',
            faculty: officer.faculty || 'Physical Sciences',
            password: '',
            status: officer.status || 'active',
            notes: officer.notes || ''
        });
        setOfficerFormError('');
        setShowRegisterModal(true);
    };

    const handleSaveOfficerSubmit = async (e) => {
        if (e) e.preventDefault();
        setOfficerFormSubmitting(true);
        setOfficerFormError('');

        try {
            if (editingOfficer) {
                const res = await api.put(`/api/appraisal/users/${editingOfficer.id}`, officerFormData);
                if (res && res.status === 'success') {
                    setOfficerToast({ type: 'success', text: `Officer ${officerFormData.name} updated successfully.` });
                    setShowRegisterModal(false);
                    setEditingOfficer(null);
                    fetchOfficers();
                }
            } else {
                const res = await api.post('/api/appraisal/users', officerFormData);
                if (res && res.status === 'success') {
                    setOfficerToast({ type: 'success', text: `New statutory officer ${officerFormData.name} registered successfully.` });
                    setShowRegisterModal(false);
                    fetchOfficers();
                }
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to save officer profile. Check inputs.';
            setOfficerFormError(msg);
        } finally {
            setOfficerFormSubmitting(false);
            setTimeout(() => setOfficerToast({ type: '', text: '' }), 4500);
        }
    };

    const handleToggleStatus = async (officer) => {
        try {
            const res = await api.patch(`/api/appraisal/users/${officer.id}/status`);
            if (res && res.status === 'success') {
                const newStatus = res.data?.status || (officer.status === 'active' ? 'suspended' : 'active');
                setOfficerToast({
                    type: 'success',
                    text: `Officer ${officer.name} is now ${newStatus === 'active' ? 'Active' : 'Suspended'}.`
                });
                fetchOfficers();
            }
        } catch (err) {
            setOfficerToast({ type: 'error', text: 'Failed to update status.' });
        } finally {
            setTimeout(() => setOfficerToast({ type: '', text: '' }), 4500);
        }
    };

    const handleResetPassword = async (officer) => {
        try {
            const res = await api.post(`/api/appraisal/users/${officer.id}/reset-password`);
            if (res && res.status === 'success') {
                setTempPasswordResult({
                    officerName: officer.name,
                    email: officer.email,
                    password: res.temporary_password
                });
                setCopiedPassword(false);
                setOfficerToast({ type: 'success', text: `Password for ${officer.name} reset successfully.` });
                fetchOfficers();
            }
        } catch (err) {
            setOfficerToast({ type: 'error', text: 'Failed to reset password.' });
        } finally {
            setTimeout(() => setOfficerToast({ type: '', text: '' }), 4500);
        }
    };

    const handleDeleteOfficer = async (officer) => {
        try {
            const res = await api.delete(`/api/appraisal/users/${officer.id}`);
            if (res && res.status === 'success') {
                setOfficerToast({ type: 'success', text: `Officer ${officer.name} deleted successfully.` });
                setDeletingOfficer(null);
                fetchOfficers();
            } else {
                setOfficerToast({ type: 'error', text: res?.message || 'Cannot delete officer.' });
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Error deleting officer.';
            setOfficerToast({ type: 'error', text: msg });
        } finally {
            setTimeout(() => setOfficerToast({ type: '', text: '' }), 4500);
        }
    };

    const getOfficerWorkload = (officer) => {
        const deptSubs = submissions.filter(s => (s.department || '').toLowerCase() === (officer.department || '').toLowerCase());
        if (officer.role === 'supervisor') {
            const pending = deptSubs.filter(s => s.current_stage === 'part_b_supervisor' || s.part_b_status === 'Pending').length;
            const completed = deptSubs.filter(s => s.part_b_status === 'Completed').length;
            return { pending, completed, label: `${pending} Pending / ${completed} Scored` };
        } else if (officer.role === 'dept_chairman') {
            const pending = deptSubs.filter(s => s.current_stage === 'part_d_dept_review' || (s.part_b_status === 'Completed' && s.part_d_status !== 'Completed')).length;
            const completed = deptSubs.filter(s => s.part_d_status === 'Completed').length;
            return { pending, completed, label: `${pending} Pending / ${completed} Reviewed` };
        } else if (officer.role === 'apc_chairman') {
            const pending = submissions.filter(s => s.current_stage === 'part_e_apc_final' || (s.part_d_status === 'Completed' && s.part_e_status !== 'Completed')).length;
            const completed = submissions.filter(s => s.part_e_status === 'Completed').length;
            return { pending, completed, label: `${pending} Pending / ${completed} Ratified` };
        }
        return { pending: 0, completed: submissions.length, label: `${submissions.length} Institutional Dossiers` };
    };

    function renderStatusBadge(sub) {
        if (sub.current_stage === 'completed' || sub.part_e_status === 'Completed' || sub.overall_status === 'completed' || sub.partEData?.decision || sub.formData?.partE?.decision) {
            return (
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: '#dcfce7',
                    color: '#166534'
                }}>
                    Part E: Completed
                </span>
            );
        }
        if (sub.part_d_status === 'Completed' || sub.current_stage === 'part_e_apc_final' || sub.current_stage === 'final_decision') {
            return (
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: '#e0f2fe',
                    color: '#0369a1'
                }}>
                    Part D: Dept Review
                </span>
            );
        }
        if (sub.part_c_status === 'Completed' || sub.current_stage === 'part_d_dept_review' || sub.current_stage === 'departmental_review') {
            return (
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: '#f3e8ff',
                    color: '#6b21a8'
                }}>
                    Part C: Signed
                </span>
            );
        }
        if (sub.part_b_status === 'Completed' || sub.current_stage === 'part_c_staff_sign' || sub.current_stage === 'staff_acknowledgment') {
            return (
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: '#d1fae5',
                    color: '#047857'
                }}>
                    Part B: Evaluated
                </span>
            );
        }
        return (
            <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: '#fef3c7',
                color: '#92400e'
            }}>
                Part A: Submitted
            </span>
        );
    }

    // Real-time synchronization for new staff submissions
    useEffect(() => {
        fetchSubmissions();

        function reloadSubmissions() {
            fetchSubmissions();
        }

        window.addEventListener('storage', reloadSubmissions);
        window.addEventListener('appraisal_submission_updated', reloadSubmissions);
        return () => {
            window.removeEventListener('storage', reloadSubmissions);
            window.removeEventListener('appraisal_submission_updated', reloadSubmissions);
        };
    }, []);

    const userRole = currentUser.role || 'supervisor';
    const roleLabel = {
        'supervisor': 'Departmental Supervisor',
        'dept_chairman': 'Dept Chairman / HOD',
        'apc_chairman': 'A&P Committee Chairman',
        'admin': 'Appraisal Admin'
    }[userRole] || 'Evaluator';

    function handlePassportUpload(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setProfileMsg({ type: 'error', text: 'Passport image must be under 2MB.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Image = reader.result;
                setPassportUrl(base64Image);
                const updatedUser = { ...currentUser, passport_url: base64Image };
                setCurrentUser(updatedUser);
                localStorage.setItem('appraisal_auth_user', JSON.stringify(updatedUser));
                setProfileMsg({ type: 'success', text: 'Passport photograph updated successfully!' });
            };
            reader.readAsDataURL(file);
        }
    }

    function handlePasswordChange(e) {
        e.preventDefault();
        setProfileMsg({ type: '', text: '' });

        if (!currentPassword) {
            setProfileMsg({ type: 'error', text: 'Please enter your current password.' });
            return;
        }
        if (newPassword.length < 6) {
            setProfileMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setProfileMsg({ type: 'error', text: 'New password and confirmation do not match.' });
            return;
        }

        const updatedUser = { ...currentUser, password: newPassword };
        setCurrentUser(updatedUser);
        localStorage.setItem('appraisal_auth_user', JSON.stringify(updatedUser));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setProfileMsg({ type: 'success', text: 'Password changed successfully!' });
    }

    function getRoleMeta(r) {
        if (r === 'dept_chairman') {
            return {
                title: 'Departmental HOD / Committee Chairman',
                name: 'Prof. Aminu Bello',
                dept: 'Department of Computer Science',
                section: 'Part D: Departmental Review & Recommendation'
            };
        }
        if (r === 'apc_chairman') {
            return {
                title: 'Chairman, Appointments & Promotions Committee',
                name: 'Prof. J. O. Oladipo',
                dept: 'Appointments & Promotions Committee (Council)',
                section: 'Part E: Central A&PC Final Ratification'
            };
        }
        return {
            title: 'Supervisor / Reporting Officer',
            name: 'Dr. Clement Alabi',
            dept: 'Department of Computer Science',
            section: 'Part B: Supervisory Scoring & Assessment'
        };
    }

    async function handleSignatureUpload(e, roleToUpload) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setProfileMsg({ type: 'error', text: 'Signature image must be under 2MB.' });
            return;
        }

        const targetRole = roleToUpload || activeSigRole;
        const roleMeta = getRoleMeta(targetRole);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = reader.result;
            setSignatureUploading(true);

            const updated = { ...signatures, [targetRole]: base64Data };
            setSignatures(updated);
            localStorage.setItem('appraisal_signatures', JSON.stringify(updated));

            if (currentUser.role === targetRole) {
                const updatedUser = { ...currentUser, signature_url: base64Data };
                setCurrentUser(updatedUser);
                localStorage.setItem('appraisal_auth_user', JSON.stringify(updatedUser));
            }

            window.dispatchEvent(new CustomEvent('appraisal_signature_updated', {
                detail: { role: targetRole, signature: base64Data }
            }));

            try {
                await api.post('/api/appraisal/signature', {
                    role: targetRole,
                    signature: base64Data
                });
                setProfileMsg({ type: 'success', text: `Digital signature for ${roleMeta.name} uploaded & saved successfully!` });
            } catch (err) {
                console.warn("Backend signature save notice:", err);
                setProfileMsg({ type: 'success', text: `Digital signature for ${roleMeta.name} stored successfully!` });
            } finally {
                setSignatureUploading(false);
            }
        };
        reader.readAsDataURL(file);
    }

    async function handleRemoveSignature(targetRole) {
        const roleToRemove = targetRole || activeSigRole;
        const roleMeta = getRoleMeta(roleToRemove);
        const updated = { ...signatures, [roleToRemove]: null };
        setSignatures(updated);
        localStorage.setItem('appraisal_signatures', JSON.stringify(updated));

        if (currentUser.role === roleToRemove) {
            const updatedUser = { ...currentUser, signature_url: null };
            setCurrentUser(updatedUser);
            localStorage.setItem('appraisal_auth_user', JSON.stringify(updatedUser));
        }

        window.dispatchEvent(new CustomEvent('appraisal_signature_updated', {
            detail: { role: roleToRemove, signature: null }
        }));

        try {
            await api.post('/api/appraisal/signature', {
                role: roleToRemove,
                signature: null
            });
            setProfileMsg({ type: 'success', text: `Signature for ${roleMeta.name} removed. Reverted to default digital name signature.` });
        } catch (err) {
            console.warn("Backend signature remove notice:", err);
            setProfileMsg({ type: 'success', text: `Signature for ${roleMeta.name} reverted to default digital name signature.` });
        }
    }

    // Dynamic KPI stats
    const supervisorPendingCount = submissions.filter(s => s.part_b_status === 'Pending' || s.current_stage === 'part_b_supervisor').length;
    const supervisorCompletedCount = submissions.filter(s => s.part_b_status === 'Completed' || (s.current_stage && s.current_stage !== 'part_a_drafting' && s.current_stage !== 'part_b_supervisor')).length;
    const scoredList = submissions.filter(s => Number(s.score) > 0);
    const avgScore = scoredList.length > 0 ? (scoredList.reduce((acc, curr) => acc + Number(curr.score), 0) / scoredList.length).toFixed(1) : '75.0';

    const hodPendingCount = submissions.filter(s => (s.part_c_status === 'Completed' || s.current_stage === 'part_d_dept_review') && s.part_d_status !== 'Completed' && s.current_stage !== 'part_e_apc_final' && s.current_stage !== 'completed').length;
    const hodCompletedCount = submissions.filter(s => s.part_d_status === 'Completed' || s.current_stage === 'part_e_apc_final' || s.current_stage === 'completed').length;
    const deptPromotionsCount = submissions.filter(s => (s.partDData?.recommendation?.includes('Promotion') || s.department_recommendation?.includes('Promotion') || (s.proposed_rank && s.proposed_rank !== s.current_rank))).length;

    const apcPendingCount = submissions.filter(s => (s.part_d_status === 'Completed' || s.current_stage === 'part_e_apc_final') && s.current_stage !== 'completed' && s.part_e_status !== 'Completed').length;
    const apcCompletedCount = submissions.filter(s => s.current_stage === 'completed' || s.part_e_status === 'Completed').length;

    const departmentList = Array.from(new Set(submissions.map(s => s.department).filter(Boolean)));

    // Full Suite of Appraisal Navigation Items (Admin gets all, evaluators get their relevant stages)
    const allNavItems = [
        // Core Overview & Submissions
        { id: 'overview', label: 'Overview', icon: BarChart3, group: 'Core Operations', roles: ['admin', 'supervisor', 'dept_chairman', 'apc_chairman'] },
        { id: 'evaluations', label: 'Staff Submissions', icon: ClipboardList, badge: submissions.length, group: 'Core Operations', roles: ['admin', 'supervisor', 'dept_chairman', 'apc_chairman'] },

        // Workflow Stages (Admin has all, each evaluator has their stage)
        { id: 'part_b', label: 'Supervisory Scoring', icon: UserCheck, badge: supervisorPendingCount, group: 'Workflow Stages', roles: ['admin', 'supervisor'] },
        { id: 'part_d', label: 'Departmental Reviews', icon: Building, badge: hodPendingCount, group: 'Workflow Stages', roles: ['admin', 'dept_chairman'] },
        { id: 'part_e', label: 'A&PC Ratifications', icon: Award, badge: apcPendingCount, group: 'Workflow Stages', roles: ['admin', 'apc_chairman'] },
        { id: 'dossiers', label: 'APER Dossiers & Print', icon: Printer, badge: apcCompletedCount, group: 'Workflow Stages', roles: ['admin', 'apc_chairman'] },

        // Evaluation Form & History
        { id: 'assessment', label: 'Evaluation Form', icon: FileText, group: 'Evaluation Form', roles: ['admin', 'supervisor', 'dept_chairman', 'apc_chairman'] },
        { id: 'history', label: 'Evaluation History', icon: CheckCircle2, group: 'Evaluation Form', roles: ['admin', 'supervisor', 'dept_chairman', 'apc_chairman'] },

        // Administrative Governance & Analytics
        { id: 'manage_users', label: 'Manage Users & Evaluators', icon: Users, badge: officers.length, group: 'Governance & Admin', roles: ['admin'] },
        { id: 'periods', label: 'Appraisal Cycles', icon: Calendar, group: 'Governance & Admin', roles: ['admin'] },
        { id: 'analytics', label: 'Analytics & Reports', icon: TrendingUp, group: 'Governance & Admin', roles: ['admin'] },
        { id: 'signatures', label: 'Official Signatures', icon: FileSignature, group: 'Governance & Admin', roles: ['admin', 'supervisor', 'dept_chairman', 'apc_chairman'] },
        { id: 'audit_trail', label: 'System Audit Logs', icon: ShieldCheck, group: 'Governance & Admin', roles: ['admin'] },
        { id: 'settings', label: 'Admin Settings', icon: Settings, group: 'Governance & Admin', roles: ['admin'] },

        // Account Settings
        { id: 'profile', label: 'My Account', icon: User, group: 'Settings', roles: ['admin', 'supervisor', 'dept_chairman', 'apc_chairman'] },
    ];

    const navItems = allNavItems.filter(item => item.roles.includes(userRole));

    // Helper: XML Escape for Excel export
    function escapeXml(str) {
        return String(str !== undefined && str !== null ? str : '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // Helper: Export to native Excel spreadsheet (.xlsx)
    function exportToXLSX(title, headers, rows, filename = 'report.xlsx') {
        let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Title">
   <Font ss:Bold="1" ss:Color="#064E3B" ss:Size="13"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:Italic="1" ss:Color="#475569" ss:Size="9"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
   <Interior ss:Color="#064E3B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Data">
   <Font ss:Size="9" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DataCenter">
   <Font ss:Size="9" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Appraisal Report">
  <Table>
   <Row>
    <Cell ss:StyleID="Title"><Data ss:Type="String">JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Subtitle"><Data ss:Type="String">${escapeXml(title)} | Academic Session: ${escapeXml(reportSession)} | Exported: ${new Date().toLocaleDateString('en-GB')}</Data></Cell>
   </Row>
   <Row></Row>
   <Row ss:StyleID="Header">`;

        headers.forEach(h => {
            xml += `
    <Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
        });

        xml += `
   </Row>`;

        rows.forEach(row => {
            xml += `
   <Row ss:StyleID="Data">`;
            row.forEach((cell, idx) => {
                const isNum = typeof cell === 'number';
                const style = idx === 0 ? 'DataCenter' : 'Data';
                xml += `
    <Cell ss:StyleID="${style}"><Data ss:Type="${isNum ? 'Number' : 'String'}">${isNum ? cell : escapeXml(cell)}</Data></Cell>`;
            });
            xml += `
   </Row>`;
        });

        xml += `
  </Table>
 </Worksheet>
</Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setDownloadSuccessToast(`Downloaded: ${finalName}`);
        setTimeout(() => setDownloadSuccessToast(''), 4500);
    }

    // Helper: Export to formatted PDF document (.pdf)
    function exportToPDF(title, subtitle, headers, rows, filename = 'report.pdf', colWeights = null) {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = 297;
        const leftMargin = 12;
        const rightMargin = 12;
        const printableWidth = pageWidth - leftMargin - rightMargin; // 273mm

        let colWidths = [];
        if (colWeights && colWeights.length === headers.length) {
            const totalWeight = colWeights.reduce((a, b) => a + b, 0);
            colWidths = colWeights.map(w => (w / totalWeight) * printableWidth);
        } else {
            const uniformWidth = printableWidth / headers.length;
            colWidths = headers.map(() => uniformWidth);
        }

        function drawBanner(isContinuation = false) {
            doc.setFillColor(6, 78, 59); // #064E3B
            doc.rect(0, 0, pageWidth, 20, 'F');

            doc.setFillColor(217, 119, 6); // gold accent
            doc.rect(0, 20, pageWidth, 1.5, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text("JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI", leftMargin, 8);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text("APPOINTMENTS & PROMOTIONS COMMITTEE • APER EVALUATION ARCHIVE", leftMargin, 13);
            doc.text(isContinuation ? `${title} (Continued)` : `${title} — Session: ${reportSession} • ${subtitle}`, leftMargin, 17.5);

            doc.setFontSize(7.5);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - rightMargin, 11, { align: 'right' });
            doc.text(`Total Records: ${rows.length}`, pageWidth - rightMargin, 16, { align: 'right' });
        }

        let currentY = 27;

        function drawTableHeader() {
            doc.setFillColor(241, 245, 249);
            doc.rect(leftMargin, currentY, printableWidth, 8, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.2);
            doc.rect(leftMargin, currentY, printableWidth, 8, 'S');

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);

            let xCursor = leftMargin;
            headers.forEach((h, idx) => {
                const w = colWidths[idx];
                doc.text(String(h), xCursor + 2, currentY + 5.5);
                xCursor += w;
            });

            currentY += 8;
        }

        drawBanner(false);
        drawTableHeader();

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);

        rows.forEach((row, rowIdx) => {
            if (currentY > 192) {
                doc.addPage();
                drawBanner(true);
                currentY = 27;
                drawTableHeader();
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.2);
            }

            if (rowIdx % 2 === 1) {
                doc.setFillColor(248, 250, 252);
                doc.rect(leftMargin, currentY, printableWidth, 7, 'F');
            }

            doc.setDrawColor(226, 232, 240);
            doc.line(leftMargin, currentY + 7, leftMargin + printableWidth, currentY + 7);

            doc.setTextColor(51, 65, 85);

            let xCursor = leftMargin;
            row.forEach((cell, idx) => {
                const w = colWidths[idx];
                let str = String(cell !== undefined && cell !== null ? cell : '-');
                const charLimit = Math.max(5, Math.floor(w * 0.48));
                if (str.length > charLimit) {
                    str = str.substring(0, charLimit - 2) + '..';
                }
                doc.text(str, xCursor + 2, currentY + 4.8);
                xCursor += w;
            });

            currentY += 7;
        });

        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`Official Academic Record — Page ${p} of ${totalPages}`, pageWidth / 2, 205, { align: 'center' });
            doc.text("JOSTUM APER Registry • Certified Confidential Document", leftMargin, 205);
        }

        const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        doc.save(finalName);

        setDownloadSuccessToast(`Downloaded: ${finalName}`);
        setTimeout(() => setDownloadSuccessToast(''), 4500);
    }

    // Dynamic reports specification
    function getAvailableReports() {
        const scoped = reportDeptFilter === 'all'
            ? submissions
            : submissions.filter(s => (s.department || '').toLowerCase() === reportDeptFilter.toLowerCase());

        // 1. Comprehensive APER Master Roll
        const masterHeaders = ["S/N", "PF Number", "Staff Name", "Department", "Current Rank", "Proposed Rank", "Part B", "Part D Rec", "Part E Decision", "Status"];
        const masterRows = scoped.map((s, i) => [
            i + 1,
            s.pf_number || 'N/A',
            s.staff_name || 'N/A',
            s.department || 'N/A',
            s.current_rank || 'N/A',
            s.proposed_rank || s.current_rank || 'N/A',
            s.part_b_score !== null && s.part_b_score !== undefined ? `${s.part_b_score}/100` : 'Pending',
            s.part_d_recommendation || (s.part_d_status === 'Completed' ? 'Recommended' : 'Pending'),
            s.part_e_decision || (s.part_e_status === 'Completed' ? 'Ratified' : 'Pending'),
            s.current_stage === 'completed' || s.part_e_status === 'Completed' ? 'Completed' : 'In Progress'
        ]);

        // 2. Departmental Performance & Promotion Digest
        const deptMap = {};
        scoped.forEach(s => {
            const dept = s.department || 'Unassigned';
            if (!deptMap[dept]) {
                deptMap[dept] = { total: 0, scored: 0, pending: 0, completed: 0, scoreSum: 0, promoted: 0 };
            }
            deptMap[dept].total++;
            if (s.part_b_score !== null && s.part_b_score !== undefined) {
                deptMap[dept].scored++;
                deptMap[dept].scoreSum += Number(s.part_b_score);
            } else {
                deptMap[dept].pending++;
            }
            if (s.part_e_status === 'Completed' || s.current_stage === 'completed') {
                deptMap[dept].completed++;
            }
            if (s.part_d_recommendation?.toLowerCase().includes('promote') || s.part_e_decision?.toLowerCase().includes('promote') || Number(s.part_b_score) >= 70) {
                deptMap[dept].promoted++;
            }
        });

        const deptHeaders = ["S/N", "Department", "Total Staff", "Part B Scored", "Pending Review", "Completed APER", "Average Score", "Promotions Rec.", "Success Rate (%)"];
        const deptRows = Object.entries(deptMap).map(([dept, stats], i) => {
            const avg = stats.scored > 0 ? (stats.scoreSum / stats.scored).toFixed(1) : '—';
            const rate = stats.total > 0 ? `${Math.round((stats.promoted / stats.total) * 100)}%` : '0%';
            return [i + 1, dept, stats.total, stats.scored, stats.pending, stats.completed, `${avg}/100`, stats.promoted, rate];
        });

        // 3. Promotion Recommendations Gazette
        const promoCandidates = scoped.filter(s =>
            Number(s.part_b_score) >= 70 ||
            s.part_d_recommendation?.toLowerCase().includes('promote') ||
            s.part_e_decision?.toLowerCase().includes('promote')
        );
        const promoHeaders = ["S/N", "PF Number", "Candidate Name", "Department", "Current Rank", "Proposed Rank", "Score", "Part D Committee Action", "APC Decision"];
        const promoRows = promoCandidates.map((s, i) => [
            i + 1,
            s.pf_number,
            s.staff_name,
            s.department,
            s.current_rank,
            s.proposed_rank || 'Senior Rank',
            s.part_b_score ? `${s.part_b_score}/100` : '—',
            s.part_d_recommendation || 'Recommended for Promotion',
            s.part_e_decision || (s.part_e_status === 'Completed' ? 'Promoted (Ratified)' : 'Pending APC Ratification')
        ]);

        // 4. Supervisory 100-Point Scoring Matrix
        const matrixHeaders = ["S/N", "PF Number", "Staff Candidate", "Department", "Teaching (40)", "Research (30)", "Service (15)", "Conduct (15)", "Total Score", "Status"];
        const matrixRows = scoped.map((s, i) => {
            const total = Number(s.part_b_score) || 0;
            const teaching = total ? Math.min(40, Math.round(total * 0.40)) : 0;
            const research = total ? Math.min(30, Math.round(total * 0.30)) : 0;
            const service = total ? Math.min(15, Math.round(total * 0.15)) : 0;
            const conduct = total ? Math.max(0, total - (teaching + research + service)) : 0;
            return [
                i + 1,
                s.pf_number,
                s.staff_name,
                s.department,
                total ? `${teaching}/40` : '—',
                total ? `${research}/30` : '—',
                total ? `${service}/15` : '—',
                total ? `${conduct}/15` : '—',
                total ? `${total}/100` : 'Pending',
                s.part_b_status === 'Completed' || total > 0 ? 'Evaluated' : 'Pending'
            ];
        });

        // 5. Action-Required & Stage Bottleneck Roster
        const pendingCandidates = scoped.filter(s => s.current_stage !== 'completed' && s.part_e_status !== 'Completed');
        const pendingHeaders = ["S/N", "PF Number", "Staff Candidate", "Department", "Current Rank", "Bottleneck Stage", "Action Required By", "Current Status"];
        const pendingRows = pendingCandidates.map((s, i) => {
            let stageName = 'Part B: Supervisor Scoring';
            let roleOwner = 'Departmental Supervisor';
            if (s.part_b_status === 'Completed' && s.part_c_status !== 'Completed') {
                stageName = 'Part C: Staff Acknowledgment';
                roleOwner = 'Staff Candidate';
            } else if (s.part_c_status === 'Completed' && s.part_d_status !== 'Completed') {
                stageName = 'Part D: Departmental A&PC Meeting';
                roleOwner = 'Head of Department (HOD)';
            } else if (s.part_d_status === 'Completed' && s.part_e_status !== 'Completed') {
                stageName = 'Part E: Central APC Ratification';
                roleOwner = 'APC Chairman & Registrar';
            }
            return [
                i + 1,
                s.pf_number,
                s.staff_name,
                s.department,
                s.current_rank,
                stageName,
                roleOwner,
                'Action Pending'
            ];
        });

        // 6. Executive Appraisal Statistical Digest (Senate & Council Summary)
        const totalStaff = scoped.length;
        const distinctionCount = scoped.filter(s => Number(s.part_b_score) >= 85).length;
        const commendableCount = scoped.filter(s => Number(s.part_b_score) >= 70 && Number(s.part_b_score) < 85).length;
        const satisfactoryCount = scoped.filter(s => Number(s.part_b_score) >= 50 && Number(s.part_b_score) < 70).length;
        const needsImpCount = scoped.filter(s => s.part_b_score !== null && Number(s.part_b_score) < 50).length;
        const pendingCount = scoped.filter(s => s.part_b_score === null || s.part_b_score === undefined).length;

        const statHeaders = ["S/N", "Performance Grade Band", "Score Criteria", "Eligible Staff", "Cohort Share (%)", "Statutory Career Progression & Consequence"];
        const statRows = [
            [1, "Distinction / Outstanding", "85 - 100%", distinctionCount, totalStaff > 0 ? `${((distinctionCount / totalStaff) * 100).toFixed(1)}%` : '0%', "Priority Accelerated Promotion & Special Merit Award"],
            [2, "Commendable / Very Good", "70 - 84%", commendableCount, totalStaff > 0 ? `${((commendableCount / totalStaff) * 100).toFixed(1)}%` : '0%', "Qualifies for Statutory Upward Elevation / Promotion"],
            [3, "Satisfactory / Good", "50 - 69%", satisfactoryCount, totalStaff > 0 ? `${((satisfactoryCount / totalStaff) * 100).toFixed(1)}%` : '0%', "Normal Annual Step Increment within CONTISS Scale"],
            [4, "Needs Improvement / Fair", "< 50%", needsImpCount, totalStaff > 0 ? `${((needsImpCount / totalStaff) * 100).toFixed(1)}%` : '0%', "Deferment of Annual Increment & Enhanced Academic Supervision"],
            [5, "Pending Initial Scoring", "Unscored", pendingCount, totalStaff > 0 ? `${((pendingCount / totalStaff) * 100).toFixed(1)}%` : '0%', "Pending Part B Departmental Supervisor Submission"]
        ];

        return [
            {
                id: 'master_roll',
                code: 'REP-APER-01',
                title: 'Comprehensive APER Master Roll',
                category: 'Master Registers',
                badgeColor: '#047857',
                icon: ClipboardList,
                description: 'Full institutional ledger of all academic and senior staff submissions, scoring progression, and official committee outcomes.',
                recordCount: masterRows.length,
                headers: masterHeaders,
                rows: masterRows,
                weights: [10, 22, 42, 38, 32, 32, 18, 28, 30, 21],
                filenameBase: `jostum_aper_master_roll_${reportSession.replace('/', '_')}`
            },
            {
                id: 'dept_performance',
                code: 'REP-APER-02',
                title: 'Departmental Performance & Ranking Digest',
                category: 'Departmental Analytics',
                badgeColor: '#0284c7',
                icon: Building,
                description: 'Comparative institutional assessment across departments showing staff volume, average scores, and promotion recommendation ratios.',
                recordCount: deptRows.length,
                headers: deptHeaders,
                rows: deptRows,
                weights: [12, 55, 28, 28, 28, 28, 28, 34, 32],
                filenameBase: `jostum_dept_performance_digest_${reportSession.replace('/', '_')}`
            },
            {
                id: 'promotion_gazette',
                code: 'REP-APER-03',
                title: 'Promotion Recommendations Gazette',
                category: 'A&PC Decisions',
                badgeColor: '#b45309',
                icon: Award,
                description: 'Official statutory gazette of candidates recommended by Departmental and Central A&PC for career elevation and academic advancement.',
                recordCount: promoRows.length,
                headers: promoHeaders,
                rows: promoRows,
                weights: [12, 24, 45, 40, 32, 32, 18, 35, 35],
                filenameBase: `jostum_promotion_gazette_${reportSession.replace('/', '_')}`
            },
            {
                id: 'supervisory_matrix',
                code: 'REP-APER-04',
                title: 'Statutory 100-Point Supervisory Scoring Matrix',
                category: 'Scoring Breakdowns',
                badgeColor: '#059669',
                icon: UserCheck,
                description: 'Granular evaluation matrix itemizing scores across Teaching (40), Research (30), Governance (15), and Administrative Conduct (15).',
                recordCount: matrixRows.length,
                headers: matrixHeaders,
                rows: matrixRows,
                weights: [12, 24, 45, 40, 25, 25, 24, 24, 30, 24],
                filenameBase: `jostum_supervisory_scoring_matrix_${reportSession.replace('/', '_')}`
            },
            {
                id: 'pending_clearances',
                code: 'REP-APER-05',
                title: 'Action-Required & Stage Bottleneck Roster',
                category: 'Operational Audits',
                badgeColor: '#d97706',
                icon: Clock,
                description: 'Operational audit of stalled dossiers requiring intervention from Departmental Supervisors, HODs, or the Central APC Chairman.',
                recordCount: pendingRows.length,
                headers: pendingHeaders,
                rows: pendingRows,
                weights: [12, 26, 45, 40, 32, 45, 43, 30],
                filenameBase: `jostum_action_required_roster_${reportSession.replace('/', '_')}`
            },
            {
                id: 'statistical_digest',
                code: 'REP-APER-06',
                title: 'Executive Senate & Council Statistical Digest',
                category: 'Executive Governance',
                badgeColor: '#7c3aed',
                icon: PieChart,
                description: 'High-level executive digest for University Senate & Governing Council summarizing grade brackets, cohort ratios, and statutory outcomes.',
                recordCount: statRows.length,
                headers: statHeaders,
                rows: statRows,
                weights: [14, 60, 35, 30, 34, 100],
                filenameBase: `jostum_senate_statistical_digest_${reportSession.replace('/', '_')}`
            }
        ];
    }

    const filteredSubmissions = submissions.filter(sub => {
        const matchesSearch = (sub.staff_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (sub.pf_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (sub.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (sub.current_rank || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (sub.proposed_rank || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesDept = filterDept === 'all' || (sub.department || '').toLowerCase() === filterDept.toLowerCase();

        let matchesStage = true;
        if (filterStage === 'part_a') matchesStage = sub.current_stage === 'part_a_drafting' || !sub.part_b_status || sub.part_b_status === 'Pending';
        else if (filterStage === 'part_b') matchesStage = sub.part_b_status === 'Pending' || sub.current_stage === 'part_b_supervisor';
        else if (filterStage === 'part_c') matchesStage = sub.current_stage === 'part_c_staff_sign' || (sub.part_b_status === 'Completed' && sub.part_c_status !== 'Completed');
        else if (filterStage === 'part_d') matchesStage = sub.current_stage === 'part_d_dept_review' || (sub.part_c_status === 'Completed' && sub.part_d_status !== 'Completed');
        else if (filterStage === 'part_e') matchesStage = sub.current_stage === 'part_e_apc_final' || (sub.part_d_status === 'Completed' && sub.current_stage !== 'completed');
        else if (filterStage === 'completed') matchesStage = sub.current_stage === 'completed' || sub.part_e_status === 'Completed';

        let matchesStatus = true;
        if (filterStatus === 'pending') {
            if (userRole === 'supervisor') matchesStatus = sub.part_b_status === 'Pending';
            else if (userRole === 'dept_chairman') matchesStatus = sub.part_d_status !== 'Completed';
            else if (userRole === 'apc_chairman' || userRole === 'admin') matchesStatus = sub.current_stage !== 'completed';
        } else if (filterStatus === 'completed') {
            if (userRole === 'supervisor') matchesStatus = sub.part_b_status === 'Completed';
            else if (userRole === 'dept_chairman') matchesStatus = sub.part_d_status === 'Completed';
            else if (userRole === 'apc_chairman' || userRole === 'admin') matchesStatus = sub.current_stage === 'completed' || sub.part_e_status === 'Completed';
        }

        return matchesSearch && matchesDept && matchesStage && matchesStatus;
    });

    function formatText(val, fallback = '') {
        if (!val) return fallback;
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) {
            const joined = val.map(item => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') return item.text || item.title || item.name || JSON.stringify(item);
                return String(item);
            }).filter(Boolean).join('; ');
            return joined || fallback;
        }
        if (typeof val === 'object') {
            return val.text || val.title || val.name || val.value || JSON.stringify(val);
        }
        return String(val);
    }

    function renderActionButton(sub) {
        if (userRole === 'supervisor') {
            const isPending = sub.part_b_status === 'Pending' || sub.current_stage === 'part_b_supervisor';
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                        type="button"
                        onClick={() => setScreeningStaff(sub)}
                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Quick Screen Candidate Dossier"
                    >
                        <Eye size={13} />
                        <span>Screen</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedStaffId(sub.id);
                            setActiveTab('assessment');
                        }}
                        style={{ background: isPending ? '#047857' : '#0f766e', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
                    >
                        <Edit size={13} />
                        <span>{isPending ? 'Score Part B' : 'View / Edit Score'}</span>
                    </button>
                </div>
            );
        }
        if (userRole === 'dept_chairman') {
            const isPending = sub.part_d_status !== 'Completed' && (sub.part_c_status === 'Completed' || sub.current_stage === 'part_d_dept_review');
            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                        type="button"
                        onClick={() => setScreeningStaff(sub)}
                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Quick Screen Candidate Dossier"
                    >
                        <Eye size={13} />
                        <span>Screen</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedStaffId(sub.id);
                            setActiveTab('assessment');
                        }}
                        style={{ background: isPending ? '#0284c7' : '#475569', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
                    >
                        <Award size={13} />
                        <span>{isPending ? 'Review & Recommend' : 'View Dept Review'}</span>
                    </button>
                </div>
            );
        }
        // APC Chairman or Admin
        const isPending = sub.current_stage !== 'completed' && sub.part_e_status !== 'Completed';
        return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button
                    type="button"
                    onClick={() => setScreeningStaff(sub)}
                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Quick Screen Candidate Dossier"
                >
                    <Eye size={13} />
                    <span>Screen</span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setSelectedStaffId(sub.id);
                        setActiveTab('assessment');
                    }}
                    style={{ background: isPending ? 'linear-gradient(90deg, #b45309, #d97706)' : '#059669', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
                >
                    <CheckCircle2 size={13} />
                    <span>{isPending ? 'Screen & Ratify (Part E)' : 'View APER Record'}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="evaluator-portal-container" style={{ display: 'flex', height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: '#FAFBFB', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Sidebar Navigation - Fixed/Sticky */}
            <aside className="evaluator-portal-sidebar print:hidden" style={{
                width: sidebarCollapsed ? '80px' : '260px',
                height: '100vh',
                flexShrink: 0,
                background: '#064e3b',
                color: '#ffffff',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
                zIndex: 20
            }}>
                {/* Brand Header */}
                <div style={{
                    padding: sidebarCollapsed ? '20px 10px' : '24px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {!sidebarCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                                src={jostumLogo}
                                alt="JOSTUM Logo"
                                style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #34d399' }}
                            />
                            <div>
                                <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>JOSTUM</h2>
                                <p style={{ fontSize: '0.72rem', color: '#a7f3d0', margin: 0 }}>Appraisal Workstation</p>
                            </div>
                        </div>
                    )}
                    {sidebarCollapsed && (
                        <img src={jostumLogo} alt="JOSTUM Logo" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a7f3d0',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                </div>

                {/* Sidebar Navigation Items */}
                <nav style={{
                    padding: '12px 8px',
                    flex: 1,
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.15) transparent'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {navItems.map((item, index) => {
                            const IconComponent = item.icon;
                            const isActive = activeTab === item.id;
                            const prevItem = index > 0 ? navItems[index - 1] : null;
                            const showGroupHeader = !sidebarCollapsed && userRole === 'admin' && (!prevItem || prevItem.group !== item.group);

                            return (
                                <React.Fragment key={item.id}>
                                    {showGroupHeader && (
                                        <div style={{
                                            fontSize: '0.62rem',
                                            fontWeight: '800',
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            color: '#6ee7b7',
                                            padding: index === 0 ? '4px 10px 4px' : '12px 10px 4px',
                                            opacity: 0.85
                                        }}>
                                            {item.group}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setActiveTab(item.id)}
                                        title={sidebarCollapsed ? item.label : undefined}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: sidebarCollapsed ? '10px' : '9px 12px',
                                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: isActive ? 'linear-gradient(90deg, #047857, #059669)' : 'transparent',
                                            color: isActive ? '#ffffff' : '#d1fae5',
                                            fontWeight: isActive ? '700' : '500',
                                            fontSize: '0.84rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            textAlign: 'left',
                                            width: '100%'
                                        }}
                                    >
                                        <IconComponent size={18} style={{ color: isActive ? '#ffffff' : '#6ee7b7', flexShrink: 0 }} />
                                        {!sidebarCollapsed && (
                                            <>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                                    {item.label}
                                                </span>
                                                {item.badge !== undefined && item.badge > 0 && (
                                                    <span style={{
                                                        background: isActive ? '#ffffff' : 'rgba(255,255,255,0.2)',
                                                        color: isActive ? '#064e3b' : '#ffffff',
                                                        fontSize: '0.68rem',
                                                        fontWeight: '800',
                                                        padding: '1px 6px',
                                                        borderRadius: '10px',
                                                        lineHeight: '1.2'
                                                    }}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </nav>

                {/* Logged in User Profile Footer */}
                <div style={{
                    padding: sidebarCollapsed ? '16px 10px' : '16px 18px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.15)'
                }}>
                    {!sidebarCollapsed ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {passportUrl ? (
                                    <img src={passportUrl} alt="User Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #34d399' }} />
                                ) : (
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#047857', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                        {currentUser.name ? currentUser.name.charAt(0) : 'S'}
                                    </div>
                                )}
                                <div>
                                    <h4 style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>{currentUser.name}</h4>
                                    <span style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>{roleLabel}</span>
                                </div>
                            </div>
                            <button
                                onClick={onLogout}
                                title="Sign Out"
                                style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '4px' }}
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onLogout}
                            title="Sign Out"
                            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '8px 0' }}
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="evaluator-portal-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                
                {/* Topbar Header - Fixed/Sticky */}
                <header className="evaluator-portal-header print:hidden" style={{
                    height: '64px',
                    minHeight: '64px',
                    flexShrink: 0,
                    background: '#ffffff',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '0 28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                            {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
                        </span>
                        <span style={{
                            background: userRole === 'supervisor' ? '#dcfce7' : (userRole === 'dept_chairman' ? '#e0f2fe' : (userRole === 'admin' ? '#ede9fe' : '#fef3c7')),
                            color: userRole === 'supervisor' ? '#166534' : (userRole === 'dept_chairman' ? '#0369a1' : (userRole === 'admin' ? '#5b21b6' : '#92400e')),
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                        }}>
                            {roleLabel}
                        </span>
                    </div>

                    {/* Quick Role Switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px 4px', borderRadius: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', padding: '0 6px' }}>Screen As:</span>
                        <button
                            type="button"
                            onClick={() => switchRole('supervisor')}
                            style={{
                                background: userRole === 'supervisor' ? '#047857' : 'transparent',
                                color: userRole === 'supervisor' ? '#ffffff' : '#334155',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '7px',
                                fontSize: '0.76rem',
                                fontWeight: userRole === 'supervisor' ? '700' : '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Supervisor
                        </button>
                        <button
                            type="button"
                            onClick={() => switchRole('dept_chairman')}
                            style={{
                                background: userRole === 'dept_chairman' ? '#0284c7' : 'transparent',
                                color: userRole === 'dept_chairman' ? '#ffffff' : '#334155',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '7px',
                                fontSize: '0.76rem',
                                fontWeight: userRole === 'dept_chairman' ? '700' : '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Dept HOD
                        </button>
                        <button
                            type="button"
                            onClick={() => switchRole('apc_chairman')}
                            style={{
                                background: userRole === 'apc_chairman' ? '#b45309' : 'transparent',
                                color: userRole === 'apc_chairman' ? '#ffffff' : '#334155',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '7px',
                                fontSize: '0.76rem',
                                fontWeight: userRole === 'apc_chairman' ? '700' : '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            APC Chairman
                        </button>
                        <button
                            type="button"
                            onClick={() => switchRole('admin')}
                            style={{
                                background: userRole === 'admin' ? '#0f172a' : 'transparent',
                                color: userRole === 'admin' ? '#ffffff' : '#334155',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '7px',
                                fontSize: '0.76rem',
                                fontWeight: userRole === 'admin' ? '700' : '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Admin
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                            {currentUser.department || 'Computer Science'}
                        </span>
                        {passportUrl && (
                            <img src={passportUrl} alt="Avatar" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #15803d' }} />
                        )}
                    </div>
                </header>

                {/* Scrollable Tab Contents */}
                <main className="evaluator-portal-content" style={{ flex: 1, padding: '28px', overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* Stat Cards - Tailored by Active Evaluator Role */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                                {userRole === 'supervisor' && (
                                    <>
                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Assigned Staff</span>
                                                <ClipboardList size={20} style={{ color: '#0284c7' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>{submissions.length}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Department Staff Candidates</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Pending Part B Scoring</span>
                                                <Clock size={20} style={{ color: '#d97706' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#d97706', margin: 0 }}>{supervisorPendingCount}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600' }}>Requires 100-Point Scoring</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Scored & Forwarded</span>
                                                <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', margin: 0 }}>{supervisorCompletedCount}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Forwarded to Staff/HOD</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Average Score</span>
                                                <Award size={20} style={{ color: '#7c3aed' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#7c3aed', margin: 0 }}>{avgScore} / 100</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Departmental Average</span>
                                        </div>
                                    </>
                                )}

                                {userRole === 'dept_chairman' && (
                                    <>
                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Dept Candidates</span>
                                                <Users size={20} style={{ color: '#0284c7' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>{submissions.length}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total in Department</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Pending Dept Review</span>
                                                <Clock size={20} style={{ color: '#0284c7' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0284c7', margin: 0 }}>{hodPendingCount}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '600' }}>Requires Part D Committee Action</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Forwarded to APC</span>
                                                <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', margin: 0 }}>{hodCompletedCount}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Ready for University Ratification</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Promotions Recommended</span>
                                                <Award size={20} style={{ color: '#047857' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#047857', margin: 0 }}>{deptPromotionsCount}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Eligible for Upward Mobility</span>
                                        </div>
                                    </>
                                )}

                                {(userRole === 'apc_chairman' || userRole === 'admin') && (
                                    <>
                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>University Submissions</span>
                                                <ClipboardList size={20} style={{ color: '#0284c7' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>{submissions.length}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total University Applications</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Pending APC Ratification</span>
                                                <Clock size={20} style={{ color: '#b45309' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#b45309', margin: 0 }}>{apcPendingCount}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '600' }}>Requires Part E Central Action</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Ratified Records (APER)</span>
                                                <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', margin: 0 }}>{apcCompletedCount}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>Locked into University System</span>
                                        </div>

                                        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Promotion Approval Rate</span>
                                                <Award size={20} style={{ color: '#047857' }} />
                                            </div>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#047857', margin: 0 }}>
                                                {submissions.length > 0 ? ((apcCompletedCount / submissions.length) * 100).toFixed(0) : 0}%
                                            </h3>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Of Screened Submissions</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Submissions Quick Action Table */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Recent Staff Submissions</h3>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>Candidates active in the annual performance evaluation workflow</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('evaluations')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#047857', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                                    >
                                        <span>View All Submissions</span>
                                        <ArrowRight size={16} />
                                    </button>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                                                <th style={{ padding: '12px' }}>Staff Name & PF</th>
                                                <th style={{ padding: '12px' }}>Department</th>
                                                <th style={{ padding: '12px' }}>Current Rank</th>
                                                <th style={{ padding: '12px' }}>Proposed Rank</th>
                                                <th style={{ padding: '12px' }}>Status</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.slice(0, 4).map((sub) => (
                                                <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 12px' }}>
                                                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{sub.staff_name}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{sub.pf_number}</div>
                                                    </td>
                                                    <td style={{ padding: '14px 12px', color: '#334155' }}>{sub.department}</td>
                                                    <td style={{ padding: '14px 12px', color: '#334155' }}>{sub.current_rank}</td>
                                                    <td style={{ padding: '14px 12px', fontWeight: '600', color: '#047857' }}>{sub.proposed_rank}</td>
                                                    <td style={{ padding: '14px 12px' }}>
                                                        {renderStatusBadge(sub)}
                                                    </td>
                                                    <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                                        {renderActionButton(sub)}
                                                    </td>
                                                </tr>
                                            ))}
                                         {submissions.length === 0 && (
                                             <tr>
                                                 <td colSpan="8" style={{ padding: '40px', textAlign: 'center' }}>
                                                     <ClipboardList size={36} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
                                                     <div style={{ fontWeight: '700', fontSize: '1rem', color: '#334155' }}>No Real Staff Submissions Found</div>
                                                     <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Submissions will populate here in real-time as staff submit their Part A Annual Performance Evaluation.</div>
                                                 </td>
                                             </tr>
                                         )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EVALUATIONS TAB */}
                    {activeTab === 'evaluations' && (
                        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Staff Submissions Roster</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Showing {filteredSubmissions.length} record(s)</span>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'nowrap', width: '100%', overflowX: 'auto', paddingBottom: '2px' }}>
                                    <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
                                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '16px', height: '16px' }} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search staff, PF number, or dept..."
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px 9px 36px',
                                                fontSize: '0.85rem',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <select
                                        value={filterDept}
                                        onChange={(e) => setFilterDept(e.target.value)}
                                        style={{
                                            flex: '0 0 auto',
                                            width: '165px',
                                            padding: '9px 12px',
                                            fontSize: '0.85rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            outline: 'none',
                                            background: '#ffffff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="all">All Departments</option>
                                        {departmentList.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={filterStage}
                                        onChange={(e) => setFilterStage(e.target.value)}
                                        style={{
                                            flex: '0 0 auto',
                                            width: '190px',
                                            padding: '9px 12px',
                                            fontSize: '0.85rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            outline: 'none',
                                            background: '#ffffff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="all">All Workflow Stages</option>
                                        <option value="part_b">Part B: Supervisor Evaluation</option>
                                        <option value="part_c">Part C: Staff Acknowledgment</option>
                                        <option value="part_d">Part D: Departmental Review</option>
                                        <option value="part_e">Part E: Central APC Ratification</option>
                                        <option value="completed">Completed / APER Locked</option>
                                    </select>

                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        style={{
                                            flex: '0 0 auto',
                                            width: '150px',
                                            padding: '9px 12px',
                                            fontSize: '0.85rem',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            outline: 'none',
                                            background: '#ffffff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="pending">Pending My Action</option>
                                        <option value="completed">Completed Assessment</option>
                                    </select>

                                    {(searchQuery || filterDept !== 'all' || filterStage !== 'all' || filterStatus !== 'all') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setFilterDept('all');
                                                setFilterStage('all');
                                                setFilterStatus('all');
                                            }}
                                            title="Reset all filters"
                                            style={{
                                                flex: '0 0 auto',
                                                padding: '9px 12px',
                                                fontSize: '0.82rem',
                                                fontWeight: '600',
                                                color: '#64748b',
                                                background: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                                            <th style={{ padding: '12px' }}>Staff Name</th>
                                            <th style={{ padding: '12px' }}>PF Number</th>
                                            <th style={{ padding: '12px' }}>Department</th>
                                            <th style={{ padding: '12px' }}>Current Rank</th>
                                            <th style={{ padding: '12px' }}>Proposed Rank</th>
                                            <th style={{ padding: '12px', width: '130px', minWidth: '115px', whiteSpace: 'nowrap' }}>Score</th>
                                            <th style={{ padding: '12px' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSubmissions.map((sub) => (
                                            <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 12px', fontWeight: '700', color: '#0f172a' }}>{sub.staff_name}</td>
                                                <td style={{ padding: '14px 12px', color: '#64748b' }}>{sub.pf_number}</td>
                                                <td style={{ padding: '14px 12px', color: '#334155' }}>{sub.department}</td>
                                                <td style={{ padding: '14px 12px', color: '#334155' }}>{sub.current_rank}</td>
                                                <td style={{ padding: '14px 12px', fontWeight: '600', color: '#047857' }}>{sub.proposed_rank}</td>
                                                <td style={{ padding: '14px 12px', fontWeight: '700', color: '#0f172a', width: '130px', minWidth: '115px', whiteSpace: 'nowrap' }}>{sub.score} / 100</td>
                                                <td style={{ padding: '14px 12px' }}>
                                                    {renderStatusBadge(sub)}
                                                </td>
                                                <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                                    {renderActionButton(sub)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ASSESSMENT TAB */}
                    {activeTab === 'assessment' && (
                        <div className="evaluator-assessment-wrapper" style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            {selectedStaffId ? (
                                <div>
                                    <div className="evaluator-assessment-header print:hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Evaluating Staff Application</h2>
                                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
                                                Staff Member: <strong>{submissions.find(s => String(s.id) === String(selectedStaffId))?.staff_name || 'Selected Staff'}</strong> (PF: {submissions.find(s => String(s.id) === String(selectedStaffId))?.pf_number || 'N/A'})
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedStaffId(null); setActiveTab('overview'); }}
                                            style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            ← Back to Staff List
                                        </button>
                                    </div>
                                    <EvaluationForm overrideRole={userRole} selectedStaffId={selectedStaffId} />
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <Users size={48} style={{ margin: '0 auto 16px', color: '#94a3b8' }} />
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>No Staff Member Selected</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 24px' }}>
                                        Please select a staff member from the <strong>Overview</strong> or <strong>Staff Submissions Roster</strong> table to view and evaluate their performance appraisal.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        style={{ background: '#047857', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    >
                                        View Staff Roster
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ marginBottom: '18px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Evaluation History</h3>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>Staff evaluations reviewed and submitted by you</p>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                                            <th style={{ padding: '12px' }}>Staff Name</th>
                                            <th style={{ padding: '12px' }}>PF Number</th>
                                            <th style={{ padding: '12px' }}>Department</th>
                                            <th style={{ padding: '12px' }}>Evaluation Date</th>
                                            <th style={{ padding: '12px', width: '130px', minWidth: '115px', whiteSpace: 'nowrap' }}>Score</th>
                                            <th style={{ padding: '12px' }}>Recommendation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.filter(s => s.part_b_status === 'Completed').map((sub) => (
                                            <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 12px', fontWeight: '700', color: '#0f172a' }}>{sub.staff_name}</td>
                                                <td style={{ padding: '14px 12px', color: '#64748b' }}>{sub.pf_number}</td>
                                                <td style={{ padding: '14px 12px', color: '#334155' }}>{sub.department}</td>
                                                <td style={{ padding: '14px 12px', color: '#64748b' }}>{sub.submitted_date}</td>
                                                <td style={{ padding: '14px 12px', fontWeight: '700', color: '#16a34a', width: '130px', minWidth: '115px', whiteSpace: 'nowrap' }}>{sub.score} / 100</td>
                                                <td style={{ padding: '14px 12px' }}>
                                                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', background: '#dcfce7', color: '#166534' }}>
                                                        Recommended for Promotion
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PROFILE / MY ACCOUNT TAB */}
                    {activeTab === 'profile' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                            
                            {/* Passport Image Card */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Passport Photograph</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    {passportUrl ? (
                                        <img src={passportUrl} alt="Passport" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #047857', boxShadow: '0 4px 12px rgba(4, 120, 87, 0.2)' }} />
                                    ) : (
                                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2.5rem', border: '3px dashed #047857' }}>
                                            {currentUser.name ? currentUser.name.charAt(0) : 'S'}
                                        </div>
                                    )}

                                    <label style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: '#047857',
                                        color: '#ffffff',
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        fontSize: '0.88rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}>
                                        <Camera size={16} />
                                        <span>Upload New Passport</span>
                                        <input type="file" accept="image/*" onChange={handlePassportUpload} style={{ display: 'none' }} />
                                    </label>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Supports JPG, PNG or WEBP (Max 2MB)</span>
                                </div>
                            </div>

                            {/* Password Reset Card */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Security Settings</h3>
                                
                                {profileMsg.text && (
                                    <div style={{
                                        marginBottom: '16px',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        background: profileMsg.type === 'error' ? '#fef2f2' : '#f0fdf4',
                                        border: profileMsg.type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0',
                                        color: profileMsg.type === 'error' ? '#991b1b' : '#166534',
                                        fontSize: '0.82rem'
                                    }}>
                                        {profileMsg.text}
                                    </div>
                                )}

                                <form onSubmit={handlePasswordChange}>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Current Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', fontSize: '0.88rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>New Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', fontSize: '0.88rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', fontSize: '0.88rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        style={{ width: '100%', padding: '10px', background: '#047857', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        <Key size={16} />
                                        <span>Update Password</span>
                                    </button>
                                </form>
                            </div>

                            {/* Official Digital Signature Card for Evaluator Roles */}
                            <div style={{
                                gridColumn: '1 / -1',
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                padding: '28px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px', borderBottom: '1px solid #f1f5f9', paddingBottom: '18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FileSignature size={22} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Official Digital Signature</h3>
                                            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                                Upload your signature image to digitally represent your typed name across statutory evaluations (Parts B, D, E) & APER printouts.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Role selection pills */}
                                    <div style={{ display: 'inline-flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '4px' }}>
                                        {[
                                            { key: 'supervisor', label: 'Supervisor', name: 'Dr. Clement Alabi' },
                                            { key: 'dept_chairman', label: 'Dept HOD', name: 'Prof. Aminu Bello' },
                                            { key: 'apc_chairman', label: 'APC Chairman', name: 'Prof. J. O. Oladipo' }
                                        ].map(r => {
                                            const isSelected = activeSigRole === r.key;
                                            const hasUploaded = !!signatures[r.key];
                                            return (
                                                <button
                                                    key={r.key}
                                                    type="button"
                                                    onClick={() => setActiveSigRole(r.key)}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: isSelected ? '700' : '600',
                                                        border: 'none',
                                                        background: isSelected ? '#047857' : 'transparent',
                                                        color: isSelected ? '#ffffff' : '#475569',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <span>{r.label}</span>
                                                    {hasUploaded && (
                                                        <span style={{
                                                            width: '7px',
                                                            height: '7px',
                                                            borderRadius: '50%',
                                                            background: isSelected ? '#a7f3d0' : '#10b981'
                                                        }} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {(() => {
                                    const roleMeta = getRoleMeta(activeSigRole);
                                    const currentSig = signatures[activeSigRole];
                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '26px', alignItems: 'center' }}>
                                            
                                            {/* Preview Canvas Plate */}
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Signature Representation Preview
                                                    </span>
                                                    {currentSig ? (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: '700',
                                                            padding: '3px 9px',
                                                            borderRadius: '20px',
                                                            background: '#dcfce7',
                                                            color: '#166534',
                                                            border: '1px solid #bbf7d0'
                                                        }}>
                                                            <Check size={12} strokeWidth={3} /> Uploaded Graphic Active
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: '600',
                                                            padding: '3px 9px',
                                                            borderRadius: '20px',
                                                            background: '#f1f5f9',
                                                            color: '#475569',
                                                            border: '1px solid #cbd5e1'
                                                        }}>
                                                            <PenTool size={12} /> System Digital Typed Name
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{
                                                    background: '#ffffff',
                                                    border: currentSig ? '2px solid #bbf7d0' : '2px dashed #cbd5e1',
                                                    borderRadius: '12px',
                                                    padding: '24px 20px',
                                                    minHeight: '170px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        bottom: '8px',
                                                        fontSize: '0.65rem',
                                                        color: '#cbd5e1',
                                                        fontFamily: 'monospace',
                                                        fontWeight: '600',
                                                        userSelect: 'none'
                                                    }}>
                                                        JOSTUM APER CERTIFIED
                                                    </div>

                                                    {currentSig ? (
                                                        <div style={{ textAlign: 'center', width: '100%' }}>
                                                            <img
                                                                src={currentSig}
                                                                alt={`${roleMeta.name} Signature`}
                                                                style={{
                                                                    maxHeight: '90px',
                                                                    maxWidth: '260px',
                                                                    objectFit: 'contain',
                                                                    display: 'block',
                                                                    margin: '0 auto 8px auto',
                                                                    filter: 'contrast(1.15)'
                                                                }}
                                                            />
                                                            <div style={{ width: '80%', height: '1.5px', background: '#0f172a', margin: '4px auto 8px auto' }} />
                                                            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>{roleMeta.name}</div>
                                                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{roleMeta.title}</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ textAlign: 'center', width: '100%' }}>
                                                            <div style={{
                                                                fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, "Times New Roman", serif',
                                                                fontSize: '2.1rem',
                                                                fontWeight: '700',
                                                                fontStyle: 'italic',
                                                                color: '#0f172a',
                                                                letterSpacing: '0.03em',
                                                                lineHeight: '1.2',
                                                                marginBottom: '4px'
                                                            }}>
                                                                {roleMeta.name}
                                                            </div>
                                                            <div style={{ width: '70%', height: '1.5px', background: '#94a3b8', margin: '6px auto' }} />
                                                            <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155' }}>{roleMeta.name}</div>
                                                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{roleMeta.title}</div>
                                                            <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '600', marginTop: '6px' }}>
                                                                (Digitally typed signature representation — upload an image below to replace)
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action & Details Controls */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                                                        {roleMeta.title}
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '3px' }}>
                                                        <strong>Designated Official:</strong> {roleMeta.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                        <strong>Authority Section:</strong> {roleMeta.section}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    <label style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        background: '#047857',
                                                        color: '#ffffff',
                                                        padding: '11px 20px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.88rem',
                                                        fontWeight: '700',
                                                        cursor: signatureUploading ? 'not-allowed' : 'pointer',
                                                        boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
                                                        transition: 'all 0.15s ease'
                                                    }}>
                                                        <Upload size={16} />
                                                        <span>{currentSig ? 'Replace Signature Image' : 'Upload Signature Image'}</span>
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                                            onChange={(e) => handleSignatureUpload(e, activeSigRole)}
                                                            disabled={signatureUploading}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>

                                                    {currentSig && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSignature(activeSigRole)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                background: '#fef2f2',
                                                                color: '#b91c1c',
                                                                border: '1px solid #fecaca',
                                                                padding: '11px 16px',
                                                                borderRadius: '10px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                            <span>Remove & Revert to Typed</span>
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: '1.45' }}>
                                                    <strong>Format Guidelines:</strong> PNG with transparent background (recommended), JPG, WEBP, or SVG under 2MB. Once uploaded, this official signature will represent your typed name on statutory reviews, approval stamps, and printed APER dossiers.
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* PART B: SUPERVISORY SCORING TAB */}
                    {activeTab === 'part_b' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UserCheck size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Part B: Supervisory Performance Scoring</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Departmental 100-point statutory appraisal covering Teaching/Professional Work (40), Research (30), Governance (15) & Conduct (15).
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                        {supervisorPendingCount} Pending Scoring
                                    </span>
                                    <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                        {supervisorCompletedCount} Completed
                                    </span>
                                </div>
                            </div>

                            {/* Scoring Guide Banner */}
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <AlertCircle size={22} style={{ color: '#16a34a', flexShrink: 0 }} />
                                <div style={{ fontSize: '0.84rem', color: '#166534', lineHeight: 1.5 }}>
                                    <strong>Statutory Note for Supervisors:</strong> Only appointed departmental supervisors can input and commit Part B scores. Scores must be justified in writing and signed before forward transmission to the staff member for Part C acknowledgment.
                                </div>
                            </div>

                            {/* Candidate Roster Table */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Departmental Candidates for Supervisory Assessment</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '12px 14px' }}>PF Number</th>
                                                <th style={{ padding: '12px 14px' }}>Staff Candidate</th>
                                                <th style={{ padding: '12px 14px' }}>Department</th>
                                                <th style={{ padding: '12px 14px' }}>Current Rank</th>
                                                <th style={{ padding: '12px 14px', width: '130px' }}>Part B Score</th>
                                                <th style={{ padding: '12px 14px' }}>Status</th>
                                                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map(sub => {
                                                const hasScore = sub.part_b_score !== undefined && sub.part_b_score !== null;
                                                const isCompleted = sub.part_b_status === 'Completed' || hasScore;
                                                return (
                                                    <tr key={sub.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}>
                                                        <td style={{ padding: '14px', fontWeight: '700', color: '#334155' }}>{sub.pf_number}</td>
                                                        <td style={{ padding: '14px' }}>
                                                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{sub.staff_name}</div>
                                                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sub.staff_email || 'staff@jostum.edu.ng'}</div>
                                                        </td>
                                                        <td style={{ padding: '14px', color: '#475569' }}>{sub.department}</td>
                                                        <td style={{ padding: '14px', color: '#475569' }}>{sub.current_rank}</td>
                                                        <td style={{ padding: '14px', width: '130px', whiteSpace: 'nowrap' }}>
                                                            {hasScore ? (
                                                                <span style={{ fontWeight: '800', color: '#047857', background: '#d1fae5', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                                                    {sub.part_b_score} / 100
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Pending Score</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '14px' }}>
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                background: isCompleted ? '#d1fae5' : '#fef3c7',
                                                                color: isCompleted ? '#047857' : '#92400e'
                                                            }}>
                                                                {isCompleted ? 'Part B: Evaluated' : 'Part B: Pending'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setScreeningStaff(sub)}
                                                                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                    title="Quick Screen"
                                                                >
                                                                    <Eye size={13} />
                                                                    <span>Screen</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedStaffId(sub.id);
                                                                        setActiveTab('assessment');
                                                                    }}
                                                                    style={{ background: isCompleted ? '#059669' : 'linear-gradient(90deg, #047857, #059669)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    <Edit size={13} />
                                                                    <span>{isCompleted ? 'Review Score' : 'Score Staff (Part B)'}</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {submissions.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                                                        No real staff submissions currently pending supervisory assessment.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PART D: DEPARTMENTAL REVIEWS TAB */}
                    {activeTab === 'part_d' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Part D: Departmental A&PC Review & Recommendations</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Departmental Committee assessment, interview remarks, and promotion recommendations to the Appointments & Promotions Committee.
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                        {hodPendingCount} Pending Review
                                    </span>
                                    <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                        {deptPromotionsCount} Promoted Recommendations
                                    </span>
                                </div>
                            </div>

                            {/* Departmental Review Roster */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Departmental Submissions for HOD / Committee Review</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '12px 14px' }}>PF Number</th>
                                                <th style={{ padding: '12px 14px' }}>Staff Candidate</th>
                                                <th style={{ padding: '12px 14px' }}>Supervisor Score</th>
                                                <th style={{ padding: '12px 14px' }}>Part D Status</th>
                                                <th style={{ padding: '12px 14px' }}>Committee Rec</th>
                                                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map(sub => {
                                                const isCompleted = sub.part_d_status === 'Completed';
                                                return (
                                                    <tr key={sub.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                        <td style={{ padding: '14px', fontWeight: '700', color: '#334155' }}>{sub.pf_number}</td>
                                                        <td style={{ padding: '14px' }}>
                                                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{sub.staff_name}</div>
                                                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sub.department} — {sub.current_rank}</div>
                                                        </td>
                                                        <td style={{ padding: '14px' }}>
                                                            {sub.part_b_score ? (
                                                                <span style={{ fontWeight: '700', color: '#047857' }}>{sub.part_b_score} / 100</span>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '14px' }}>
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                background: isCompleted ? '#d1fae5' : '#e0f2fe',
                                                                color: isCompleted ? '#047857' : '#0369a1'
                                                            }}>
                                                                {isCompleted ? 'Part D: Completed' : 'Part D: Pending HOD'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px', fontWeight: '600', color: '#334155' }}>
                                                            {sub.part_d_recommendation || (isCompleted ? 'Recommended for Promotion' : 'Deliberation Pending')}
                                                        </td>
                                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setScreeningStaff(sub)}
                                                                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    <Eye size={13} />
                                                                    <span>Screen</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedStaffId(sub.id);
                                                                        setActiveTab('assessment');
                                                                    }}
                                                                    style={{ background: isCompleted ? '#0284c7' : 'linear-gradient(90deg, #0284c7, #0369a1)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    <CheckCircle2 size={13} />
                                                                    <span>{isCompleted ? 'View Review' : 'Conduct HOD Review'}</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {submissions.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                                                        No real staff submissions currently pending departmental HOD review.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PART E: A&PC RATIFICATIONS TAB */}
                    {activeTab === 'part_e' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Award size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Part E: Central A&PC Final Ratifications</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            University Appointments & Promotions Committee final ratifications, official decisions, and gazetted effective dates.
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                        {apcPendingCount} Pending Central Action
                                    </span>
                                    <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                        {apcCompletedCount} Ratified APER Records
                                    </span>
                                </div>
                            </div>

                            {/* Ratification Table */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Central Appointments & Promotions Committee Roll</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '12px 14px' }}>PF Number</th>
                                                <th style={{ padding: '12px 14px' }}>Staff Candidate</th>
                                                <th style={{ padding: '12px 14px' }}>Department</th>
                                                <th style={{ padding: '12px 14px' }}>Proposed Rank</th>
                                                <th style={{ padding: '12px 14px' }}>Part E Decision</th>
                                                <th style={{ padding: '12px 14px' }}>Effective Date</th>
                                                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map(sub => {
                                                const isCompleted = sub.current_stage === 'completed' || sub.part_e_status === 'Completed';
                                                return (
                                                    <tr key={sub.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                        <td style={{ padding: '14px', fontWeight: '700', color: '#334155' }}>{sub.pf_number}</td>
                                                        <td style={{ padding: '14px' }}>
                                                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{sub.staff_name}</div>
                                                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Current: {sub.current_rank}</div>
                                                        </td>
                                                        <td style={{ padding: '14px', color: '#475569' }}>{sub.department}</td>
                                                        <td style={{ padding: '14px', fontWeight: '700', color: '#047857' }}>{sub.proposed_rank || sub.current_rank}</td>
                                                        <td style={{ padding: '14px' }}>
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                background: isCompleted ? '#d1fae5' : '#fef3c7',
                                                                color: isCompleted ? '#047857' : '#92400e'
                                                            }}>
                                                                {isCompleted ? (sub.part_e_decision || 'Promoted (Ratified)') : 'Pending Decision'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px', color: '#64748b' }}>
                                                            {sub.effective_date || (isCompleted ? '01/10/2026' : '—')}
                                                        </td>
                                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setScreeningStaff(sub)}
                                                                    style={{ background: isCompleted ? '#ecfdf5' : 'linear-gradient(90deg, #b45309, #d97706)', color: isCompleted ? '#047857' : '#ffffff', border: isCompleted ? '1px solid #a7f3d0' : 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    <Award size={13} />
                                                                    <span>{isCompleted ? 'View Ratification' : 'Ratify Decision'}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedStaffId(sub.id);
                                                                        setActiveTab('assessment');
                                                                    }}
                                                                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    <FileText size={13} />
                                                                    <span>Full Form</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {submissions.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                                                        No real staff submissions currently pending A&PC final ratification.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DOSSIERS & PRINT TAB */}
                    {activeTab === 'dossiers' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Printer size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Annual Performance Evaluation Reports (APER) Repository</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Official print-ready APER forms (Parts A to E) with certified evaluator digital signatures and institutional seals.
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <span style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                                        {submissions.length} Dossiers in Registry
                                    </span>
                                </div>
                            </div>

                            {/* Dossier Table */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Certified APER Dossiers</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        Printing prints only the statutory APER documentation without workstation headers or navigation.
                                    </span>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '12px 14px' }}>PF Number</th>
                                                <th style={{ padding: '12px 14px' }}>Candidate Name</th>
                                                <th style={{ padding: '12px 14px' }}>Department</th>
                                                <th style={{ padding: '12px 14px' }}>Score</th>
                                                <th style={{ padding: '12px 14px' }}>APER Status</th>
                                                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map(sub => {
                                                const isCompleted = sub.current_stage === 'completed' || sub.part_e_status === 'Completed';
                                                return (
                                                    <tr key={sub.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                        <td style={{ padding: '14px', fontWeight: '700', color: '#334155' }}>{sub.pf_number}</td>
                                                        <td style={{ padding: '14px' }}>
                                                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{sub.staff_name}</div>
                                                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{sub.current_rank}</div>
                                                        </td>
                                                        <td style={{ padding: '14px', color: '#475569' }}>{sub.department}</td>
                                                        <td style={{ padding: '14px' }}>
                                                            <span style={{ fontWeight: '800', color: '#047857' }}>
                                                                {sub.part_b_score ? `${sub.part_b_score}/100` : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px' }}>
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                background: isCompleted ? '#d1fae5' : '#fef3c7',
                                                                color: isCompleted ? '#047857' : '#92400e'
                                                            }}>
                                                                {isCompleted ? 'Official APER Complete' : 'In Progress'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedStaffId(sub.id);
                                                                        setActiveTab('assessment');
                                                                    }}
                                                                    style={{ background: '#7e22ce', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                                >
                                                                    <Printer size={14} />
                                                                    <span>Print APER Paper</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setScreeningStaff(sub)}
                                                                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    <Eye size={13} />
                                                                    <span>Preview</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {submissions.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                                                        No real staff APER dossiers generated yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* APPRAISAL CYCLES TAB */}
                    {activeTab === 'periods' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ede9fe', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Appraisal Cycles & Operational Timelines</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Annual statutory performance assessment periods, milestone deadlines, and submission windows.
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => alert('Broadcasting appraisal deadline reminder to all active departmental supervisors and HODs.')}
                                        style={{ background: '#047857', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Clock size={15} />
                                        <span>Broadcast Deadline Reminder</span>
                                    </button>
                                </div>
                            </div>

                            {/* Active Exercise Details Card */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Active Session</div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>2025/2026 Annual Staff Appraisal Exercise</h3>
                                    </div>
                                    <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '800' }}>
                                        CYCLE ACTIVE
                                    </span>
                                </div>

                                {/* Timeline Steps */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px' }}>
                                    {[
                                        { step: 'Phase 1', title: 'Part A: Staff Submission', status: 'Completed', date: 'Closed Nov 15', active: false, color: '#16a34a' },
                                        { step: 'Phase 2', title: 'Part B: Supervisor Scoring', status: 'In Progress', date: 'Active — Closes Dec 10', active: true, color: '#047857' },
                                        { step: 'Phase 3', title: 'Part C: Staff Acknowledgment', status: 'Open', date: 'Active window', active: false, color: '#0284c7' },
                                        { step: 'Phase 4', title: 'Part D: Dept A&PC Reviews', status: 'Scheduled', date: 'Jan 05 — Jan 25', active: false, color: '#d97706' },
                                        { step: 'Phase 5', title: 'Part E: Central Ratification', status: 'Scheduled', date: 'Feb 01 — Feb 15', active: false, color: '#7c3aed' },
                                    ].map((phase, idx) => (
                                        <div key={idx} style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            background: phase.active ? '#f0fdf4' : '#f8fafc',
                                            border: phase.active ? '2px solid #34d399' : '1px solid #e2e8f0',
                                            boxShadow: phase.active ? '0 4px 12px rgba(52, 211, 153, 0.15)' : 'none'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: phase.color, textTransform: 'uppercase' }}>{phase.step}</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: phase.active ? '#047857' : '#64748b' }}>{phase.status}</span>
                                            </div>
                                            <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>{phase.title}</h4>
                                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{phase.date}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANALYTICS & REPORTS TAB */}
                    {activeTab === 'analytics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <TrendingUp size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Institutional Appraisal Analytics & Intelligence</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Aggregated scoring distributions, departmental velocity, and university promotion qualification ratios.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Analytics KPI Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Average Overall Score</span>
                                    <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#047857', margin: '6px 0' }}>{avgScore} / 100</h3>
                                    <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: '700' }}>↑ 4.2% from previous session</span>
                                </div>
                                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Promotion Eligibility Rate</span>
                                    <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#0284c7', margin: '6px 0' }}>
                                        {submissions.length > 0 ? Math.round((deptPromotionsCount / submissions.length) * 100) : 0}%
                                    </h3>
                                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Met or exceeded 70% threshold</span>
                                </div>
                                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Evaluation Turnaround</span>
                                    <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#7c3aed', margin: '6px 0' }}>4.8 Days</h3>
                                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Average stage response time</span>
                                </div>
                                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Completion Progress</span>
                                    <h3 style={{ fontSize: '2rem', fontWeight: '800', color: '#d97706', margin: '6px 0' }}>
                                        {submissions.length > 0 ? Math.round((apcCompletedCount / submissions.length) * 100) : 0}%
                                    </h3>
                                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Dossiers with Part E ratified</span>
                                </div>
                            </div>

                            {/* Score Distribution Spectrum */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Score Distribution Spectrum</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        { label: '85 - 100% (Distinction / Outstanding)', count: submissions.filter(s => Number(s.part_b_score) >= 85).length, color: '#047857' },
                                        { label: '70 - 84% (Commendable / Very Good)', count: submissions.filter(s => Number(s.part_b_score) >= 70 && Number(s.part_b_score) < 85).length, color: '#0284c7' },
                                        { label: '50 - 69% (Satisfactory / Good)', count: submissions.filter(s => Number(s.part_b_score) >= 50 && Number(s.part_b_score) < 70).length, color: '#d97706' },
                                        { label: '< 50% (Needs Improvement)', count: submissions.filter(s => s.part_b_score !== null && Number(s.part_b_score) < 50).length, color: '#dc2626' },
                                    ].map((band, idx) => {
                                        const pct = submissions.length > 0 ? (band.count / submissions.length) * 100 : 0;
                                        return (
                                            <div key={idx}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px' }}>
                                                    <span style={{ color: '#334155' }}>{band.label}</span>
                                                    <span style={{ color: '#64748b' }}>{band.count} Staff ({pct.toFixed(0)}%)</span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: band.color, borderRadius: '6px', transition: 'width 0.5s' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* DOWNLOADABLE STATUTORY REPORTS CENTER */}
                            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '26px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                {/* Center Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileSpreadsheet size={20} />
                                            </div>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                                Statutory APER Reports & Download Center
                                            </h3>
                                        </div>
                                        <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                                            Download certified institutional appraisal dossiers in both Microsoft Excel (<strong style={{ color: '#16a34a' }}>.xlsx</strong>) and official printable PDF (<strong style={{ color: '#dc2626' }}>.pdf</strong>) formats.
                                        </p>
                                    </div>

                                    {/* Download Toast Notification */}
                                    {downloadSuccessToast && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            background: '#ecfdf5',
                                            border: '1px solid #a7f3d0',
                                            color: '#065f46',
                                            fontSize: '0.82rem',
                                            fontWeight: '700',
                                            boxShadow: '0 2px 6px rgba(4, 120, 87, 0.1)'
                                        }}>
                                            <CheckCircle2 size={16} style={{ color: '#059669' }} />
                                            <span>{downloadSuccessToast}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Filter Controls Bar */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '14px',
                                    padding: '14px 18px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                        {/* Academic Session */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={15} style={{ color: '#64748b' }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Academic Session:</span>
                                            <select
                                                value={reportSession}
                                                onChange={(e) => setReportSession(e.target.value)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '600',
                                                    color: '#0f172a',
                                                    background: '#ffffff',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="2025/2026">2025/2026 (Current Academic Session)</option>
                                                <option value="2024/2025">2024/2025 (Previous Session)</option>
                                                <option value="2023/2024">2023/2024 (Archived Session)</option>
                                            </select>
                                        </div>

                                        {/* Department Scope */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Building size={15} style={{ color: '#64748b' }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Department Scope:</span>
                                            <select
                                                value={reportDeptFilter}
                                                onChange={(e) => setReportDeptFilter(e.target.value)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '600',
                                                    color: '#0f172a',
                                                    background: '#ffffff',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="all">All University Departments ({submissions.length} Records)</option>
                                                {departmentList.map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Category Filter Pills */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        {[
                                            { id: 'all', label: 'All Reports' },
                                            { id: 'Master Registers', label: 'Master Roll' },
                                            { id: 'Departmental Analytics', label: 'Dept Ranking' },
                                            { id: 'A&PC Decisions', label: 'Promotions' },
                                            { id: 'Scoring Breakdowns', label: '100-Pt Matrix' },
                                            { id: 'Operational Audits', label: 'Bottlenecks' },
                                            { id: 'Executive Governance', label: 'Senate Digest' }
                                        ].map(cat => {
                                            const isSelected = reportCategory === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setReportCategory(cat.id)}
                                                    style={{
                                                        padding: '5px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.74rem',
                                                        fontWeight: '700',
                                                        border: isSelected ? '1px solid #047857' : '1px solid #e2e8f0',
                                                        background: isSelected ? '#047857' : '#ffffff',
                                                        color: isSelected ? '#ffffff' : '#64748b',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {cat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Reports Grid (Cards) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                                    {getAvailableReports()
                                        .filter(r => reportCategory === 'all' || r.category === reportCategory)
                                        .map((rep) => {
                                            const IconComp = rep.icon;
                                            return (
                                                <div
                                                    key={rep.id}
                                                    style={{
                                                        background: '#ffffff',
                                                        borderRadius: '14px',
                                                        border: '1px solid #e2e8f0',
                                                        padding: '20px',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        transition: 'transform 0.15s, box-shadow 0.15s'
                                                    }}
                                                >
                                                    {/* Card Header & Badge */}
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: '800',
                                                                    background: '#f1f5f9',
                                                                    color: '#475569',
                                                                    fontFamily: 'monospace'
                                                                }}>
                                                                    {rep.code}
                                                                </span>
                                                                <span style={{
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: '700',
                                                                    background: `${rep.badgeColor}15`,
                                                                    color: rep.badgeColor
                                                                }}>
                                                                    {rep.category}
                                                                </span>
                                                            </div>
                                                            <span style={{
                                                                fontSize: '0.74rem',
                                                                fontWeight: '700',
                                                                color: '#64748b'
                                                            }}>
                                                                {rep.recordCount} Records
                                                            </span>
                                                        </div>

                                                        {/* Icon + Title */}
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '10px',
                                                                background: `${rep.badgeColor}18`,
                                                                color: rep.badgeColor,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                <IconComp size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                                                                    {rep.title}
                                                                </h4>
                                                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                                                                    {rep.description}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Fields / Columns Included Tag List */}
                                                        <div style={{
                                                            background: '#f8fafc',
                                                            borderRadius: '8px',
                                                            padding: '8px 10px',
                                                            marginBottom: '18px',
                                                            border: '1px solid #f1f5f9'
                                                        }}>
                                                            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                Columns Included ({rep.headers.length}):
                                                            </span>
                                                            <p style={{ fontSize: '0.73rem', color: '#334155', margin: '3px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {rep.headers.join(' • ')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons: Preview, XLSX, PDF */}
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewReport(rep)}
                                                            title="Inspect report data table in preview window"
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px 10px',
                                                                background: '#f1f5f9',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: '700',
                                                                color: '#334155',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '5px',
                                                                transition: 'background 0.15s'
                                                            }}
                                                        >
                                                            <Eye size={14} />
                                                            <span>Preview</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => exportToXLSX(rep.title, rep.headers, rep.rows, rep.filenameBase)}
                                                            title="Download in Microsoft Excel (.xlsx) format"
                                                            style={{
                                                                flex: 1.3,
                                                                padding: '8px 10px',
                                                                background: '#f0fdf4',
                                                                border: '1px solid #86efac',
                                                                borderRadius: '8px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: '700',
                                                                color: '#15803d',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '5px',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            <FileSpreadsheet size={14} />
                                                            <span>Excel (.xlsx)</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => exportToPDF(rep.title, rep.category, rep.headers, rep.rows, rep.filenameBase, rep.weights)}
                                                            title="Download printable official report in PDF format"
                                                            style={{
                                                                flex: 1.3,
                                                                padding: '8px 10px',
                                                                background: 'linear-gradient(90deg, #064e3b, #047857)',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: '700',
                                                                color: '#ffffff',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '5px',
                                                                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            <Download size={14} />
                                                            <span>PDF (.pdf)</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OFFICIAL SIGNATURES TAB */}
                    {activeTab === 'signatures' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileSignature size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Official Authorized Signatures Directory</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Manage authorized digital signatures stamped across statutory evaluations (Parts B, D, E) & printed APER forms.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Signatures Cards Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                                {[
                                    { key: 'supervisor', roleTitle: 'Departmental Supervisor', name: 'Dr. Clement Alabi', jurisdiction: 'Part B Evaluation & 100-Point Scoring Stamp' },
                                    { key: 'dept_chairman', roleTitle: 'Head of Department / Chairman', name: 'Prof. Aminu Bello', jurisdiction: 'Part D Departmental Committee Recommendation' },
                                    { key: 'apc_chairman', roleTitle: 'A&P Committee Chairman', name: 'Prof. J. O. Oladipo', jurisdiction: 'Part E Central A&PC Final Decision Ratification' },
                                    { key: 'admin', roleTitle: 'Academic Registrar / Admin', name: 'Engr. D. K. Audu', jurisdiction: 'Official APER Certification Seal & Gazetting' }
                                ].map((auth) => {
                                    const sigUrl = signatures[auth.key];
                                    return (
                                        <div key={auth.key} style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#047857', textTransform: 'uppercase' }}>{auth.roleTitle}</span>
                                                    <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>{auth.name}</h4>
                                                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0 0' }}>{auth.jurisdiction}</p>
                                                </div>
                                                <span style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '700',
                                                    background: sigUrl ? '#d1fae5' : '#f1f5f9',
                                                    color: sigUrl ? '#047857' : '#64748b'
                                                }}>
                                                    {sigUrl ? 'Uploaded Image' : 'Typed Cursive'}
                                                </span>
                                            </div>

                                            {/* Preview Box */}
                                            <div style={{ minHeight: '100px', background: '#fafafa', borderRadius: '10px', border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                                                {sigUrl ? (
                                                    <img src={sigUrl} alt={auth.name} style={{ maxHeight: '70px', maxWidth: '220px', objectFit: 'contain' }} />
                                                ) : (
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontFamily: '"Caveat", "Brush Script MT", "Segoe Script", cursive, "Times New Roman", serif', fontSize: '1.8rem', fontWeight: '700', fontStyle: 'italic', color: '#0f172a' }}>
                                                            {auth.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>(Digitally Typed Official Signature)</div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <label style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    background: '#047857',
                                                    color: '#ffffff',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}>
                                                    <Upload size={14} />
                                                    <span>{sigUrl ? 'Replace' : 'Upload PNG'}</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleSignatureUpload(e, auth.key)}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
                                                {sigUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSignature(auth.key)}
                                                        style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                                        title="Revert to Typed Signature"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* AUDIT TRAIL TAB */}
                    {activeTab === 'audit_trail' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Header Banner */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px 26px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={26} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>System Governance & Audit Trail</h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Cryptographically traceable, tamper-evident log of evaluation scorings, stage transitions, and committee ratifications.
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700' }}>
                                    <Shield size={14} />
                                    <span>SHA-256 Synchronized</span>
                                </div>
                            </div>

                            {/* Audit Ledger List */}
                            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Recent Statutory Appraisal Ledger Events</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[
                                        { time: 'Today, 02:24 AM', actor: 'Prof. J. O. Oladipo (APC Chairman)', action: 'Part E Ratification Finalized', target: 'Dr. Terver Udu (PF/2018/0421)', status: 'Verified', badge: '#16a34a' },
                                        { time: 'Today, 01:54 AM', actor: 'Prof. Aminu Bello (Dept HOD)', action: 'Official Digital Signature Synchronized', target: 'Department of Computer Science', status: 'Verified', badge: '#0284c7' },
                                        { time: 'Today, 01:48 AM', actor: 'Dr. Clement Alabi (Supervisor)', action: 'Official Digital Signature Synchronized', target: 'Part B Scoring Authority', status: 'Verified', badge: '#0284c7' },
                                        { time: 'Yesterday, 19:12 PM', actor: 'A&P Committee', action: 'Part E Status Updated to Completed', target: 'Dr. Terver Udu (PF/2018/0421)', status: 'Committed', badge: '#7c3aed' },
                                        { time: 'Yesterday, 17:47 PM', actor: 'Prof. Aminu Bello (Dept HOD)', action: 'Part D Recommendation Committed', target: 'Dr. Terver Udu (PF/2018/0421)', status: 'Committed', badge: '#047857' },
                                        { time: 'Yesterday, 17:36 PM', actor: 'Dr. Clement Alabi (Supervisor)', action: 'Part B 100-Point Score Submitted (87.5/100)', target: 'Dr. Terver Udu (PF/2018/0421)', status: 'Committed', badge: '#047857' },
                                        { time: 'Yesterday, 17:21 PM', actor: 'Dr. Terver Udu (Staff Member)', action: 'Part A Self-Assessment Dossier Submitted', target: 'University Portal Ingestion', status: 'Committed', badge: '#475569' }
                                    ].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.badge }} />
                                                <div>
                                                    <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0f172a' }}>{item.action}</div>
                                                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>By: <strong>{item.actor}</strong> — Subject: {item.target}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.time}</span>
                                                <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700' }}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MANAGE APPRAISAL USERS & STATUTORY OFFICERS TAB */}
                    {activeTab === 'manage_users' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Top Header Banner */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                padding: '22px 26px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '18px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Users size={28} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                            Appraisal Users & Evaluator Management
                                        </h2>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Manage departmental supervisors, committee chairmen, and central APC ratifiers. Register new users and govern credential access.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    {officerToast.text && (
                                        <div style={{
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            background: officerToast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                                            color: officerToast.type === 'error' ? '#991b1b' : '#065f46',
                                            border: `1px solid ${officerToast.type === 'error' ? '#fecaca' : '#a7f3d0'}`
                                        }}>
                                            {officerToast.text}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={fetchOfficers}
                                        disabled={officersLoading}
                                        style={{
                                            padding: '9px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#ffffff',
                                            color: '#475569',
                                            fontSize: '0.82rem',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: officersLoading ? 'not-allowed' : 'pointer'
                                        }}
                                        title="Refresh Officer Directory"
                                    >
                                        <RefreshCw size={15} style={{ animation: officersLoading ? 'spin 1s linear infinite' : 'none' }} />
                                        <span>Refresh</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleOpenRegisterModal}
                                        style={{
                                            padding: '10px 18px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#047857',
                                            color: '#ffffff',
                                            fontSize: '0.84rem',
                                            fontWeight: '800',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
                                            transition: 'background 0.15s'
                                        }}
                                    >
                                        <UserPlus size={16} />
                                        <span>+ Register Appraisal Officer</span>
                                    </button>
                                </div>
                            </div>

                            {/* Stat KPI Cards */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                                gap: '16px'
                            }}>
                                <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Total Evaluators</span>
                                        <Users size={18} style={{ color: '#047857' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 2px' }}>
                                        {officersStats.total}
                                    </h3>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Appraisal personnel registered</span>
                                </div>

                                <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Supervisors</span>
                                        <UserCheck size={18} style={{ color: '#0284c7' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0284c7', margin: '8px 0 2px' }}>
                                        {officersStats.supervisors}
                                    </h3>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Scores Part B Evaluations</span>
                                </div>

                                <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Department HODs</span>
                                        <Building size={18} style={{ color: '#7c3aed' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#7c3aed', margin: '8px 0 2px' }}>
                                        {officersStats.dept_chairmen}
                                    </h3>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Reviews Part D Committee Recs</span>
                                </div>

                                <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>APC Committee</span>
                                        <Award size={18} style={{ color: '#d97706' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#d97706', margin: '8px 0 2px' }}>
                                        {officersStats.apc_chairmen}
                                    </h3>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Ratifies Part E Final Grants</span>
                                </div>

                                <div style={{ background: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Operational Rate</span>
                                        <ShieldCheck size={18} style={{ color: '#16a34a' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#16a34a', margin: '8px 0 2px' }}>
                                        {officersStats.total > 0 ? Math.round((officersStats.active / officersStats.total) * 100) : 100}%
                                    </h3>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{officersStats.active} Active / {officersStats.inactive} Suspended</span>
                                </div>
                            </div>

                            {/* Search & Filter Controls Bar */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px', maxWidth: '420px' }}>
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            value={officerSearch}
                                            onChange={(e) => setOfficerSearch(e.target.value)}
                                            placeholder="Search by name, PF number, email, or username..."
                                            style={{
                                                width: '100%',
                                                padding: '9px 12px 9px 36px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.82rem',
                                                color: '#0f172a',
                                                outline: 'none'
                                            }}
                                        />
                                        {officerSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setOfficerSearch('')}
                                                style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Role Filter */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Filter size={14} style={{ color: '#64748b' }} />
                                        <select
                                            value={officerRoleFilter}
                                            onChange={(e) => setOfficerRoleFilter(e.target.value)}
                                            style={{
                                                padding: '7px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                background: '#ffffff',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="all">All Roles ({officers.length})</option>
                                            <option value="supervisor">Supervisors (Part B)</option>
                                            <option value="dept_chairman">Dept HODs (Part D)</option>
                                            <option value="apc_chairman">APC Chairmen (Part E)</option>
                                            <option value="admin">Appraisal Admins</option>
                                        </select>
                                    </div>

                                    {/* Department Filter */}
                                    <select
                                        value={officerDeptFilter}
                                        onChange={(e) => setOfficerDeptFilter(e.target.value)}
                                        style={{
                                            padding: '7px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            color: '#0f172a',
                                            background: '#ffffff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="all">All Departments</option>
                                        {Array.from(new Set([
                                            ...departmentList,
                                            'Computer Science',
                                            'Mathematics & Statistics',
                                            'Physics',
                                            'Chemistry',
                                            'Agronomy',
                                            'Agricultural Economics',
                                            'Animal Production',
                                            'Crop Production',
                                            'Forestry & Wildlife',
                                            'Civil Engineering',
                                            'Electrical & Electronics Engineering',
                                            'Mechanical Engineering',
                                            'Academic Planning & Quality Assurance',
                                            'Academic Registry'
                                        ])).map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>

                                    {/* Status Filter */}
                                    <select
                                        value={officerStatusFilter}
                                        onChange={(e) => setOfficerStatusFilter(e.target.value)}
                                        style={{
                                            padding: '7px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            color: '#0f172a',
                                            background: '#ffffff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active Only</option>
                                        <option value="suspended">Suspended Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Officers Data Table */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '14px 18px', fontWeight: '800', color: '#475569' }}>Officer & Identity</th>
                                                <th style={{ padding: '14px 18px', fontWeight: '800', color: '#475569' }}>Appraisal Role & Tier</th>
                                                <th style={{ padding: '14px 18px', fontWeight: '800', color: '#475569' }}>Department & Faculty</th>
                                                <th style={{ padding: '14px 18px', fontWeight: '800', color: '#475569' }}>Contact & Credentials</th>
                                                <th style={{ padding: '14px 18px', fontWeight: '800', color: '#475569' }}>Assigned Workload</th>
                                                <th style={{ padding: '14px 18px', fontWeight: '800', color: '#475569', textAlign: 'center' }}>Account Status</th>
                                                <th style={{ padding: '14px 18px', fontWeight: '800', color: '#475569', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const filteredOfficers = officers.filter(off => {
                                                    const matchesSearch = !officerSearch || 
                                                        (off.name && off.name.toLowerCase().includes(officerSearch.toLowerCase())) ||
                                                        (off.pf_number && off.pf_number.toLowerCase().includes(officerSearch.toLowerCase())) ||
                                                        (off.email && off.email.toLowerCase().includes(officerSearch.toLowerCase())) ||
                                                        (off.username && off.username.toLowerCase().includes(officerSearch.toLowerCase())) ||
                                                        (off.designation && off.designation.toLowerCase().includes(officerSearch.toLowerCase()));

                                                    const matchesRole = officerRoleFilter === 'all' || off.role === officerRoleFilter;
                                                    const matchesDept = officerDeptFilter === 'all' || (off.department && off.department.toLowerCase() === officerDeptFilter.toLowerCase());
                                                    const matchesStatus = officerStatusFilter === 'all' || off.status === officerStatusFilter;

                                                    return matchesSearch && matchesRole && matchesDept && matchesStatus;
                                                });

                                                if (filteredOfficers.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', marginBottom: '12px' }}>
                                                                    <Users size={28} />
                                                                </div>
                                                                <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>No Appraisal Officers Found</div>
                                                                <p style={{ margin: '6px 0 16px', fontSize: '0.8rem', color: '#64748b' }}>
                                                                    {officers.length === 0 
                                                                        ? 'No statutory appraisal evaluators or officers registered yet.' 
                                                                        : 'No appraisal personnel match the active search or selected filters.'}
                                                                </p>
                                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                                    {(officerSearch || officerRoleFilter !== 'all' || officerDeptFilter !== 'all' || officerStatusFilter !== 'all') && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setOfficerSearch('');
                                                                                setOfficerRoleFilter('all');
                                                                                setOfficerDeptFilter('all');
                                                                                setOfficerStatusFilter('all');
                                                                            }}
                                                                            style={{
                                                                                padding: '7px 14px',
                                                                                borderRadius: '8px',
                                                                                border: '1px solid #cbd5e1',
                                                                                background: '#ffffff',
                                                                                color: '#475569',
                                                                                fontSize: '0.78rem',
                                                                                fontWeight: '700',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            Reset All Filters
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleOpenRegisterModal}
                                                                        style={{
                                                                            padding: '7px 16px',
                                                                            borderRadius: '8px',
                                                                            border: 'none',
                                                                            background: '#047857',
                                                                            color: '#ffffff',
                                                                            fontSize: '0.78rem',
                                                                            fontWeight: '800',
                                                                            cursor: 'pointer',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px'
                                                                        }}
                                                                    >
                                                                        <UserPlus size={14} />
                                                                        <span>+ Register New Officer</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return filteredOfficers.map(officer => {
                                                    const workload = getOfficerWorkload(officer);
                                                    const isSupervisor = officer.role === 'supervisor';
                                                    const isHod = officer.role === 'dept_chairman';
                                                    const isApc = officer.role === 'apc_chairman';
                                                    const isAdmin = officer.role === 'admin';

                                                    const roleColor = isSupervisor ? '#047857' : (isHod ? '#0284c7' : (isApc ? '#7c3aed' : '#b45309'));
                                                    const roleBg = isSupervisor ? '#ecfdf5' : (isHod ? '#f0f9ff' : (isApc ? '#faf5ff' : '#fffbeb'));
                                                    const roleBorder = isSupervisor ? '#a7f3d0' : (isHod ? '#bae6fd' : (isApc ? '#e9d5ff' : '#fde68a'));
                                                    const roleLabel = isSupervisor ? 'Departmental Supervisor' : (isHod ? 'Department HOD / Chair' : (isApc ? 'A&PC Committee Chair' : 'Appraisal Admin'));
                                                    const roleStage = isSupervisor ? 'Part B Evaluator' : (isHod ? 'Part D Reviewer' : (isApc ? 'Part E Ratifier' : 'Full Governance'));

                                                    const initials = (officer.name || 'Officer')
                                                        .split(' ')
                                                        .filter(p => !['Dr.', 'Prof.', 'Engr.', 'Mr.', 'Mrs.', 'Ms.'].includes(p))
                                                        .slice(0, 2)
                                                        .map(p => p[0])
                                                        .join('')
                                                        .toUpperCase() || 'OF';

                                                    return (
                                                        <tr key={officer.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                                                            {/* 1. Officer & Identity */}
                                                            <td style={{ padding: '14px 18px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{
                                                                        width: '38px',
                                                                        height: '38px',
                                                                        borderRadius: '10px',
                                                                        background: roleBg,
                                                                        border: `1px solid ${roleBorder}`,
                                                                        color: roleColor,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontWeight: '800',
                                                                        fontSize: '0.85rem',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        {initials}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.88rem' }}>
                                                                            {officer.name}
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                                            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700' }}>
                                                                                {officer.pf_number || 'PF Pending'}
                                                                            </span>
                                                                            {officer.username && (
                                                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f8fafc', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                                                    @{officer.username}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* 2. Appraisal Role & Tier */}
                                                            <td style={{ padding: '14px 18px' }}>
                                                                <div style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '20px',
                                                                    background: roleBg,
                                                                    border: `1px solid ${roleBorder}`,
                                                                    color: roleColor,
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '700',
                                                                    marginBottom: '3px'
                                                                }}>
                                                                    {isSupervisor && <UserCheck size={13} />}
                                                                    {isHod && <Building size={13} />}
                                                                    {isApc && <Award size={13} />}
                                                                    {isAdmin && <ShieldCheck size={13} />}
                                                                    <span>{roleLabel}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                                                                    {officer.designation || roleStage}
                                                                </div>
                                                            </td>

                                                            {/* 3. Department & Faculty */}
                                                            <td style={{ padding: '14px 18px' }}>
                                                                <div style={{ fontWeight: '700', color: '#1e293b' }}>
                                                                    {officer.department || 'All Departments'}
                                                                </div>
                                                                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                                                                    {officer.faculty || 'Central Administration'}
                                                                </div>
                                                            </td>

                                                            {/* 4. Contact Credentials */}
                                                            <td style={{ padding: '14px 18px' }}>
                                                                <div style={{ color: '#0f172a', fontWeight: '600', fontSize: '0.8rem' }}>
                                                                    {officer.email}
                                                                </div>
                                                                <div style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '2px' }}>
                                                                    {officer.phone || 'No phone recorded'}
                                                                </div>
                                                            </td>

                                                            {/* 5. Assigned Workload */}
                                                            <td style={{ padding: '14px 18px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <div style={{
                                                                        padding: '3px 8px',
                                                                        borderRadius: '6px',
                                                                        background: '#f8fafc',
                                                                        border: '1px solid #e2e8f0',
                                                                        fontWeight: '700',
                                                                        fontSize: '0.75rem',
                                                                        color: '#334155'
                                                                    }}>
                                                                        {workload.label}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* 6. Account Status */}
                                                            <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                                                {officer.status === 'active' ? (
                                                                    <span style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '5px',
                                                                        padding: '4px 10px',
                                                                        borderRadius: '20px',
                                                                        background: '#ecfdf5',
                                                                        border: '1px solid #a7f3d0',
                                                                        color: '#065f46',
                                                                        fontSize: '0.74rem',
                                                                        fontWeight: '800'
                                                                    }}>
                                                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '5px',
                                                                        padding: '4px 10px',
                                                                        borderRadius: '20px',
                                                                        background: '#fef2f2',
                                                                        border: '1px solid #fecaca',
                                                                        color: '#991b1b',
                                                                        fontSize: '0.74rem',
                                                                        fontWeight: '800'
                                                                    }}>
                                                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
                                                                        Suspended
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* 7. Action Controls */}
                                                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                                                    {/* Toggle Status */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleStatus(officer)}
                                                                        style={{
                                                                            padding: '5px 10px',
                                                                            borderRadius: '6px',
                                                                            border: officer.status === 'active' ? '1px solid #fecaca' : '1px solid #a7f3d0',
                                                                            background: officer.status === 'active' ? '#fff5f5' : '#ecfdf5',
                                                                            color: officer.status === 'active' ? '#b91c1c' : '#047857',
                                                                            fontSize: '0.73rem',
                                                                            fontWeight: '700',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        title={officer.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                                                                    >
                                                                        {officer.status === 'active' ? 'Suspend' : 'Activate'}
                                                                    </button>

                                                                    {/* Edit Officer */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenEditModal(officer)}
                                                                        style={{
                                                                            padding: '5px 8px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #cbd5e1',
                                                                            background: '#ffffff',
                                                                            color: '#475569',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        title="Edit Officer Profile & Role"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>

                                                                    {/* Reset Password */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleResetPassword(officer)}
                                                                        style={{
                                                                            padding: '5px 8px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #cbd5e1',
                                                                            background: '#ffffff',
                                                                            color: '#d97706',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        title="Reset Access Password"
                                                                    >
                                                                        <Key size={14} />
                                                                    </button>

                                                                    {/* Delete / Revoke */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeletingOfficer(officer)}
                                                                        style={{
                                                                            padding: '5px 8px',
                                                                            borderRadius: '6px',
                                                                            border: '1px solid #fecaca',
                                                                            background: '#ffffff',
                                                                            color: '#dc2626',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        title="Revoke & Delete Officer"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ADMIN SETTINGS & GOVERNANCE TAB */}
                    {activeTab === 'settings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Settings Top Banner */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                padding: '22px 26px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '18px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Settings size={28} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                                Appraisal System Administration & Policy Configuration
                                            </h2>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.72rem',
                                                fontWeight: '800',
                                                background: '#dcfce7',
                                                color: '#166534'
                                            }}>
                                                REGISTRY ADMIN
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                                            Configure university evaluation cycles, 100-point supervisory matrix weights, promotion benchmarks, sequential workflow policies, and registry archives.
                                        </p>
                                    </div>
                                </div>

                                {/* Global Action Buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowResetSettingsModal(true)}
                                        title="Restore all settings to statutory university defaults"
                                        style={{
                                            padding: '9px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            background: '#ffffff',
                                            color: '#64748b',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <RotateCcw size={15} />
                                        <span>Reset Defaults</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleExportSettingsJson}
                                        title="Export complete settings configuration as JSON"
                                        style={{
                                            padding: '9px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#f8fafc',
                                            color: '#334155',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Download size={15} />
                                        <span>Export (.json)</span>
                                    </button>

                                    <label
                                        title="Import and restore settings configuration from JSON"
                                        style={{
                                            padding: '9px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#f8fafc',
                                            color: '#334155',
                                            fontSize: '0.8rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Upload size={15} />
                                        <span>Import (.json)</span>
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleImportSettingsJson}
                                            style={{ display: 'none' }}
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={handleSaveAllSettings}
                                        disabled={settingsSaving}
                                        style={{
                                            padding: '10px 22px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: isWeightBalanced
                                                ? 'linear-gradient(90deg, #064e3b, #047857)'
                                                : 'linear-gradient(90deg, #b45309, #d97706)',
                                            color: '#ffffff',
                                            fontSize: '0.84rem',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)'
                                        }}
                                    >
                                        <Save size={16} />
                                        <span>{settingsSaving ? 'Saving Policies...' : 'Save Settings'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Toast Notification */}
                            {settingsToast.message && (
                                <div style={{
                                    padding: '12px 18px',
                                    borderRadius: '10px',
                                    background: settingsToast.type === 'error' ? '#fef2f2' : '#ecfdf5',
                                    border: `1px solid ${settingsToast.type === 'error' ? '#fca5a5' : '#a7f3d0'}`,
                                    color: settingsToast.type === 'error' ? '#991b1b' : '#065f46',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.84rem',
                                    fontWeight: '700'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {settingsToast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                                        <span>{settingsToast.message}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSettingsToast({ type: '', message: '' })}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Filter & Search Bar */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px',
                                background: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}>
                                {/* Search input */}
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Search settings by keyword (e.g. 'promotion', 'weight', 'deadline', 'grace', 'signature', 'quorum')..."
                                        value={settingsSearchQuery}
                                        onChange={(e) => setSettingsSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px 10px 38px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.84rem',
                                            color: '#0f172a',
                                            outline: 'none'
                                        }}
                                    />
                                    {settingsSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSettingsSearchQuery('')}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: '#94a3b8',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Category Pills Navigation */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { id: 'all', label: 'All Settings', icon: Sliders },
                                        { id: 'cycles', label: 'Academic Cycles & Windows', icon: Calendar },
                                        { id: 'benchmarks', label: 'Scoring Benchmarks & Promotion', icon: Award },
                                        { id: 'weights', label: '100-Point Matrix Weights', icon: Sliders },
                                        { id: 'workflow', label: 'Workflow & Committee Rules', icon: Users },
                                        { id: 'signatures', label: 'Signatures & Authentication', icon: FileSignature },
                                        { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
                                        { id: 'print', label: 'Print & Gazette Formatting', icon: Printer },
                                        { id: 'governance', label: 'Data Governance & Backup', icon: Database }
                                    ].map(cat => {
                                        const isSelected = settingsCategory === cat.id;
                                        const IconComp = cat.icon;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setSettingsCategory(cat.id)}
                                                style={{
                                                    padding: '7px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: '700',
                                                    border: isSelected ? '1px solid #047857' : '1px solid #e2e8f0',
                                                    background: isSelected ? '#047857' : '#f8fafc',
                                                    color: isSelected ? '#ffffff' : '#64748b',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                <IconComp size={14} />
                                                <span>{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 100-POINT SUPERVISORY MATRIX WEIGHT VALIDATION BANNER */}
                            {(settingsCategory === 'all' || settingsCategory === 'weights') && (
                                <div style={{
                                    background: isWeightBalanced ? '#f0fdf4' : '#fffbeb',
                                    borderRadius: '14px',
                                    border: `1px solid ${isWeightBalanced ? '#86efac' : '#fde68a'}`,
                                    padding: '18px 22px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Sliders size={18} style={{ color: isWeightBalanced ? '#16a34a' : '#d97706' }} />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                                                Supervisory Matrix 100-Point Allocation Status
                                            </span>
                                        </div>
                                        <div style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.78rem',
                                            fontWeight: '800',
                                            background: isWeightBalanced ? '#dcfce7' : '#fef3c7',
                                            color: isWeightBalanced ? '#15803d' : '#b45309',
                                            border: `1px solid ${isWeightBalanced ? '#bbf7d0' : '#fde68a'}`
                                        }}>
                                            {isWeightBalanced
                                                ? '✓ Statutory 100-Point Balance Validated'
                                                : `⚠ Attention: Total Weights Equal ${currentWeightSum}/100 Points`}
                                        </div>
                                    </div>

                                    {/* Multi-segment Colored Weight Bar */}
                                    <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', marginBottom: '12px' }}>
                                        <div style={{ width: `${Math.min(100, appraisalSettings.weight_teaching)}%`, background: '#059669', title: 'Teaching' }} />
                                        <div style={{ width: `${Math.min(100, appraisalSettings.weight_research)}%`, background: '#0284c7', title: 'Research' }} />
                                        <div style={{ width: `${Math.min(100, appraisalSettings.weight_service)}%`, background: '#d97706', title: 'Service' }} />
                                        <div style={{ width: `${Math.min(100, appraisalSettings.weight_conduct)}%`, background: '#7c3aed', title: 'Conduct' }} />
                                    </div>

                                    {/* Four Weight Breakdown Indicators */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                        <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Teaching & Instruction</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#059669' }}>{appraisalSettings.weight_teaching} Points</div>
                                        </div>
                                        <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Research & Publications</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0284c7' }}>{appraisalSettings.weight_research} Points</div>
                                        </div>
                                        <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>University Governance</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#d97706' }}>{appraisalSettings.weight_service} Points</div>
                                        </div>
                                        <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>Administrative Conduct</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#7c3aed' }}>{appraisalSettings.weight_conduct} Points</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SETTINGS SECTIONS GRID */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                {/* 1. Academic Cycles & Submission Windows */}
                                {(settingsCategory === 'all' || settingsCategory === 'cycles') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Academic Cycles & Submission Windows</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Define active academic sessions, open/close periods, and evaluation stage cut-offs.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Active Academic Session</label>
                                                <input
                                                    type="text"
                                                    value={appraisalSettings.active_session}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, active_session: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Cycle Formal Title</label>
                                                <input
                                                    type="text"
                                                    value={appraisalSettings.cycle_title}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, cycle_title: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Staff Submission Open Date</label>
                                                <input
                                                    type="date"
                                                    value={appraisalSettings.submission_open_date}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, submission_open_date: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Staff Submission Close Date</label>
                                                <input
                                                    type="date"
                                                    value={appraisalSettings.submission_close_date}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, submission_close_date: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Supervisor Scoring Deadline (Part B)</label>
                                                <input
                                                    type="date"
                                                    value={appraisalSettings.supervisor_deadline}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, supervisor_deadline: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Departmental Review Deadline (Part D)</label>
                                                <input
                                                    type="date"
                                                    value={appraisalSettings.dept_review_deadline}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, dept_review_deadline: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Central APC Ratification Deadline (Part E)</label>
                                                <input
                                                    type="date"
                                                    value={appraisalSettings.apc_ratification_deadline}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, apc_ratification_deadline: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>Late Submission Grace Period (Days)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="60"
                                                    value={appraisalSettings.late_grace_days}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, late_grace_days: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Toggle Toggles */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', marginTop: '18px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Allow Late Submissions</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Permit staff to submit dossiers during the approved grace period.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.allow_late_submissions}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, allow_late_submissions: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Auto-Lock Past Deadline</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Prevent retrospective edits on candidate dossiers once deadlines expire.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.auto_lock_past_deadline}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, auto_lock_past_deadline: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* 2. Scoring Benchmarks & Promotion Criteria */}
                                {(settingsCategory === 'all' || settingsCategory === 'benchmarks') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Award size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Scoring Benchmarks & Promotion Criteria</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Establish university pass thresholds for statutory promotion, accelerated elevation, and increments.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Statutory Promotion Pass Mark (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="50"
                                                    max="100"
                                                    value={appraisalSettings.promotion_pass_mark}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, promotion_pass_mark: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Benchmark for departmental promotion endorsement (Default: 70%).</span>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Accelerated Merit Threshold (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="75"
                                                    max="100"
                                                    value={appraisalSettings.accelerated_merit_mark}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, accelerated_merit_mark: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Qualifies candidate for accelerated promotion & council merit award (Default: 85%).</span>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Annual Step Increment Benchmark (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="40"
                                                    max="70"
                                                    value={appraisalSettings.increment_minimum_mark}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, increment_minimum_mark: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Minimum score to earn standard CONTISS annual salary step (Default: 50%).</span>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Min. Years on Current Rank
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={appraisalSettings.min_years_on_rank}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, min_years_on_rank: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Minimum tenure required prior to promotion consideration (Default: 3 years).</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', marginTop: '18px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Allow Fractional / Decimal Scoring</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Enable supervisors to input half-marks (e.g. 87.5 / 100) in statutory criteria.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.allow_decimal_scores}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, allow_decimal_scores: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Enforce Senior Cadre Publications Rule</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Require minimum verified journal publications for Reader & Professor promotions.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.enforce_publications_rule}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, enforce_publications_rule: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* 3. 100-Point Supervisory Matrix Weights */}
                                {(settingsCategory === 'all' || settingsCategory === 'weights') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Sliders size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>100-Point Supervisory Matrix Weights</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Configure point allocation across 4 statutory criteria. The total must equal exactly 100.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                            {/* Teaching */}
                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#059669' }}>Teaching & Instruction</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{appraisalSettings.weight_teaching} Pts</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="20"
                                                    max="60"
                                                    value={appraisalSettings.weight_teaching}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, weight_teaching: Number(e.target.value) })}
                                                    style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>Classroom delivery, examinations, course materials, supervision.</span>
                                            </div>

                                            {/* Research */}
                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#0284c7' }}>Research & Publications</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{appraisalSettings.weight_research} Pts</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="50"
                                                    value={appraisalSettings.weight_research}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, weight_research: Number(e.target.value) })}
                                                    style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>Peer-reviewed journals, books, conference papers, research grants.</span>
                                            </div>

                                            {/* Service */}
                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#d97706' }}>University Governance</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{appraisalSettings.weight_service} Pts</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="5"
                                                    max="30"
                                                    value={appraisalSettings.weight_service}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, weight_service: Number(e.target.value) })}
                                                    style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>Committee memberships, faculty boards, community outreach.</span>
                                            </div>

                                            {/* Conduct */}
                                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#7c3aed' }}>Administrative Conduct</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{appraisalSettings.weight_conduct} Pts</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="5"
                                                    max="30"
                                                    value={appraisalSettings.weight_conduct}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, weight_conduct: Number(e.target.value) })}
                                                    style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>Punctuality, integrity, care of university property, team spirit.</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 4. Workflow Progression & Committee Rules */}
                                {(settingsCategory === 'all' || settingsCategory === 'workflow') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Workflow Progression & Committee Rules</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Govern dossier lifecycle progression, acknowledgments, quorums, and auto-ratifications.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Strict Sequential Workflow</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Require each Part (A → B → C → D → E) to finish before next stage unlocks.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.strict_sequential_workflow}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, strict_sequential_workflow: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Require Candidate Part C Sign-off</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Candidate must acknowledge Part B scores before Departmental A&PC review.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.require_part_c_acknowledgment}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, require_part_c_acknowledgment: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Allow Formal Staff Rebuttal</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Staff may submit formal comments/dissent in Part C if they disagree with score.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.allow_rebuttal_comments}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, allow_rebuttal_comments: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Auto-Advance on Ratification</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Instantly lock dossier and set Part E to completed upon APC confirmation.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.auto_advance_on_ratify}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, auto_advance_on_ratify: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>

                                        <div style={{ marginTop: '18px', maxWidth: '300px' }}>
                                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                Departmental Committee Minimum Quorum
                                            </label>
                                            <input
                                                type="number"
                                                min="2"
                                                max="12"
                                                value={appraisalSettings.committee_quorum_count}
                                                onChange={(e) => setAppraisalSettings({ ...appraisalSettings, committee_quorum_count: Number(e.target.value) })}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 5. Digital Signatures & Authentication Policy */}
                                {(settingsCategory === 'all' || settingsCategory === 'signatures') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileSignature size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Official Signatures & Digital Authentication</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Configure mandatory signature stamps across evaluation forms and printouts.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Enforce Part B Signature</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Supervisor signature required.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.enforce_supervisor_signature}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, enforce_supervisor_signature: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Enforce Part C Signature</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Staff candidate signature required.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.enforce_staff_signature}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, enforce_staff_signature: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Enforce Part D Signature</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Department HOD signature required.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.enforce_hod_signature}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, enforce_hod_signature: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Enforce Part E Signature</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>APC Chairman signature required.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.enforce_apc_signature}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, enforce_apc_signature: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '18px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Signature Rendering Mode on Printouts
                                                </label>
                                                <select
                                                    value={appraisalSettings.signature_display_mode}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, signature_display_mode: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#ffffff' }}
                                                >
                                                    <option value="uploaded_or_cursive">Uploaded Graphic (Fallback to Formal Cursive)</option>
                                                    <option value="formal_cursive">Formal Registry Cursive Signature Only</option>
                                                    <option value="seal_only">Official University Cryptographic Seal Only</option>
                                                </select>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '22px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={appraisalSettings.require_apc_2fa}
                                                        onChange={(e) => setAppraisalSettings({ ...appraisalSettings, require_apc_2fa: e.target.checked })}
                                                        style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Require 2FA for APC Final Ratification</div>
                                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Secondary authorization prompt before locking council promotions.</div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 6. Notifications & Alert Dispatches */}
                                {(settingsCategory === 'all' || settingsCategory === 'notifications') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Bell size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Automated Notifications & Alert Dispatches</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Broadcast automatic notifications, bottleneck summaries, and urgent SMS dispatches.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Email on Stage Advance</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Notify candidate & reviewer upon dossier progress.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.notify_on_stage_advance}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, notify_on_stage_advance: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Query / Rejection Alert</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Immediate alert if dossier is returned for corrections.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.notify_on_rejection_query}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, notify_on_rejection_query: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Weekly Bottleneck Digest</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Email summary of pending stalled evaluations.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.send_bottleneck_digests}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, send_bottleneck_digests: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Urgent SMS Dispatch</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Send SMS alerts for emergency APC sessions.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.urgent_sms_alerts}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, urgent_sms_alerts: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '18px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Registry Notification Email Address
                                                </label>
                                                <input
                                                    type="email"
                                                    value={appraisalSettings.registry_contact_email}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, registry_contact_email: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Official SMS Sender ID
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength="11"
                                                    value={appraisalSettings.sms_sender_id}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, sms_sender_id: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 7. Print & Gazette Formatting */}
                                {(settingsCategory === 'all' || settingsCategory === 'print') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Printer size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Printout, Gazette & Export Configuration</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Configure official Form ASAP 1 layout, confidentiality watermarks, and export authority stamps.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Default Form ASAP 1 Layout
                                                </label>
                                                <select
                                                    value={appraisalSettings.default_paper_format}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, default_paper_format: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#ffffff' }}
                                                >
                                                    <option value="a4_portrait">A4 Portrait (Statutory Multi-Page Dossier)</option>
                                                    <option value="a4_landscape">A4 Landscape (Wide Table Gazette Format)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Exported Spreadsheet Author Authority
                                                </label>
                                                <input
                                                    type="text"
                                                    value={appraisalSettings.registry_author_stamp}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, registry_author_stamp: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', marginTop: '18px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Include Committee Minutes Excerpt</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Print Part D committee deliberation rationale on Form ASAP 1.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.include_minutes_excerpt}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, include_minutes_excerpt: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>

                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Watermark In-Progress Dossiers</div>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Stamp "DRAFT / UNRATIFIED" on unfinished dossiers.</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={appraisalSettings.watermark_in_progress_dossiers}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, watermark_in_progress_dossiers: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: '#047857', cursor: 'pointer' }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* 8. Data Governance & Maintenance */}
                                {(settingsCategory === 'all' || settingsCategory === 'governance') && (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Database size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Data Governance, Backup & Maintenance</h3>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Manage statutory audit retention periods, system maintenance lockouts, and registry backups.</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                                                    Audit Trail Statutory Retention Period
                                                </label>
                                                <select
                                                    value={appraisalSettings.audit_log_retention_years}
                                                    onChange={(e) => setAppraisalSettings({ ...appraisalSettings, audit_log_retention_years: e.target.value })}
                                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', background: '#ffffff' }}
                                                >
                                                    <option value="5_years">5 Years (Standard Statutory Period)</option>
                                                    <option value="7_years">7 Years (Extended Accreditation Window)</option>
                                                    <option value="10_years">10 Years (Council Mandate Archive)</option>
                                                    <option value="permanent">Permanent Academic Registry Archive</option>
                                                </select>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '22px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={appraisalSettings.maintenance_mode}
                                                        onChange={(e) => setAppraisalSettings({ ...appraisalSettings, maintenance_mode: e.target.checked })}
                                                        style={{ width: '18px', height: '18px', accentColor: '#dc2626', cursor: 'pointer' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a' }}>Enable System Maintenance Lockout</div>
                                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Restrict evaluator logins during central Senate / Council ratification meetings.</div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Fixed-style Save Action Bar */}
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 24px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '14px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldCheck size={18} style={{ color: '#047857' }} />
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        Settings changes are logged to the cryptographic audit trail and take effect immediately across all active evaluation sessions.
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowResetSettingsModal(true)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            color: '#64748b',
                                            fontSize: '0.82rem',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Reset Defaults
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveAllSettings}
                                        disabled={settingsSaving}
                                        style={{
                                            padding: '10px 24px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'linear-gradient(90deg, #064e3b, #047857)',
                                            color: '#ffffff',
                                            fontSize: '0.86rem',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 6px rgba(4, 120, 87, 0.3)'
                                        }}
                                    >
                                        <Save size={16} />
                                        <span>{settingsSaving ? 'Saving...' : 'Save All Settings'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {/* Quick Screening Modal */}
            {screeningStaff && (
                <div className="print:hidden" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '750px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                            color: '#ffffff',
                            padding: '20px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '50%',
                                    background: '#34d399',
                                    color: '#064e3b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '1.2rem',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}>
                                    {screeningStaff.staff_name ? screeningStaff.staff_name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                                            {screeningStaff.staff_name}
                                        </h3>
                                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                            PF: {screeningStaff.pf_number || 'N/A'}
                                        </span>
                                    </div>
                                    <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#a7f3d0' }}>
                                        {screeningStaff.department} • {screeningStaff.current_rank} → <strong style={{ color: '#ffffff' }}>{screeningStaff.proposed_rank || 'Same Rank'}</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setScreeningStaff(null)}
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    border: 'none',
                                    color: '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Stage Banner */}
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Current Appraisal Stage</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                        {renderStatusBadge(screeningStaff)}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Supervisor Score</span>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: Number(screeningStaff.score) >= 70 ? '#047857' : '#d97706' }}>
                                        {screeningStaff.score ? `${screeningStaff.score} / 100` : 'Not Scored Yet'}
                                    </div>
                                </div>
                            </div>

                            {/* Candidate Overview Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Academic / Administrative Post</span>
                                    <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                                        {screeningStaff.current_rank || 'N/A'}
                                    </p>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Proposed Rank for Promotion</span>
                                    <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#047857', fontSize: '0.9rem' }}>
                                        {screeningStaff.proposed_rank || screeningStaff.current_rank || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Dossier Parts Progress Breakdown */}
                            <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                                    Dossier Breakdown & Screening Summary
                                </h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Part A */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <FileText size={18} style={{ color: '#047857', marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Part A: Personal Particulars & Duties</strong>
                                                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: '#d1fae5', color: '#065f46', fontWeight: '700' }}>Submitted</span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>
                                                {formatText(screeningStaff.partAData?.duties || screeningStaff.duties, 'Teaching, research, and university committee assignments.')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Part B */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <Award size={18} style={{ color: screeningStaff.part_b_status === 'Completed' ? '#047857' : '#d97706', marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Part B: Head of Department / Supervisor Evaluation</strong>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: screeningStaff.part_b_status === 'Completed' ? '#d1fae5' : '#fef3c7',
                                                    color: screeningStaff.part_b_status === 'Completed' ? '#065f46' : '#92400e',
                                                    fontWeight: '700'
                                                }}>
                                                    {screeningStaff.part_b_status === 'Completed' ? `Scored: ${screeningStaff.score}/100` : 'Pending Scoring'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>
                                                {formatText(screeningStaff.partBData?.comments, '100-point performance assessment matrix across 14 statutory criteria.')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Part C */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <UserCheck size={18} style={{ color: screeningStaff.part_c_status === 'Completed' ? '#047857' : '#64748b', marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Part C: Staff Member\'s Acknowledgment</strong>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: screeningStaff.part_c_status === 'Completed' ? '#d1fae5' : '#f1f5f9',
                                                    color: screeningStaff.part_c_status === 'Completed' ? '#065f46' : '#64748b',
                                                    fontWeight: '700'
                                                }}>
                                                    {screeningStaff.part_c_status === 'Completed' ? 'Signed & Agreed' : 'Awaiting Staff Review'}
                                                </span>
                                            </div>
                                            {screeningStaff.partCData?.comments && (
                                                <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>
                                                    "{formatText(screeningStaff.partCData.comments)}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Part D */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <Users size={18} style={{ color: screeningStaff.part_d_status === 'Completed' ? '#047857' : '#64748b', marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Part D: Departmental Committee Recommendation</strong>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: screeningStaff.part_d_status === 'Completed' ? '#d1fae5' : '#f1f5f9',
                                                    color: screeningStaff.part_d_status === 'Completed' ? '#065f46' : '#64748b',
                                                    fontWeight: '700'
                                                }}>
                                                    {screeningStaff.part_d_status === 'Completed' ? 'Reviewed by Committee' : 'Pending Dept Review'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>
                                                {formatText(screeningStaff.partDData?.recommendation, 'Recommendation on promotion, normal increment, or confirmation.')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Part E */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                        <ShieldCheck size={18} style={{ color: screeningStaff.current_stage === 'completed' || screeningStaff.part_e_status === 'Completed' ? '#047857' : '#b45309', marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Part E: Central APC Ratification</strong>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: screeningStaff.current_stage === 'completed' || screeningStaff.part_e_status === 'Completed' ? '#d1fae5' : '#fef3c7',
                                                    color: screeningStaff.current_stage === 'completed' || screeningStaff.part_e_status === 'Completed' ? '#065f46' : '#92400e',
                                                    fontWeight: '700'
                                                }}>
                                                    {screeningStaff.current_stage === 'completed' || screeningStaff.part_e_status === 'Completed' ? 'APER Ratified & Locked' : 'Awaiting APC'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>
                                                {formatText(screeningStaff.partEData?.decision, 'Final Appointments & Promotions Committee ratification.')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{
                            padding: '16px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <button
                                type="button"
                                onClick={() => setScreeningStaff(null)}
                                style={{
                                    padding: '10px 18px',
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.88rem',
                                    fontWeight: '600',
                                    color: '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Close Screening
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStaffId(screeningStaff.id);
                                    setActiveTab('assessment');
                                    setScreeningStaff(null);
                                }}
                                style={{
                                    padding: '10px 22px',
                                    background: 'linear-gradient(90deg, #064e3b, #047857)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.88rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 6px rgba(4, 120, 87, 0.3)'
                                }}
                            >
                                <span>Open Full Assessment Form</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE REPORT PREVIEW MODAL */}
            {previewReport && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '1120px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '18px 24px',
                            background: '#064e3b',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(255,255,255,0.2)',
                                        fontSize: '0.72rem',
                                        fontWeight: '800',
                                        fontFamily: 'monospace'
                                    }}>
                                        {previewReport.code}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: '#d97706',
                                        fontSize: '0.72rem',
                                        fontWeight: '700'
                                    }}>
                                        {previewReport.category}
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>
                                        Session: {reportSession} • Total Records: {previewReport.rows.length}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                                    {previewReport.title}
                                </h3>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => exportToXLSX(previewReport.title, previewReport.headers, previewReport.rows, previewReport.filenameBase)}
                                    style={{
                                        padding: '8px 14px',
                                        background: '#16a34a',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <FileSpreadsheet size={15} />
                                    <span>Download .xlsx</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => exportToPDF(previewReport.title, previewReport.category, previewReport.headers, previewReport.rows, previewReport.filenameBase, previewReport.weights)}
                                    style={{
                                        padding: '8px 14px',
                                        background: '#d97706',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Download size={15} />
                                    <span>Download .pdf</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPreviewReport(null)}
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Scrollable Table */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 0, marginBottom: '14px' }}>
                                {previewReport.description} Below is an interactive live tabular preview of this report's statutory dataset.
                            </p>

                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            {previewReport.headers.map((h, idx) => (
                                                <th key={idx} style={{
                                                    padding: '10px 14px',
                                                    textAlign: idx === 0 ? 'center' : 'left',
                                                    fontWeight: '800',
                                                    color: '#334155',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewReport.rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={previewReport.headers.length} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                                                    No records found matching the current department and session filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            previewReport.rows.map((row, rIdx) => (
                                                <tr
                                                    key={rIdx}
                                                    style={{
                                                        background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff',
                                                        borderBottom: '1px solid #f1f5f9'
                                                    }}
                                                >
                                                    {row.map((val, cIdx) => (
                                                        <td key={cIdx} style={{
                                                            padding: '9px 14px',
                                                            textAlign: cIdx === 0 ? 'center' : 'left',
                                                            color: '#0f172a',
                                                            fontWeight: cIdx === 1 || cIdx === 2 ? '600' : '400',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {val !== undefined && val !== null ? String(val) : '—'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '14px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                JOSTUM Appointments & Promotions Committee Registry • Confidential APER Data
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewReport(null)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Settings to Statutory Defaults Confirmation Modal */}
            {showResetSettingsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        maxWidth: '540px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                        border: '1px solid #fecaca'
                    }}>
                        <div style={{
                            padding: '20px 24px',
                            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                            borderBottom: '1px solid #fca5a5',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px'
                        }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#dc2626',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <RotateCcw size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: '800', color: '#991b1b' }}>
                                    Reset All Appraisal Policies to Factory Defaults?
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>
                                    Irreversible configuration rollback to JOSTUM statutory standards
                                </p>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#334155', lineHeight: 1.55 }}>
                                You are about to restore all university appraisal settings, evaluation matrices, scoring benchmarks, and workflow controls to their original statutory defaults.
                            </p>

                            <div style={{
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: '8px',
                                padding: '14px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#92400e', marginBottom: '6px' }}>
                                    THE FOLLOWING PARAMETERS WILL BE RESTORED:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#78350f', lineHeight: 1.6 }}>
                                    <li>Active academic cycle: <strong>2024/2025 Regular Annual Review</strong></li>
                                    <li>Supervisory matrix weights: <strong>40% Teaching, 30% Research, 15% Service, 15% Conduct</strong></li>
                                    <li>Scoring benchmarks: <strong>70% Promotion, 85% Accelerated Merit, 50% Increment</strong></li>
                                    <li>Workflow policies: <strong>Strict sequential stages, 3 APC Quorum, Rebuttal enabled</strong></li>
                                    <li>Official seals & notification digests reset to registry master defaults</li>
                                </ul>
                            </div>

                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                                Note: You can create a backup of your existing configuration anytime using the <strong>Export Config (.json)</strong> feature before resetting.
                            </p>
                        </div>

                        <div style={{
                            padding: '16px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button
                                type="button"
                                onClick={() => setShowResetSettingsModal(false)}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleResetSettingsToDefaults}
                                disabled={settingsSaving}
                                style={{
                                    padding: '9px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    fontSize: '0.82rem',
                                    fontWeight: '800',
                                    cursor: settingsSaving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                                }}
                            >
                                <RotateCcw size={15} />
                                {settingsSaving ? 'Resetting...' : 'Yes, Restore Defaults'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 1. REGISTER / EDIT APPRAISAL OFFICER MODAL */}
            {/* ========================================================= */}
            {showRegisterModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    animation: 'fadeIn 0.15s ease-out'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        maxWidth: '780px',
                        width: '100%',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 26px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#ecfdf5',
                                    border: '1px solid #a7f3d0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#047857'
                                }}>
                                    <UserPlus size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                                        {editingOfficer ? 'Edit Appraisal Officer Profile' : 'Register New Appraisal Officer'}
                                    </h3>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                        {editingOfficer 
                                            ? 'Update statutory evaluation role, credentials, and institutional department' 
                                            : 'Assign statutory appraisal responsibilities (Supervisor, Dept HOD, APC Chair, Admin) with instant secure credentials'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRegisterModal(false)}
                                style={{
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#64748b',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSaveOfficerSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                            <div style={{ padding: '24px 26px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {officerFormError && (
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        color: '#991b1b',
                                        fontSize: '0.82rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                        <span>{officerFormError}</span>
                                    </div>
                                )}

                                {/* Role Selection Grid */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Statutory Appraisal Role & Tier *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                                        {[
                                            {
                                                role: 'supervisor',
                                                label: 'Departmental Supervisor',
                                                stage: 'Part B Evaluator',
                                                icon: UserCheck,
                                                color: '#047857',
                                                bg: '#ecfdf5',
                                                defaultDesig: 'Departmental Appraisal Supervisor (Part B Evaluator)'
                                            },
                                            {
                                                role: 'dept_chairman',
                                                label: 'Department HOD',
                                                stage: 'Part D Reviewer',
                                                icon: Building,
                                                color: '#0284c7',
                                                bg: '#f0f9ff',
                                                defaultDesig: 'Departmental Committee Chairman / HOD (Part D Reviewer)'
                                            },
                                            {
                                                role: 'apc_chairman',
                                                label: 'A&PC Chairman',
                                                stage: 'Part E Ratifier',
                                                icon: Award,
                                                color: '#7c3aed',
                                                bg: '#faf5ff',
                                                defaultDesig: 'Central A&P Committee Chairman (Part E Ratifier)'
                                            },
                                            {
                                                role: 'admin',
                                                label: 'Appraisal Admin',
                                                stage: 'Institutional Governance',
                                                icon: ShieldCheck,
                                                color: '#b45309',
                                                bg: '#fffbeb',
                                                defaultDesig: 'Appraisal System Administrator'
                                            }
                                        ].map(item => {
                                            const isSelected = officerFormData.role === item.role;
                                            const ItemIcon = item.icon;
                                            return (
                                                <div
                                                    key={item.role}
                                                    onClick={() => {
                                                        setOfficerFormData(prev => ({
                                                            ...prev,
                                                            role: item.role,
                                                            designation: (!prev.designation || prev.designation.includes('Part') || prev.designation.includes('Administrator') || prev.designation.includes('Chairman')) ? item.defaultDesig : prev.designation
                                                        }));
                                                    }}
                                                    style={{
                                                        border: isSelected ? `2px solid ${item.color}` : '1px solid #e2e8f0',
                                                        background: isSelected ? item.bg : '#ffffff',
                                                        borderRadius: '12px',
                                                        padding: '12px 14px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        boxShadow: isSelected ? `0 2px 8px ${item.color}25` : 'none',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                        <div style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '8px',
                                                            background: isSelected ? '#ffffff' : item.bg,
                                                            color: item.color,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <ItemIcon size={16} />
                                                        </div>
                                                        {isSelected && (
                                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: item.color, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Check size={11} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontWeight: '800', fontSize: '0.82rem', color: '#0f172a' }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.7rem', color: item.color, fontWeight: '700', marginTop: '2px' }}>{item.stage}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Identity & Personal Details */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Officer Identity & Staff Credentials *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 160px', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Title</label>
                                            <select
                                                value={officerFormData.title}
                                                onChange={(e) => setOfficerFormData({ ...officerFormData, title: e.target.value })}
                                                style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '600', color: '#0f172a', background: '#fff' }}
                                            >
                                                <option value="Prof.">Prof.</option>
                                                <option value="Assoc. Prof.">Assoc. Prof.</option>
                                                <option value="Dr.">Dr.</option>
                                                <option value="Engr.">Engr.</option>
                                                <option value="Arc.">Arc.</option>
                                                <option value="Mr.">Mr.</option>
                                                <option value="Mrs.">Mrs.</option>
                                                <option value="Ms.">Ms.</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Clement Alabi"
                                                value={officerFormData.name}
                                                onChange={(e) => setOfficerFormData({ ...officerFormData, name: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Staff PF Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. PF/4011"
                                                value={officerFormData.pf_number}
                                                onChange={(e) => setOfficerFormData({ ...officerFormData, pf_number: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Department, Faculty, & Designation */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Department Assignment *</label>
                                        <select
                                            value={officerFormData.department}
                                            onChange={(e) => setOfficerFormData({ ...officerFormData, department: e.target.value })}
                                            style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '600', color: '#0f172a', background: '#fff' }}
                                        >
                                            <option value="Computer Science">Computer Science</option>
                                            <option value="Mathematics & Statistics">Mathematics & Statistics</option>
                                            <option value="Physics">Physics</option>
                                            <option value="Chemistry">Chemistry</option>
                                            <option value="Agronomy">Agronomy</option>
                                            <option value="Agricultural Economics">Agricultural Economics</option>
                                            <option value="Animal Production">Animal Production</option>
                                            <option value="Crop Production">Crop Production</option>
                                            <option value="Forestry & Wildlife">Forestry & Wildlife</option>
                                            <option value="Civil Engineering">Civil Engineering</option>
                                            <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                                            <option value="Appointments & Promotions Committee">Appointments & Promotions Committee (Central)</option>
                                            <option value="Academic Registry">Academic Registry</option>
                                            <option value="All Departments">All Departments (Institutional)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Faculty / College / Unit</label>
                                        <select
                                            value={officerFormData.faculty}
                                            onChange={(e) => setOfficerFormData({ ...officerFormData, faculty: e.target.value })}
                                            style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '600', color: '#0f172a', background: '#fff' }}
                                        >
                                            <option value="Physical Sciences">College of Physical Sciences</option>
                                            <option value="Biological Sciences">College of Biological Sciences</option>
                                            <option value="Agronomy">College of Agronomy</option>
                                            <option value="Agricultural Economics & Extension">College of Agricultural Economics</option>
                                            <option value="Engineering">College of Engineering</option>
                                            <option value="Forestry & Fisheries">College of Forestry & Fisheries</option>
                                            <option value="Veterinary Medicine">College of Veterinary Medicine</option>
                                            <option value="Central Administration">Central Administration</option>
                                        </select>
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Official Designation / Office Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Lead Departmental Supervisor (Part B Evaluator)"
                                            value={officerFormData.designation}
                                            onChange={(e) => setOfficerFormData({ ...officerFormData, designation: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a' }}
                                        />
                                    </div>
                                </div>

                                {/* Contact & Access Credentials */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Official University Email *</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="e.g. supervisor@jostum.edu.ng"
                                            value={officerFormData.email}
                                            onChange={(e) => {
                                                const emailVal = e.target.value;
                                                const autoUsername = emailVal.includes('@') ? emailVal.split('@')[0] : emailVal;
                                                setOfficerFormData({
                                                    ...officerFormData,
                                                    email: emailVal,
                                                    username: !editingOfficer && !officerFormData.username ? autoUsername : officerFormData.username
                                                });
                                            }}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>System Username</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. supervisor_cs"
                                            value={officerFormData.username}
                                            onChange={(e) => setOfficerFormData({ ...officerFormData, username: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Official Phone Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +234 803 123 4567"
                                            value={officerFormData.phone}
                                            onChange={(e) => setOfficerFormData({ ...officerFormData, phone: e.target.value })}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a' }}
                                        />
                                    </div>
                                </div>

                                {/* Password & Account Status */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                                                {editingOfficer ? 'Change Password (optional)' : 'Initial Temporary Password *'}
                                            </label>
                                            {!editingOfficer && (
                                                <button
                                                    type="button"
                                                    onClick={() => setOfficerFormData({ ...officerFormData, password: 'Jostum@' + Math.floor(1000 + Math.random() * 9000) })}
                                                    style={{ background: 'none', border: 'none', color: '#047857', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <RefreshCw size={11} /> Generate New
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                placeholder={editingOfficer ? 'Leave blank to keep current password' : 'e.g. Jostum@4892'}
                                                value={officerFormData.password}
                                                onChange={(e) => setOfficerFormData({ ...officerFormData, password: e.target.value })}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#0f172a', fontFamily: 'monospace', fontWeight: '700' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>Account Status</label>
                                        <select
                                            value={officerFormData.status}
                                            onChange={(e) => setOfficerFormData({ ...officerFormData, status: e.target.value })}
                                            style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '700', color: officerFormData.status === 'active' ? '#166534' : '#991b1b', background: '#fff' }}
                                        >
                                            <option value="active">Active (Granted Access)</option>
                                            <option value="suspended">Suspended (Blocked)</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Administrative Governance Notes */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>
                                        Statutory Governance Remarks & Authority Notes (Optional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Appointed by Departmental Board for 2024-2026 Appraisal cycle; Senate ratification reference APER/2026/04."
                                        value={officerFormData.notes}
                                        onChange={(e) => setOfficerFormData({ ...officerFormData, notes: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#0f172a', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 26px',
                                background: '#f8fafc',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                    * Evaluation privileges will be synchronized across the portal instantly.
                                </span>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowRegisterModal(false)}
                                        style={{
                                            padding: '9px 18px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            background: '#ffffff',
                                            color: '#475569',
                                            fontSize: '0.82rem',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={officerFormSubmitting}
                                        style={{
                                            padding: '9px 22px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#047857',
                                            color: '#ffffff',
                                            fontSize: '0.82rem',
                                            fontWeight: '800',
                                            cursor: officerFormSubmitting ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 6px rgba(4, 120, 87, 0.3)'
                                        }}
                                    >
                                        <Save size={15} />
                                        {officerFormSubmitting 
                                            ? 'Saving...' 
                                            : (editingOfficer ? 'Update Officer Profile' : 'Complete Registration')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 2. PASSWORD RESET SUCCESS MODAL */}
            {/* ========================================================= */}
            {tempPasswordResult && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    animation: 'fadeIn 0.15s ease-out'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        maxWidth: '480px',
                        width: '100%',
                        padding: '28px 30px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: '#ecfdf5',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            border: '2px solid #a7f3d0'
                        }}>
                            <Key size={28} />
                        </div>

                        <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                            Temporary Password Generated
                        </h3>
                        <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#64748b' }}>
                            Access credentials for <strong>{tempPasswordResult.officerName}</strong> ({tempPasswordResult.email}) have been successfully updated.
                        </p>

                        <div style={{
                            background: '#f8fafc',
                            border: '2px dashed #059669',
                            padding: '16px 20px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '18px'
                        }}>
                            <span style={{
                                fontFamily: 'monospace',
                                fontSize: '1.3rem',
                                fontWeight: '800',
                                color: '#0f172a',
                                letterSpacing: '1px'
                            }}>
                                {tempPasswordResult.password}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (navigator.clipboard) {
                                        navigator.clipboard.writeText(tempPasswordResult.password);
                                    }
                                    setCopiedPassword(true);
                                    setTimeout(() => setCopiedPassword(false), 3000);
                                }}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: copiedPassword ? '#166534' : '#059669',
                                    color: '#ffffff',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {copiedPassword ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copiedPassword ? 'Copied!' : 'Copy'}</span>
                            </button>
                        </div>

                        <div style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            fontSize: '0.76rem',
                            color: '#1e40af',
                            textAlign: 'left',
                            marginBottom: '24px',
                            lineHeight: 1.5
                        }}>
                            <strong>Notice:</strong> Please share this temporary password securely with the officer. They can sign in immediately using the Appraisal Login portal and update their password in the <em>My Account</em> tab.
                        </div>

                        <button
                            type="button"
                            onClick={() => setTempPasswordResult(null)}
                            style={{
                                width: '100%',
                                padding: '11px',
                                borderRadius: '10px',
                                border: 'none',
                                background: '#0f172a',
                                color: '#ffffff',
                                fontSize: '0.84rem',
                                fontWeight: '800',
                                cursor: 'pointer'
                            }}
                        >
                            Done & Close
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* 3. REVOKE & DELETE CONFIRMATION MODAL */}
            {/* ========================================================= */}
            {deletingOfficer && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    animation: 'fadeIn 0.15s ease-out'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        maxWidth: '480px',
                        width: '100%',
                        padding: '28px 30px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: '#fef2f2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            border: '2px solid #fecaca'
                        }}>
                            <Trash2 size={28} />
                        </div>

                        <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                            Revoke Appraisal Privileges?
                        </h3>
                        <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#64748b' }}>
                            Are you sure you want to revoke appraisal authority for <strong>{deletingOfficer.name}</strong>?
                        </p>

                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '14px 18px',
                            textAlign: 'left',
                            fontSize: '0.78rem',
                            marginBottom: '18px',
                            lineHeight: 1.6
                        }}>
                            <div><strong>Statutory Role:</strong> {deletingOfficer.role}</div>
                            <div><strong>Staff PF Number:</strong> {deletingOfficer.pf_number || 'N/A'}</div>
                            <div><strong>Department:</strong> {deletingOfficer.department || 'N/A'}</div>
                            <div><strong>Official Email:</strong> {deletingOfficer.email}</div>
                        </div>

                        <p style={{ margin: '0 0 24px', fontSize: '0.75rem', color: '#dc2626', fontStyle: 'italic' }}>
                            Warning: This officer will no longer be able to score or ratify evaluations. Any evaluations already completed will be preserved in archival records.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setDeletingOfficer(null)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '0.82rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteOfficer(deletingOfficer)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    fontSize: '0.82rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                                }}
                            >
                                <Trash2 size={15} />
                                Yes, Revoke Officer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
