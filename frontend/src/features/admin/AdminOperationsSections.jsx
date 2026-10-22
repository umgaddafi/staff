import { useEffect, useState } from 'react';
import { Eye, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AdminModal, AdminPageHeader, Field } from '../../components/common/ui';
import { Pagination } from '../../components/common/Pagination';
import { usePendingAction } from '../../hooks/usePendingAction';
import { AdminRequestsWorkspace } from './AdminRequestsWorkspace';
import { formatDateTime } from '../../utils/formatters';
import { useConfirm } from '../../contexts/ConfirmContext';

function AdminVerificationQueueSection({ summary, reloadPortal, showFlash }) {
    return (
        <AdminRequestsWorkspace
            summary={summary}
            reloadPortal={reloadPortal}
            showFlash={showFlash}
            title="Pending Verifications"
            subtitle="Focus on unprocessed staff submissions first, then move through the wider request timeline only when needed."
            initialQueueMode="pending-only"
            initialTab="pending"
        />
    );
}

function AdminAccountsRolesSection({
    staff,
    departments = [],
    ranks = [],
    onUpdateStaff,
    onAssignRole,
    onDeactivate,
    onReactivate,
    onForcePasswordReset,
    onResendInvite,
    onUnlock,
}) {
    const [filters, setFilters] = useState({ search: '', role: '', departmentId: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [detailForm, setDetailForm] = useState(null);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();

    const departmentsList = departments?.length > 0 ? departments : (staff?.filters?.departments || []);
    const ranksList = ranks?.length > 0 ? ranks : (staff?.filters?.ranks || []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const selectedDepartment = departmentsList.find((item) => String(item.id) === String(filters.departmentId));
    const filteredItems = staff.items.filter((item) => {
        const searchValue = filters.search.trim().toLowerCase();

        if (searchValue) {
            const hay = `${item.name} ${item.email || ''} ${item.staffNumber || ''} ${item.pfNumber || ''} ${item.phone || ''} ${item.username || ''}`.toLowerCase();
            if (!hay.includes(searchValue)) {
                return false;
            }
        }

        if (selectedDepartment && item.departmentName !== selectedDepartment.name) {
            return false;
        }

        if (filters.role === 'NULL' && item.role) {
            return false;
        }

        if (filters.role && filters.role !== 'NULL' && item.role !== filters.role) {
            return false;
        }

        return true;
    });

    const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const roleCounts = buildRoleCounts(staff.items);
    const inactiveCount = staff.items.filter((item) => item.hasAccount && !item.isActive).length;
    const resetRequiredCount = staff.items.filter((item) => item.forcePasswordChange).length;
    const attentionItems = filteredItems.filter((item) => (
        !item.hasAccount
        || !item.isActive
        || item.forcePasswordChange
        || !item.departmentName
        || !item.rankName
    ));

    function openDetailModal(item) {
        setSelectedStaff(item);
        setDetailForm({
            first_name: item.firstName || '',
            last_name: item.lastName || '',
            other_name: item.otherName || '',
            pf_number: item.pfNumber || item.staffNumber || '',
            category: item.category || 'SENIOR',
            email: item.email || '',
            phone: item.phone || '',
            department_id: item.departmentId || '',
            department: item.department || item.departmentName || '',
            rank_id: item.rankId || '',
            rank: item.rank || item.rankName || '',
            role: item.role || 'Staff',
            is_active: item.hasAccount ? (item.isActive ? 1 : 0) : 1,
        });
    }

    function closeDetailModal() {
        setSelectedStaff(null);
        setDetailForm(null);
    }

    async function handleSaveStaff(e) {
        if (e) e.preventDefault();
        if (!selectedStaff || !detailForm) return;

        const actionKey = `save-staff-${selectedStaff.staffId}`;
        const res = await runPending(actionKey, async () => {
            if (onUpdateStaff) {
                return await onUpdateStaff(selectedStaff.staffId, detailForm);
            }
        });

        if (res?.ok) {
            closeDetailModal();
        }
    }

    async function handleResetPasswordToPhone() {
        if (!selectedStaff) return;
        const targetPhone = detailForm?.phone?.trim() || selectedStaff.phone?.trim();
        if (!targetPhone) return;

        await confirm({
            title: 'Confirm Password Reset',
            message: `Are you sure you want to reset ${selectedStaff.name}'s password to their registered phone number (${targetPhone})? They will be required to change it on their next login.`,
            confirmText: 'Reset Password to Phone',
            danger: false,
            action: async () => {
                const actionKey = `force-reset-${selectedStaff.staffId}`;
                const res = await runPending(actionKey, () => onForcePasswordReset(selectedStaff.staffId));
                if (res?.ok) {
                    setSelectedStaff((curr) => curr ? { ...curr, forcePasswordChange: true } : null);
                }
            }
        });
    }

    return (
        <>
            <AdminPageHeader
                title="User Accounts & Roles"
                subtitle="Track access coverage, role assignment, and manage staff credentials and security."
            />
            <div className="admin-dashboard-stats admin-role-stats">
                <div className="admin-dashboard-stat is-primary">
                    <div>
                        <h3>Administrators</h3>
                        <strong>{roleCounts.Admin}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-warning">
                    <div>
                        <h3>Moderators</h3>
                        <strong>{roleCounts.Moderator}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-success">
                    <div>
                        <h3>Staff Accounts</h3>
                        <strong>{roleCounts.Staff}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-neutral">
                    <div>
                        <h3>No Linked Account</h3>
                        <strong>{roleCounts.None}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-warning">
                    <div>
                        <h3>Inactive Accounts</h3>
                        <strong>{inactiveCount}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-primary">
                    <div>
                        <h3>Reset Required</h3>
                        <strong>{resetRequiredCount}</strong>
                    </div>
                </div>
            </div>

            <section className="admin-filter-card card">
                <div className="admin-filter-grid is-access">
                    <Field label="Search Name / Email / PF Number / Phone">
                        <input
                            className="input"
                            value={filters.search}
                            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                            placeholder="Search staff access records..."
                        />
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
                    <Field label="Department">
                        <select
                            className="select"
                            value={filters.departmentId}
                            onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}
                        >
                            <option value="">All Departments</option>
                            {departmentsList.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                    </Field>
                    <div className="admin-filter-reset">
                        <button
                            type="button"
                            className="admin-button admin-button-secondary"
                            onClick={() => setFilters({ search: '', role: '', departmentId: '' })}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </section>

            <section className="admin-panel card">
                <div className="admin-panel-header">
                    <h3>Access Directory</h3>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '130px' }}>PF Number</th>
                                <th>Staff</th>
                                <th>Department</th>
                                <th>Rank</th>
                                <th style={{ width: '140px' }}>Status</th>
                                <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="admin-empty-cell">No access records match the current filters.</td>
                                </tr>
                            ) : paginatedItems.map((item) => (
                                <tr key={item.staffId}>
                                    <td>
                                        <strong style={{ fontFamily: 'monospace', fontSize: '0.92rem', color: '#1e293b' }}>
                                            {item.pfNumber || item.staffNumber || '—'}
                                        </strong>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {item.profilePhotoUrl ? (
                                                <img
                                                    src={item.profilePhotoUrl}
                                                    alt={item.name}
                                                    style={{ width: '2.4rem', height: '2.4rem', borderRadius: '999px', objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '2.4rem',
                                                        height: '2.4rem',
                                                        borderRadius: '999px',
                                                        background: '#e0f2fe',
                                                        color: '#0369a1',
                                                        display: 'grid',
                                                        placeItems: 'center',
                                                        fontWeight: '700',
                                                        fontSize: '0.95rem',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {item.name?.charAt(0) || 'S'}
                                                </div>
                                            )}
                                            <div className="admin-cell-stack">
                                                <strong style={{ color: '#0f172a' }}>{item.name}</strong>
                                                <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                                    {item.email || (item.phone ? `Phone: ${item.phone}` : 'No contact email')}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{item.departmentName || item.department || 'Not assigned'}</td>
                                    <td>{item.rankName || item.rank || 'Not assigned'}</td>
                                    <td>
                                        <div className="admin-access-status-stack">
                                            <span className={`admin-badge ${item.hasAccount ? (item.isActive ? 'is-approved' : 'is-rejected') : 'is-warning'}`}>
                                                {item.hasAccount ? (item.isActive ? 'Active' : 'Inactive') : 'Needs Account'}
                                            </span>
                                            {item.hasAccount && item.role ? (
                                                <span className="admin-access-hint">{item.role}</span>
                                            ) : null}
                                            {item.forcePasswordChange ? (
                                                <span className="admin-badge is-warning" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>
                                                    Reset Required
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            className="admin-icon-button is-view"
                                            onClick={() => openDetailModal(item)}
                                            title={`View & edit details for ${item.name}`}
                                            aria-label={`View & edit details for ${item.name}`}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.35rem',
                                                padding: '0.35rem 0.65rem',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                background: '#f8fafc',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.82rem',
                                                color: '#1e293b',
                                            }}
                                        >
                                            <Eye size={15} color="#006633" />
                                            <span>View</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredItems.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                />
            </section>

            <section className="admin-panel card">
                <div className="admin-panel-header">
                    <h3>Attention Queue</h3>
                </div>
                {attentionItems.length === 0 ? (
                    <div className="admin-empty-state">
                        <strong>No immediate access gaps.</strong>
                        <p>All visible records already have account, department, and rank information in place.</p>
                    </div>
                ) : (
                    <div className="admin-attention-grid">
                        {attentionItems.slice(0, 12).map((item) => (
                            <article
                                className="admin-attention-card"
                                key={item.staffId}
                                onClick={() => openDetailModal(item)}
                                style={{ cursor: 'pointer' }}
                                title="Click to view & edit details"
                            >
                                <strong>{item.name}</strong>
                                <span>{item.pfNumber || item.staffNumber}</span>
                                <div className="admin-attention-tags">
                                    {!item.hasAccount ? <span className="admin-badge is-warning">No account</span> : null}
                                    {item.hasAccount && !item.isActive ? <span className="admin-badge is-rejected">Inactive</span> : null}
                                    {item.forcePasswordChange ? <span className="admin-badge is-warning">Reset required</span> : null}
                                    {!item.departmentName ? <span className="admin-badge is-neutral">No department</span> : null}
                                    {!item.rankName ? <span className="admin-badge is-neutral">No rank</span> : null}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {selectedStaff && detailForm && (
                <AdminModal
                    open={Boolean(selectedStaff)}
                    title="Staff Access & Profile Details"
                    onClose={closeDetailModal}
                    className="is-wide"
                    actions={(
                        <>
                            <button
                                type="button"
                                className="admin-button admin-button-secondary"
                                onClick={closeDetailModal}
                                disabled={isPending(`save-staff-${selectedStaff.staffId}`)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="admin-button admin-button-primary"
                                onClick={handleSaveStaff}
                                disabled={isPending(`save-staff-${selectedStaff.staffId}`)}
                            >
                                {isPending(`save-staff-${selectedStaff.staffId}`) ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </>
                    )}
                >
                    <div className="admin-detail-hero">
                        {selectedStaff.profilePhotoUrl ? (
                            <img
                                src={selectedStaff.profilePhotoUrl}
                                alt={selectedStaff.name}
                                className="admin-detail-avatar"
                            />
                        ) : (
                            <div className="admin-detail-avatar">
                                {selectedStaff.name?.charAt(0) || 'S'}
                            </div>
                        )}
                        <div className="admin-detail-title-block">
                            <h3 className="admin-detail-name">{selectedStaff.name}</h3>
                            <div className="admin-detail-meta-row">
                                <span><strong>PF:</strong> {selectedStaff.pfNumber || selectedStaff.staffNumber || 'N/A'}</span>
                                <span>•</span>
                                <span>{selectedStaff.departmentName || selectedStaff.department || 'No department'}</span>
                                <span>•</span>
                                <span>{selectedStaff.rankName || selectedStaff.rank || 'No rank'}</span>
                            </div>
                            <div className="admin-detail-badges">
                                <span className={`admin-badge ${selectedStaff.hasAccount ? (selectedStaff.isActive ? 'is-approved' : 'is-rejected') : 'is-warning'}`}>
                                    {selectedStaff.hasAccount ? (selectedStaff.isActive ? 'Account Active' : 'Account Inactive') : 'Needs Account'}
                                </span>
                                <span className="admin-badge is-neutral">
                                    Role: {selectedStaff.role || 'No Role Assigned'}
                                </span>
                                <span className={`admin-badge ${selectedStaff.forcePasswordChange ? 'is-warning' : 'is-success'}`}>
                                    {selectedStaff.forcePasswordChange ? 'Password Reset Pending' : 'Password Ready'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSaveStaff} className="admin-modal-form">
                        <section className="admin-detail-card-section">
                            <h4 className="admin-detail-section-title">
                                Personal Information
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                                <Field label="First Name">
                                    <input
                                        className="input"
                                        value={detailForm.first_name}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, first_name: e.target.value }))}
                                        required
                                    />
                                </Field>
                                <Field label="Other Name(s)">
                                    <input
                                        className="input"
                                        value={detailForm.other_name}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, other_name: e.target.value }))}
                                        placeholder="Middle / other name"
                                    />
                                </Field>
                                <Field label="Last Name">
                                    <input
                                        className="input"
                                        value={detailForm.last_name}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, last_name: e.target.value }))}
                                        required
                                    />
                                </Field>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginTop: '0.85rem' }}>
                                <Field label="PF Number">
                                    <input
                                        className="input"
                                        value={detailForm.pf_number}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, pf_number: e.target.value }))}
                                        required
                                    />
                                </Field>
                                <Field label="Staff Category">
                                    <select
                                        className="select"
                                        value={detailForm.category}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, category: e.target.value }))}
                                    >
                                        <option value="SENIOR">SENIOR STAFF</option>
                                        <option value="JUNIOR">JUNIOR STAFF</option>
                                    </select>
                                </Field>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginTop: '0.85rem' }}>
                                <Field label="Email Address">
                                    <input
                                        type="email"
                                        className="input"
                                        value={detailForm.email}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, email: e.target.value }))}
                                        placeholder="staff@university.edu.ng"
                                    />
                                </Field>
                                <Field label="Phone Number (Used for Password Reset)">
                                    <input
                                        type="tel"
                                        className="input"
                                        value={detailForm.phone}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, phone: e.target.value }))}
                                        placeholder="080XXXXXXXX"
                                    />
                                </Field>
                            </div>
                        </section>

                        <section className="admin-detail-card-section">
                            <h4 className="admin-detail-section-title">
                                Academic Assignment
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <Field label="Department">
                                    <select
                                        className="select"
                                        value={detailForm.department_id || ''}
                                        onChange={(e) => {
                                            const idVal = e.target.value;
                                            const matched = departmentsList.find((d) => String(d.id) === String(idVal));
                                            setDetailForm((curr) => ({
                                                ...curr,
                                                department_id: idVal,
                                                department: matched ? matched.name : curr.department,
                                            }));
                                        }}
                                    >
                                        <option value="">Select Department</option>
                                        {departmentsList.map((dept) => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Rank / Designation">
                                    <select
                                        className="select"
                                        value={detailForm.rank_id || ''}
                                        onChange={(e) => {
                                            const idVal = e.target.value;
                                            const matched = ranksList.find((r) => String(r.id) === String(idVal));
                                            setDetailForm((curr) => ({
                                                ...curr,
                                                rank_id: idVal,
                                                rank: matched ? matched.name : curr.rank,
                                            }));
                                        }}
                                    >
                                        <option value="">Select Rank</option>
                                        {ranksList.map((rank) => (
                                            <option key={rank.id} value={rank.id}>{rank.name}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </section>

                        <section className="admin-detail-card-section">
                            <h4 className="admin-detail-section-title">
                                System Access & Role Control
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <Field label="Assigned Role">
                                    <select
                                        className="select"
                                        value={detailForm.role}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, role: e.target.value }))}
                                    >
                                        <option value="Staff">Staff</option>
                                        <option value="Moderator">Moderator</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </Field>
                                <Field label="Account Login Status">
                                    <select
                                        className="select"
                                        value={String(detailForm.is_active)}
                                        onChange={(e) => setDetailForm((curr) => ({ ...curr, is_active: Number(e.target.value) }))}
                                    >
                                        <option value="1">Active (Allow Sign In)</option>
                                        <option value="0">Deactivated (Block Sign In)</option>
                                    </select>
                                </Field>
                            </div>

                            <div className="admin-password-reset-box">
                                <div className="admin-password-reset-copy">
                                    <strong>Reset Password to Phone Number</strong>
                                    <p>
                                        Resets this staff member's password to their registered phone number
                                        {detailForm.phone?.trim() ? (
                                            <> (<strong>{detailForm.phone.trim()}</strong>)</>
                                        ) : (
                                            <> (<span style={{ color: '#dc2626' }}>No phone number specified</span>)</>
                                        )}.
                                        They will be forced to change it on their next login.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="admin-button admin-button-warning"
                                    onClick={handleResetPasswordToPhone}
                                    disabled={!detailForm.phone?.trim() || isPending(`force-reset-${selectedStaff.staffId}`)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                                >
                                    <KeyRound size={15} />
                                    {isPending(`force-reset-${selectedStaff.staffId}`) ? 'Resetting...' : 'Reset Password to Phone'}
                                </button>
                            </div>
                        </section>
                    </form>
                </AdminModal>
            )}
        </>
    );
}

