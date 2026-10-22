import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminModal, AdminPageHeader, Field } from '../../components/common/ui';
import { Pagination } from '../../components/common/Pagination';
import { PortalNavIcon } from '../../components/icons/AppIcons';
import { usePendingAction } from '../../hooks/usePendingAction';
import { formatDateTime } from '../../utils/formatters';
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
                                        <Link className="admin-table-action" to="/admin/verifications">
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

function AdminStaffSection({ staff, onCreate, onUpdate, onDelete }) {
    const [filters, setFilters] = useState({ search: '', departmentId: '', rankId: '', role: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState(null);
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', staff_number: '', department_id: '', rank_id: '', staff_category_id: '', passport_url: '' });
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
            staff_number: item.staffNumber || '',
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
        setForm({ first_name: '', last_name: '', email: '', staff_number: '', department_id: '', rank_id: '', staff_category_id: '', passport_url: '' });
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
        if (!form.staff_number) return;
        
        setIsSearchingStaff(true);
        setSearchError('');
        setSearchSuccessful(false);
        
        try {
            const response = await fetch(`${JOSTUM_API}/v1/staff/${form.staff_number}`);
            
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
                    <Field label="Staff Number (Search to auto-fill)">
                        <div style={{ position: 'relative', display: 'flex' }}>
                            <input 
                                className="input" 
                                value={form.staff_number} 
                                onChange={(event) => setForm((current) => ({ ...current, staff_number: event.target.value }))} 
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
                                disabled={isSearchingStaff || !form.staff_number}
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

export function AdminPayslipSection() {
    const currentYear = new Date().getFullYear();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthName = months[new Date().getMonth()] || 'August';

    const [year, setYear] = useState(currentYear.toString());
    const [month, setMonth] = useState(currentMonthName);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message, summary }
    const fileInputRef = useState(null);

    const years = [
        (currentYear + 1).toString(),
        currentYear.toString(),
        (currentYear - 1).toString(),
        (currentYear - 2).toString(),
    ];

    const fetchBatches = async () => {
        try {
            setLoadingBatches(true);
            const data = await api.get('/api/payroll/batches');
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
        fetchBatches();
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setFeedback({ type: 'error', message: 'Please select a valid .xlsx payroll spreadsheet before uploading.' });
            return;
        }

        setUploading(true);
        setFeedback(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('payroll_year', year);
            formData.append('payroll_month', month);

            const data = await api('/api/payroll/upload', {
                method: 'POST',
                formData,
            });

            if (data.status === 'success') {
                setFeedback({
                    type: 'success',
                    message: data.message,
                    summary: data.summary,
                });
                setFile(null);
                const fileInput = document.getElementById('payroll-file-input');
                if (fileInput) fileInput.value = '';
                await fetchBatches();
            } else {
                setFeedback({
                    type: 'error',
                    message: data.message || 'Failed to upload payroll file. Please verify column formatting.',
                });
            }
        } catch (err) {
            console.error('Payroll upload error:', err);
            setFeedback({
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
            const data = await api.delete(`/api/payroll/batches/${batchId}`);
            if (data.status === 'success') {
                await fetchBatches();
                setFeedback({ type: 'success', message: `Payroll batch for ${period} was successfully deleted.` });
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
                subtitle="Upload official monthly .xlsx payroll workbooks to publish payslips across all university staff portals"
                meta={
                    <a
                        href={templateDownloadUrl}
                        download="jostum_payslip_upload_template.xlsx"
                        className="admin-button"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#047857',
                            color: '#ffffff',
                            textDecoration: 'none',
                            fontWeight: '600',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                        }}
                    >
                        <span>📥</span> Download .xlsx Template
                    </a>
                }
            />

            {/* Feedback Alert */}
            {feedback && (
                <div
                    style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        border: feedback.type === 'success' ? '1px solid #6ee7b7' : '1px solid #fca5a5',
                        background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: feedback.type === 'success' ? '#065f46' : '#991b1b',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{feedback.type === 'success' ? '✓ Upload Successful' : '⚠ Upload Notice'}</strong>
                        <button
                            onClick={() => setFeedback(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
                        >
                            ✕
                        </button>
                    </div>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>{feedback.message}</p>
                    {feedback.summary && (
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
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{feedback.summary.total_staff}</div>
                            </div>
                            <div>
                                <small style={{ color: '#047857', fontWeight: 'bold' }}>MATCHED IN DB</small>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{feedback.summary.matched_staff}</div>
                            </div>
                            <div>
                                <small style={{ color: '#047857', fontWeight: 'bold' }}>TOTAL GROSS</small>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>₦{feedback.summary.total_earnings}</div>
                            </div>
                            <div>
                                <small style={{ color: '#047857', fontWeight: 'bold' }}>NET PAYROLL</small>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>₦{feedback.summary.total_net_salary}</div>
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
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.9rem' }}
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
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.9rem' }}
                                >
                                    {months.map((m) => (
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
                                Tip: Existing payslips for <strong>{month}-{year}</strong> will be updated automatically on re-upload.
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
                                {uploading ? 'Processing Payroll...' : `Publish ${month} ${year} Payslips`}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* Upload History Panel */}
            <section className="admin-panel card">
                <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>Published Payroll Batches</h3>
                        <small style={{ color: 'var(--muted)' }}>Archived university payroll runs available to staff</small>
                    </div>
                    <button
                        onClick={fetchBatches}
                        className="admin-button"
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                        🔄 Refresh
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
                                        <td>₦{Number(batch.total_earnings).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        <td>₦{Number(batch.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        <td>
                                            <strong style={{ color: '#047857' }}>
                                                ₦{Number(batch.total_net_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                                                className="admin-icon-button"
                                                style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                                                title="Delete this payroll batch"
                                            >
                                                🗑
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
    );
}

export {
    AdminDashboardSection,
    AdminStaffSection,
    AdminRequestsSection,
    CollegeManager,
    DepartmentManager,
    RankManager,
};
