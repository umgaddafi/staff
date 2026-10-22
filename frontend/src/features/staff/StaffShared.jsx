import { ComparisonTable } from '../../components/common/states';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { formatDateTime } from '../../utils/formatters';
import { historyEntityLabel } from './constants';

function StaffModal({ open, title, children, actions, onClose, wide = false }) {
    useModalLifecycle({ open, onClose });

    if (!open) {
        return null;
    }

    return (
        <div className="staff-modal-root" role="presentation">
            <button type="button" className="staff-modal-backdrop" onClick={onClose} aria-label="Close dialog" />
            <div className={`staff-modal-window${wide ? ' is-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
                <div className="staff-modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="staff-modal-close" onClick={onClose} aria-label="Close dialog">
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div className="staff-modal-body">{children}</div>
                <div className="staff-modal-actions">{actions}</div>
            </div>
        </div>
    );
}

function StaffPageHeader({ title, copy, action = null, meta = null }) {
    return (
        <div className="staff-page-header">
            <div className="staff-page-header-copy">
                <h2>{title}</h2>
                {copy ? <p>{copy}</p> : null}
            </div>
            <div className="staff-page-header-side">
                {meta}
                {action}
            </div>
        </div>
    );
}

function HistorySection({ items }) {
    return (
        <>
            <StaffPageHeader
                title="Activity Log"
                copy="Track the status of your profile updates and admin approvals."
            />
            <HistoryList items={items} />
        </>
    );
}

function HistoryList({ items, condensed = false }) {
    if (!items.length) {
        return <div className="staff-empty-card"><p>No recent activity. Changes you make to your profile will appear here.</p></div>;
    }

    return (
        <div className="staff-history-list">
            {items.map((item) => (
                <article className="staff-history-card" key={item.log_id}>
                    <div className="staff-history-head">
                        <div className={`staff-history-icon is-${String(item.action || '').toLowerCase()}`}>
                            {item.action === 'CREATE' ? '+' : item.action === 'DELETE' ? '−' : '✎'}
                        </div>
                        <div>
                            <strong>{item.action}: {historyEntityLabel(item)}</strong>
                            <div className="staff-history-time">{formatDateTime(item.timestamp)}</div>
                        </div>
                        <span className={`staff-status-pill is-${String(item.status || '').toLowerCase()}`}>{item.status}</span>
                    </div>
                    {!condensed && (
                        <details className="staff-history-details">
                            <summary>View request details</summary>
                            <ComparisonTable comparison={item.comparison} />
                            {item.admin_comment && <p className="staff-history-note">Admin note: {item.admin_comment}</p>}
                        </details>
                    )}
                </article>
            ))}
        </div>
    );
}

export { StaffModal, StaffPageHeader, HistorySection, HistoryList };
