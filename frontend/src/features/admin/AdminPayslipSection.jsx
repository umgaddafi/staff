import { useState, useEffect, useMemo } from 'react';
import {
    FileSpreadsheet,
    Users,
    Search,
    Plus,
    Trash2,
    Edit3,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Download,
    RefreshCw,
    X,
    Building2,
    BadgeCheck,
    CreditCard
} from 'lucide-react';
import { AdminModal, AdminPageHeader, Field } from '../../components/common/ui';
import { api } from '../../lib/api';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_INCOMES = [
    { item: 'CONSOLIDATED', amount: '' },
    { item: 'HAZARD ALLOWANCE', amount: '' },
];

const DEFAULT_DEDUCTIONS = [
    { item: 'TAX', amount: '' },
    { item: 'PENSION', amount: '' },
    { item: 'NATIONAL HOUSING FUND', amount: '' },
];

function formatCurrency(amount) {
    const num = Number(String(amount || 0).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return '₦0.00';
    return '₦' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmount(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

export function AdminPayslipSection() {
    const currentYear = new Date().getFullYear();
    const currentMonthName = MONTHS[new Date().getMonth()] || 'August';

    // Top-level tab state: 'directory' (Staff Payslips) or 'upload' (Batch Excel Upload)
    const [activeTab, setActiveTab] = useState('directory');

    // Directory list state
    const [payslips, setPayslips] = useState([]);
    const [totalPayslips, setTotalPayslips] = useState(0);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingPayslips, setLoadingPayslips] = useState(false);
    const [search, setSearch] = useState('');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState(currentYear.toString());

    // Batch Excel upload state
    const [uploadYear, setUploadYear] = useState(currentYear.toString());
    const [uploadMonth, setUploadMonth] = useState(currentMonthName);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [batchFeedback, setBatchFeedback] = useState(null);

    // Modal state for Add/Update Staff Payslip
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [savingPayslip, setSavingPayslip] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    // Form data for staff payslip modal
    const [formData, setFormData] = useState({
        pf_number: '',
        staff_id: null,
        payroll_month: currentMonthName,
        payroll_year: currentYear.toString(),
        particulars: {
            full_name: '',
            department: '',
            designation: '',
            salary_scale: 'CONUASS',
            salary_level: '',
            salary_step: '',
            bank_name: '',
            account_no: '',
            pfa_name: '',
            pfa_pin: '',
            paypoint: 'Electronic Paypoint',
        },
        incomes: DEFAULT_INCOMES,
        deductions: DEFAULT_DEDUCTIONS,
    });

    // Staff lookup state inside modal
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [staffSuggestions, setStaffSuggestions] = useState([]);
    const [searchingStaff, setSearchingStaff] = useState(false);

    const years = [
        (currentYear + 1).toString(),
        currentYear.toString(),
        (currentYear - 1).toString(),
        (currentYear - 2).toString(),
    ];

    // Fetch payslips directory
    const fetchPayslips = async () => {
        try {
            setLoadingPayslips(true);
            const params = new URLSearchParams({
                page: page.toString(),
                per_page: '15',
            });
            if (filterYear !== 'all') params.append('year', filterYear);
            if (filterMonth !== 'all') params.append('month', filterMonth);
            if (search.trim()) params.append('search', search.trim());

            const res = await api(`/api/payroll/admin/payslips?${params.toString()}`);
            if (res.status === 'success') {
                setPayslips(res.payslips || []);
                setTotalPayslips(res.total || 0);
                setLastPage(res.last_page || 1);
            }
        } catch (err) {
            console.error('Error fetching payslips:', err);
        } finally {
            setLoadingPayslips(false);
        }
    };

    // Fetch batches
    const fetchBatches = async () => {
        try {
            setLoadingBatches(true);
            const data = await api('/api/payroll/batches');
            if (data.status === 'success') {
                setBatches(data.batches || []);
            }
        } catch (err) {
            console.error('Error fetching payroll batches:', err);
        } finally {
            setLoadingBatches(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'directory') {
            fetchPayslips();
        } else {
            fetchBatches();
        }
    }, [activeTab, page, filterMonth, filterYear]);

    // Handle search input debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'directory') {
                setPage(1);
                fetchPayslips();
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    // Staff lookup search inside modal
    useEffect(() => {
        if (!staffSearchQuery.trim() || staffSearchQuery.length < 2) {
            setStaffSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setSearchingStaff(true);
                const res = await api(`/api/payroll/admin/staff-lookup?query=${encodeURIComponent(staffSearchQuery.trim())}`);
                if (res.status === 'success') {
                    setStaffSuggestions(res.staff || []);
                }
            } catch (err) {
                console.error('Staff lookup error:', err);
            } finally {
                setSearchingStaff(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [staffSearchQuery]);

    // Select staff suggestion
    const handleSelectStaffSuggestion = (staff) => {
        setFormData((prev) => ({
            ...prev,
            pf_number: staff.pf_number,
            staff_id: staff.staff_id,
            particulars: {
                ...prev.particulars,
                full_name: staff.full_name || prev.particulars.full_name,
                department: staff.department || prev.particulars.department,
                designation: staff.designation || prev.particulars.designation,
                salary_level: staff.salary_level || prev.particulars.salary_level,
                salary_step: staff.salary_step || prev.particulars.salary_step,
            },
        }));
        setStaffSuggestions([]);
        setStaffSearchQuery('');
    };

    // Open modal to add new payslip
    const handleOpenAddModal = () => {
        setEditingId(null);
        setModalError('');
        setModalSuccess('');
        setFormData({
            pf_number: '',
            staff_id: null,
            payroll_month: filterMonth !== 'all' ? filterMonth : currentMonthName,
            payroll_year: filterYear !== 'all' ? filterYear : currentYear.toString(),
            particulars: {
                full_name: '',
                department: '',
                designation: '',
                salary_scale: 'CONUASS',
                salary_level: '',
                salary_step: '',
                bank_name: '',
                account_no: '',
                pfa_name: '',
                pfa_pin: '',
                paypoint: 'Electronic Paypoint',
            },
            incomes: [
                { item: 'CONSOLIDATED', amount: '' },
                { item: 'HAZARD ALLOWANCE', amount: '' },
            ],
            deductions: [
                { item: 'TAX', amount: '' },
                { item: 'PENSION', amount: '' },
                { item: 'NATIONAL HOUSING FUND', amount: '' },
            ],
        });
        setModalOpen(true);
    };

    // Open modal to edit existing payslip
    const handleOpenEditModal = async (id) => {
        try {
            setEditingId(id);
            setModalError('');
            setModalSuccess('');
            setModalOpen(true);

            const res = await api(`/api/payroll/admin/payslips/${id}`);
            if (res.status === 'success' && res.payslip) {
                const p = res.payslip;
                setFormData({
                    id: p.id,
                    pf_number: p.pf_number || '',
                    staff_id: p.staff_id || null,
                    payroll_month: p.payroll_month || currentMonthName,
                    payroll_year: (p.payroll_year || currentYear).toString(),
                    particulars: {
                        full_name: p.employee_particulars?.full_name || '',
                        department: p.employee_particulars?.department || '',
                        designation: p.employee_particulars?.designation || '',
                        salary_scale: p.employee_particulars?.salary_scale || 'CONUASS',
                        salary_level: p.employee_particulars?.salary_level || '',
                        salary_step: p.employee_particulars?.salary_step || '',
                        bank_name: p.employee_particulars?.bank_name || '',
                        account_no: p.employee_particulars?.account_no || '',
                        pfa_name: p.employee_particulars?.pfa_name || '',
                        pfa_pin: p.employee_particulars?.pfa_pin || '',
                        paypoint: p.employee_particulars?.paypoint || 'Electronic Paypoint',
                    },
                    incomes: p.incomes?.length ? p.incomes : DEFAULT_INCOMES,
                    deductions: p.deductions?.length ? p.deductions : DEFAULT_DEDUCTIONS,
                });
            }
        } catch (err) {
            console.error('Error fetching payslip detail:', err);
            setModalError(err.message || 'Failed to load payslip details.');
        }
    };

    // Delete single payslip
    const handleDeletePayslip = async (id, pf, period) => {
        if (!window.confirm(`Are you sure you want to delete the payslip for ${pf} (${period})? This cannot be undone.`)) {
            return;
        }

        try {
            const res = await api(`/api/payroll/admin/payslips/${id}`, { method: 'DELETE' });
            if (res.status === 'success') {
                fetchPayslips();
            } else {
                alert(res.message || 'Failed to delete payslip.');
            }
        } catch (err) {
            console.error('Error deleting payslip:', err);
            alert(err.message || 'Error deleting payslip record.');
        }
    };

    // Live calculations for modal
    const computedGross = useMemo(() => {
        return (formData.incomes || []).reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
    }, [formData.incomes]);

    const computedDeductions = useMemo(() => {
        return (formData.deductions || []).reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
    }, [formData.deductions]);

    const computedNet = useMemo(() => {
        return computedGross - computedDeductions;
    }, [computedGross, computedDeductions]);

    // Handle adding/removing income and deduction rows
    const handleAddIncomeRow = () => {
        setFormData((prev) => ({
            ...prev,
            incomes: [...prev.incomes, { item: '', amount: '' }],
        }));
    };

    const handleRemoveIncomeRow = (index) => {
        setFormData((prev) => ({
            ...prev,
            incomes: prev.incomes.filter((_, idx) => idx !== index),
        }));
    };

    const handleIncomeChange = (index, field, value) => {
        setFormData((prev) => {
            const updated = [...prev.incomes];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, incomes: updated };
        });
    };

    const handleAddDeductionRow = () => {
        setFormData((prev) => ({
            ...prev,
            deductions: [...prev.deductions, { item: '', amount: '' }],
        }));
    };

    const handleRemoveDeductionRow = (index) => {
        setFormData((prev) => ({
            ...prev,
            deductions: prev.deductions.filter((_, idx) => idx !== index),
        }));
    };

    const handleDeductionChange = (index, field, value) => {
        setFormData((prev) => {
            const updated = [...prev.deductions];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, deductions: updated };
        });
    };

    // Save payslip modal submission
    const handleSavePayslip = async (e) => {
        e.preventDefault();
        setModalError('');
        setModalSuccess('');

        if (!formData.pf_number.trim()) {
            setModalError('Please specify the staff PF Number.');
            return;
        }

        setSavingPayslip(true);
        try {
            const payload = {
                id: editingId,
                pf_number: formData.pf_number.trim(),
                staff_id: formData.staff_id,
                payroll_month: formData.payroll_month,
                payroll_year: formData.payroll_year,
                employee_particulars: formData.particulars,
                incomes: formData.incomes.filter((i) => i.item.trim() && parseAmount(i.amount) >= 0),
                deductions: formData.deductions.filter((d) => d.item.trim() && parseAmount(d.amount) >= 0),
            };

            const res = await api('/api/payroll/admin/payslips', {
                method: 'POST',
                data: payload,
            });

            if (res.status === 'success') {
                setModalSuccess(res.message);
                setTimeout(() => {
                    setModalOpen(false);
                    fetchPayslips();
                }, 1200);
            } else {
                setModalError(res.message || 'Failed to save payslip.');
            }
        } catch (err) {
            console.error('Save payslip error:', err);
            setModalError(err.message || 'An error occurred while saving the payslip.');
        } finally {
            setSavingPayslip(false);
        }
    };

    // Batch Excel upload handlers
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setBatchFeedback({ type: 'error', message: 'Please select a valid .xlsx payroll spreadsheet before uploading.' });
            return;
        }

        setUploading(true);
        setBatchFeedback(null);

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('payroll_year', uploadYear);
            uploadFormData.append('payroll_month', uploadMonth);

            const data = await api('/api/payroll/upload', {
                method: 'POST',
                formData: uploadFormData,
            });

            if (data.status === 'success') {
                setBatchFeedback({
                    type: 'success',
                    message: data.message,
                    summary: data.summary,
                });
                setFile(null);
                const fileInput = document.getElementById('payroll-file-input');
                if (fileInput) fileInput.value = '';
                await fetchBatches();
            } else {
                setBatchFeedback({
                    type: 'error',
                    message: data.message || 'Failed to upload payroll file. Please verify column formatting.',
                });
            }
        } catch (err) {
            console.error('Payroll upload error:', err);
            setBatchFeedback({
                type: 'error',
                message: err.message || 'A network or server error occurred while processing the payroll file.',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteBatch = async (batchId, period) => {
        if (!window.confirm(`Are you sure you want to delete the payroll batch for ${period}? All associated staff payslips will be permanently removed.`)) {
            return;
        }

        try {
            const data = await api(`/api/payroll/batches/${batchId}`, { method: 'DELETE' });
            if (data.status === 'success') {
                await fetchBatches();
                setBatchFeedback({ type: 'success', message: `Payroll batch for ${period} was successfully deleted.` });
            } else {
                alert(data.message || 'Failed to delete batch.');
            }
        } catch (err) {
            console.error('Error deleting batch:', err);
            alert(err.message || 'Failed to delete payroll batch.');
        }
    };

    const templateDownloadUrl = `${import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '/backend/public')}/api/payroll/template`;

    return (
        <>
            <AdminPageHeader
                title="Staff Payslip & Payroll Management"
                subtitle="Manage, add, and update individual staff payslips or publish bulk monthly payroll runs across the institution"
                meta={
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            type="button"
                            className="admin-button admin-button-primary"
                            onClick={handleOpenAddModal}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Plus size={16} /> Add / Update Staff Payslip
                        </button>
                        <a
                            href={templateDownloadUrl}
                            download="jostum_payslip_upload_template.xlsx"
                            className="admin-button admin-button-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                            <Download size={15} /> .xlsx Template
                        </a>
                    </div>
                }
            />

            {/* Top Navigation Tabs */}
            <div className="admin-settings-tabs-container" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-settings-tablist" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        className={`admin-settings-tab${activeTab === 'directory' ? ' is-active' : ''}`}
                        onClick={() => setActiveTab('directory')}
                        aria-selected={activeTab === 'directory'}
                    >
                        <Users size={16} />
                        <span>Staff Payslips Directory</span>
                        <span className="admin-badge is-neutral" style={{ marginLeft: '6px' }}>
                            {totalPayslips}
                        </span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`admin-settings-tab${activeTab === 'upload' ? ' is-active' : ''}`}
                        onClick={() => setActiveTab('upload')}
                        aria-selected={activeTab === 'upload'}
                    >
                        <FileSpreadsheet size={16} />
                        <span>Bulk Excel Upload & Batches</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: INDIVIDUAL STAFF PAYSLIPS DIRECTORY */}
            {activeTab === 'directory' && (
                <>
                    {/* Filters Toolbar */}
                    <section className="admin-filter-card card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                            <Field label="Search Staff Name / PF Number">
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="input"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="e.g. PF/5797 or Gaddafi..."
                                        style={{ paddingLeft: '2.2rem' }}
                                    />
                                    <Search
                                        size={16}
                                        style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
                                    />
                                </div>
                            </Field>

                            <Field label="Filter Month">
                                <select
                                    className="select"
                                    value={filterMonth}
                                    onChange={(e) => {
                                        setFilterMonth(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="all">All Months</option>
                                    {MONTHS.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Filter Year">
                                <select
                                    className="select"
                                    value={filterYear}
                                    onChange={(e) => {
                                        setFilterYear(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="all">All Years</option>
                                    {years.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </Field>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="admin-button admin-button-secondary"
                                    onClick={() => {
                                        setSearch('');
                                        setFilterMonth('all');
                                        setFilterYear(currentYear.toString());
                                        setPage(1);
                                    }}
                                    style={{ height: '38px', whiteSpace: 'nowrap' }}
                                >
                                    Reset Filters
                                </button>
                                <button
                                    type="button"
                                    className="admin-button admin-button-primary"
                                    onClick={fetchPayslips}
                                    style={{ height: '38px' }}
                                    title="Refresh"
                                >
                                    <RefreshCw size={15} />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Staff Payslips Directory Table */}
                    <section className="admin-panel card">
                        <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Staff Payslips Records</h3>
                                <small style={{ color: 'var(--muted)' }}>
                                    Showing {payslips.length} of {totalPayslips} records {filterMonth !== 'all' ? `for ${filterMonth}` : ''} {filterYear !== 'all' ? filterYear : ''}
                                </small>
                            </div>
                            <button
                                type="button"
                                className="admin-button admin-button-primary"
                                onClick={handleOpenAddModal}
                                style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Plus size={14} /> Add Staff Payslip
                            </button>
                        </div>

                        <div className="admin-table-wrap">
                            {loadingPayslips ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading payslips...</div>
                            ) : payslips.length === 0 ? (
                                <div style={{ padding: '3.5rem', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontWeight: '600', color: '#1e293b', fontSize: '1rem' }}>No staff payslips found for this criteria.</p>
                                    <p style={{ margin: '0.4rem 0 1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                        You can add a new payslip for any staff member or upload a monthly Excel sheet.
                                    </p>
                                    <button
                                        type="button"
                                        className="admin-button admin-button-primary"
                                        onClick={handleOpenAddModal}
                                    >
                                        + Add New Staff Payslip
                                    </button>
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Staff Member</th>
                                            <th>Period</th>
                                            <th>Department & Rank</th>
                                            <th>Gross (₦)</th>
                                            <th>Deductions (₦)</th>
                                            <th>Net Pay (₦)</th>
                                            <th>Last Updated</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payslips.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <div className="admin-cell-stack">
                                                        <strong style={{ color: '#0f172a' }}>{item.staff_name}</strong>
                                                        <span style={{ fontFamily: 'monospace', color: '#475569', fontSize: '0.8rem' }}>
                                                            {item.pf_number}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="admin-badge is-neutral">
                                                        {item.payroll_month} {item.payroll_year}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="admin-cell-stack">
                                                        <span>{item.department || 'N/A'}</span>
                                                        <small style={{ color: 'var(--muted)' }}>{item.designation || 'N/A'}</small>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span>{formatCurrency(item.total_earnings)}</span>
                                                </td>
                                                <td>
                                                    <span style={{ color: '#dc2626' }}>{formatCurrency(item.total_deductions)}</span>
                                                </td>
                                                <td>
                                                    <strong style={{ color: '#047857' }}>
                                                        {formatCurrency(item.net_salary)}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <small style={{ color: 'var(--muted)' }}>
                                                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}
                                                    </small>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                        <button
                                                            type="button"
                                                            className="admin-icon-button is-edit"
                                                            onClick={() => handleOpenEditModal(item.id)}
                                                            title="Edit Payslip Details"
                                                            style={{ padding: '4px 8px' }}
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="admin-icon-button is-danger"
                                                            onClick={() => handleDeletePayslip(item.id, item.pf_number, item.month_year_label)}
                                                            title="Delete Payslip"
                                                            style={{ padding: '4px 8px' }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination footer */}
                        {lastPage > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--line)' }}>
                                <small style={{ color: 'var(--muted)' }}>Page {page} of {lastPage}</small>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        className="admin-button admin-button-secondary"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-button admin-button-secondary"
                                        disabled={page >= lastPage}
                                        onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* TAB 2: BULK EXCEL WORKBOOK UPLOAD */}
            {activeTab === 'upload' && (
                <>
                    {/* Feedback Alert */}
                    {batchFeedback && (
                        <div
                            style={{
                                padding: '1rem 1.25rem',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                                border: batchFeedback.type === 'success' ? '1px solid #6ee7b7' : '1px solid #fca5a5',
                                background: batchFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                color: batchFeedback.type === 'success' ? '#065f46' : '#991b1b',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{batchFeedback.type === 'success' ? '✓ Upload Successful' : '⚠ Upload Notice'}</strong>
                                <button
                                    onClick={() => setBatchFeedback(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
                                >
                                    ✕
                                </button>
                            </div>
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>{batchFeedback.message}</p>
                            {batchFeedback.summary && (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                        gap: '0.75rem',
                                        marginTop: '0.75rem',
                                        paddingTop: '0.75rem',
                                        borderTop: '1px solid #d1fae5',
                                    }}
                                >
                                    <div>
                                        <small style={{ color: '#047857', fontWeight: 'bold' }}>STAFF PROCESSED</small>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{batchFeedback.summary.total_staff}</div>
                                    </div>
                                    <div>
                                        <small style={{ color: '#047857', fontWeight: 'bold' }}>MATCHED IN DB</small>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{batchFeedback.summary.matched_staff}</div>
                                    </div>
                                    <div>
                                        <small style={{ color: '#047857', fontWeight: 'bold' }}>TOTAL GROSS</small>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>₦{batchFeedback.summary.total_earnings}</div>
                                    </div>
                                    <div>
                                        <small style={{ color: '#047857', fontWeight: 'bold' }}>NET PAYROLL</small>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>₦{batchFeedback.summary.total_net_salary}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upload New Payslip Panel */}
                    <section className="admin-panel card" style={{ marginBottom: '2rem' }}>
                        <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Upload Monthly Payroll (.xlsx)</h3>
                                <small style={{ color: 'var(--muted)' }}>Select target payroll period and upload completed university payroll workbook</small>
                            </div>
                            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', color: '#475569', fontWeight: '600' }}>
                                OpenXML (.xlsx) Supported
                            </span>
                        </div>
                        <div className="admin-form-panel" style={{ padding: '1.5rem' }}>
                            <form onSubmit={handleUpload}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label className="label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                            Payroll Year
                                        </label>
                                        <select
                                            className="select"
                                            value={uploadYear}
                                            onChange={(e) => setUploadYear(e.target.value)}
                                        >
                                            {years.map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                            Payroll Month
                                        </label>
                                        <select
                                            className="select"
                                            value={uploadMonth}
                                            onChange={(e) => setUploadMonth(e.target.value)}
                                        >
                                            {MONTHS.map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                            Payroll Workbook File (.xlsx, .xls, .csv)
                                        </label>
                                        <input
                                            id="payroll-file-input"
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={(e) => setFile(e.target.files[0] || null)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px dashed var(--line)', borderRadius: '6px', background: '#fafafa' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>
                                        Tip: Existing payslips for <strong>{uploadMonth}-{uploadYear}</strong> will be updated automatically on re-upload.
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={uploading || !file}
                                        className="admin-button admin-button-primary"
                                        style={{
                                            padding: '0.65rem 1.75rem',
                                            whiteSpace: 'nowrap',
                                            opacity: uploading || !file ? 0.6 : 1,
                                            cursor: uploading || !file ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        {uploading ? 'Processing Payroll...' : `Publish ${uploadMonth} ${uploadYear} Payslips`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>

                    {/* Published Batches Panel */}
                    <section className="admin-panel card">
                        <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Published Payroll Batches</h3>
                                <small style={{ color: 'var(--muted)' }}>Archived university payroll runs available to staff</small>
                            </div>
                            <button
                                onClick={fetchBatches}
                                className="admin-button admin-button-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            >
                                <RefreshCw size={13} style={{ marginRight: '4px' }} /> Refresh
                            </button>
                        </div>
                        <div className="admin-table-wrap">
                            {loadingBatches ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Loading payroll batches...</div>
                            ) : batches.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>No payroll batches uploaded yet.</p>
                                    <small>Use the form above to upload and publish the first monthly staff payslip file.</small>
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Payroll Month</th>
                                            <th>Staff Count</th>
                                            <th>Total Gross (₦)</th>
                                            <th>Total Deductions (₦)</th>
                                            <th>Net Salary (₦)</th>
                                            <th>Status</th>
                                            <th>Date Published</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batches.map((batch) => (
                                            <tr key={batch.id}>
                                                <td>
                                                    <strong style={{ color: '#103463' }}>{batch.payroll_period}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{batch.original_file_name}</div>
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: '600' }}>{batch.total_staff}</span> staff
                                                </td>
                                                <td>{formatCurrency(batch.total_earnings)}</td>
                                                <td>{formatCurrency(batch.total_deductions)}</td>
                                                <td>
                                                    <strong style={{ color: '#047857' }}>
                                                        {formatCurrency(batch.total_net_salary)}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <span className="admin-badge is-approved">
                                                        {batch.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(batch.created_at).toLocaleDateString()}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleDeleteBatch(batch.id, batch.payroll_period)}
                                                        className="admin-icon-button is-danger"
                                                        title="Delete this payroll batch"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                </>
            )}

            {/* ADD / UPDATE STAFF PAYSLIP MODAL */}
            <AdminModal
                open={modalOpen}
                title={editingId ? 'Edit Staff Payslip' : 'Add / Update Staff Payslip'}
                onClose={() => setModalOpen(false)}
                wide
                className="admin-modal-lg"
                actions={
                    <>
                        <button
                            type="button"
                            className="admin-button admin-button-secondary"
                            onClick={() => setModalOpen(false)}
                            disabled={savingPayslip}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="admin-payslip-entry-form"
                            className="admin-button admin-button-primary"
                            disabled={savingPayslip || !formData.pf_number}
                        >
                            {savingPayslip ? 'Saving Payslip...' : (editingId ? 'Update Payslip' : 'Save & Publish Payslip')}
                        </button>
                    </>
                }
            >
                <form id="admin-payslip-entry-form" onSubmit={handleSavePayslip}>
                    {modalError && (
                        <div className="admin-inline-alert is-danger" style={{ marginBottom: '1rem' }}>
                            <AlertCircle size={16} style={{ marginRight: '6px' }} />
                            <span>{modalError}</span>
                        </div>
                    )}
                    {modalSuccess && (
                        <div className="admin-inline-alert is-success" style={{ marginBottom: '1rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                            <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                            <span>{modalSuccess}</span>
                        </div>
                    )}

                    {/* Step 1: Target Month & Year */}
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '1.25rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={16} color="var(--primary)" /> Target Payroll Period
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            <Field label="Payroll Month">
                                <select
                                    className="select"
                                    value={formData.payroll_month}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, payroll_month: e.target.value }))}
                                    required
                                >
                                    {MONTHS.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Payroll Year">
                                <select
                                    className="select"
                                    value={formData.payroll_year}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, payroll_year: e.target.value }))}
                                    required
                                >
                                    {years.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </div>

                    {/* Step 2: Staff Identification & Quick Search */}
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '1.25rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BadgeCheck size={16} color="var(--primary)" /> Staff Identification
                        </h4>

                        {!editingId && (
                            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                <Field label="Quick Auto-fill: Search by Staff Name or PF Number">
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="input"
                                            value={staffSearchQuery}
                                            onChange={(e) => setStaffSearchQuery(e.target.value)}
                                            placeholder="Type staff name or PF number to search database..."
                                            style={{ paddingLeft: '2.2rem' }}
                                        />
                                        <Search
                                            size={16}
                                            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
                                        />
                                    </div>
                                </Field>

                                {/* Autocomplete Dropdown */}
                                {staffSuggestions.length > 0 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            zIndex: 20,
                                            background: '#ffffff',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                        }}
                                    >
                                        {staffSuggestions.map((s) => (
                                            <div
                                                key={s.staff_id}
                                                onClick={() => handleSelectStaffSuggestion(s)}
                                                style={{
                                                    padding: '0.6rem 1rem',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'background 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                                            >
                                                <div>
                                                    <strong style={{ fontSize: '0.85rem' }}>{s.full_name}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {s.department} • {s.designation}
                                                    </div>
                                                </div>
                                                <span className="admin-badge is-neutral" style={{ fontSize: '0.75rem' }}>
                                                    {s.pf_number}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                            <Field label="Staff PF Number *">
                                <input
                                    className="input"
                                    value={formData.pf_number}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, pf_number: e.target.value }))}
                                    onBlur={async () => {
                                        if (formData.pf_number.trim() && !formData.particulars.full_name) {
                                            try {
                                                const res = await api(`/api/payroll/admin/staff-lookup?query=${encodeURIComponent(formData.pf_number.trim())}`);
                                                if (res.status === 'success' && res.staff && res.staff.length > 0) {
                                                    const s = res.staff[0];
                                                    handleSelectStaffSuggestion(s);
                                                }
                                            } catch (e) {
                                                // ignore
                                            }
                                        }
                                    }}
                                    placeholder="e.g. PF/5797"
                                    required
                                    style={{ fontWeight: '600' }}
                                />
                            </Field>
                            <Field label="Staff Full Name">
                                <input
                                    className="input"
                                    value={formData.particulars.full_name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, full_name: e.target.value } }))}
                                    placeholder="e.g. DR. GADDAFI TERSOO UMAR"
                                />
                            </Field>
                            <Field label="Department">
                                <input
                                    className="input"
                                    value={formData.particulars.department}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, department: e.target.value } }))}
                                    placeholder="e.g. Computer Science"
                                />
                            </Field>
                            <Field label="Designation / Rank">
                                <input
                                    className="input"
                                    value={formData.particulars.designation}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, designation: e.target.value } }))}
                                    placeholder="e.g. Senior Lecturer"
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Step 3: Salary Particulars & Banking */}
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '1.25rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CreditCard size={16} color="var(--primary)" /> Salary & Bank Details
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
                            <Field label="Salary Scale">
                                <input
                                    className="input"
                                    value={formData.particulars.salary_scale}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, salary_scale: e.target.value } }))}
                                    placeholder="CONUASS / CONTISS"
                                />
                            </Field>
                            <Field label="Level">
                                <input
                                    className="input"
                                    value={formData.particulars.salary_level}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, salary_level: e.target.value } }))}
                                    placeholder="e.g. 05"
                                />
                            </Field>
                            <Field label="Step">
                                <input
                                    className="input"
                                    value={formData.particulars.salary_step}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, salary_step: e.target.value } }))}
                                    placeholder="e.g. 02"
                                />
                            </Field>
                            <Field label="Bank Name">
                                <input
                                    className="input"
                                    value={formData.particulars.bank_name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, bank_name: e.target.value } }))}
                                    placeholder="e.g. Fidelity Bank"
                                />
                            </Field>
                            <Field label="Account Number">
                                <input
                                    className="input"
                                    value={formData.particulars.account_no}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, account_no: e.target.value } }))}
                                    placeholder="e.g. 6173905754"
                                />
                            </Field>
                            <Field label="PFA Name">
                                <input
                                    className="input"
                                    value={formData.particulars.pfa_name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, particulars: { ...prev.particulars, pfa_name: e.target.value } }))}
                                    placeholder="e.g. Stanbic IBTC"
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Step 4: Allowances & Earnings */}
                    <div style={{ marginBottom: '1.25rem', border: '1px solid #d1fae5', borderRadius: '8px', padding: '1rem', background: '#f0fdf4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#065f46' }}>
                                Allowances & Incomes (Gross)
                            </h4>
                            <button
                                type="button"
                                className="admin-button admin-button-secondary"
                                onClick={handleAddIncomeRow}
                                style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                            >
                                + Add Income Item
                            </button>
                        </div>

                        {formData.incomes.map((inc, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <input
                                    className="input"
                                    value={inc.item}
                                    onChange={(e) => handleIncomeChange(index, 'item', e.target.value)}
                                    placeholder="Income name (e.g. CONSOLIDATED)"
                                    style={{ fontSize: '0.85rem' }}
                                />
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#047857', fontWeight: 'bold' }}>₦</span>
                                    <input
                                        className="input"
                                        type="number"
                                        step="0.01"
                                        value={inc.amount}
                                        onChange={(e) => handleIncomeChange(index, 'amount', e.target.value)}
                                        placeholder="0.00"
                                        style={{ paddingLeft: '1.8rem', fontSize: '0.85rem', fontWeight: '600' }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveIncomeRow(index)}
                                    className="admin-icon-button is-danger"
                                    style={{ padding: '6px' }}
                                    title="Remove item"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 'bold', color: '#047857', fontSize: '0.9rem' }}>
                            Subtotal Gross Earnings: {formatCurrency(computedGross)}
                        </div>
                    </div>

                    {/* Step 5: Deductions */}
                    <div style={{ marginBottom: '1.25rem', border: '1px solid #fee2e2', borderRadius: '8px', padding: '1rem', background: '#fef2f2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                                Deductions
                            </h4>
                            <button
                                type="button"
                                className="admin-button admin-button-secondary"
                                onClick={handleAddDeductionRow}
                                style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                            >
                                + Add Deduction Item
                            </button>
                        </div>

                        {formData.deductions.map((ded, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <input
                                    className="input"
                                    value={ded.item}
                                    onChange={(e) => handleDeductionChange(index, 'item', e.target.value)}
                                    placeholder="Deduction name (e.g. TAX)"
                                    style={{ fontSize: '0.85rem' }}
                                />
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#dc2626', fontWeight: 'bold' }}>₦</span>
                                    <input
                                        className="input"
                                        type="number"
                                        step="0.01"
                                        value={ded.amount}
                                        onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                                        placeholder="0.00"
                                        style={{ paddingLeft: '1.8rem', fontSize: '0.85rem', fontWeight: '600', color: '#dc2626' }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveDeductionRow(index)}
                                    className="admin-icon-button is-danger"
                                    style={{ padding: '6px' }}
                                    title="Remove item"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        <div style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: 'bold', color: '#dc2626', fontSize: '0.9rem' }}>
                            Subtotal Deductions: {formatCurrency(computedDeductions)}
                        </div>
                    </div>

                    {/* Step 6: Live Net Summary Banner */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem',
                            padding: '1rem',
                            borderRadius: '8px',
                            background: '#0f172a',
                            color: '#ffffff',
                            textAlign: 'center',
                            marginBottom: '0.5rem',
                        }}
                    >
                        <div>
                            <small style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>TOTAL EARNINGS</small>
                            <strong style={{ fontSize: '1rem', color: '#38bdf8' }}>{formatCurrency(computedGross)}</strong>
                        </div>
                        <div>
                            <small style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>TOTAL DEDUCTIONS</small>
                            <strong style={{ fontSize: '1rem', color: '#f87171' }}>{formatCurrency(computedDeductions)}</strong>
                        </div>
                        <div>
                            <small style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>NET SALARY</small>
                            <strong style={{ fontSize: '1.15rem', color: '#4ade80' }}>{formatCurrency(computedNet)}</strong>
                        </div>
                    </div>
                </form>
            </AdminModal>
        </>
    );
}
