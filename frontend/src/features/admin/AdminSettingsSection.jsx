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
    Save,
    ListOrdered,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    RefreshCw,
    UserCheck,
    GraduationCap,
    School,
    Search
} from 'lucide-react';
import { AdminPageHeader } from '../../components/common/ui';
import { AdminPermissionsSection } from './AdminPermissionsSection';

const TABS = [
    { id: 'module', label: 'Module', icon: Layers },
    { id: 'hierarchy', label: 'Staff Hierarchy', icon: ListOrdered },
    { id: 'permissions', label: 'Permission Matrix', icon: ShieldCheck },
    { id: 'main', label: 'Main', icon: Sliders },
];

function AdminSettingsSection({ systemSettings = {}, rolePermissions = {}, staffList = [], onSave, onSavePermissions }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryTab = searchParams.get('tab');

    const resolveTab = (tab) => {
        if (tab === 'permissions' || tab === 'permission-matrix' || tab === 'matrix') {
            return 'permissions';
        }
        if (tab === 'main') {
            return 'main';
        }
        if (tab === 'hierarchy' || tab === 'staff-hierarchy') {
            return 'hierarchy';
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

    // --- Staff Hierarchy Tab State ---
    const parseHierarchyList = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                return val.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
            }
        }
        return ['PF/0583', 'PF/1229', 'PF/2365', 'PF/1466'];
    };

    const [hierarchyList, setHierarchyList] = useState(() => parseHierarchyList(systemSettings?.hierarchy_pf_numbers));
    const [newPfInput, setNewPfInput] = useState('');
    const [bulkPfText, setBulkPfText] = useState('');
    const [showBulkMode, setShowBulkMode] = useState(false);
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [hierarchySaving, setHierarchySaving] = useState(false);
    const [hierarchySaved, setHierarchySaved] = useState(false);

    useEffect(() => {
        if (systemSettings?.hierarchy_pf_numbers !== undefined) {
            setHierarchyList(parseHierarchyList(systemSettings.hierarchy_pf_numbers));
        }
    }, [systemSettings?.hierarchy_pf_numbers]);

    const normalizePf = (val) => String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    const findStaffByPf = (pf) => {
        const norm = normalizePf(pf);
        if (!norm) return null;
        return (staffList || []).find((s) => {
            const pfVal = s.pfNumber || s.staffNumber || s.pf_number || '';
            return normalizePf(pfVal) === norm;
        });
    };

    const handleAddPf = (pfToAdd) => {
        const raw = String(pfToAdd || newPfInput).trim();
        if (!raw) return;
        const norm = normalizePf(raw);
        if (hierarchyList.some((p) => normalizePf(p) === norm)) {
            setNewPfInput('');
            setStaffSearchQuery('');
            return;
        }
        setHierarchyList((prev) => [...prev, raw]);
        setNewPfInput('');
        setStaffSearchQuery('');
    };

    const handleMoveUp = (index) => {
        if (index <= 0) return;
        setHierarchyList((prev) => {
            const next = [...prev];
            const temp = next[index - 1];
            next[index - 1] = next[index];
            next[index] = temp;
            return next;
        });
    };

    const handleMoveDown = (index) => {
        if (index >= hierarchyList.length - 1) return;
        setHierarchyList((prev) => {
            const next = [...prev];
            const temp = next[index + 1];
            next[index + 1] = next[index];
            next[index] = temp;
            return next;
        });
    };

    const handleRemovePf = (index) => {
        setHierarchyList((prev) => prev.filter((_, i) => i !== index));
    };

    const handleResetDefaults = () => {
        setHierarchyList(['PF/0583', 'PF/1229', 'PF/2365', 'PF/1466']);
    };

    const handleApplyBulk = (mode = 'replace') => {
        const parsed = bulkPfText
            .split(/[\r\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (parsed.length === 0) return;

        if (mode === 'replace') {
            setHierarchyList(parsed);
        } else {
            const existingNorms = new Set(hierarchyList.map(normalizePf));
            const fresh = parsed.filter((it) => !existingNorms.has(normalizePf(it)));
            setHierarchyList((prev) => [...prev, ...fresh]);
        }
        setBulkPfText('');
        setShowBulkMode(false);
    };

    const handleSaveHierarchy = async () => {
        if (hierarchySaving) return;
        setHierarchySaving(true);
        try {
            await onSave({
                ...systemSettings,
                hierarchy_pf_numbers: hierarchyList,
            });
            setHierarchySaved(true);
            setTimeout(() => setHierarchySaved(false), 3500);
        } finally {
            setHierarchySaving(false);
        }
    };

    const searchNorm = staffSearchQuery.trim().toLowerCase();
    const staffSearchResults = searchNorm
        ? (staffList || []).filter((s) => {
            const name = (s.name || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
            const pf = (s.pfNumber || s.staffNumber || s.pf_number || '').toLowerCase();
            const dept = (s.departmentName || s.department || '').toLowerCase();
            return name.includes(searchNorm) || pf.includes(searchNorm) || dept.includes(searchNorm);
        }).slice(0, 6)
        : [];

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

            {/* TAB: STAFF HIERARCHY */}
            {activeTab === 'hierarchy' && (
                <div role="tabpanel" id="tab-panel-hierarchy" aria-labelledby="tab-btn-hierarchy">
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
                                    <ListOrdered size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Staff Directory Hierarchy &amp; Display Order</h3>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
                                        Set custom priority PF numbers to place university officers at the top of the directory. All remaining staff are ordered automatically by secondary hierarchy rules.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="admin-hierarchy-layout">
                            {/* LEFT COLUMN: Primary Hierarchy (Priority PF Numbers) */}
                            <div className="admin-hierarchy-left">
                                <div className="admin-hierarchy-subcard">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: '#0f172a' }}>
                                                Primary Hierarchy (Priority PF Numbers)
                                            </h4>
                                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                                Staff matching these PF numbers appear at the very top in this exact order.
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <button
                                                type="button"
                                                className="admin-button admin-button-secondary"
                                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                                                onClick={() => setShowBulkMode((prev) => !prev)}
                                            >
                                                {showBulkMode ? 'Hide Bulk Paste' : 'Bulk Paste'}
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-button admin-button-secondary"
                                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                                                onClick={handleResetDefaults}
                                                title="Reset to default priority PF numbers (PF/0583, PF/1229, PF/2365, PF/1466)"
                                            >
                                                <RefreshCw size={13} style={{ marginRight: '4px' }} /> Defaults
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bulk Paste Area */}
                                    {showBulkMode && (
                                        <div className="admin-hierarchy-bulk-panel">
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                                                Paste PF numbers (comma or line separated):
                                            </label>
                                            <textarea
                                                className="textarea"
                                                rows={3}
                                                value={bulkPfText}
                                                onChange={(e) => setBulkPfText(e.target.value)}
                                                placeholder="e.g. PF/0583, PF/1229, PF/2365, PF/1466"
                                                style={{ width: '100%', fontSize: '0.85rem', marginBottom: '0.5rem' }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    type="button"
                                                    className="admin-button admin-button-primary"
                                                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                                                    onClick={() => handleApplyBulk('replace')}
                                                >
                                                    Replace Priority List
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-button admin-button-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                                                    onClick={() => handleApplyBulk('append')}
                                                >
                                                    Append to List
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-button admin-button-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                                                    onClick={() => { setBulkPfText(''); setShowBulkMode(false); }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Single PF & Quick Staff Search */}
                                    <div className="admin-hierarchy-input-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 200px', display: 'flex', gap: '0.4rem' }}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Enter PF No (e.g. PF/0583)..."
                                                value={newPfInput}
                                                onChange={(e) => setNewPfInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddPf();
                                                    }
                                                }}
                                                style={{ fontSize: '0.88rem' }}
                                            />
                                            <button
                                                type="button"
                                                className="admin-button admin-button-primary"
                                                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                onClick={() => handleAddPf()}
                                                disabled={!newPfInput.trim()}
                                            >
                                                <Plus size={16} /> Add
                                            </button>
                                        </div>

                                        {/* Quick Pick Search */}
                                        <div style={{ flex: '1 1 220px', position: 'relative' }}>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <Search size={15} style={{ position: 'absolute', left: '0.7rem', color: '#94a3b8' }} />
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="Search staff to add..."
                                                    value={staffSearchQuery}
                                                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                                                    style={{ paddingLeft: '2.2rem', fontSize: '0.88rem', width: '100%' }}
                                                />
                                            </div>
                                            {staffSearchResults.length > 0 && (
                                                <div className="admin-hierarchy-search-dropdown">
                                                    {staffSearchResults.map((s) => {
                                                        const sPf = s.pfNumber || s.staffNumber || s.pf_number || 'N/A';
                                                        const isAlreadyInList = hierarchyList.some((p) => normalizePf(p) === normalizePf(sPf));
                                                        return (
                                                            <div
                                                                key={s.staffId || sPf}
                                                                className="admin-hierarchy-search-item"
                                                                onClick={() => {
                                                                    if (!isAlreadyInList) {
                                                                        handleAddPf(sPf);
                                                                    }
                                                                }}
                                                                style={{ opacity: isAlreadyInList ? 0.6 : 1, cursor: isAlreadyInList ? 'default' : 'pointer' }}
                                                            >
                                                                <div>
                                                                    <strong>{s.name || `${s.firstName || ''} ${s.lastName || ''}`}</strong>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                        {sPf} • {s.role || s.rankName || 'Staff'} • {s.departmentName || s.department || 'General'}
                                                                    </div>
                                                                </div>
                                                                <span className="admin-badge" style={{ fontSize: '0.72rem' }}>
                                                                    {isAlreadyInList ? 'Added' : '+ Add'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Configured List of PF Numbers */}
                                    <div className="admin-hierarchy-list-wrap">
                                        {hierarchyList.length === 0 ? (
                                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                No priority PF numbers configured. Click &quot;Defaults&quot; or enter PF numbers above.
                                            </div>
                                        ) : (
                                            <div className="admin-hierarchy-list">
                                                {hierarchyList.map((pf, index) => {
                                                    const matched = findStaffByPf(pf);
                                                    return (
                                                        <div key={`${pf}-${index}`} className="admin-hierarchy-row">
                                                            <div className="admin-hierarchy-rank-badge">
                                                                #{index + 1}
                                                            </div>
                                                            <div className="admin-hierarchy-pf-pill">
                                                                {pf}
                                                            </div>
                                                            <div className="admin-hierarchy-staff-info">
                                                                {matched ? (
                                                                    <>
                                                                        <div className="admin-hierarchy-staff-name">
                                                                            {matched.name || `${matched.firstName || ''} ${matched.lastName || ''}`}
                                                                        </div>
                                                                        <div className="admin-hierarchy-staff-meta">
                                                                            {matched.role || matched.rankName || 'Staff Member'} • {matched.departmentName || matched.department || 'General'}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                                                                        Custom Priority PF Number
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="admin-hierarchy-actions">
                                                                <button
                                                                    type="button"
                                                                    className="admin-icon-button"
                                                                    disabled={index === 0}
                                                                    onClick={() => handleMoveUp(index)}
                                                                    title="Move up in priority"
                                                                    aria-label="Move up"
                                                                >
                                                                    <ArrowUp size={15} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-icon-button"
                                                                    disabled={index === hierarchyList.length - 1}
                                                                    onClick={() => handleMoveDown(index)}
                                                                    title="Move down in priority"
                                                                    aria-label="Move down"
                                                                >
                                                                    <ArrowDown size={15} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-icon-button is-danger"
                                                                    onClick={() => handleRemovePf(index)}
                                                                    title="Remove from priority list"
                                                                    aria-label="Remove"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Secondary Hierarchy Explanatory Card */}
                            <div className="admin-hierarchy-right">
                                <div className="admin-hierarchy-subcard is-info">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '6px',
                                            background: 'rgba(0, 102, 51, 0.12)',
                                            color: '#006633',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <GraduationCap size={16} />
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: '#0f172a' }}>
                                            Secondary Hierarchy Rules
                                        </h4>
                                    </div>

                                    <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b', lineHeight: '1.45' }}>
                                        Staff members not included in the priority list above are dynamically ordered across the public directory according to the following university criteria:
                                    </p>

                                    <div className="admin-hierarchy-tiers">
                                        <div className="admin-hierarchy-tier-item">
                                            <div className="admin-hierarchy-tier-number">1</div>
                                            <div className="admin-hierarchy-tier-body">
                                                <strong>Staff with Passport / Photo Present</strong>
                                                <p>Staff members with an uploaded portrait or passport photograph appear first before profiles with default placeholders.</p>
                                            </div>
                                        </div>

                                        <div className="admin-hierarchy-tier-item">
                                            <div className="admin-hierarchy-tier-number">2</div>
                                            <div className="admin-hierarchy-tier-body">
                                                <strong>Academic Rank Seniority</strong>
                                                <p>Senior academic cadres take precedence: <em>Professors</em> &rarr; <em>Associate Professors (Readers)</em> &rarr; <em>Senior Lecturers</em> &rarr; <em>Lecturers I &amp; II</em> &rarr; <em>Assistant Lecturers &amp; GAs</em>.</p>
                                            </div>
                                        </div>

                                        <div className="admin-hierarchy-tier-item">
                                            <div className="admin-hierarchy-tier-number">3</div>
                                            <div className="admin-hierarchy-tier-body">
                                                <strong>Colleges vs. Non-College Units</strong>
                                                <p>Academic Colleges and Teaching Faculties appear before Non-College Administrative or Central Directorate units.</p>
                                            </div>
                                        </div>

                                        <div className="admin-hierarchy-tier-item">
                                            <div className="admin-hierarchy-tier-number">4</div>
                                            <div className="admin-hierarchy-tier-body">
                                                <strong>Department &amp; Alphabetical Order</strong>
                                                <p>Within the same rank and college level, profiles are sorted alphabetically by Academic Department, then by Staff Full Name.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Action Bar */}
                        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--muted, #64748b)' }}>
                                    Hierarchy order takes effect immediately across the public directory and profile listings.
                                </span>
                                {hierarchySaved && (
                                    <span style={{ fontSize: '0.85rem', color: '#006633', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={16} /> Staff hierarchy settings saved successfully!
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                className="button"
                                onClick={handleSaveHierarchy}
                                disabled={hierarchySaving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Save size={16} />
                                {hierarchySaving ? 'Saving Changes...' : 'Save Hierarchy Settings'}
                            </button>
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
