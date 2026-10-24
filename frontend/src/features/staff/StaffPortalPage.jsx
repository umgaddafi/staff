import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorState, LoadingScreen } from '../../components/common/states';
import { PortalShell } from '../../components/layouts/PortalShell';
import { usePortalResource } from '../../hooks/usePortalResource';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/formatters';
import { downloadStaffCv } from '../../utils/staffCv';
import { SettingsSection, IdCardSection } from './StaffAccountSections';
import {
    CoursesSection,
    ExternalProfilesSection,
    GrantsSection,
    MembershipSection,
    SupervisionSection,
} from './StaffAcademicSections';
import { StaffDashboard } from './StaffDashboard';
import {
    ProfileSection,
    PublicationsSection,
    QualificationsSection,
    ResearchSection,
} from './StaffProfileSections';
import { HistorySection } from './StaffShared';
import { StaffAppraisalSections } from './StaffAppraisalSections';
import { StaffDocumentsSection } from './StaffDocumentsSection';
import { StaffAuditSections } from './StaffAuditSections';
import { StaffPaymentsSections } from './StaffPaymentsSections';

/**
 * Extracts a permission key from a nav item's route path.
 * e.g. '/staff/appraisal/my-appraisals' -> 'appraisal/my-appraisals'
 *      '/staff/profile' -> 'profile'
 *      '/staff' -> 'dashboard'
 */
function extractPermissionKey(to) {
    const parts = to.replace(/^\/staff\/?/, '').replace(/\/$/, '');
    return parts || 'dashboard';
}

function filterNavByPermissions(allSections, rolePermissions, userRole) {
    // Admin and Moderator roles always see everything
    if (userRole === 'Admin' || userRole === 'Moderator') {
        return allSections;
    }

    const perms = rolePermissions?.[userRole] || {};
    // If no permissions have been configured yet, show everything (permissive default)
    const hasAnyConfig = Object.keys(perms).length > 0;
    if (!hasAnyConfig) {
        return allSections;
    }

    return allSections
        .map((section) => {
            const filteredItems = section.items.filter((item) => {
                const key = extractPermissionKey(item.to);
                // Dashboard is always visible
                if (key === 'dashboard') return true;
                // If the key is explicitly set in perms, use its value; otherwise default to visible
                return key in perms ? Boolean(perms[key]) : true;
            });
            return { ...section, items: filteredItems };
        })
        .filter((section) => section.items.length > 0);
}