function AdminReportsSection({ dashboard, staff, requests }) {
    const roleCounts = buildRoleCounts(staff.items);
    const requestRows = requests.map((item) => {
        const staffRecord = staff.items.find((staffItem) => staffItem.staffId === item.staffId);

        return {
            ...item,
            departmentName: staffRecord?.departmentName || 'Unassigned',
            rankName: staffRecord?.rankName || 'Unassigned',
            role: staffRecord?.role || 'No Account',
        };
    });
    const departmentRows = buildDepartmentReport(staff.items, requestRows);
    const linkedAccounts = staff.items.filter((item) => Boolean(item.role)).length;
    const structureCoverage = staff.items.filter((item) => item.departmentName && item.rankName).length;
    const topPendingRows = requestRows
        .filter((item) => item.pendingRequests > 0)
        .sort((left, right) => right.pendingRequests - left.pendingRequests || String(right.lastRequestAt).localeCompare(String(left.lastRequestAt)))
        .slice(0, 8);

    return (
        <>
            <AdminPageHeader
                title="Reports & Exports"
                subtitle="Use the current portal data to monitor access coverage, backlog pressure, and department-level activity."
                action={(
                    <div className="admin-report-actions">
                        <button
                            type="button"
                            className="admin-button admin-button-secondary"
                            onClick={() => downloadCsv('staff-directory.csv', buildStaffCsvRows(staff.items))}
                        >
                            Export Staff CSV
                        </button>
                        <button
                            type="button"
                            className="admin-button admin-button-primary"
                            onClick={() => downloadCsv('approval-queue.csv', buildRequestCsvRows(requestRows))}
                        >
                            Export Requests CSV
                        </button>
                    </div>
                )}
            />
            <div className="admin-dashboard-stats admin-report-stats">
                <div className="admin-dashboard-stat is-primary">
                    <div>
                        <h3>Active Staff</h3>
                        <strong>{dashboard.stats.staff}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-warning">
                    <div>
                        <h3>Pending Approvals</h3>
                        <strong>{dashboard.stats.pending}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-success">
                    <div>
                        <h3>Linked Accounts</h3>
                        <strong>{linkedAccounts}</strong>
                    </div>
                </div>
                <div className="admin-dashboard-stat is-neutral">
                    <div>
                        <h3>Profile Structure Ready</h3>
                        <strong>{structureCoverage}</strong>
                    </div>
                </div>
            </div>
            <section className="admin-panel card">
                <div className="admin-panel-header">
                    <h3>Role Coverage</h3>
                </div>
                <div className="admin-coverage-grid">
                    {Object.entries(roleCounts).map(([role, count]) => (
                        <div className="admin-coverage-card" key={role}>
                            <span>{role === 'None' ? 'No Account' : role}</span>
                            <strong>{count}</strong>
                        </div>
                    ))}
                </div>
            </section>
            <section className="admin-panel card">
                <div className="admin-panel-header">
                    <h3>Department Operations</h3>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>Staff</th>
                                <th>Pending Requests</th>
                                <th>Total Requests</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departmentRows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="admin-empty-cell">No department reporting data is available.</td>
                                </tr>
                            ) : departmentRows.map((item) => (
                                <tr key={item.departmentName}>
                                    <td className="admin-cell-strong">{item.departmentName}</td>
                                    <td>{item.staffCount}</td>
                                    <td><span className={`admin-badge ${item.pendingRequests > 0 ? 'is-warning' : 'is-success'}`}>{item.pendingRequests}</span></td>
                                    <td>{item.totalRequests}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <section className="admin-panel card">
                <div className="admin-panel-header">
                    <h3>Approval Backlog</h3>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Staff</th>
                                <th>Department</th>
                                <th>Pending</th>
                                <th>Last Request</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topPendingRows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="admin-empty-cell">There are no pending request backlogs right now.</td>
                                </tr>
                            ) : topPendingRows.map((item) => (
                                <tr key={item.staffId}>
                                    <td>
                                        <div className="admin-cell-stack">
                                            <strong>{item.name}</strong>
                                            <span>{item.staffNumber}</span>
                                        </div>
                                    </td>
                                    <td>{item.departmentName}</td>
                                    <td><span className="admin-badge is-warning">{item.pendingRequests}</span></td>
                                    <td>{formatDateTime(item.lastRequestAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function buildRoleCounts(items) {
    return items.reduce((counts, item) => {
        const role = item.role || 'None';
        counts[role] = (counts[role] || 0) + 1;
        return counts;
    }, { Admin: 0, Moderator: 0, Staff: 0, None: 0 });
}

function buildRoleDrafts(items) {
    return items.reduce((drafts, item) => {
        drafts[item.staffId] = item.role || 'Staff';
        return drafts;
    }, {});
}

function buildDepartmentReport(staffItems, requestRows) {
    const byDepartment = new Map();

    staffItems.forEach((item) => {
        const key = item.departmentName || 'Unassigned';
        const current = byDepartment.get(key) || {
            departmentName: key,
            staffCount: 0,
            pendingRequests: 0,
            totalRequests: 0,
        };

        current.staffCount += 1;
        byDepartment.set(key, current);
    });

    requestRows.forEach((item) => {
        const key = item.departmentName || 'Unassigned';
        const current = byDepartment.get(key) || {
            departmentName: key,
            staffCount: 0,
            pendingRequests: 0,
            totalRequests: 0,
        };

        current.pendingRequests += Number(item.pendingRequests || 0);
        current.totalRequests += Number(item.totalRequests || 0);
        byDepartment.set(key, current);
    });

    return Array.from(byDepartment.values()).sort((left, right) => {
        if (right.pendingRequests !== left.pendingRequests) {
            return right.pendingRequests - left.pendingRequests;
        }

        return right.staffCount - left.staffCount;
    });
}

function buildStaffCsvRows(items) {
    return items.map((item) => ({
        'Staff Name': item.name,
        'PF Number': item.staffNumber,
        Email: item.email,
        Department: item.departmentName || '',
        Rank: item.rankName || '',
        Role: item.role || 'No Account',
    }));
}

function buildRequestCsvRows(items) {
    return items.map((item) => ({
        'Staff Name': item.name,
        'PF Number': item.staffNumber,
        Department: item.departmentName || '',
        Rank: item.rankName || '',
        Role: item.role || 'No Account',
        'Pending Requests': item.pendingRequests,
        'Total Requests': item.totalRequests,
        'Last Request At': item.lastRequestAt,
    }));
}

function downloadCsv(filename, rows) {
    if (!rows.length || typeof window === 'undefined') {
        return;
    }

    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
    const stringValue = String(value ?? '');
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

export {
    AdminVerificationQueueSection,
    AdminAccountsRolesSection,
    AdminReportsSection,
};
