import { useEffect, useState } from 'react';
import { AuthShell } from '../layouts/AuthShells';
import { initials } from '../../utils/formatters';

function LoadingScreen({ label = 'Loading application...', compact = false }) {
    if (compact) {
        return (
            <div className="loading-inline" role="status" aria-live="polite">
                <div className="loading-spinner loading-spinner-inline" aria-hidden="true" />
                <div className="loading-copy">
                    <strong>Loading...</strong>
                    <span>{label}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="loading-screen">
            <div className="loading-panel" role="status" aria-live="polite">
                <div className="loading-spinner" aria-hidden="true" />
                <div className="loading-copy">
                    <strong>Loading...</strong>
                    <span>{label}</span>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ title, copy }) {
    return (
        <div className="empty-state">
            <strong>{title}</strong>
            <div>{copy}</div>
        </div>
    );
}

function ErrorState({ title = 'Unable to load this view.', message, onRetry, fullScreen = false }) {
    const content = (
        <div className="section-card stack" style={{ padding: 24 }}>
            <strong>{title}</strong>
            <p className="muted" style={{ margin: 0 }}>{message}</p>
            {onRetry && (
                <div className="toolbar" style={{ marginTop: 0 }}>
                    <button className="button" type="button" onClick={onRetry}>
                        Try again
                    </button>
                </div>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <AuthShell
                title="The workspace could not be reached"
                copy="The frontend is up, but the portfolio service did not return the expected data for this request."
                mobileCopy="The service did not return the expected data."
            >
                <div className="auth-card card stack">
                    <p className="page-eyebrow">Connection status</p>
                    <h2>Connection problem</h2>
                    <p className="muted">{message}</p>
                    {onRetry && (
                        <div className="toolbar" style={{ marginTop: 0 }}>
                            <button className="button" type="button" onClick={onRetry}>
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            </AuthShell>
        );
    }

    return content;
}

function Avatar({ name, photoUrl, className = 'avatar', imageFit = 'cover' }) {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [photoUrl]);

    if (photoUrl && !imgError) {
        return (
            <div className={className}>
                <img
                    src={photoUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: imageFit }}
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    return <div className={className}>{initials(name)}</div>;
}

function ComparisonTable({ comparison }) {
    if (!comparison?.fields?.length) {
        return null;
    }

    return (
        <div className="comparison-grid">
            {comparison.fields.map((field) => (
                <div className="comparison-row" key={field.field}>
                    <div className="comparison-label">{field.label}</div>
                    <div className="comparison-box">
                        <strong>Current</strong>
                        <div>{renderComparisonValue(field.currentDisplay, field.currentUrl)}</div>
                    </div>
                    <div className="comparison-box">
                        <strong>Proposed</strong>
                        <div>{renderComparisonValue(field.proposedDisplay, field.proposedUrl)}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function renderComparisonValue(display, url) {
    if (url) {
        const isImage = /\.(jpg|jpeg|png|webp)$/i.test(url);
        if (isImage) {
            return <img src={url} alt={display || 'Evidence'} style={{ maxWidth: 120, borderRadius: 12 }} />;
        }

        return (
            <a className="link-button" href={url} target="_blank" rel="noreferrer">
                View file
            </a>
        );
    }

    return display || 'Empty';
}

export { LoadingScreen, EmptyState, ErrorState, Avatar, ComparisonTable };
