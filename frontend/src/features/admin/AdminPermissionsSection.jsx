import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/common/ui';

/**
 * Staff portal sidebar permission keys, grouped by section.
 * Each key maps to a route prefix in the staff portal.
 */
const PERMISSION_GROUPS = [
    {
        label: 'General',
        items: [
            { key: 'dashboard', label: 'Dashboard' },
        ],
    },
    {
        label: 'My Profile',
        items: [
            { key: 'profile', label: 'Personal Information' },
            { key: 'qualifications', label: 'Qualifications' },
            { key: 'memberships', label: 'Memberships' },
            { key: 'external', label: 'Web Profiles' },
        ],
    },
    {
        label: 'Academic Output',
        items: [
            { key: 'research', label: 'Research Areas' },
            { key: 'publications', label: 'Publications' },
            { key: 'supervision', label: 'Supervision' },
        ],
    },
    {
        label: 'Teaching & Grants',
        items: [
            { key: 'courses', label: 'Courses' },
            { key: 'grants', label: 'Grants' },
        ],
    },
    {
        label: 'Appraisal',
        items: [
            { key: 'appraisal', label: 'Appraisal Dashboard' },
            { key: 'appraisal/my-appraisals', label: 'My Appraisals' },
            { key: 'appraisal/profile', label: 'Appraisal Profile' },
        ],
    },
    {
        label: 'Internal Audit',
        items: [
            { key: 'audit', label: 'Audit Overview' },
            { key: 'audit/verification', label: 'Verification' },
            { key: 'audit/profile', label: 'Audit Profile' },
        ],
    },
    {
        label: 'Payments',
        items: [
            { key: 'payments', label: 'Payslip' },
        ],
    },
    {
        label: 'System',
        items: [
            { key: 'settings', label: 'Settings' },
            { key: 'id-card', label: 'ID Card' },
            { key: 'history', label: 'Change History' },
        ],
    },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) => group.items.map((item) => item.key));

const ROLE_OPTIONS = [
    { key: 'Staff', label: 'Staff' },
    { key: 'Moderator', label: 'Moderator' },
    { key: 'Admin', label: 'Admin' },
];

function buildDefaultPermissions() {
    const defaults = {};
    for (const role of ROLE_OPTIONS) {
        defaults[role.key] = {};
        for (const key of ALL_PERMISSION_KEYS) {
            defaults[role.key][key] = true;
        }
    }
    return defaults;
}

function mergeWithDefaults(saved) {
    const defaults = buildDefaultPermissions();
    if (!saved || typeof saved !== 'object') {
        return defaults;
    }
    const merged = {};
    for (const role of ROLE_OPTIONS) {
        const savedRole = saved[role.key] || {};
        merged[role.key] = {};
        for (const key of ALL_PERMISSION_KEYS) {
            merged[role.key][key] = key in savedRole ? Boolean(savedRole[key]) : true;
        }
    }
    return merged;
}

function AdminPermissionsSection({ rolePermissions, onSave, hideHeader = false }) {
    const [draft, setDraft] = useState(() => mergeWithDefaults(rolePermissions));
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    useEffect(() => {
        setDraft(mergeWithDefaults(rolePermissions));
    }, [rolePermissions]);

    const hasChanges = useMemo(() => {
        const current = mergeWithDefaults(rolePermissions);
        return JSON.stringify(draft) !== JSON.stringify(current);
    }, [draft, rolePermissions]);

    function handleToggle(roleKey, permKey, checked) {
        setDraft((prev) => ({
            ...prev,
            [roleKey]: {
                ...prev[roleKey],
                [permKey]: checked,
            },
        }));
    }

    function handleToggleAllForRole(roleKey, checked) {
        setDraft((prev) => {
            const next = { ...prev };
            next[roleKey] = {};
            for (const key of ALL_PERMISSION_KEYS) {
                next[roleKey][key] = checked;
            }
            return next;
        });
    }

    async function handleSave() {
        if (saving) return;
        setSaving(true);
        try {
            await onSave(draft);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3500);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {!hideHeader && (
                <AdminPageHeader
                    title="Permission Matrix"
                    subtitle="Control which sidebar items each role can access in the Staff Portal."
                />
            )}
            <section className="admin-panel card">
                <div className="admin-panel-header">
                    <h3>Staff Portal Sidebar Permissions</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                        Unchecked items will be hidden from the staff sidebar for that role.
                    </p>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table admin-permission-table">
                        <thead>
                            <tr>
                                <th>Sidebar Item</th>
                                {ROLE_OPTIONS.map((role) => (
                                    <th key={role.key} className="admin-permission-role-header">
                                        <span>{role.label}</span>
                                        <label className="admin-permission-toggle-all">
                                            <input
                                                type="checkbox"
                                                checked={ALL_PERMISSION_KEYS.every((k) => draft[role.key]?.[k])}
                                                onChange={(e) => handleToggleAllForRole(role.key, e.target.checked)}
                                            />
                                            <span>All</span>
                                        </label>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        {PERMISSION_GROUPS.map((group) => (
                            <tbody key={group.label}>
                                <tr className="admin-permission-group-row">
                                    <td colSpan={ROLE_OPTIONS.length + 1}>
                                        {group.label}
                                    </td>
                                </tr>
                                {group.items.map((perm) => (
                                    <tr key={perm.key}>
                                        <td className="admin-permission-label">{perm.label}</td>
                                        {ROLE_OPTIONS.map((role) => {
                                            const isAdmin = role.key === 'Admin';
                                            const isDashboard = perm.key === 'dashboard';
                                            const locked = isAdmin || isDashboard;
                                            return (
                                                <td key={`${perm.key}-${role.key}`} className="admin-permission-cell">
                                                    <label className="admin-permission-check">
                                                        <input
                                                            type="checkbox"
                                                            checked={locked || Boolean(draft[role.key]?.[perm.key])}
                                                            disabled={locked}
                                                            onChange={(e) => handleToggle(role.key, perm.key, e.target.checked)}
                                                        />
                                                        <span>{locked ? 'Always' : 'Allow'}</span>
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        ))}
                    </table>
                </div>
                <div className="admin-panel-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                            Admin users and the Dashboard item are always enabled and cannot be disabled.
                        </p>
                        {savedSuccess && (
                            <span style={{ fontSize: '0.82rem', color: '#006633', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={15} /> Saved successfully
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="button"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        {saving ? 'Saving...' : 'Save Permission Matrix'}
                    </button>
                </div>
            </section>
        </>
    );
}

export { AdminPermissionsSection, PERMISSION_GROUPS, ALL_PERMISSION_KEYS, mergeWithDefaults };
