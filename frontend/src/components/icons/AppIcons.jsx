function UserFieldIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M19 21a7 7 0 0 0-14 0" />
            <circle cx="12" cy="8" r="4" />
        </svg>
    );
}

function LockFieldIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
        </svg>
    );
}

function EyeFieldIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.8" />
        </svg>
    );
}

function EyeOffFieldIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M3 3l18 18" />
            <path d="M10.7 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.7 17.7 0 0 1-3.2 3.8" />
            <path d="M6.1 6.8C3.9 8.3 2.5 12 2.5 12s3.5 6 9.5 6c1.7 0 3.2-.5 4.5-1.2" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
    );
}

function SidebarToggleIcon({ collapsed, ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M9 4v16" />
            {collapsed ? <path d="m13 9 4 3-4 3" /> : <path d="m15 9-4 3 4 3" />}
        </svg>
    );
}

function MenuToggleIcon({ open, ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {open ? (
                <>
                    <path d="m6 6 12 12" />
                    <path d="M18 6 6 18" />
                </>
            ) : (
                <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                </>
            )}
        </svg>
    );
}

function PortalActionIcon({ name, ...props }) {
    if (name === 'preview') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.8" />
            </svg>
        );
    }

    if (name === 'public') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3a15.3 15.3 0 0 1 0 18" />
                <path d="M12 3a15.3 15.3 0 0 0 0 18" />
            </svg>
        );
    }

    if (name === 'logout') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M14 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
                <path d="M10 17 15 12 10 7" />
                <path d="M15 12H4" />
            </svg>
        );
    }

    return null;
}

function PublicPortfolioIcon({ name, ...props }) {
    if (name === 'mail') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <rect x="3" y="5" width="18" height="14" rx="2.2" />
                <path d="m4.5 7 7.5 6 7.5-6" />
            </svg>
        );
    }

    if (name === 'phone') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M8.4 3.2c.4-.4 1-.5 1.5-.3l2.3.9c.6.2.9.9.8 1.5l-.5 2.5c-.1.5.1 1 .5 1.4l1.2 1.2c.4.4.9.6 1.4.5l2.5-.5c.6-.1 1.2.2 1.5.8l.9 2.3c.2.5.1 1.1-.3 1.5l-1.7 1.7c-.8.8-2 1.2-3.1 1-2.8-.5-5.8-2.1-8.5-4.9-2.8-2.8-4.4-5.7-4.9-8.5-.2-1.1.2-2.3 1-3.1z" />
            </svg>
        );
    }

    if (name === 'location') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M12 2.8a6.5 6.5 0 0 0-6.5 6.5c0 4.7 5 10.7 5.3 11 .3.4.9.4 1.2 0 .2-.3 5.2-6.3 5.2-11A6.5 6.5 0 0 0 12 2.8Zm0 9.3a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z" />
            </svg>
        );
    }

    if (name === 'bio') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M12 2.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 11.8c-4.6 0-8.4 2.4-8.4 5.4 0 .7.6 1.2 1.2 1.2h14.4c.7 0 1.2-.5 1.2-1.2 0-3-3.8-5.4-8.4-5.4Z" />
            </svg>
        );
    }

    if (name === 'education') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M12 3 2.5 8.2 12 13.4l7.6-4.1v5.4h1.9V8.2z" />
                <path d="M6.1 11.2v3.8c0 1.4 2.7 3.2 5.9 3.2s5.9-1.8 5.9-3.2v-3.8L12 14.5z" />
            </svg>
        );
    }

    if (name === 'research') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M9 3h6" />
                <path d="M10 3v5l-4.8 8.2A3 3 0 0 0 7.8 21h8.4a3 3 0 0 0 2.6-4.8L14 8V3" />
                <path d="M8.2 15h7.6" />
            </svg>
        );
    }

    if (name === 'teaching') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 20h8" />
                <path d="M12 16v4" />
                <path d="m7 8 5 3 5-3" />
            </svg>
        );
    }

    if (name === 'grants') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M12 2.8a6 6 0 0 0-6 6c0 1.4.5 2.7 1.4 3.8L12 21.2l4.6-8.6A6 6 0 0 0 18 8.8a6 6 0 0 0-6-6Zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
            </svg>
        );
    }

    if (name === 'linkedin') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M6.4 8.8a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Zm-1.2 2h2.4v8.4H5.2zm4.5 0h2.3V12c.3-.7 1.1-1.4 2.3-1.4 1.7 0 2 1 2 2.8v5.8h2.4v-6.1c0-3-1.6-4.4-3.8-4.4-1.8 0-2.6 1-3 1.7v-1.5H9.7z" />
            </svg>
        );
    }

    if (name === 'globe') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3a15.3 15.3 0 0 1 0 18" />
                <path d="M12 3a15.3 15.3 0 0 0 0 18" />
            </svg>
        );
    }

    return null;
}

