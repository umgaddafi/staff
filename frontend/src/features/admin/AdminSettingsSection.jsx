import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    ExternalLink,
    FileText,
    ShieldCheck,
    Settings,
    CheckCircle2,
    Sliders,
    Layers,
    Building2,
    Globe,
    Mail,
    Phone,
    Calendar,
    Save
} from 'lucide-react';
import { AdminPageHeader } from '../../components/common/ui';
import { AdminPermissionsSection } from './AdminPermissionsSection';

const TABS = [
    { id: 'module', label: 'Module', icon: Layers },
    { id: 'permissions', label: 'Permission Matrix', icon: ShieldCheck },
    { id: 'main', label: 'Main', icon: Sliders },
];

function AdminSettingsSection({ systemSettings = {}, rolePermissions = {}, onSave, onSavePermissions }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryTab = searchParams.get('tab');

    const resolveTab = (tab) => {
        if (tab === 'permissions' || tab === 'permission-matrix' || tab === 'matrix') {
            return 'permissions';
        }
        if (tab === 'main') {
            return 'main';
        }
        return 'module';
    };

    const [activeTab, setActiveTab] = useState(() => resolveTab(queryTab));

    useEffect(() => {
        if (queryTab) {
            setActiveTab(resolveTab(queryTab));
        }
    }, [queryTab]);

    function handleTabClick(tabId) {
        setActiveTab(tabId);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (tabId === 'module') {
                next.delete('tab');
            } else {
                next.set('tab', tabId);
            }
            return next;
        }, { replace: true });
    }

    // --- Module Tab State ---
    const [moduleSettings, setModuleSettings] = useState({
        enable_appraisal_in_staff_sidebar: Boolean(systemSettings.enable_appraisal_in_staff_sidebar),
        enable_audit_in_staff_sidebar: Boolean(systemSettings.enable_audit_in_staff_sidebar),
    });
    const [savingKey, setSavingKey] = useState(null);
    const [lastSaved, setLastSaved] = useState(null);

    useEffect(() => {
        setModuleSettings({
            enable_appraisal_in_staff_sidebar: Boolean(systemSettings?.enable_appraisal_in_staff_sidebar),
            enable_audit_in_staff_sidebar: Boolean(systemSettings?.enable_audit_in_staff_sidebar),
        });
    }, [systemSettings?.enable_appraisal_in_staff_sidebar, systemSettings?.enable_audit_in_staff_sidebar]);

    async function handleToggle(key) {
        const nextValue = !moduleSettings[key];
        const nextSettings = {
            ...moduleSettings,
            [key]: nextValue,
        };
        setModuleSettings(nextSettings);
        setSavingKey(key);

        try {
            await onSave(nextSettings);
            setLastSaved(key);
            setTimeout(() => setLastSaved((curr) => (curr === key ? null : curr)), 3000);
        } catch {
            // Revert state on error
            setModuleSettings(moduleSettings);
        } finally {
            setSavingKey(null);
        }
    }

    // --- Main Tab State ---
    const [mainForm, setMainForm] = useState({
        institution_name: systemSettings.institution_name || 'Federal University of Health Sciences, Otukpo',
        portal_title: systemSettings.portal_title || 'Academic Staff Profile & Portfolio Management System',
        academic_session: systemSettings.academic_session || '2024/2025',
        support_email: systemSettings.support_email || 'support@fuhso.edu.ng',
        support_phone: systemSettings.support_phone || '+234 803 000 0000',
        allow_public_directory: systemSettings.allow_public_directory !== false,
        allow_cv_download: systemSettings.allow_cv_download !== false,
    });
    const [mainSaving, setMainSaving] = useState(false);
    const [mainSaved, setMainSaved] = useState(false);

    useEffect(() => {
        if (systemSettings) {
            setMainForm((prev) => ({
                institution_name: systemSettings.institution_name ?? prev.institution_name,
                portal_title: systemSettings.portal_title ?? prev.portal_title,
                academic_session: systemSettings.academic_session ?? prev.academic_session,
                support_email: systemSettings.support_email ?? prev.support_email,
                support_phone: systemSettings.support_phone ?? prev.support_phone,
                allow_public_directory: systemSettings.allow_public_directory !== undefined ? Boolean(systemSettings.allow_public_directory) : prev.allow_public_directory,
                allow_cv_download: systemSettings.allow_cv_download !== undefined ? Boolean(systemSettings.allow_cv_download) : prev.allow_cv_download,
            }));
        }
    }, [
        systemSettings?.institution_name,
        systemSettings?.portal_title,
        systemSettings?.academic_session,
        systemSettings?.support_email,
        systemSettings?.support_phone,
        systemSettings?.allow_public_directory,
        systemSettings?.allow_cv_download,
    ]);

    async function handleMainSubmit(e) {
        if (e) e.preventDefault();
        if (mainSaving) return;
        setMainSaving(true);
        try {
            await onSave(mainForm);
            setMainSaved(true);
            setTimeout(() => setMainSaved(false), 3500);
        } finally {
            setMainSaving(false);
        }
    }

    return (
        <>
            <AdminPageHeader
                title="System Settings"
                subtitle="Configure statutory modules, role permission matrix, and core institutional settings."
            />

            {/* Settings Tab Navigation */}
            <div className="admin-settings-tabs-container">
                <div className="admin-settings-tablist" role="tablist" aria-label="Settings Categories">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                id={`tab-btn-${tab.id}`}
                                aria-selected={isActive}
                                aria-controls={`tab-panel-${tab.id}`}
                                className={`admin-settings-tab ${isActive ? 'is-active' : ''}`}
                                onClick={() => handleTabClick(tab.id)}
                            >
                                <Icon size={18} className="admin-settings-tab-icon" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB 1: MODULE */}
            {activeTab === 'module' && (
                <div role="tabpanel" id="tab-panel-module" aria-labelledby="tab-btn-module">
                    <section className="admin-panel card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="admin-panel-header" style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 102, 51, 0.1)',
                                    color: '#006633',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Staff Sidebar Module Visibility</h3>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
                                        Choose which statutory modules appear in the Staff Portal navigation sidebar.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Appraisal Module Card */}
                            <div
                                className="admin-setting-module-row"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '1rem',
                                    padding: '1.25rem',
                                    borderRadius: '10px',
                                    background: 'var(--surface, #ffffff)',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', maxWidth: '640px' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '10px',
                                        background: moduleSettings.enable_appraisal_in_staff_sidebar ? 'rgba(0, 102, 51, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                                        color: moduleSettings.enable_appraisal_in_staff_sidebar ? '#006633' : '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: '2px',
                                    }}>
                                        <FileText size={22} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-color, #0f172a)' }}>
                                                Staff Appraisal &amp; APER Module
                                            </h4>
                                            <span
                                                style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: '600',
                                                    padding: '0.18rem 0.55rem',
                                                    borderRadius: '999px',
                                                    background: moduleSettings.enable_appraisal_in_staff_sidebar ? 'rgba(0, 102, 51, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                                    color: moduleSettings.enable_appraisal_in_staff_sidebar ? '#006633' : '#64748b',
                                                }}
                                            >
                                                {moduleSettings.enable_appraisal_in_staff_sidebar ? 'Active in Staff Sidebar' : 'Hidden from Staff Sidebar'}
                                            </span>
                                            {lastSaved === 'enable_appraisal_in_staff_sidebar' && (
                                                <span style={{ fontSize: '0.75rem', color: '#006633', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <CheckCircle2 size={13} /> Saved
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: 'var(--muted, #64748b)', lineHeight: '1.45' }}>
                                            When toggled on, the Appraisal menu (Dashboard, My Appraisals, My CV) is visible to academic staff in their sidebar.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <label
                                        className="admin-toggle-switch"
                                        title={moduleSettings.enable_appraisal_in_staff_sidebar ? 'Toggle off to hide from staff sidebar' : 'Toggle on to show in staff sidebar'}
                                        aria-label="Toggle Appraisal module in staff sidebar"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={moduleSettings.enable_appraisal_in_staff_sidebar}
                                            onChange={() => handleToggle('enable_appraisal_in_staff_sidebar')}
                                            disabled={savingKey === 'enable_appraisal_in_staff_sidebar'}
                                        />
                                        <span className="admin-toggle-slider" />
                                    </label>

                                    <a
                                        href="/appraisal"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="admin-setting-icon-link"
                                        title="Open Appraisal & APER Portal in a new tab"
                                        aria-label="Open Appraisal & APER Portal in a new tab"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>

                            {/* Internal Audit Module Card */}
                            <div
                                className="admin-setting-module-row"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '1rem',
                                    padding: '1.25rem',
                                    borderRadius: '10px',
                                    background: 'var(--surface, #ffffff)',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', maxWidth: '640px' }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '10px',
                                        background: moduleSettings.enable_audit_in_staff_sidebar ? 'rgba(0, 102, 51, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                                        color: moduleSettings.enable_audit_in_staff_sidebar ? '#006633' : '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: '2px',
                                    }}>
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-color, #0f172a)' }}>
                                                Internal Audit Module
                                            </h4>
                                            <span
                                                style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: '600',
                                                    padding: '0.18rem 0.55rem',
                                                    borderRadius: '999px',
                                                    background: moduleSettings.enable_audit_in_staff_sidebar ? 'rgba(0, 102, 51, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                                    color: moduleSettings.enable_audit_in_staff_sidebar ? '#006633' : '#64748b',
                                                }}
                                            >
                                                {moduleSettings.enable_audit_in_staff_sidebar ? 'Active in Staff Sidebar' : 'Hidden from Staff Sidebar'}
                                            </span>
                                            {lastSaved === 'enable_audit_in_staff_sidebar' && (
                                                <span style={{ fontSize: '0.75rem', color: '#006633', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <CheckCircle2 size={13} /> Saved
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: 'var(--muted, #64748b)', lineHeight: '1.45' }}>
                                            When toggled on, the Internal Audit menu (Overview, Verification) is visible to staff in their sidebar.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <label
                                        className="admin-toggle-switch"
                                        title={moduleSettings.enable_audit_in_staff_sidebar ? 'Toggle off to hide from staff sidebar' : 'Toggle on to show in staff sidebar'}
                                        aria-label="Toggle Internal Audit module in staff sidebar"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={moduleSettings.enable_audit_in_staff_sidebar}
                                            onChange={() => handleToggle('enable_audit_in_staff_sidebar')}
                                            disabled={savingKey === 'enable_audit_in_staff_sidebar'}
                                        />
                                        <span className="admin-toggle-slider" />
                                    </label>

                                    <a
                                        href="/audit"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="admin-setting-icon-link"
                                        title="Open Internal Audit Portal in a new tab"
                                        aria-label="Open Internal Audit Portal in a new tab"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* TAB 2: PERMISSION MATRIX */}
            {activeTab === 'permissions' && (
                <div role="tabpanel" id="tab-panel-permissions" aria-labelledby="tab-btn-permissions">
                    <AdminPermissionsSection
                        rolePermissions={rolePermissions}
                        onSave={onSavePermissions}
                        hideHeader
                    />
                </div>
            )}

            {/* TAB 3: MAIN */}
            {activeTab === 'main' && (
                <div role="tabpanel" id="tab-panel-main" aria-labelledby="tab-btn-main">
                    <form onSubmit={handleMainSubmit}>
                        <div className="admin-main-settings-grid">
                            {/* Card 1: Institution & Academic Setup */}
                            <div className="admin-settings-card">
                                <div className="admin-settings-card-header">
                                    <div className="admin-settings-card-icon">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <h4 className="admin-settings-card-title">Institution &amp; Academic Identity</h4>
                                        <p className="admin-settings-card-desc">University branding, portal labels, and academic terms.</p>
                                    </div>
                                </div>

                                <div className="admin-settings-form-row">
                                    <label className="admin-settings-label" htmlFor="main_institution_name">
                                        Institution / University Name
                                    </label>
                                    <div className="admin-settings-input-wrap">
                                        <Building2 size={16} className="admin-settings-input-icon" />
                                        <input
                                            id="main_institution_name"
                                            type="text"
                                            className="admin-settings-input"
                                            value={mainForm.institution_name}
                                            onChange={(e) => setMainForm((prev) => ({ ...prev, institution_name: e.target.value }))}
                                            placeholder="e.g. Federal University of Health Sciences, Otukpo"
                                            required
                                        />
                                    </div>
                                    <p className="admin-settings-help-text">Displayed on official reports, payslips, and portal banners.</p>
                                </div>

                                <div className="admin-settings-form-row">
                                    <label className="admin-settings-label" htmlFor="main_portal_title">
                                        Portal Title
                                    </label>
                                    <div className="admin-settings-input-wrap">
                                        <Globe size={16} className="admin-settings-input-icon" />
                                        <input
                                            id="main_portal_title"
                                            type="text"
                                            className="admin-settings-input"
                                            value={mainForm.portal_title}
                                            onChange={(e) => setMainForm((prev) => ({ ...prev, portal_title: e.target.value }))}
                                            placeholder="e.g. Academic Staff Profile & Portfolio Management System"
                                            required
                                        />
                                    </div>
                                    <p className="admin-settings-help-text">System title shown in browser tab and portal headers.</p>
                                </div>

                                <div className="admin-settings-form-row">
                                    <label className="admin-settings-label" htmlFor="main_academic_session">
                                        Active Academic Session
                                    </label>
                                    <div className="admin-settings-input-wrap">
                                        <Calendar size={16} className="admin-settings-input-icon" />
                                        <input
                                            id="main_academic_session"
                                            type="text"
                                            className="admin-settings-input"
                                            value={mainForm.academic_session}
                                            onChange={(e) => setMainForm((prev) => ({ ...prev, academic_session: e.target.value }))}
                                            placeholder="e.g. 2024/2025"
                                            required
                                        />
                                    </div>
                                    <p className="admin-settings-help-text">Current active session applied across appraisals and courses.</p>
                                </div>
                            </div>

                            {/* Card 2: Helpdesk & Public Directory Policies */}
                            <div className="admin-settings-card">
                                <div className="admin-settings-card-header">
                                    <div className="admin-settings-card-icon">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h4 className="admin-settings-card-title">Helpdesk &amp; Directory Access</h4>
                                        <p className="admin-settings-card-desc">Technical contact information and public privacy controls.</p>
                                    </div>
                                </div>

                                <div className="admin-settings-form-row">
                                    <label className="admin-settings-label" htmlFor="main_support_email">
                                        Technical Support Email
                                    </label>
                                    <div className="admin-settings-input-wrap">
                                        <Mail size={16} className="admin-settings-input-icon" />
                                        <input
                                            id="main_support_email"
                                            type="email"
                                            className="admin-settings-input"
                                            value={mainForm.support_email}
                                            onChange={(e) => setMainForm((prev) => ({ ...prev, support_email: e.target.value }))}
                                            placeholder="e.g. support@fuhso.edu.ng"
                                            required
                                        />
                                    </div>
                                    <p className="admin-settings-help-text">Recipient for login help requests and staff inquiries.</p>
                                </div>

                                <div className="admin-settings-form-row">
                                    <label className="admin-settings-label" htmlFor="main_support_phone">
                                        Helpline / Support Phone
                                    </label>
                                    <div className="admin-settings-input-wrap">
                                        <Phone size={16} className="admin-settings-input-icon" />
                                        <input
                                            id="main_support_phone"
                                            type="text"
                                            className="admin-settings-input"
                                            value={mainForm.support_phone}
                                            onChange={(e) => setMainForm((prev) => ({ ...prev, support_phone: e.target.value }))}
                                            placeholder="e.g. +234 803 000 0000"
                                        />
                                    </div>
                                    <p className="admin-settings-help-text">Helpline phone displayed on public contact pages.</p>
                                </div>

                                <div style={{ marginTop: '1.25rem' }}>
                                    <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                                        Public Policies
                                    </h5>

                                    <div className="admin-settings-policy-item">
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#0f172a' }}>
                                                Public Staff Directory
                                            </div>
                                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                                Allow public visitors to search and view published academic profiles without logging in.
                                            </p>
                                        </div>
                                        <label className="admin-toggle-switch" aria-label="Toggle public staff directory">
                                            <input
                                                type="checkbox"
                                                checked={mainForm.allow_public_directory}
                                                onChange={(e) => setMainForm((prev) => ({ ...prev, allow_public_directory: e.target.checked }))}
                                            />
                                            <span className="admin-toggle-slider" />
                                        </label>
                                    </div>

                                    <div className="admin-settings-policy-item">
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '0.88rem', color: '#0f172a' }}>
                                                Public CV &amp; Resume Download
                                            </div>
                                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                                Allow visitors and researchers to download PDF academic resumes from staff profile pages.
                                            </p>
                                        </div>
                                        <label className="admin-toggle-switch" aria-label="Toggle public CV download">
                                            <input
                                                type="checkbox"
                                                checked={mainForm.allow_cv_download}
                                                onChange={(e) => setMainForm((prev) => ({ ...prev, allow_cv_download: e.target.checked }))}
                                            />
                                            <span className="admin-toggle-slider" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Action Bar */}
                        <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
                                    Changes take effect immediately across all portals upon saving.
                                </span>
                                {mainSaved && (
                                    <span style={{ fontSize: '0.85rem', color: '#006633', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={16} /> Main settings saved successfully!
                                    </span>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="button"
                                disabled={mainSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Save size={16} />
                                {mainSaving ? 'Saving Changes...' : 'Save Main Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

export { AdminSettingsSection };
