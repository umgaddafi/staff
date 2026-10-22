import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Avatar } from '../common/states';
import { usePendingAction } from '../../hooks/usePendingAction';
import {
    AdminPortalBrandIcon,
    ChevronDownIcon,
    MenuToggleIcon,
    NotificationBellIcon,
    PortalActionIcon,
    PortalNavIcon,
    SidebarToggleIcon,
    StaffPortalBrandIcon,
    StaffPortalPublicViewIcon,
} from '../icons/AppIcons';
import { formatDateTime, initials } from '../../utils/formatters';

function PortalShell({
    user,
    navItems,
    navSections = null,
    title,
    onLogout,
    headerAction,
    topbarActions = null,
    sidebarFooter = null,
    staffTopbar = null,
    adminTopbar = null,
    variant = 'default',
    children,
}) {
    const location = useLocation();
    const { isPending, runPending, hasPending } = usePendingAction();
    const [isMobileViewport, setIsMobileViewport] = useState(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return false;
        }

        return window.matchMedia('(max-width: 1023px)').matches;
    });
    const isSidebarCollapsed = false;
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const resolvedNavItems = navSections ? navSections.flatMap((section) => section.items) : navItems;
    const homePath = resolvedNavItems[0]?.to || '/';
    const activeItem = resolvedNavItems.find((item) => (
        location.pathname === item.to
        || (item.to !== '/staff' && item.to !== '/admin' && location.pathname.startsWith(`${item.to}/`))
    ));

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(max-width: 1023px)');
        const syncViewport = (event) => {
            setIsMobileViewport(event.matches);
        };

        syncViewport(mediaQuery);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncViewport);
            return () => mediaQuery.removeEventListener('change', syncViewport);
        }

        mediaQuery.addListener(syncViewport);
        return () => mediaQuery.removeListener(syncViewport);
    }, []);

    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isMobileViewport) {
            setIsMobileSidebarOpen(false);
        }
    }, [isMobileViewport]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        if (!isMobileViewport || !isMobileSidebarOpen) {
            document.body.style.overflow = '';
            return undefined;
        }

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileSidebarOpen, isMobileViewport]);

    useEffect(() => {
        if (!isMobileViewport || !isMobileSidebarOpen || typeof window === 'undefined') {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMobileSidebarOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileSidebarOpen, isMobileViewport]);

    const isDesktopCollapsed = !isMobileViewport && isSidebarCollapsed;
    const staffTopbarName = staffTopbar?.name || user.name || title;
    const adminTopbarName = adminTopbar?.name || user.name || 'Administrator';
    const resolvedStaffTopbar = variant === 'staff'
        ? Object.assign(
            {
                brandLabel: title,
                homeTo: homePath,
                publicViewTo: '/',
                profileTo: '/staff/profile',
                settingsTo: '/staff/history',
                notificationsTo: '/staff/history',
                notificationItems: [],
                unreadCount: 0,
                onMarkNotificationRead: null,
                onMarkAllNotificationsRead: null,
            },
            staffTopbar || {},
            { name: staffTopbarName },
        )
        : null;
    const resolvedAdminTopbar = variant === 'admin'
        ? Object.assign(
            {
                brandLabel: title,
                homeTo: homePath,
            },
            adminTopbar || {},
            { name: adminTopbarName },
        )
        : null;
    const resolvedTopbarActions = topbarActions ?? (
        variant === 'default' ? (
            <>
                {headerAction}
                <Link
                    className="ghost-button portal-action-button"
                    to="/"
                    aria-label="Public site"
                    title="Public site"
                >
                    <span className="portal-action-icon" aria-hidden="true">
                        <PortalActionIcon name="public" />
                    </span>
                    <span className="portal-action-label">Public site</span>
                </Link>
                <button
                    className="danger-button portal-action-button"
                    onClick={onLogout}
                    aria-label="Logout"
                    title="Logout"
                >
                    <span className="portal-action-icon" aria-hidden="true">
                        <PortalActionIcon name="logout" />
                    </span>
                    <span className="portal-action-label">Logout</span>
                </button>
            </>
        ) : null
    );

    return (
        <div
            className={[
                'portal-layout',
                variant !== 'default' ? `portal-layout-${variant}` : '',
                variant === 'staff' ? 'staff-portal-shell' : '',
                variant === 'admin' ? 'admin-portal-shell' : '',
                isDesktopCollapsed ? 'portal-layout-collapsed' : '',
                isMobileViewport ? 'portal-layout-mobile' : '',
                isMobileViewport && isMobileSidebarOpen ? 'portal-layout-mobile-open' : '',
            ].filter(Boolean).join(' ')}
        >
            {variant === 'admin' && resolvedAdminTopbar ? (
                <header className="admin-portal-topbar-shell">
                    <div className="admin-portal-topbar-brand">
                        {isMobileViewport ? (
                            <button
                                type="button"
                                className="admin-portal-topbar-menu"
                                onClick={() => setIsMobileSidebarOpen((current) => !current)}
                                aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                                aria-expanded={isMobileSidebarOpen}
                                aria-controls="portal-navigation"
                            >
                                <MenuToggleIcon open={isMobileSidebarOpen} />
                            </button>
                        ) : null}
                        <Link className="admin-portal-topbar-brand-link" to={resolvedAdminTopbar.homeTo}>
                            <span className="admin-portal-topbar-brand-label">{resolvedAdminTopbar.brandLabel}</span>
                        </Link>
                    </div>
                    <details className="admin-portal-topbar-dropdown">
                        <summary className="admin-portal-topbar-account-button" aria-label="Admin menu" title={resolvedAdminTopbar.name}>
                            <span className="admin-portal-topbar-avatar">{resolvedAdminTopbar.initials || initials(resolvedAdminTopbar.name)}</span>
                            <span className="admin-portal-topbar-name">{resolvedAdminTopbar.name}</span>
                            <ChevronDownIcon className="admin-portal-topbar-chevron" />
                        </summary>
                        <div className="admin-portal-topbar-menu-panel">
                            <Link className="admin-portal-topbar-menu-item" to={resolvedAdminTopbar.homeTo} onClick={(e) => e.target.closest('details').removeAttribute('open')}>Dashboard</Link>
                            <button type="button" className="admin-portal-topbar-menu-item is-danger" onClick={(e) => { e.target.closest('details').removeAttribute('open'); onLogout(); }}>Logout</button>
                        </div>
                    </details>
                </header>
            ) : null}
            {variant === 'staff' && resolvedStaffTopbar ? (
                <header className="staff-portal-topbar-shell">
                    <div className="staff-portal-topbar-brand">
                        {isMobileViewport ? (
                            <button
                                type="button"
                                className="staff-portal-topbar-menu"
                                onClick={() => setIsMobileSidebarOpen((current) => !current)}
                                aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                                aria-expanded={isMobileSidebarOpen}
                                aria-controls="portal-navigation"
                            >
                                <MenuToggleIcon open={isMobileSidebarOpen} />
                            </button>
                        ) : null}
                        <Link className="staff-portal-topbar-brand-link" to={resolvedStaffTopbar.homeTo}>
                            <span className="staff-portal-topbar-brand-label">{resolvedStaffTopbar.brandLabel}</span>
                        </Link>
                    </div>
                    <div className="staff-portal-topbar-tools">
                        <Link
                            className="staff-portal-topbar-public"
                            to={resolvedStaffTopbar.publicViewTo}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Public View"
                            title="Public View"
                        >
                            <StaffPortalPublicViewIcon />
                            <span>Public View</span>
                        </Link>
                        <details className="staff-portal-topbar-dropdown">
                            <summary
                                className="staff-portal-topbar-icon-button"
                                aria-label={resolvedStaffTopbar.unreadCount > 0 ? `${resolvedStaffTopbar.unreadCount} unread notifications` : 'Notifications'}
                                title="Notifications"
                            >
                                <NotificationBellIcon />
                                {resolvedStaffTopbar.unreadCount > 0 ? (
                                    <span className="staff-portal-topbar-badge">
                                        {resolvedStaffTopbar.unreadCount > 99 ? '99+' : resolvedStaffTopbar.unreadCount}
                                    </span>
                                ) : null}
                            </summary>
                            <div className="staff-portal-topbar-menu-panel staff-portal-topbar-menu-panel-notifications">
                                <div className="staff-portal-topbar-menu-head">
                                    <div className="staff-portal-topbar-menu-head-copy">
                                        <strong>Notifications</strong>
                                        <span>{resolvedStaffTopbar.unreadCount} unread</span>
                                    </div>
                                    {resolvedStaffTopbar.unreadCount > 0 && resolvedStaffTopbar.onMarkAllNotificationsRead ? (
                                        <button
                                            type="button"
                                            className="staff-portal-topbar-menu-head-action"
                                            onClick={() => runPending('notifications-mark-all', resolvedStaffTopbar.onMarkAllNotificationsRead)}
                                            disabled={hasPending}
                                        >
                                            {isPending('notifications-mark-all') ? 'Marking...' : 'Mark all as read'}
                                        </button>
                                    ) : null}
                                </div>
                                <div className="staff-portal-topbar-notification-list">
                                    {resolvedStaffTopbar.notificationItems.length ? resolvedStaffTopbar.notificationItems.slice(0, 8).map((item) => (
                                        <div
                                            key={item.notificationId}
                                            className={`staff-portal-topbar-notification-item${item.isRead ? '' : ' is-unread'}`}
                                        >
                                            <a
                                                className="staff-portal-topbar-notification-link"
                                                href={item.targetUrl || resolvedStaffTopbar.notificationsTo}
                                                onClick={(e) => e.target.closest('details')?.removeAttribute('open')}
                                            >
                                                <strong>{item.title}</strong>
                                                {item.message ? <span>{item.message}</span> : null}
                                                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                                            </a>
                                            {!item.isRead && resolvedStaffTopbar.onMarkNotificationRead ? (
                                                <button
                                                    type="button"
                                                    className="staff-portal-topbar-notification-action"
                                                    onClick={() => runPending(`notification-${item.notificationId}`, () => resolvedStaffTopbar.onMarkNotificationRead(item.notificationId))}
                                                    disabled={hasPending}
                                                >
                                                    {isPending(`notification-${item.notificationId}`) ? 'Marking...' : 'Mark as read'}
                                                </button>
                                            ) : null}
                                        </div>
                                    )) : (
                                        <p className="staff-portal-topbar-empty">No notifications yet.</p>
                                    )}
                                </div>
                                <Link className="staff-portal-topbar-menu-link" to={resolvedStaffTopbar.notificationsTo} onClick={(e) => e.target.closest('details').removeAttribute('open')}>
                                    Open change history
                                </Link>
                            </div>
                        </details>
                        <details className="staff-portal-topbar-dropdown">
                            <summary className="staff-portal-topbar-account-button" aria-label="Account menu" title={resolvedStaffTopbar.name}>
                                <Avatar
                                    name={resolvedStaffTopbar.name}
                                    photoUrl={resolvedStaffTopbar.photoUrl}
                                    className="staff-portal-topbar-avatar"
                                    imageFit="fill"
                                />
                                <span className="staff-portal-topbar-name">{resolvedStaffTopbar.name}</span>
                                <ChevronDownIcon className="staff-portal-topbar-chevron" />
                            </summary>
                            <div className="staff-portal-topbar-menu-panel staff-portal-topbar-menu-panel-account">
                                <Link className="staff-portal-topbar-menu-item" to={resolvedStaffTopbar.profileTo} onClick={(e) => e.target.closest('details').removeAttribute('open')}>Profile</Link>
                                <Link className="staff-portal-topbar-menu-item" to={resolvedStaffTopbar.settingsTo} onClick={(e) => e.target.closest('details').removeAttribute('open')}>Settings</Link>
                                <button type="button" className="staff-portal-topbar-menu-item is-danger" onClick={(e) => { e.target.closest('details').removeAttribute('open'); onLogout(); }}>Sign out</button>
                            </div>
                        </details>
                    </div>
                </header>
            ) : null}
            {isMobileViewport && isMobileSidebarOpen ? (
                <button
                    type="button"
                    className="portal-sidebar-backdrop"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    aria-label="Close navigation"
                />
            ) : null}
            <aside
                className={[
                    'portal-sidebar',
                    isDesktopCollapsed ? 'is-collapsed' : '',
                    isMobileViewport && isMobileSidebarOpen ? 'is-mobile-open' : '',
                ].filter(Boolean).join(' ')}
                aria-hidden={isMobileViewport && !isMobileSidebarOpen}
            >
                <div className="portal-sidebar-head">
                    {variant === 'default' ? (
                        <div className="portal-user-card">
                            <Avatar name={user.name} photoUrl={user.profilePhotoUrl} className="portal-avatar" />
                            <div className="portal-user-copy">
                                <strong>{user.name}</strong>
                                <p>{user.rankName || user.role}</p>
                                <span>{user.staffNumber || user.email || 'Active portal access'}</span>
                            </div>
                            {isMobileViewport ? (
                                <button
                                    type="button"
                                    className="portal-sidebar-toggle"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    aria-label="Close sidebar"
                                    title="Close sidebar"
                                >
                                    <MenuToggleIcon open={isMobileSidebarOpen} />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {variant === 'admin' && resolvedAdminTopbar ? (
                        <div className="portal-sidebar-brand">
                            <Link className="admin-portal-topbar-brand-link" to={resolvedAdminTopbar.homeTo}>
                                <AdminPortalBrandIcon className="admin-portal-topbar-brand-icon" />
                                {!isDesktopCollapsed ? (
                                    <span className="admin-portal-topbar-brand-label">{resolvedAdminTopbar.brandLabel}</span>
                                ) : null}
                            </Link>
                            {isMobileViewport ? (
                                <button
                                    type="button"
                                    className="portal-sidebar-toggle"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    aria-label="Close sidebar"
                                    title="Close sidebar"
                                >
                                    <MenuToggleIcon open={isMobileSidebarOpen} />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {variant === 'staff' && resolvedStaffTopbar ? (
                        <div className="portal-sidebar-brand">
                            <Link className="staff-portal-topbar-brand-link" to={resolvedStaffTopbar.homeTo}>
                                {!isDesktopCollapsed ? (
                                    <span className="staff-portal-topbar-brand-label">{resolvedStaffTopbar.brandLabel}</span>
                                ) : null}
                            </Link>
                            {isMobileViewport ? (
                                <button
                                    type="button"
                                    className="portal-sidebar-toggle"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                    aria-label="Close sidebar"
                                    title="Close sidebar"
                                >
                                    <MenuToggleIcon open={isMobileSidebarOpen} />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <div className="portal-nav-wrap">
                    <nav className="portal-nav" id="portal-navigation">
                        {navSections ? navSections.map((section, sectionIndex) => (
                            <div className="portal-nav-section" key={`${section.title || 'section'}-${sectionIndex}`}>
                                {section.title ? <p className="portal-nav-section-title">{section.title}</p> : null}
                                <div className="portal-nav-section-links">
                                    {section.items.map((item) => (
                                        <NavLink
                                            end={['/staff', '/admin', '/staff/audit', '/staff/appraisal'].includes(item.to)}
                                            key={item.to}
                                            to={item.to}
                                            className={({ isActive }) => (isActive ? 'active' : '')}
                                            aria-label={item.label}
                                            title={isDesktopCollapsed ? item.label : undefined}
                                        >
                                            <span className="portal-nav-icon" aria-hidden="true">
                                                <PortalNavIcon name={item.icon} />
                                            </span>
                                            <span className="portal-nav-title">{item.navLabel || item.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <>
                                <p className="portal-nav-label">Navigation</p>
                                {navItems.map((item) => (
                                    <NavLink
                                        end={['/staff', '/admin', '/staff/audit', '/staff/appraisal'].includes(item.to)}
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) => (isActive ? 'active' : '')}
                                        aria-label={item.label}
                                        title={isDesktopCollapsed ? item.label : undefined}
                                    >
                                        <span className="portal-nav-icon" aria-hidden="true">
                                            <PortalNavIcon name={item.icon} />
                                        </span>
                                        <span className="portal-nav-title">{item.label}</span>
                                    </NavLink>
                                ))}
                            </>
                        )}
                    </nav>
                </div>
                {sidebarFooter ? <div className="portal-sidebar-footer">{sidebarFooter}</div> : null}
            </aside>
            <main className="portal-content">
                <div className={`portal-topbar${variant === 'default' ? ' card' : ''}`}>
                    <div className="portal-topbar-copy">
                        {isMobileViewport && variant !== 'staff' && variant !== 'admin' ? (
                            <button
                                type="button"
                                className="portal-mobile-menu-button"
                                onClick={() => setIsMobileSidebarOpen((current) => !current)}
                                aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                                aria-expanded={isMobileSidebarOpen}
                                aria-controls="portal-navigation"
                            >
                                <MenuToggleIcon open={isMobileSidebarOpen} />
                                <span>{isMobileSidebarOpen ? 'Close menu' : 'Open menu'}</span>
                            </button>
                        ) : null}
                        {variant === 'staff' || variant === 'admin' ? (
                            <div className="portal-breadcrumb" aria-label="Breadcrumb">
                                <Link to={homePath}>Home</Link>
                                <span className="portal-breadcrumb-separator">/</span>
                                <span>{activeItem?.label || title}</span>
                            </div>
                        ) : (
                            <p className="page-title">{activeItem?.label || title}</p>
                        )}
                    </div>
                    {resolvedTopbarActions ? (
                        <div className="portal-topbar-side">
                            <div className={`toolbar portal-topbar-actions${isMobileViewport ? ' portal-topbar-actions-mobile' : ''}`}>
                                {resolvedTopbarActions}
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className="section-stack">{children}</div>
            </main>
        </div>
    );
}

export { PortalShell };
