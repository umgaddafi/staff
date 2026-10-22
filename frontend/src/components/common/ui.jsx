import { useModalLifecycle } from '../../hooks/useModalLifecycle';

function Flash({ flash, onClear }) {
    if (!flash) {
        return null;
    }

    return (
        <div className={`flash ${flash.type || 'success'}`} onClick={onClear} role="status">
            <strong>{flash.type === 'error' ? 'Error' : 'Notice'}</strong>
            <div>{flash.message}</div>
        </div>
    );
}

function AdminModal({ open, title, children, actions, onClose, className = '' }) {
    useModalLifecycle({ open, onClose });

    if (!open) {
        return null;
    }

    return (
        <div className="admin-modal-root" role="presentation">
            <button type="button" className="admin-modal-backdrop" onClick={onClose} aria-label="Close dialog" />
            <div className={`admin-modal-window card ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title}>
                <div className="admin-modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close dialog">
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div className="admin-modal-body">{children}</div>
                <div className="admin-modal-actions">{actions}</div>
            </div>
        </div>
    );
}

function AdminPageHeader({ title, subtitle = '', action = null, meta = null }) {
    return (
        <div className="admin-page-header">
            <div className="admin-page-header-copy">
                <h2>{title}</h2>
                {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <div className="admin-page-header-side">
                {meta ? <div className="admin-page-header-meta">{meta}</div> : null}
                {action}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="field">
            <label>{label}</label>
            {children}
        </div>
    );
}

export { Flash, AdminModal, AdminPageHeader, Field };
