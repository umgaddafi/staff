import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminModal, AdminPageHeader, Field } from '../../components/common/ui';
import { Pagination } from '../../components/common/Pagination';
import { PortalNavIcon } from '../../components/icons/AppIcons';
import { usePendingAction } from '../../hooks/usePendingAction';
import { formatDateTime, formatBytes } from '../../utils/formatters';
import { AdminRequestsWorkspace } from './AdminRequestsWorkspace';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api } from '../../lib/api';

const JOSTUM_API = import.meta.env.DEV ? '/jostum-api' : '/backend/public/jostum-api';

function AdminDashboardSection({ dashboard }) {
    const today = new Date().toLocaleDateString(undefined, { month: 'long', day: '2-digit', year: 'numeric' });
    const statCards = [
        { key: 'pending', label: 'Pending Requests', value: dashboard.stats.pending, icon: 'requests', tone: 'warning' },
        { key: 'staff', label: 'Active Staff', value: dashboard.stats.staff, icon: 'staff', tone: 'success' },
        { key: 'publications', label: 'Total Publications', value: dashboard.stats.publications, icon: 'publications', tone: 'primary' },
    ];

    return (
        <>
            <AdminPageHeader
                title="Dashboard Overview"
                subtitle="System Summary & Alerts"
                meta={<span className="admin-date-badge">{today}</span>}
            />
            <div className="admin-dashboard-stats">
                {statCards.map((item) => (
                    <div className={`admin-dashboard-stat is-${item.tone}`} key={item.key}>
                        <div>
                            <h3>{item.label}</h3>
                            <strong>{item.value}</strong>
                        </div>
                        <span className="admin-dashboard-stat-icon" aria-hidden="true">
                            <PortalNavIcon name={item.icon} />
                        </span>
                    </div>
                ))}
            </div>
            <section className="admin-panel card">
                <div className="admin-panel-header">
                    <h3>Pending Approval Queue</h3>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Staff Name</th>
                                <th>Action Type</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboard.pendingQueue.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="admin-empty-cell">No pending items.</td>
                                </tr>
                            ) : dashboard.pendingQueue.map((item) => (
                                <tr key={item.logId}>
                                    <td className="admin-cell-strong">{item.staffName || 'Unknown staff'}</td>
                                    <td>Update {item.entityName}</td>
                                    <td>{formatDateTime(item.timestamp)}</td>
                                    <td><span className="admin-badge is-warning">Pending</span></td>
                                    <td>
                                        <Link className="admin-table-action" to="/admin/requests">
                                            Review
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

const DOC_CATEGORIES = [
    { id: 'appointment_letter', label: 'Appointment Letter' },
    { id: 'confirmation_letter', label: 'Confirmation Letter' },
    { id: 'promotion_letter', label: 'Promotion Letters' },
    { id: 'other', label: 'Other Documents' },
    { id: 'all', label: 'All Documents' },
];

function AdminStaffSection({ staff, onCreate, onUpdate, onDelete }) {
    const [filters, setFilters] = useState({ search: '', departmentId: '', rankId: '', role: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState(null);
    const [viewingStaffDocs, setViewingStaffDocs] = useState(null);
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', pf_number: '', department_id: '', rank_id: '', staff_category_id: '', passport_url: '' });
    const [isSearchingStaff, setIsSearchingStaff] = useState(false);
    const [searchSuccessful, setSearchSuccessful] = useState(false);
    const [searchError, setSearchError] = useState('');
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const selectedDepartment = staff.filters.departments.find((item) => String(item.id) === String(filters.departmentId));
    const selectedRank = staff.filters.ranks.find((item) => String(item.id) === String(filters.rankId));
    const isCreating = isPending('create-staff');
    const isUpdating = editingStaffId ? isPending(`update-staff-${editingStaffId}`) : false;
    const isSaving = isCreating || isUpdating;

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const filteredStaff = staff.items.filter((item) => {
        const searchValue = filters.search.trim().toLowerCase();
        const roleValue = item.role || 'NULL';

        if (searchValue && !`${item.name} ${item.email} ${item.staffNumber || ''} ${item.pfNumber || ''}`.toLowerCase().includes(searchValue)) {
            return false;
        }

        if (selectedDepartment && item.departmentName !== selectedDepartment.name) {
            return false;
        }

        if (selectedRank && item.rankName !== selectedRank.name) {
            return false;
        }

        if (filters.role && roleValue !== filters.role) {
            return false;
        }

        return true;
    });

    const paginatedStaff = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    function openEditModal(item) {
        const matchedRank = staff.filters.ranks.find(r => r.id === item.rankId);
        setForm({
            first_name: item.firstName || '',
            last_name: item.lastName || '',
            email: item.email || '',
            pf_number: item.pfNumber || item.staffNumber || '',
            department_id: item.departmentId || '',
            rank_id: item.rankId || '',
            staff_category_id: matchedRank ? matchedRank.category_id : '',
            passport_url: item.profilePhotoUrl || '',
        });
        setEditingStaffId(item.staffId);
        setSearchSuccessful(true);
        setShowCreateModal(true);
    }

    function closeCreateModal() {
        setForm({ first_name: '', last_name: '', email: '', pf_number: '', department_id: '', rank_id: '', staff_category_id: '', passport_url: '' });
        setEditingStaffId(null);
        setSearchSuccessful(false);
        setShowCreateModal(false);
    }

    async function submitCreate(event) {
        event.preventDefault();
        
        let result;
        if (editingStaffId) {
            result = await runPending(`update-staff-${editingStaffId}`, () => onUpdate(editingStaffId, form));
        } else {
            result = await runPending('create-staff', () => onCreate(form));
        }

        if (result?.ok) {
            closeCreateModal();
        }
    }

    async function handleSearchStaff() {
        if (!form.pf_number) return;
        
        setIsSearchingStaff(true);
        setSearchError('');
        setSearchSuccessful(false);
        
        try {
            const response = await fetch(`${JOSTUM_API}/v1/staff/${form.pf_number}`);
            
            if (!response.ok) {
                throw new Error('Staff not found or API error.');
            }
            
            const result = await response.json();
            if (result && result.data) {
                let matchedDepartmentId = '';
                if (result.data.department) {
                    const matchedDept = staff.filters.departments.find(d => d.name.toLowerCase() === result.data.department.toLowerCase());
                    if (matchedDept) matchedDepartmentId = matchedDept.id;
                }

                let matchedRankId = '';
                let matchedRank = null;
                if (result.data.rank) {
                    matchedRank = staff.filters.ranks.find(r => r.name.toLowerCase() === result.data.rank.toLowerCase());
                    if (matchedRank) matchedRankId = matchedRank.id;
                }

                let matchedCategoryId = '';
                if (matchedRank) matchedCategoryId = matchedRank.category_id;

                setForm(current => ({
                    ...current,
                    first_name: result.data.first_name || '',
                    last_name: result.data.last_name || '',
                    email: result.data.email || current.email,
                    department_id: matchedDepartmentId || current.department_id,
                    rank_id: matchedRankId || current.rank_id,
                    staff_category_id: matchedCategoryId || current.staff_category_id,
                    passport_url: result.data.passport_url || current.passport_url,
                }));
                setSearchSuccessful(true);
            } else {
                throw new Error('Invalid data format received.');
            }
        } catch (error) {
            setSearchError(error.message || 'Failed to fetch staff details.');
        } finally {
            setIsSearchingStaff(false);
        }
    }

    async function openDocViewer(item) {
        setViewingStaffDocs({
            staff: item,
            documents: [],
            loading: true,
            error: null,
            activeTab: 'appointment_letter',
        });

        try {
            const res = await api(`/api/admin/staff/${item.staffId}/documents`);
            setViewingStaffDocs((curr) => curr ? {
                ...curr,
                staff: res.staff || item,
                documents: res.documents || [],
                loading: false,
            } : null);
        } catch (err) {
            setViewingStaffDocs((curr) => curr ? {
                ...curr,
                loading: false,
                error: err.message || 'Failed to fetch staff documents',
            } : null);
        }
    }

    return (
        <>
            <AdminPageHeader
                title="Staff Directory"
                action={(
                    <button type="button" className="admin-button admin-button-primary" onClick={() => { setEditingStaffId(null); setShowCreateModal(true); }}>
                        Add New Staff
                    </button>
                )}
            />
            <section className="admin-filter-card card">
                <div className="admin-filter-grid is-staff">
                    <Field label="Search Name/Email">
                        <input
                            className="input"
                            value={filters.search}
                            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                            placeholder="Search..."
                        />
                    </Field>
                    <Field label="Department">
                        <select
                            className="select"
                            value={filters.departmentId}
                            onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}
                        >
                            <option value="">All Depts</option>
                            {staff.filters.departments.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Rank">
                        <select
                            className="select"
                            value={filters.rankId}
                            onChange={(event) => setFilters((current) => ({ ...current, rankId: event.target.value }))}
                        >
                            <option value="">All Ranks</option>
                            {staff.filters.ranks.map((rank) => (
                                <option key={rank.id} value={rank.id}>{rank.name}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Role">
                        <select
                            className="select"
                            value={filters.role}
                            onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
                        >
                            <option value="">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Moderator">Moderator</option>
                            <option value="Staff">Staff</option>
                            <option value="NULL">No Account</option>
                        </select>
                    </Field>
                    <div className="admin-filter-reset">
                        <button
                            type="button"
                            className="admin-button admin-button-secondary"
                            onClick={() => setFilters({ search: '', departmentId: '', rankId: '', role: '' })}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </section>
            <section className="admin-panel card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name &amp; Email</th>
                                <th>Role</th>
                                <th>Rank</th>
                                <th>Department</th>
                                <th className="is-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="admin-empty-cell">No staff records found.</td>
                                </tr>
                            ) : paginatedStaff.map((item) => (
                                <tr key={item.staffId}>
                                    <td>
                                        <div className="admin-cell-stack">
                                            <strong>{item.name}</strong>
                                            <span>{item.email}</span>
                                        </div>
                                    </td>
                                    <td>{item.role || 'No Account'}</td>
                                    <td>{item.rankName || 'N/A'}</td>
                                    <td>{item.departmentName || 'N/A'}</td>
                                    <td className="is-right" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            className="admin-button admin-button-primary"
                                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: '#0f766e', borderColor: '#0f766e' }}
                                            onClick={() => openDocViewer(item)}
                                            title="View Staff Reference Documents"
                                        >
                                            View
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-button-secondary"
                                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                                            onClick={() => openEditModal(item)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-table-danger"
                                            onClick={async () => {
                                                await confirm({
                                                    title: 'Confirm Deletion',
                                                    message: `Delete ${item.name}? This action cannot be undone.`,
                                                    confirmText: 'Delete',
                                                    danger: true,
                                                    action: () => runPending(`delete-staff-${item.staffId}`, () => onDelete(item.staffId))
                                                });
                                            }}
                                            disabled={isPending(`delete-staff-${item.staffId}`)}
                                        >
                                            {isPending(`delete-staff-${item.staffId}`) ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredStaff.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                />
            </section>
            <AdminModal
                open={showCreateModal}
                title={editingStaffId ? "Edit Staff" : "Add New Staff"}
                onClose={closeCreateModal}
                actions={(
                    <>
                        <button type="button" className="admin-button admin-button-secondary" onClick={closeCreateModal} disabled={isSaving}>Cancel</button>
                        <button type="submit" form="admin-staff-create-form" className="admin-button admin-button-primary" disabled={isSaving || isSearchingStaff || !searchSuccessful}>
                            {isSaving ? 'Saving...' : (editingStaffId ? 'Update Account' : 'Create Account')}
                        </button>
                    </>
                )}
            >
                <form id="admin-staff-create-form" className="admin-modal-form" onSubmit={submitCreate}>
                    {searchError && <div className="admin-form-error" style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{searchError}</div>}
                    <Field label="PF Number (Search to auto-fill)">
                        <div style={{ position: 'relative', display: 'flex' }}>
                            <input 
                                className="input" 
                                value={form.pf_number} 
                                onChange={(event) => setForm((current) => ({ ...current, pf_number: event.target.value }))} 
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleSearchStaff();
                                    }
                                }}
                                required 
                                style={{ paddingRight: '3rem' }}
                                placeholder="e.g. PF/5797 or SS/1234"
                            />
                            <button
                                type="button"
                                className="admin-icon-button"
                                onClick={handleSearchStaff}
                                disabled={isSearchingStaff || !form.pf_number}
                                style={{ position: 'absolute', right: '0.25rem', top: '50%', transform: 'translateY(-50%)', padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                                aria-label="Search staff details"
                                title="Search staff details"
                            >
                                {isSearchingStaff ? (
                                    <span style={{ fontSize: '0.8rem' }}>...</span>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </Field>
                    {!searchSuccessful && !editingStaffId && (
                        <div style={{ marginTop: '0.5rem', marginBottom: '1rem', textAlign: 'right' }}>
                            <button
                                type="button"
                                onClick={() => setSearchSuccessful(true)}
                                style={{ background: 'none', border: 'none', color: 'var(--admin-shell-green, #065f46)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
                            >
                                Or fill staff details manually &rarr;
                            </button>
                        </div>
                    )}
                    
                    {searchSuccessful && (
                        <>
                            {form.passport_url && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <img src={form.passport_url} alt="Staff Passport" style={{ width: '100px', height: '100px', objectFit: 'fill', borderRadius: '8px', border: '2px solid var(--border-light)' }} />
                                </div>
                            )}
                            
                            <div className="admin-modal-grid">
                                <Field label="First name"><input className="input" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} required /></Field>
                                <Field label="Last name"><input className="input" value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} required /></Field>
                            </div>
                            <div className="admin-modal-grid">
                                <Field label="Email"><input className="input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></Field>
                                <Field label="Staff Category">
                                    <select className="select" value={form.staff_category_id} onChange={(event) => setForm((current) => ({ ...current, staff_category_id: event.target.value, rank_id: '' }))}>
                                        <option value="">Select category</option>
                                        {staff.filters.categories?.map((category) => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                            <div className="admin-modal-grid">
                                <Field label="Department">
                                    <select className="select" value={form.department_id} onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))} required>
                                        <option value="">Select department</option>
                                        {staff.filters.departments.map((department) => (
                                            <option key={department.id} value={department.id}>{department.name}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Rank">
                                    <select className="select" value={form.rank_id} onChange={(event) => setForm((current) => ({ ...current, rank_id: event.target.value }))} required disabled={!form.staff_category_id && staff.filters.categories?.length > 0}>
                                        <option value="">Select rank</option>
                                        {staff.filters.ranks
                                            .filter(rank => !form.staff_category_id || String(rank.category_id) === String(form.staff_category_id))
                                            .map((rank) => (
                                            <option key={rank.id} value={rank.id}>{rank.name}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </>
                    )}
                </form>
            </AdminModal>
            {viewingStaffDocs && (
                <AdminModal
                    open={Boolean(viewingStaffDocs)}
                    title={`Staff Reference Documents: ${viewingStaffDocs.staff.name || viewingStaffDocs.staff.full_name || 'Staff'}`}
                    onClose={() => setViewingStaffDocs(null)}
                    wide
                    actions={(
                        <button
                            type="button"
                            className="admin-button admin-button-secondary"
                            onClick={() => setViewingStaffDocs(null)}
                        >
                            Close
                        </button>
                    )}
                >
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                                    {viewingStaffDocs.staff.full_name || viewingStaffDocs.staff.name}
                                </h3>
                                <p style={{ margin: '0.25rem 0 0 0', color: '#475569', fontSize: '0.88rem' }}>
                                    <strong>PF Number:</strong> {viewingStaffDocs.staff.pf_number || viewingStaffDocs.staff.pfNumber || viewingStaffDocs.staff.staffNumber || 'N/A'} &nbsp;|&nbsp;
                                    <strong>Department:</strong> {viewingStaffDocs.staff.department || viewingStaffDocs.staff.departmentName || 'N/A'} &nbsp;|&nbsp;
                                    <strong>Rank:</strong> {viewingStaffDocs.staff.rank || viewingStaffDocs.staff.rankName || 'N/A'}
                                </p>
                            </div>
                            <span className="admin-badge is-primary" style={{ padding: '0.35rem 0.75rem' }}>
                                {viewingStaffDocs.documents.length} Document{viewingStaffDocs.documents.length === 1 ? '' : 's'}
                            </span>
                        </div>

                        {/* Tabs */}
                        <div className="staff-docs-tabs">
                            {DOC_CATEGORIES.map((cat) => {
                                const count = cat.id === 'all'
                                    ? viewingStaffDocs.documents.length
                                    : viewingStaffDocs.documents.filter((d) => d.document_type === cat.id).length;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        className={`staff-docs-tab-btn ${viewingStaffDocs.activeTab === cat.id ? 'active' : ''}`}
                                        onClick={() => setViewingStaffDocs((curr) => curr ? { ...curr, activeTab: cat.id } : null)}
                                    >
                                        <span>{cat.label}</span>
                                        <span className="staff-docs-tab-count">{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {viewingStaffDocs.loading ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                                Loading documents...
                            </div>
                        ) : viewingStaffDocs.error ? (
                            <div className="admin-form-error" style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626' }}>
                                {viewingStaffDocs.error}
                            </div>
                        ) : (() => {
                            const docs = viewingStaffDocs.activeTab === 'all'
                                ? viewingStaffDocs.documents
                                : viewingStaffDocs.documents.filter((d) => d.document_type === viewingStaffDocs.activeTab);

                            if (docs.length === 0) {
                                return (
                                    <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                        <p style={{ margin: 0, fontWeight: 600, color: '#64748b' }}>
                                            No {DOC_CATEGORIES.find((c) => c.id === viewingStaffDocs.activeTab)?.label || 'documents'} uploaded by this staff member.
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {docs.map((doc) => {
                                        const isPdf = doc.mime_type === 'application/pdf' || doc.file_path?.toLowerCase().endsWith('.pdf');
                                        const isImage = doc.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(doc.file_path || '');
                                        return (
                                            <div
                                                key={doc.id}
                                                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: '#1e293b' }}>
                                                            {doc.title || doc.original_filename}
                                                        </h4>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
                                                            <span><strong>Original File:</strong> {doc.original_filename}</span>
                                                            <span><strong>Size:</strong> {formatBytes(doc.file_size)}</span>
                                                            <span><strong>Uploaded:</strong> {formatDateTime(doc.created_at)}</span>
                                                        </div>
                                                    </div>
                                                    {doc.file_url && (
                                                        <a
                                                            href={doc.file_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="admin-button admin-button-primary"
                                                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
                                                        >
                                                            Open File
                                                        </a>
                                                    )}
                                                </div>

                                                {doc.file_url && isPdf && (
                                                    <iframe
                                                        src={doc.file_url}
                                                        title={doc.title || doc.original_filename}
                                                        style={{ width: '100%', height: '360px', border: '1px solid #e2e8f0', borderRadius: 6, marginTop: '1rem' }}
                                                    />
                                                )}

                                                {doc.file_url && isImage && (
                                                    <div style={{ textAlign: 'center', marginTop: '1rem', background: '#f8fafc', padding: '0.5rem', borderRadius: 6 }}>
                                                        <img
                                                            src={doc.file_url}
                                                            alt={doc.title || doc.original_filename}
                                                            style={{ maxHeight: '350px', maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </AdminModal>
            )}
        </>
    );
}

function AdminRequestsSection({ summary, reloadPortal, showFlash }) {
    return <AdminRequestsWorkspace summary={summary} reloadPortal={reloadPortal} showFlash={showFlash} />;
}

function CollegeManager({ items, onSave, onDelete }) {
    const [editing, setEditing] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSaving = isPending('save-college');

    useEffect(() => {
        setName(editing?.name || '');
    }, [editing]);

    function openCreate() {
        setEditing(null);
        setName('');
        setShowModal(true);
    }

    async function submit(event) {
        event.preventDefault();
        const result = await runPending('save-college', () => onSave({ name }, editing?.id));
        if (result?.ok) {
            setEditing(null);
            setName('');
            setShowModal(false);
        }
    }

    return (
        <>
            <AdminPageHeader
                title="College / Faculty Management"
                action={<button type="button" className="admin-button admin-button-primary" onClick={openCreate}>Add College/Faculty</button>}
            />
            <section className="admin-panel card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>College / Faculty Name</th>
                                <th className="is-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="admin-empty-cell">No colleges/faculties found.</td>
                                </tr>
                            ) : items.map((item) => (
                                <tr key={item.id}>
                                    <td className="admin-cell-strong">{item.name}</td>
                                    <td className="is-right">
                                        <div className="admin-table-actions">
                                            <button type="button" className="admin-icon-button is-edit" onClick={() => {
                                                setEditing(item);
                                                setShowModal(true);
                                            }}>Edit</button>
                                            <button
                                                type="button"
                                                className="admin-icon-button is-danger"
                                                onClick={async () => {
                                                    await confirm({
                                                        title: 'Confirm Deletion',
                                                        message: 'Delete this college/faculty? All associated departments will be affected.',
                                                        confirmText: 'Delete',
                                                        danger: true,
                                                        action: () => runPending(`delete-college-${item.id}`, () => onDelete(item.id))
                                                    });
                                                }}
                                                disabled={isPending(`delete-college-${item.id}`)}
                                            >
                                                {isPending(`delete-college-${item.id}`) ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <AdminModal
                open={showModal}
                title={editing ? 'Edit College/Faculty' : 'Add College/Faculty'}
                onClose={() => setShowModal(false)}
                actions={(
                    <>
                        <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</button>
                        <button type="submit" form="admin-college-form" className="admin-button admin-button-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : (editing ? 'Update' : 'Save')}
                        </button>
                    </>
                )}
            >
                <form id="admin-college-form" className="admin-modal-form" onSubmit={submit}>
                    <Field label="College / Faculty Name">
                        <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
                    </Field>
                </form>
            </AdminModal>
        </>
    );
}

function DepartmentManager({ items, colleges, onSave, onDelete }) {
    const [editing, setEditing] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', college_id: '' });
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSaving = isPending('save-department');

    useEffect(() => {
        setForm(editing ? { name: editing.name, college_id: String(editing.collegeId) } : { name: '', college_id: '' });
    }, [editing]);

    function openCreate() {
        setEditing(null);
        setForm({ name: '', college_id: '' });
        setShowModal(true);
    }

    async function submit(event) {
        event.preventDefault();
        const result = await runPending('save-department', () => onSave(form, editing?.id));
        if (result?.ok) {
            setEditing(null);
            setForm({ name: '', college_id: '' });
            setShowModal(false);
        }
    }

    return (
        <>
            <AdminPageHeader
                title="Department Management"
                action={<button type="button" className="admin-button admin-button-primary" onClick={openCreate}>Add Department</button>}
            />
            <section className="admin-panel card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>College</th>
                                <th className="is-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="admin-empty-cell">No departments found.</td>
                                </tr>
                            ) : items.map((item) => (
                                <tr key={item.id}>
                                    <td className="admin-cell-strong">{item.name}</td>
                                    <td>{item.collegeName || 'N/A'}</td>
                                    <td className="is-right">
                                        <div className="admin-table-actions">
                                            <button type="button" className="admin-icon-button is-edit" onClick={() => {
                                                setEditing(item);
                                                setShowModal(true);
                                            }}>Edit</button>
                                            <button
                                                type="button"
                                                className="admin-icon-button is-danger"
                                                onClick={async () => {
                                                    await confirm({
                                                        title: 'Confirm Deletion',
                                                        message: 'Delete this department? All associated records will be affected.',
                                                        confirmText: 'Delete',
                                                        danger: true,
                                                        action: () => runPending(`delete-department-${item.id}`, () => onDelete(item.id))
                                                    });
                                                }}
                                                disabled={isPending(`delete-department-${item.id}`)}
                                            >
                                                {isPending(`delete-department-${item.id}`) ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <AdminModal
                open={showModal}
                title={editing ? 'Edit Department' : 'Add Department'}
                onClose={() => setShowModal(false)}
                actions={(
                    <>
                        <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</button>
                        <button type="submit" form="admin-department-form" className="admin-button admin-button-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : (editing ? 'Update Department' : 'Save Department')}
                        </button>
                    </>
                )}
            >
                <form id="admin-department-form" className="admin-modal-form" onSubmit={submit}>
                    <Field label="College">
                        <select className="select" value={form.college_id} onChange={(event) => setForm((current) => ({ ...current, college_id: event.target.value }))} required>
                            <option value="">Select College</option>
                            {colleges.map((college) => (
                                <option key={college.id} value={college.id}>{college.name}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Department Name">
                        <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                    </Field>
                </form>
            </AdminModal>
        </>
    );
}

function RankManager({ items, onSave, onDelete }) {
    const [editing, setEditing] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ rank_name: '', rank_level: 0 });
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSaving = isPending('save-rank');

    useEffect(() => {
        setForm(editing ? { rank_name: editing.name, rank_level: editing.level } : { rank_name: '', rank_level: 0 });
    }, [editing]);

    function openCreate() {
        setEditing(null);
        setForm({ rank_name: '', rank_level: 0 });
        setShowModal(true);
    }

    async function submit(event) {
        event.preventDefault();
        const result = await runPending('save-rank', () => onSave(form, editing?.id));
        if (result?.ok) {
            setEditing(null);
            setForm({ rank_name: '', rank_level: 0 });
            setShowModal(false);
        }
    }

    return (
        <>
            <AdminPageHeader
                title="Academic Rank Management"
                action={<button type="button" className="admin-button admin-button-primary" onClick={openCreate}>Add Rank</button>}
            />
            <section className="admin-panel card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Rank Name</th>
                                <th>Level</th>
                                <th className="is-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="admin-empty-cell">No ranks found.</td>
                                </tr>
                            ) : items.map((item) => (
                                <tr key={item.id}>
                                    <td className="admin-cell-strong">{item.name}</td>
                                    <td><span className="admin-badge is-neutral">Level {item.level}</span></td>
                                    <td className="is-right">
                                        <div className="admin-table-actions">
                                            <button type="button" className="admin-icon-button is-edit" onClick={() => {
                                                setEditing(item);
                                                setShowModal(true);
                                            }}>Edit</button>
                                            <button
                                                type="button"
                                                className="admin-icon-button is-danger"
                                                onClick={async () => {
                                                    await confirm({
                                                        title: 'Confirm Deletion',
                                                        message: 'Delete this rank? Staff with this rank will need to be updated.',
                                                        confirmText: 'Delete',
                                                        danger: true,
                                                        action: () => runPending(`delete-rank-${item.id}`, () => onDelete(item.id))
                                                    });
                                                }}
                                                disabled={isPending(`delete-rank-${item.id}`)}
                                            >
                                                {isPending(`delete-rank-${item.id}`) ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <AdminModal
                open={showModal}
                title={editing ? 'Edit Academic Rank' : 'Add Academic Rank'}
                onClose={() => setShowModal(false)}
                actions={(
                    <>
                        <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</button>
                        <button type="submit" form="admin-rank-form" className="admin-button admin-button-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : (editing ? 'Update Rank' : 'Save Rank')}
                        </button>
                    </>
                )}
            >
                <form id="admin-rank-form" className="admin-modal-form" onSubmit={submit}>
                    <Field label="Rank Name">
                        <input className="input" value={form.rank_name} onChange={(event) => setForm((current) => ({ ...current, rank_name: event.target.value }))} required />
                    </Field>
                    <Field label="Rank Level">
                        <input className="input" type="number" min="0" value={form.rank_level} onChange={(event) => setForm((current) => ({ ...current, rank_level: event.target.value }))} required />
                    </Field>
                </form>
            </AdminModal>
        </>
    );
}

export {
    AdminAccountsRolesSection,
    AdminReportsSection,
    AdminVerificationQueueSection,
} from './AdminOperationsSections';

export { AdminPayslipSection } from './AdminPayslipSection';

export {
    AdminDashboardSection,
    AdminStaffSection,
    AdminRequestsSection,
    CollegeManager,
    DepartmentManager,
    RankManager,
};
