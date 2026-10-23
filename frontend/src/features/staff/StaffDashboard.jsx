import { Link } from 'react-router-dom';
import { StaffDashboardActionIcon, StaffDashboardStatIcon } from '../../components/icons/AppIcons';

function StaffDashboard({ data, onDownloadCv }) {
    const staff = data.profile.staff || {};
    const staffDisplayName = [staff.first_name, staff.other_name, staff.last_name].filter(Boolean).join(' ') || data.user.name || 'Staff';
    const statsMeta = {
        publications: { to: '/staff/publications', icon: 'publications', color: '#1f6fff', background: 'rgba(31, 111, 255, 0.10)' },
        supervisions: { to: '/staff/supervision', icon: 'supervisions', color: '#198754', background: 'rgba(25, 135, 84, 0.10)' },
        grants: { to: '/staff/grants', icon: 'grants', color: '#f2b705', background: 'rgba(242, 183, 5, 0.10)' },
        verifiedLogs: { to: '/staff/history', icon: 'verifiedLogs', color: '#6c757d', background: 'rgba(108, 117, 125, 0.12)' },
    };

    function formatActivityDate(value) {
        if (!value) {
            return 'N/A';
        }

        return new Intl.DateTimeFormat(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).format(new Date(value));
    }

    function activityTitle(item) {
        const action = ((item.action || 'Update').toLowerCase().replace(/^./, (character) => character.toUpperCase()));
        const entity = item.entity_label || item.entity_name?.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) || 'Record';

        return `${action} ${entity}`;
    }

    function activityDetail(item) {
        const payload = item.comparison?.payload || {};
        return payload.title || payload.name || payload.degree || payload.course_title || payload.body_name || payload.platform || 'Record updated';
    }

    return (
        <>
            <section className="staff-dashboard-hero">
                <h1 className="staff-dashboard-hero-title">Hello, {staffDisplayName}!</h1>
                <p className="staff-dashboard-hero-copy">Welcome to your executive overview.</p>
                <div className="staff-dashboard-hero-actions">
                    <Link className="staff-dashboard-hero-button is-primary" to="/staff/profile">
                        <StaffDashboardActionIcon name="edit" />
                        <span>Edit Profile</span>
                    </Link>
                    <Link
                        className="staff-dashboard-hero-button is-secondary"
                        to={`/portfolio/${data.user.staffId || staff.staff_id}?private=1`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <StaffDashboardActionIcon name="shield" />
                        <span>Private View</span>
                    </Link>
                </div>
            </section>

            <div className="stats-grid staff-dashboard-stats">
                {data.dashboard.stats.map((stat) => {
                    const meta = statsMeta[stat.key] || { to: '/staff', icon: 'verifiedLogs', color: '#6c757d', background: 'rgba(108, 117, 125, 0.12)' };

                    return (
                        <Link className="section-card stat-card staff-dashboard-stat" key={stat.key} to={meta.to}>
                            <div className="staff-dashboard-stat-header">
                                <div
                                    className="staff-dashboard-stat-icon"
                                    style={{ color: meta.color, backgroundColor: meta.background }}
                                >
                                    <StaffDashboardStatIcon name={meta.icon} />
                                </div>
                                <div className="staff-dashboard-stat-label">{stat.label}</div>
                            </div>
                            <div className="staff-dashboard-stat-value">{stat.value}</div>
                        </Link>
                    );
                })}
            </div>

            <div className="two-column staff-dashboard-grid">
                <div className="section-card staff-dashboard-panel">
                    <h2 className="section-title">Quick Management</h2>
                    <div className="staff-dashboard-quick-list">
                        <Link className="staff-dashboard-quick-link" to="/staff/publications">
                            <span className="staff-dashboard-quick-icon">
                                <StaffDashboardActionIcon name="plus" />
                            </span>
                            <span>
                                <strong>Add Publication</strong>
                                <small>Research &amp; Papers</small>
                            </span>
                        </Link>
                        <Link className="staff-dashboard-quick-link" to="/staff/payments">
                            <span className="staff-dashboard-quick-icon">
                                <StaffDashboardActionIcon name="payslip" />
                            </span>
                            <span>
                                <strong>Payslip</strong>
                                <small>Salary &amp; Monthly Slips</small>
                            </span>
                        </Link>
                        <Link className="staff-dashboard-quick-link" to="/staff/external">
                            <span className="staff-dashboard-quick-icon">
                                <StaffDashboardActionIcon name="link" />
                            </span>
                            <span>
                                <strong>Sync Profiles</strong>
                                <small>ORCID, Google Scholar</small>
                            </span>
                        </Link>
                    </div>
                </div>

                <div className="section-card staff-dashboard-panel">
                    <div className="staff-dashboard-panel-header">
                        <h2 className="section-title">Recent Activity</h2>
                        <Link className="staff-dashboard-view-all" to="/staff/history">View All</Link>
                    </div>
                    <div className="staff-dashboard-timeline">
                        {data.dashboard.recentActivity.length === 0 ? (
                            <div className="staff-dashboard-timeline-item is-empty">
                                <div className="staff-dashboard-timeline-dot" />
                                <div className="staff-dashboard-timeline-body">
                                    <h3>No recent activity</h3>
                                    <p>Changes you submit will appear here.</p>
                                </div>
                            </div>
                        ) : data.dashboard.recentActivity.map((item, index) => {
                            const status = (item.status || 'Pending').toLowerCase();

                            return (
                                <div className="staff-dashboard-timeline-item" key={item.log_id || `${item.timestamp}-${index}`}>
                                    <div className="staff-dashboard-timeline-dot" />
                                    <div className="staff-dashboard-timeline-body">
                                        <div className="staff-dashboard-timeline-head">
                                            <div>
                                                <h3>{activityTitle(item)}</h3>
                                                <p>{activityDetail(item)}</p>
                                            </div>
                                            <span className={`staff-dashboard-status is-${status}`}>{item.status || 'Pending'}</span>
                                        </div>
                                        <time>{formatActivityDate(item.timestamp)}</time>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

export { StaffDashboard };
