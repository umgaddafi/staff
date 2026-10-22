import { useEffect, useState } from 'react';
import { ComparisonTable } from '../../components/common/states';
import { AdminModal, AdminPageHeader, Field } from '../../components/common/ui';
import { usePendingAction } from '../../hooks/usePendingAction';
import { api } from '../../lib/api';
import { formatDateTime, getErrorMessage } from '../../utils/formatters';
import { PortalNavIcon } from '../../components/icons/AppIcons';
import { useConfirm } from '../../contexts/ConfirmContext';

const REQUEST_TABS = [
    { key: 'pending', label: 'Pending' },
    { key: 'recent', label: 'Recent History' },
    { key: 'all', label: 'All History' },
];

const QUEUE_MODES = [
    { key: 'pending-first', label: 'Pending First' },
    { key: 'pending-only', label: 'Pending Only' },
    { key: 'all', label: 'All Staff' },
];

function AdminRequestsWorkspace({
    summary,
    reloadPortal,
    showFlash,
    title = 'Change Requests',
    subtitle = 'Review staff updates, compare submitted changes, and approve or reject from one workspace.',
    initialQueueMode = 'pending-first',
    initialTab = 'pending',
}) {
    const [history, setHistory] = useState(null);
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [historyError, setHistoryError] = useState('');
    const [search, setSearch] = useState('');
    const [queueMode, setQueueMode] = useState(initialQueueMode);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedLogId, setSelectedLogId] = useState(null);
    const [rejectionState, setRejectionState] = useState({ open: false, logId: null, reason: '' });
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();

    const filteredSummary = filterRequestQueue(summary, search, queueMode);
    const selectedStaff = filteredSummary.find((item) => item.staffId === selectedStaffId) || null;
    const tabCounts = history ? {
        pending: getVisibleLogs(history.logs, 'pending').length,
        recent: getVisibleLogs(history.logs, 'recent').length,
        all: history.logs.length,
    } : {
        pending: 0,
        recent: 0,
        all: 0,
    };
    const visibleLogs = history ? getVisibleLogs(history.logs, activeTab) : [];
    const selectedLog = visibleLogs.find((log) => log.log_id === selectedLogId) || visibleLogs[0] || null;
    const workspaceStats = buildWorkspaceStats(summary);

    useEffect(() => {
        if (!filteredSummary.length) {
            setSelectedStaffId(null);
            setHistory(null);
            setHistoryError('');
            return;
        }

        if (filteredSummary.some((item) => item.staffId === selectedStaffId)) {
            return;
        }

        void loadHistory(filteredSummary[0].staffId);
    }, [filteredSummary, selectedStaffId]);

    useEffect(() => {
        if (!history) {
            setSelectedLogId(null);
            return;
        }

        if (activeTab === 'pending' && getVisibleLogs(history.logs, 'pending').length === 0 && history.logs.length > 0) {
            setActiveTab('recent');
            return;
        }

        const nextVisibleLogs = getVisibleLogs(history.logs, activeTab);
        if (!nextVisibleLogs.length) {
            setSelectedLogId(null);
            return;
        }

        if (!nextVisibleLogs.some((log) => log.log_id === selectedLogId)) {
            setSelectedLogId(nextVisibleLogs[0].log_id);
        }
    }, [history, activeTab, selectedLogId]);

    async function loadHistory(staffId) {
        setHistoryError('');
        return runPending(`load-history-${staffId}`, async () => {
            try {
                const result = await api(`/api/admin/requests/${staffId}`);
                const hasPending = getVisibleLogs(result.logs, 'pending').length > 0;
                const nextTab = hasPending ? 'pending' : 'recent';
                const nextLogs = getVisibleLogs(result.logs, nextTab);

                setHistory(result);
                setSelectedStaffId(staffId);
                setActiveTab(nextTab);
                setSelectedLogId(nextLogs[0]?.log_id ?? null);

                return { ok: true, result };
            } catch (loadError) {
                setHistory(null);
                setSelectedStaffId(staffId);
                setSelectedLogId(null);
                setHistoryError(getErrorMessage(loadError));
                showFlash(getErrorMessage(loadError), 'error');
                return { ok: false, error: loadError };
            }
        });
    }

    async function submitDecision(logId, decision, rejectionReason = '') {
        return runPending(`${decision}-${logId}`, async () => {
            try {
                const result = await api(`/api/admin/review/${logId}`, {
                    method: 'POST',
                    data: {
                        decision,
                        rejection_reason: rejectionReason,
                    },
                });

                showFlash(result.message || 'Request updated.');
                setRejectionState({ open: false, logId: null, reason: '' });
                await reloadPortal();
                if (selectedStaffId) {
                    await loadHistory(selectedStaffId);
                }

                return { ok: true, result };
            } catch (decisionError) {
                showFlash(getErrorMessage(decisionError), 'error');
                return { ok: false, error: decisionError };
            }
        });
    }

    async function submitRejection(event) {
        event.preventDefault();
        if (!rejectionState.logId || rejectionState.reason.trim() === '') {
            return;
        }

        await submitDecision(rejectionState.logId, 'reject', rejectionState.reason);
    }

    async function submitApproveAll() {
        await confirm({
            title: 'Approve All Requests',
            message: 'Are you sure you want to approve ALL pending requests? This will apply all pending changes to the database.',
            confirmText: 'Approve All',
            danger: false,
            action: async () => {
                try {
                    const result = await api('/api/admin/requests/approve-all', {
                        method: 'POST',
                    });

                    showFlash(result.message || 'All pending requests approved.');
                    await reloadPortal();
                    if (selectedStaffId) {
                        await loadHistory(selectedStaffId);
                    }

                    return { ok: true, result };
                } catch (error) {
                    showFlash(getErrorMessage(error), 'error');
                    return { ok: false, error };
                }
            }
        });
    }

    const statCards = [
        { key: 'pending', label: 'Pending Requests', value: workspaceStats.pending, icon: 'requests', tone: 'warning' },
        { key: 'staff', label: 'Staff in Queue', value: workspaceStats.staff, icon: 'staff', tone: 'success' },
        { key: 'total', label: 'Total Requests', value: workspaceStats.total, icon: 'documents', tone: 'primary' },
    ];

    return (
        <>
            <AdminPageHeader
                title={title}
                subtitle={subtitle}
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
            <section className="admin-request-toolbar card">
                <div className="admin-request-toolbar-grid">
                    <Field label="Search Staff Name / PF Number">
                        <input
                            className="input"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="e.g. Jane or UNIV/2024/001"
                        />
                    </Field>
                    <div className="field">
                        <label>Queue Focus</label>
                        <div className="admin-request-chip-group">
                            {QUEUE_MODES.map((mode) => (
                                <button
                                    key={mode.key}
                                    type="button"
                                    className={`admin-request-chip${queueMode === mode.key ? ' is-active' : ''}`}
                                    onClick={() => setQueueMode(mode.key)}
                                    aria-pressed={queueMode === mode.key}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            <section className="admin-request-workspace">
                <aside className="admin-request-queue card">
                    <div className="admin-request-section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="admin-request-section-copy">
                            <h3>Request Queue</h3>
                            <p>{filteredSummary.length} staff record{filteredSummary.length === 1 ? '' : 's'} in view</p>
                        </div>
                        {workspaceStats.pending > 0 && (
                            <button
                                type="button"
                                className="admin-button admin-button-primary"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                onClick={submitApproveAll}
                                disabled={isPending('approve-all')}
                            >
                                {isPending('approve-all') ? 'Approving...' : 'Approve All'}
                            </button>
                        )}
                    </div>
                    {filteredSummary.length === 0 ? (
                        <div className="admin-empty-state">
                            <strong>No request records found.</strong>
                            <p>Try a different search term or queue filter.</p>
                        </div>
                    ) : (
                        <div className="admin-request-queue-list">
                            {filteredSummary.map((item) => {
                                const isSelected = item.staffId === selectedStaffId;
                                const isLoadingHistory = isPending(`load-history-${item.staffId}`);

                                return (
                                    <button
                                        key={item.staffId}
                                        type="button"
                                        className={`admin-request-queue-item${isSelected ? ' is-selected' : ''}`}
                                        onClick={() => {
                                            if (!isSelected || !history) {
                                                void loadHistory(item.staffId);
                                            }
                                        }}
                                        disabled={isLoadingHistory}
                                    >
                                        <div className="admin-request-queue-item-head">
                                            <div>
                                                <strong>{item.name}</strong>
                                                <span>{item.staffNumber}</span>
                                            </div>
                                            <span className={`admin-badge ${item.pendingRequests > 0 ? 'is-pending' : 'is-approved'}`}>
                                                {item.pendingRequests} pending
                                            </span>
                                        </div>
                                        <div className="admin-request-queue-item-foot">
                                            <span>{item.totalRequests} total request{item.totalRequests === 1 ? '' : 's'}</span>
                                            <time dateTime={item.lastRequestAt}>{formatDateTime(item.lastRequestAt)}</time>
                                        </div>
                                        {isLoadingHistory ? (
                                            <span className="admin-request-queue-item-state">Loading requests...</span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </aside>
                <section className="admin-request-detail card">
                    <div className="admin-request-section-head">
                        <div className="admin-request-section-copy">
                            <h3>Request Detail</h3>
                            <p>Inspect one request at a time before making a decision.</p>
                        </div>
                    </div>
                    {historyError ? <div className="admin-inline-alert is-danger">{historyError}</div> : null}
                    {!history ? (
                        <div className="admin-empty-state">
                            <strong>Select a staff member.</strong>
                            <p>The request timeline and approval controls will appear here.</p>
                        </div>
                    ) : (
                        <AdminRequestDetailPane
                            history={history}
                            selectedStaff={selectedStaff}
                            activeTab={activeTab}
                            selectedLog={selectedLog}
                            selectedLogId={selectedLogId}
                            tabCounts={tabCounts}
                            visibleLogs={visibleLogs}
                            onSelectLog={setSelectedLogId}
                            onChangeTab={setActiveTab}
                            onApprove={(logId) => submitDecision(logId, 'approve')}
                            onReject={(logId) => setRejectionState({ open: true, logId, reason: '' })}
                            isPending={isPending}
                        />
                    )}
                </section>
            </section>
            <AdminModal
                open={rejectionState.open}
                title="Reject Request"
                onClose={() => {
                    if (!rejectionState.logId || isPending(`reject-${rejectionState.logId}`)) {
                        return;
                    }

                    setRejectionState({ open: false, logId: null, reason: '' });
                }}
                actions={(
                    <>
                        <button
                            type="button"
                            className="admin-button admin-button-secondary"
                            onClick={() => setRejectionState({ open: false, logId: null, reason: '' })}
                            disabled={Boolean(rejectionState.logId) && isPending(`reject-${rejectionState.logId}`)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="admin-request-rejection-form"
                            className="admin-button admin-button-danger"
                            disabled={!rejectionState.reason.trim() || (Boolean(rejectionState.logId) && isPending(`reject-${rejectionState.logId}`))}
                        >
                            {Boolean(rejectionState.logId) && isPending(`reject-${rejectionState.logId}`) ? 'Rejecting...' : 'Reject Request'}
                        </button>
                    </>
                )}
            >
                <form id="admin-request-rejection-form" className="admin-modal-form" onSubmit={submitRejection}>
                    <div className="admin-request-reason-note">
                        This reason will be stored with the request and sent back to the staff member as part of the rejection decision.
                    </div>
                    <Field label="Rejection Reason">
                        <textarea
                            className="textarea"
                            rows="5"
                            value={rejectionState.reason}
                            onChange={(event) => setRejectionState((current) => ({ ...current, reason: event.target.value }))}
                            placeholder="State clearly why this request cannot be approved."
                            required
                        />
                    </Field>
                </form>
            </AdminModal>
        </>
    );
}

function AdminRequestDetailPane({
    history,
    selectedStaff,
    activeTab,
    selectedLog,
    selectedLogId,
    tabCounts,
    visibleLogs,
    onSelectLog,
    onChangeTab,
    onApprove,
    onReject,
    isPending,
}) {
    const statusCounts = buildStatusCounts(history.logs);
    const comparisonFields = selectedLog?.comparison?.fields || [];
    const { detailFields, evidenceFields } = splitComparisonFields(comparisonFields);
    const approvePending = selectedLog ? isPending(`approve-${selectedLog.log_id}`) : false;
    const rejectPending = selectedLog ? isPending(`reject-${selectedLog.log_id}`) : false;

    return (
        <div className="admin-request-detail-shell">
            <div className="admin-request-staff-card">
                <div className="admin-request-staff-copy">
                    <strong>{history.staff.name}</strong>
                    <span>PF Number: {history.staff.staffNumber}</span>
                    {selectedStaff && selectedStaff.staffId !== history.staff.staffId ? (
                        <span>Viewing request history outside the current queue filter.</span>
                    ) : null}
                </div>
                <div className="admin-request-staff-meta">
                    <span className="admin-badge is-pending">{statusCounts.pending} pending</span>
                    <span className="admin-badge is-approved">{statusCounts.approved} approved</span>
                    <span className="admin-badge is-rejected">{statusCounts.rejected} rejected</span>
                </div>
            </div>

            <div className="admin-request-tablist" role="tablist" aria-label="Request views">
                {REQUEST_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        className={`admin-request-tab${activeTab === tab.key ? ' is-active' : ''}`}
                        aria-selected={activeTab === tab.key}
                        onClick={() => onChangeTab(tab.key)}
                    >
                        <span>{tab.label}</span>
                        <strong>{tabCounts[tab.key]}</strong>
                    </button>
                ))}
            </div>

            {visibleLogs.length === 0 ? (
                <div className="admin-empty-state">
                    <strong>No requests in this view.</strong>
                    <p>Switch tabs to inspect a different part of the request timeline.</p>
                </div>
            ) : (
                <>
                    <div className="admin-request-log-strip">
                        {visibleLogs.map((log) => (
                            <button
                                key={log.log_id}
                                type="button"
                                className={`admin-request-log-card${selectedLogId === log.log_id ? ' is-active' : ''}`}
                                onClick={() => onSelectLog(log.log_id)}
                            >
                                <div className="admin-request-log-card-head">
                                    <strong>{formatRequestTitle(log)}</strong>
                                    <span className={`admin-badge is-${String(log.status || '').toLowerCase()}`}>{log.status}</span>
                                </div>
                                <div className="admin-request-log-card-meta">
                                    <span>{log.username || 'Staff request'}</span>
                                    <time dateTime={log.timestamp}>{formatDateTime(log.timestamp)}</time>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedLog ? (
                        <>
                            <article className="admin-request-detail-card">
                                <div className="admin-request-detail-header">
                                    <div>
                                        <p className="admin-request-detail-eyebrow">Selected Request</p>
                                        <h4>{formatRequestTitle(selectedLog)}</h4>
                                    </div>
                                    <span className={`admin-badge is-${String(selectedLog.status || '').toLowerCase()}`}>{selectedLog.status}</span>
                                </div>

                                <section className="admin-request-summary-card">
                                    <div className="admin-request-summary-grid">
                                        <div className="admin-request-summary-item">
                                            <span>Request ID</span>
                                            <strong>#{selectedLog.log_id}</strong>
                                        </div>
                                        <div className="admin-request-summary-item">
                                            <span>Submitted By</span>
                                            <strong>{selectedLog.username || history.staff.name}</strong>
                                        </div>
                                        <div className="admin-request-summary-item">
                                            <span>Submitted At</span>
                                            <strong>{formatDateTime(selectedLog.timestamp)}</strong>
                                        </div>
                                        <div className="admin-request-summary-item">
                                            <span>Record Type</span>
                                            <strong>{humanizeEntityName(selectedLog.entity_name)}</strong>
                                        </div>
                                    </div>
                                </section>

                                {selectedLog.admin_comment ? (
                                    <section className="admin-request-reason-card">
                                        <div className="admin-request-block-head">
                                            <h5>Admin Comment</h5>
                                        </div>
                                        <p>{selectedLog.admin_comment}</p>
                                    </section>
                                ) : null}

                                <section className="admin-request-content-card">
                                    <div className="admin-request-block-head">
                                        <h5>Changed Fields</h5>
                                        <span>{detailFields.length} field{detailFields.length === 1 ? '' : 's'} under review</span>
                                    </div>
                                    {detailFields.length ? (
                                        <ComparisonTable comparison={{ fields: detailFields }} />
                                    ) : (
                                        <div className="admin-request-inline-empty">No direct text fields were changed for this request.</div>
                                    )}
                                </section>

                                {evidenceFields.length ? (
                                    <section className="admin-request-content-card">
                                        <div className="admin-request-block-head">
                                            <h5>Evidence & Attachments</h5>
                                            <span>{evidenceFields.length} item{evidenceFields.length === 1 ? '' : 's'}</span>
                                        </div>
                                        <div className="admin-request-evidence-grid">
                                            {evidenceFields.map((field) => (
                                                <AdminRequestEvidenceCard key={field.field} field={field} />
                                            ))}
                                        </div>
                                    </section>
                                ) : null}
                            </article>

                            <div className={`admin-request-decision-bar${selectedLog.status === 'Pending' ? '' : ' is-readonly'}`}>
                                <div className="admin-request-decision-copy">
                                    <strong>{selectedLog.status === 'Pending' ? 'Ready to decide?' : `Request ${String(selectedLog.status || '').toLowerCase()}.`}</strong>
                                    <span>
                                        {selectedLog.status === 'Pending'
                                            ? 'Approve to apply the change immediately, or reject it with a clear reason for the staff member.'
                                            : 'This request has already been processed. Use the tabs above to move through other requests.'}
                                    </span>
                                </div>
                                {selectedLog.status === 'Pending' ? (
                                    <div className="admin-request-decision-actions">
                                        <button
                                            type="button"
                                            className="admin-button admin-button-primary"
                                            onClick={() => {
                                                void onApprove(selectedLog.log_id);
                                            }}
                                            disabled={approvePending || rejectPending}
                                        >
                                            {approvePending ? 'Approving...' : 'Approve'}
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-button admin-button-danger"
                                            onClick={() => onReject(selectedLog.log_id)}
                                            disabled={approvePending || rejectPending}
                                        >
                                            {rejectPending ? 'Rejecting...' : 'Reject'}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </>
                    ) : null}
                </>
            )}
        </div>
    );
}

function AdminRequestEvidenceCard({ field }) {
    return (
        <article className="admin-request-evidence-card">
            <strong>{field.label}</strong>
            <div className="admin-request-evidence-compare">
                <div className="admin-request-evidence-box">
                    <span>Current</span>
                    {renderEvidenceValue(field.currentDisplay, field.currentUrl)}
                </div>
                <div className="admin-request-evidence-box">
                    <span>Submitted</span>
                    {renderEvidenceValue(field.proposedDisplay, field.proposedUrl)}
                </div>
            </div>
        </article>
    );
}

function renderEvidenceValue(display, url) {
    if (!url) {
        return <div className="admin-request-file-empty">{display || 'Empty'}</div>;
    }

    if (isImageUrl(url)) {
        return (
            <a className="admin-request-image-link" href={url} target="_blank" rel="noreferrer">
                <img className="admin-request-image-preview" src={url} alt={display || 'Evidence'} />
                <span>Open image</span>
            </a>
        );
    }

    return (
        <a className="admin-request-file-link" href={url} target="_blank" rel="noreferrer">
            {display || 'Open file'}
        </a>
    );
}

function isImageUrl(url) {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
}

function splitComparisonFields(fields = []) {
    const detailFields = [];
    const evidenceFields = [];

    fields.forEach((field) => {
        if (field.currentUrl || field.proposedUrl) {
            evidenceFields.push(field);
            return;
        }

        detailFields.push(field);
    });

    return { detailFields, evidenceFields };
}

function filterRequestQueue(summary, search, queueMode) {
    const query = search.trim().toLowerCase();
    let items = summary.filter((item) => {
        if (!query) {
            return true;
        }

        return `${item.name} ${item.staffNumber}`.toLowerCase().includes(query);
    });

    if (queueMode === 'pending-only') {
        items = items.filter((item) => item.pendingRequests > 0);
    }

    return items.slice().sort((left, right) => {
        if (queueMode === 'all') {
            return String(right.lastRequestAt || '').localeCompare(String(left.lastRequestAt || ''));
        }

        if (right.pendingRequests !== left.pendingRequests) {
            return right.pendingRequests - left.pendingRequests;
        }

        return String(right.lastRequestAt || '').localeCompare(String(left.lastRequestAt || ''));
    });
}

function getVisibleLogs(logs = [], tab) {
    if (tab === 'pending') {
        return logs.filter((log) => String(log.status) === 'Pending');
    }

    if (tab === 'recent') {
        return logs.slice(0, 6);
    }

    return logs;
}

function buildStatusCounts(logs = []) {
    return logs.reduce((counts, log) => {
        const status = String(log.status || '').toLowerCase();
        if (status === 'pending') {
            counts.pending += 1;
        } else if (status === 'approved') {
            counts.approved += 1;
        } else if (status === 'rejected') {
            counts.rejected += 1;
        }

        return counts;
    }, { pending: 0, approved: 0, rejected: 0 });
}

function buildWorkspaceStats(summary = []) {
    return summary.reduce((stats, item) => {
        stats.pending += Number(item.pendingRequests || 0);
        stats.total += Number(item.totalRequests || 0);
        stats.staff += 1;
        return stats;
    }, { pending: 0, total: 0, staff: 0 });
}

function humanizeEntityName(value = '') {
    return String(value)
        .split('_')
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
}

function formatRequestTitle(log) {
    const action = String(log.action || '').toUpperCase();
    const entity = humanizeEntityName(log.entity_name);

    if (action === 'CREATE') {
        return `Create ${entity}`;
    }

    if (action === 'DELETE') {
        return `Delete ${entity}`;
    }

    if (action === 'UPDATE') {
        return `Update ${entity}`;
    }

    return `${action} ${entity}`.trim();
}

export { AdminRequestsWorkspace };