function publicProfileLinkIcon(platform = '') {
    const normalized = platform.toLowerCase();

    if (normalized.includes('linked')) {
        return 'linkedin';
    }

    return 'globe';
}

function StaffDashboardActionIcon({ name, ...props }) {
    if (name === 'plus') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M12 5v14" />
                <path d="M5 12h14" />
            </svg>
        );
    }

    if (name === 'link') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M10 13.5 14 9.5" />
                <path d="M7.3 16.2 5.8 17.7a3 3 0 1 1-4.2-4.2L5 10.1a3 3 0 0 1 4.2 0" />
                <path d="m16.7 7.8 1.5-1.5a3 3 0 1 1 4.2 4.2L19 13.9a3 3 0 0 1-4.2 0" />
            </svg>
        );
    }

    if (name === 'edit') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
        );
    }

    if (name === 'shield') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M12 3 5 6v5c0 5 3.4 8.3 7 10 3.6-1.7 7-5 7-10V6l-7-3Z" />
                <path d="M12 8v8" />
                <path d="M8.5 11.5h7" />
            </svg>
        );
    }

    if (name === 'download') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M12 4v11" />
                <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
                <path d="M4 20h16" />
            </svg>
        );
    }

    if (name === 'payslip' || name === 'document') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
        );
    }

    return null;
}

function StaffDashboardStatIcon({ name, ...props }) {
    if (name === 'publications') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                <path d="M8 7h8" />
                <path d="M8 11h6" />
            </svg>
        );
    }

    if (name === 'supervisions') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        );
    }

    if (name === 'grants') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <circle cx="12" cy="8" r="6" />
                <path d="M12 2v12" />
                <path d="M9 11l3 3 3-3" />
                <path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.11" />
            </svg>
        );
    }

    if (name === 'verifiedLogs') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
            </svg>
        );
    }

    return null;
}

function StaffPortalBrandIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M12 3 2 8v2h20V8z" />
            <path d="M4 11h2v6H4zm4 0h2v6H8zm6 0h2v6h-2zm4 0h2v6h-2z" opacity="0.9" />
            <path d="M2 19h20v2H2z" />
        </svg>
    );
}

function NotificationBellIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M12 3.8a5.2 5.2 0 0 0-5.2 5.2v2.6c0 .9-.3 1.8-.8 2.6l-1.1 1.8a1 1 0 0 0 .9 1.5h12.4a1 1 0 0 0 .9-1.5L18 14.2a4.8 4.8 0 0 1-.8-2.6V9A5.2 5.2 0 0 0 12 3.8Z" />
            <path d="M9.7 18.7a2.3 2.3 0 0 0 4.6 0z" />
        </svg>
    );
}

function ChevronDownIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

function StaffPortalPublicViewIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M14 5h5v5" />
            <path d="M10 14 19 5" />
            <path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
        </svg>
    );
}

function AdminPortalBrandIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M12 2.6 4 5.6v5.6c0 5 3.4 8.8 8 10.2 4.6-1.4 8-5.2 8-10.2V5.6z" />
            <path d="M12 6.6v8.8" fill="none" stroke="#2c170f" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M8.6 10.2h6.8" fill="none" stroke="#2c170f" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    );
}

function AcademicPortalIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M2.5 8.5 12 4l9.5 4.5L12 13 2.5 8.5Z" />
            <path d="M6 10.3v4.1c0 .4.2.8.6 1 1.2.8 3.1 1.7 5.4 1.7s4.2-.9 5.4-1.7c.4-.2.6-.6.6-1v-4.1" />
            <path d="M21.5 9v3.7" />
            <circle cx="21.5" cy="13.7" r="1.1" fill="currentColor" stroke="none" />
        </svg>
    );
}

function PortalNavIcon({ name }) {
    if (name === 'dashboard') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" rx="2" />
                <rect x="13" y="3" width="8" height="5" rx="2" />
                <rect x="13" y="10" width="8" height="11" rx="2" />
                <rect x="3" y="13" width="8" height="8" rx="2" />
            </svg>
        );
    }

    if (name === 'profile') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21a7 7 0 0 0-14 0" />
                <circle cx="12" cy="8" r="4" />
            </svg>
        );
    }

    if (name === 'qualifications') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3 2 8l10 5 10-5-10-5Z" />
                <path d="M6 10.5v4.5c0 1.8 2.7 3.5 6 3.5s6-1.7 6-3.5v-4.5" />
            </svg>
        );
    }

    if (name === 'research') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9.5 3h5" />
                <path d="M10 3v5l-5.5 9.2A2 2 0 0 0 6.2 20h11.6a2 2 0 0 0 1.7-2.8L14 8V3" />
                <path d="M8 14h8" />
            </svg>
        );
    }

    if (name === 'publications') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2H20v17.5A2.5 2.5 0 0 0 17.5 17H6Z" />
                <path d="M6 4.5V22" />
                <path d="M10 7h6" />
                <path d="M10 11h6" />
            </svg>
        );
    }

    if (name === 'courses') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
        );
    }

    if (name === 'grants') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1v22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        );
    }

    if (name === 'supervision') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9.5" cy="7" r="3.5" />
                <path d="M20.5 8.5v6" />
                <path d="M17.5 11.5h6" />
            </svg>
        );
    }

    if (name === 'memberships') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 4h10l1 6-6 4-6-4 1-6Z" />
            </svg>
        );
    }

    if (name === 'external') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
            </svg>
        );
    }

    if (name === 'history') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
                <path d="M12 7v5l3 2" />
            </svg>
        );
    }

    if (name === 'settings') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 0 1 0 2.6 1.8 1.8 0 0 1-2.6 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.3A1.8 1.8 0 0 1 13.5 22h-3A1.8 1.8 0 0 1 8.7 20.2v-.3a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 0 1-2.6 0 1.8 1.8 0 0 1 0-2.6l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.3A1.8 1.8 0 0 1 2 13.5v-3A1.8 1.8 0 0 1 3.8 8.7h.3a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 0 1 0-2.6 1.8 1.8 0 0 1 2.6 0l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9v-.3A1.8 1.8 0 0 1 10.5 2h3A1.8 1.8 0 0 1 15.3 3.8v.3a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 0 1 2.6 0 1.8 1.8 0 0 1 0 2.6l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6h.3A1.8 1.8 0 0 1 22 10.5v3a1.8 1.8 0 0 1-1.8 1.8h-.3a1 1 0 0 0-.9.6Z" />
            </svg>
        );
    }

    if (name === 'idCard') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2.4" />
                <circle cx="8.2" cy="11" r="2.1" />
                <path d="M5.7 16.2a3.5 3.5 0 0 1 5 0" />
                <path d="M13 9h5.5" />
                <path d="M13 12h5.5" />
                <path d="M13 15h4" />
            </svg>
        );
    }

    if (name === 'staff') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="3.5" />
                <path d="M18 8h5" />
                <path d="M20.5 5.5v5" />
            </svg>
        );
    }

    if (name === 'requests') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 3h6" />
                <path d="M10 8h4" />
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="M9 13h6" />
                <path d="M9 17h4" />
            </svg>
        );
    }

    if (name === 'operations') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h10" />
                <circle cx="18" cy="18" r="2" />
                <path d="m18 9 1.6 1.6L22 8.2" />
            </svg>
        );
    }

    if (name === 'roles') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3.5" />
                <path d="m15.5 11.5 2 2 4-4" />
                <path d="M17.5 19H22" />
            </svg>
        );
    }

    if (name === 'colleges') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18" />
                <path d="M5 21V8l7-4 7 4v13" />
                <path d="M9 21v-6h6v6" />
            </svg>
        );
    }

    if (name === 'departments') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="7" height="7" rx="2" />
                <rect x="14" y="4" width="7" height="7" rx="2" />
                <rect x="3" y="14" width="7" height="7" rx="2" />
                <rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
        );
    }

    if (name === 'ranks') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
            </svg>
        );
    }

    if (name === 'reports') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 20h16" />
                <path d="M7 16v-5" />
                <path d="M12 16V8" />
                <path d="M17 16v-9" />
                <path d="M5 4h14" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l2.5 2.5" />
        </svg>
    );
}