function StaffPortalPage({ user, onLogout, showFlash }) {
    const location = useLocation();
    const { data, loading, error, load } = usePortalResource('/api/staff/portal');
    const section = location.pathname.split('/')[2] || 'dashboard';

    const allNavSections = [
        {
            title: null,
            items: [
                { to: '/staff', label: 'Dashboard', icon: 'dashboard' },
            ],
        },
        {
            title: 'My Profile',
            items: [
                { to: '/staff/profile', label: 'Personal Information', navLabel: 'Personal Info', icon: 'profile' },
                { to: '/staff/documents', label: 'Basic Documents', navLabel: 'Documents', icon: 'documents' },
                { to: '/staff/qualifications', label: 'Qualifications', icon: 'qualifications' },
                { to: '/staff/memberships', label: 'Memberships', icon: 'memberships' },
                { to: '/staff/external', label: 'Web Profiles', icon: 'external' },
            ],
        },
        {
            title: 'Academic Output',
            items: [
                { to: '/staff/research', label: 'Research Areas', icon: 'research' },
                { to: '/staff/publications', label: 'Publications', icon: 'publications' },
                { to: '/staff/supervision', label: 'Supervision', icon: 'supervision' },
            ],
        },
        {
            title: 'Teaching & Grants',
            items: [
                { to: '/staff/courses', label: 'Courses', icon: 'courses' },
                { to: '/staff/grants', label: 'Grants', icon: 'grants' },
            ],
        },
        ...(data?.systemSettings?.enable_appraisal_in_staff_sidebar ? [
            {
                title: 'Appraisal',
                items: [
                    { to: '/staff/appraisal', label: 'Dashboard', icon: 'dashboard' },
                    { to: '/staff/appraisal/my-appraisals', label: 'My Appraisals', icon: 'document' },
                    { to: '/staff/appraisal/cv', label: 'My CV', icon: 'profile' },
                ],
            },
        ] : []),
        ...(data?.systemSettings?.enable_audit_in_staff_sidebar ? [
            {
                title: 'Internal Audit',
                items: [
                    { to: '/staff/audit', label: 'Overview', icon: 'dashboard' },
                    { to: '/staff/audit/verification', label: 'Verification', icon: 'document' },
                ],
            },
        ] : []),
        {
            title: 'Payments',
            items: [
                { to: '/staff/payments', label: 'Payslip', icon: 'payslip' },
            ],
        },
        {
            title: 'System',
            items: [
                { to: '/staff/settings', label: 'Settings', icon: 'settings' },
                { to: '/staff/id-card', label: 'ID Card', icon: 'idCard' },
                { to: '/staff/history', label: 'Change History', icon: 'history' },
            ],
        },
    ];

    const navSections = useMemo(
        () => filterNavByPermissions(allNavSections, data?.rolePermissions, user?.role),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data?.rolePermissions, data?.systemSettings, user?.role]
    );
    const navItems = navSections.flatMap((group) => group.items);


    async function mutate(path, options, successMessage) {
        try {
            const result = await api(path, options);
            showFlash(result.message || successMessage || 'Saved successfully.');
            await load();
            return { ok: true, result };
        } catch (mutationError) {
            showFlash(getErrorMessage(mutationError), 'error');
            return { ok: false, error: mutationError };
        }
    }

    async function changePassword(payload) {
        try {
            const result = await api('/api/auth/change-password', { method: 'POST', data: payload });
            showFlash(result.message || 'Password updated successfully.');
            return { ok: true, result };
        } catch (mutationError) {
            showFlash(getErrorMessage(mutationError), 'error');
            return { ok: false, error: mutationError };
        }
    }

    async function markNotificationRead(notificationId) {
        try {
            const result = await api(`/api/staff/notifications/${notificationId}/read`, { method: 'POST' });
            await load();
            return { ok: true, result };
        } catch (mutationError) {
            showFlash(getErrorMessage(mutationError), 'error');
            return { ok: false, error: mutationError };
        }
    }

    if (loading || !data) {
        if (loading) {
            return <LoadingScreen label="Loading staff portal..." />;
        }

        return <ErrorState title="Staff portal unavailable." message={error} onRetry={load} fullScreen />;
    }

    let content = null;

    if (section === 'dashboard') {
        content = <StaffDashboard data={data} onDownloadCv={() => downloadStaffCv(data.profile, data.user)} />;
    } else if (section === 'profile') {
        content = <ProfileSection staff={data.profile.staff} ranks={data.referenceData.ranks} departments={data.referenceData?.departments || []} onSubmit={(formData) => mutate('/api/staff/profile', { method: 'POST', formData }, 'Profile updated.')} />;
    } else if (section === 'documents') {
        content = <StaffDocumentsSection initialDocuments={data.documents || []} />;
    } else if (section === 'qualifications') {
        content = <QualificationsSection items={data.profile.qualifications} onCreate={(formData) => mutate('/api/staff/qualifications', { method: 'POST', formData })} onDelete={(id) => mutate(`/api/staff/qualifications/${id}`, { method: 'DELETE' })} />;
    } else if (section === 'research') {
        content = <ResearchSection items={data.profile.researchAreas} onCreate={(name) => mutate('/api/staff/research-areas', { method: 'POST', data: { name } })} onDelete={(id) => mutate(`/api/staff/research-areas/${id}`, { method: 'DELETE' })} />;
    } else if (section === 'publications') {
        content = <PublicationsSection items={data.profile.publications} onSave={(payload) => mutate('/api/staff/publications', { method: 'POST', data: payload })} onDelete={(id) => mutate(`/api/staff/publications/${id}`, { method: 'DELETE' })} />;
    } else if (section === 'courses') {
        content = <CoursesSection items={data.profile.courses} courseOptions={data.referenceData.courses} onLink={(payload) => mutate('/api/staff/courses', { method: 'POST', data: payload })} onDelete={(payload) => mutate('/api/staff/courses', { method: 'DELETE', data: payload })} />;
    } else if (section === 'grants') {
        content = <GrantsSection items={data.profile.grants} onCreate={(payload) => mutate('/api/staff/grants', { method: 'POST', data: payload })} onDelete={(id) => mutate(`/api/staff/grants/${id}`, { method: 'DELETE' })} />;
    } else if (section === 'supervision') {
        content = <SupervisionSection items={data.profile.supervisions} onCreate={(payload) => mutate('/api/staff/supervisions', { method: 'POST', data: payload })} onDelete={(id) => mutate(`/api/staff/supervisions/${id}`, { method: 'DELETE' })} />;
    } else if (section === 'memberships') {
        content = <MembershipSection items={data.profile.memberships} onCreate={(formData) => mutate('/api/staff/memberships', { method: 'POST', formData })} onDelete={(id) => mutate(`/api/staff/memberships/${id}`, { method: 'DELETE' })} />;
    } else if (section === 'external') {
        content = <ExternalProfilesSection items={data.profile.externalProfiles} onCreate={(payload) => mutate('/api/staff/external-profiles', { method: 'POST', data: payload })} onDelete={(id) => mutate(`/api/staff/external-profiles/${id}`, { method: 'DELETE' })} />;
    } else if (section === 'settings') {
        content = (
            <SettingsSection
                staff={data.profile.staff}
                user={data.user}
                notifications={data.notifications}
                onChangePassword={changePassword}
                onMarkAllNotificationsRead={() => mutate('/api/staff/notifications/read-all', { method: 'POST' }, 'All notifications marked as read.')}
                onDownloadCv={() => downloadStaffCv(data.profile, data.user)}
            />
        );
    } else if (section === 'id-card') {
        content = (
            <IdCardSection
                staff={data.profile.staff}
                idCard={data.idCard}
                onRequestCard={(payload) => mutate('/api/staff/id-card/request', { method: 'POST', data: payload }, 'ID card request submitted successfully.')}
            />
        );
    } else if (section === 'appraisal') {
        content = <StaffAppraisalSections />;
    } else if (section === 'audit') {
        content = <StaffAuditSections staff={data.profile.staff} />;
    } else if (section === 'payments') {
        content = <StaffPaymentsSections staff={data.profile.staff} />;
    } else {
        content = <HistorySection items={data.history} />;
    }

    return (
        <PortalShell
            user={user}
            navItems={navItems}
            navSections={navSections}
            title="Staff Portal"
            onLogout={onLogout}
            variant="staff"
            staffTopbar={{
                brandLabel: 'Staff Portal',
                homeTo: '/staff',
                publicViewTo: `/portfolio/${user.staffId || data.user.staffId}`,
                profileTo: '/staff/profile',
                settingsTo: '/staff/settings',
                notificationsTo: '/staff/history',
                notificationItems: data.notifications?.items || [],
                unreadCount: data.notifications?.unreadCount || 0,
                onMarkNotificationRead: markNotificationRead,
                onMarkAllNotificationsRead: () => mutate('/api/staff/notifications/read-all', { method: 'POST' }, 'All notifications marked as read.'),
                name: data.user.name || user.name,
                photoUrl: data.user.profilePhotoUrl || data.profile.staff?.profile_photo_url || user.profilePhotoUrl || '',
            }}
        >
            {content}
        </PortalShell>
    );
}

export { StaffPortalPage };