function StaffCrudIcon({ name, ...props }) {
    if (name === 'award') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <circle cx="12" cy="8.2" r="4.1" />
                <path d="m9.5 12.1-1.8 7 4.3-2.4 4.3 2.4-1.8-7" />
            </svg>
        );
    }

    if (name === 'university') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M12 3 2.5 8.2 12 13.4l7.6-4.1v5.4h1.9V8.2z" />
                <path d="M6.1 11.2v3.8c0 1.4 2.7 3.2 5.9 3.2s5.9-1.8 5.9-3.2v-3.8L12 14.5z" />
            </svg>
        );
    }

    if (name === 'google') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M12 4 2.5 9.1 12 14.2l7.6-4.1v5.2h1.9V9.1z" />
                <path d="M6.1 12v3.3c0 1.3 2.7 3 5.9 3s5.9-1.7 5.9-3V12L12 15.1z" />
            </svg>
        );
    }

    if (name === 'orcid') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <rect x="4" y="5" width="16" height="14" rx="2.4" />
                <circle cx="8.2" cy="10" r="1.3" fill="#ffffff" />
                <path d="M7 13.1h2.4v3.4H7z" fill="#ffffff" />
                <path d="M12 9.1c2.5 0 4 1.5 4 3.6 0 2.2-1.5 3.7-4 3.7h-1.9V9.1zm0 5.5c1.2 0 1.9-.7 1.9-1.9 0-1.1-.7-1.8-1.9-1.8h-.7v3.7z" fill="#ffffff" />
            </svg>
        );
    }

    if (name === 'researchgate') {
        return (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
                <path d="M6 18V6h4.9c2.4 0 4 1.3 4 3.3 0 1.5-.8 2.6-2.2 3.1l2.6 5.6h-2.7l-2.3-5h-1.8v5zm2.5-7.1h1.9c1.1 0 1.8-.6 1.8-1.5s-.7-1.5-1.8-1.5H8.5z" />
                <path d="M17.1 8.6h2.5V18h-2.5z" opacity="0.92" />
            </svg>
        );
    }

    if (name === 'scopus') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
                <circle cx="10.5" cy="10.5" r="5.5" />
                <path d="m14.5 14.5 4.5 4.5" />
            </svg>
        );
    }

    return null;
}

export {
    UserFieldIcon,
    LockFieldIcon,
    EyeFieldIcon,
    EyeOffFieldIcon,
    SidebarToggleIcon,
    MenuToggleIcon,
    PortalActionIcon,
    PublicPortfolioIcon,
    publicProfileLinkIcon,
    StaffDashboardActionIcon,
    StaffDashboardStatIcon,
    StaffPortalBrandIcon,
    NotificationBellIcon,
    ChevronDownIcon,
    StaffPortalPublicViewIcon,
    AdminPortalBrandIcon,
    AcademicPortalIcon,
    PortalNavIcon,
    StaffCrudIcon,
};
