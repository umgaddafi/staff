import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import {
    BarChart3,
    CalendarDays,
    ClipboardList,
    Edit,
    Eye,
    Plus,
    RefreshCw,
    Settings,
    ShieldCheck,
    Trash2,
    Users,
    X,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    AlertCircle,
    FileText,
    CheckCircle2,
    Search,
    Filter,
    FileSpreadsheet,
    Download,
    Printer
} from 'lucide-react';
import { api } from '../../lib/api';
import jostumLogo from '../../assets/jostum.jpeg';
import { AdminStaffAuditSection } from './AdminStaffAuditSection';

export function AuditAdminDashboard({ onLogout }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [stats, setStats] = useState({
        total_staff: 0,
        panel_members: 2,
        archived_staff: 0,
        not_submitted: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        requires_correction: 0,
        recent_panel_logins: [
            { id: 1, member_code: 'PANEL001', logged_in_at: '2026-08-23 20:45:27' },
            { id: 2, member_code: 'MEMBER-0002', logged_in_at: '2026-08-23 20:38:42' },
            { id: 3, member_code: 'PANEL001', logged_in_at: '2026-08-23 20:38:22' }
        ],
        recent_screened_staff: []
    });

    async function loadStats() {
        try {
            const res = await api('/api/public/audit/submissions');
            if (res && res.stats) {
                setStats(prev => ({
                    ...prev,
                    total_staff: res.stats.total_staff ?? 0,
                    not_submitted: res.stats.not_submitted ?? 0,
                    pending: res.stats.pending_count ?? 0,
                    verified: res.stats.screened_count ?? 0,
                    rejected: res.stats.rejected_count ?? 0,
                    requires_correction: res.stats.correction_count ?? 0,
                    panel_members: res.stats.panel_members ?? 2,
                    recent_screened_staff: res.stats.recent_screened_staff || []
                }));
            }
        } catch (err) {
            console.error('Stats loading error:', err);
        }
    }

    useEffect(() => {
        void loadStats();
    }, []);

    const navItems = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'staff', label: 'Staff', icon: Users },
        { id: 'screening', label: 'Screening Portal', icon: FileText },
        { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
        { id: 'panel', label: 'Panel Members', icon: ShieldCheck },
        { id: 'schedule', label: 'Schedule Screening', icon: CalendarDays },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    function handleLogoutClick() {
        if (onLogout) {
            onLogout();
        } else {
            localStorage.removeItem('audit_auth_user');
            window.location.href = '/audit/login';
        }
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFBFB', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Left Sidebar Navigation - Sticky Top */}
            <aside style={{
                width: sidebarCollapsed ? '80px' : '260px',
                height: '100vh',
                position: 'sticky',
                top: 0,
                overflowY: 'auto',
                background: '#014737',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s ease',
                flexShrink: 0,
                zIndex: 100,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
            }}>
                {/* Brand Header */}
                <div style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <img src={jostumLogo} alt="JOSTUM Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: '#fff', padding: '2px' }} />
                    {!sidebarCollapsed && (
                        <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                            JOSTUM Audit
                        </span>
                    )}
                </div>

                {/* Navigation Links */}
                <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isActive ? '#E8F5E9' : 'transparent',
                                    color: isActive ? '#014737' : 'rgba(255, 255, 255, 0.8)',
                                    fontWeight: isActive ? '700' : '500',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={20} color={isActive ? '#014737' : 'currentColor'} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Sidebar Footer Logout */}
                <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <button
                        type="button"
                        onClick={handleLogoutClick}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={18} />
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Topbar Header - Sticky Top */}
                <header style={{
                    height: '64px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 90,
                    background: '#FFFFFF',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 28px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button
                            type="button"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', display: 'grid', placeItems: 'center' }}
                        >
                            {sidebarCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
                        </button>
                        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#E8F5E9', color: '#014737', display: 'grid', placeItems: 'center' }}>
                            <BarChart3 size={20} />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#014737' }}>
                            Admin Dashboard
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogoutClick}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: '#FFFFFF',
                            color: '#014737',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </header>

                {/* Tab Body Contents */}
                <div style={{ padding: '28px', flex: 1 }}>
                    {activeTab === 'overview' && <OverviewTab stats={stats} />}
                    {activeTab === 'staff' && <StaffListTab />}
                    {activeTab === 'screening' && <AdminStaffAuditSection showFlash={(msg) => console.log(msg)} onLogout={handleLogoutClick} isEmbedded={true} />}
                    {activeTab === 'reports' && <ReportsTab />}
                    {activeTab === 'panel' && <PanelMembersTab />}
                    {activeTab === 'schedule' && <ScheduleScreeningTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </main>
        </div>
    );
}

{/* Overview Tab Component */}
function OverviewTab({ stats }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Stat Cards Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <StatMetricCard icon={Users} label="Total Staff" value={stats.total_staff} iconBg="#E0F2FE" iconColor="#0369A1" />
                <StatMetricCard icon={ShieldCheck} label="Panel Members" value={stats.panel_members} iconBg="#DCFCE7" iconColor="#15803D" />
                <StatMetricCard icon={ClipboardList} label="Archived Staff" value={stats.archived_staff} iconBg="#F1F5F9" iconColor="#64748B" />
                <StatMetricCard icon={AlertCircle} label="Not Submitted" value={stats.not_submitted} iconBg="#FEF9C3" iconColor="#A16207" />
            </div>

            {/* Stat Cards Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <StatMetricCard label="Pending" value={stats.pending} />
                <StatMetricCard label="Verified" value={stats.verified} />
                <StatMetricCard label="Rejected" value={stats.rejected} />
                <StatMetricCard label="Requires Correction" value={stats.requires_correction} />
            </div>

            {/* Bottom 2 Feeds */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '8px' }}>
                {/* Panel Member Logins */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 20px', color: '#014737', fontSize: '18px', fontWeight: '800' }}>
                        Panel Member Logins
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {stats.recent_panel_logins.map((item, idx) => (
                            <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '12px', padding: '16px' }}>
                                <strong style={{ display: 'block', color: '#0F172A', fontSize: '15px', fontWeight: '700' }}>
                                    {item.member_code}
                                </strong>
                                <span style={{ color: '#64748B', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    {item.logged_in_at}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recently Screened Staff */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 20px', color: '#014737', fontSize: '18px', fontWeight: '800' }}>
                        Recently Screened Staff
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {stats.recent_screened_staff.map((item, idx) => (
                            <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '12px', padding: '16px' }}>
                                <strong style={{ display: 'block', color: '#0F172A', fontSize: '15px', fontWeight: '700' }}>
                                    {item.staff_name}
                                </strong>
                                <span style={{ color: '#64748B', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    {item.pf_number} · <span style={{ color: '#166534', fontWeight: '700' }}>{item.decision}</span> · {item.screened_at}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatMetricCard({ icon: Icon, label, value, iconBg = '#F1F5F9', iconColor = '#64748B' }) {
    return (
        <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
            {Icon && (
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: iconBg, color: iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon size={22} />
                </div>
            )}
            <div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', lineHeight: 1.1 }}>
                    {value}
                </div>
                <div style={{ color: '#64748B', fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
                    {label}
                </div>
            </div>
        </div>
    );
}

{/* Full Working Staff List Tab */}
function StaffListTab() {
    const [staffList, setStaffList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [stats, setStats] = useState(null);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All departments');
    const [statusFilter, setStatusFilter] = useState('All statuses');
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [decidingDocId, setDecidingDocId] = useState(null);
    const [decidingStaff, setDecidingStaff] = useState(false);
    const [actionMessage, setActionMessage] = useState('');

    async function fetchStaff() {
        setLoading(true);
        try {
            const res = await api('/api/public/audit/submissions');
            if (res && res.submissions) {
                setStaffList(res.submissions);
            }
            if (res && res.departments) {
                setDepartments(res.departments);
            }
            if (res && res.stats) {
                setStats(res.stats);
            }
        } catch (err) {
            console.error('Failed to load audit staff list:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDocDecision(docId, decision) {
        setDecidingDocId(docId);
        setActionMessage('');
        try {
            await api.post(`/api/public/audit/documents/${docId}/decide`, { decision });
            const res = await api('/api/public/audit/submissions');
            if (res && res.submissions) {
                setStaffList(res.submissions);
                if (selectedStaff) {
                    const updated = res.submissions.find((s) => s.id === selectedStaff.id || s.pf_number === selectedStaff.pf_number);
                    if (updated) setSelectedStaff(updated);
                }
            }
            setActionMessage(`Document marked as '${decision}'.`);
        } catch (err) {
            console.error('Failed to update document decision:', err);
            setActionMessage(`Error: ${err.message || 'Failed to update document'}`);
        } finally {
            setDecidingDocId(null);
        }
    }

    async function handleStaffDecision(decision) {
        if (!selectedStaff) return;
        setDecidingStaff(true);
        setActionMessage('');
        try {
            await api.post(`/api/public/audit/submissions/${selectedStaff.id}/decide`, { decision });
            const res = await api('/api/public/audit/submissions');
            if (res && res.submissions) {
                setStaffList(res.submissions);
                const updated = res.submissions.find((s) => s.id === selectedStaff.id || s.pf_number === selectedStaff.pf_number);
                if (updated) setSelectedStaff(updated);
            }
            setActionMessage(`Staff status updated to '${decision}'.`);
        } catch (err) {
            console.error('Failed to update staff decision:', err);
            setActionMessage(`Error: ${err.message || 'Failed to update status'}`);
        } finally {
            setDecidingStaff(false);
        }
    }

    useEffect(() => {
        void fetchStaff();
    }, []);

    const filtered = staffList.filter((s) => {
        const matchesSearch =
            !search ||
            s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            s.pf_number?.toLowerCase().includes(search.toLowerCase()) ||
            s.phone?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase()) ||
            s.rank?.toLowerCase().includes(search.toLowerCase()) ||
            s.department?.toLowerCase().includes(search.toLowerCase());

        const matchesDept =
            deptFilter === 'All departments' ||
            s.department?.toLowerCase() === deptFilter.toLowerCase();

        const matchesStatus =
            statusFilter === 'All statuses' ||
            s.status?.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesDept && matchesStatus;
    });

    const totalStaffCount = stats?.total_staff ?? staffList.length;
    const verifiedCount = stats?.verified_count ?? staffList.filter(s => {
        const st = (s.status || '').toLowerCase();
        return st === 'verified' || st === 'legit' || s.status_id === 3;
    }).length;
    const pendingCount = stats?.pending_count ?? staffList.filter(s => {
        const st = (s.status || '').toLowerCase();
        return st === 'pending' || s.status_id === 2;
    }).length;
    const notSubmittedCount = stats?.not_submitted ?? staffList.filter(s => {
        const st = (s.status || '').toLowerCase();
        return st === 'not submitted' || st === 'not_submitted' || s.status_id === 1;
    }).length;

    function getBadgeConfig(status) {
        const st = (status || '').toLowerCase();
        if (st === 'verified' || st === 'legit') {
            return { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0', label: 'Verified' };
        }
        if (st === 'pending') {
            return { bg: '#FEF9C3', color: '#A16207', border: '#FEF08A', label: 'Pending' };
        }
        if (st === 'rejected' || st === 'fraudulent') {
            return { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA', label: 'Rejected' };
        }
        if (st === 'requires correction' || st === 'correction') {
            return { bg: '#FFEDD5', color: '#C2410C', border: '#FED7AA', label: 'Correction' };
        }
        return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', label: 'Not Submitted' };
    }

    function getInitials(name) {
        if (!name) return 'ST';
        const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Engr\.)\s*/i, '').trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            
            {/* Header & Refresh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ color: '#014737', margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                            Staff Directory & Audit Verification
                        </h2>
                        <span style={{ background: '#E8F5E9', color: '#014737', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                            Live Database
                        </span>
                    </div>
                    <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: '13px' }}>
                        Real university staff records synchronized directly from academic staff repository.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={fetchStaff}
                        disabled={loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: '#F8FAFC',
                            color: '#014737',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stat Cards: Total Staff, Verified, Pending Audit, Not Submitted */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatMetricCard
                    icon={Users}
                    label="Total Staff"
                    value={totalStaffCount}
                    iconBg="#E0F2FE"
                    iconColor="#0369A1"
                />
                <StatMetricCard
                    icon={CheckCircle2}
                    label="Verified"
                    value={verifiedCount}
                    iconBg="#DCFCE7"
                    iconColor="#15803D"
                />
                <StatMetricCard
                    icon={AlertCircle}
                    label="Pending Audit"
                    value={pendingCount}
                    iconBg="#FEF9C3"
                    iconColor="#A16207"
                />
                <StatMetricCard
                    icon={ClipboardList}
                    label="Not Submitted"
                    value={notSubmittedCount}
                    iconBg="#F1F5F9"
                    iconColor="#475569"
                />
            </div>

            {/* Filter Controls Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search PF, Name, Phone, Email, Rank..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 14px 10px 40px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            fontSize: '13px',
                            outline: 'none',
                            color: '#0F172A'
                        }}
                    />
                </div>

                <div>
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 14px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            fontSize: '13px',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="All departments">All Departments</option>
                        {departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 14px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            fontSize: '13px',
                            background: '#FFFFFF',
                            color: '#0F172A',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="All statuses">All Statuses</option>
                        <option value="Pending">Pending Audit</option>
                        <option value="Verified">Verified</option>
                        <option value="Not Submitted">Not Submitted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Requires Correction">Requires Correction</option>
                    </select>
                </div>
            </div>

            {/* Table Area */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: '#014737' }} />
                    <div style={{ fontWeight: '600' }}>Fetching real staff records from database...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #CBD5E1' }}>
                    <Users size={32} color="#94A3B8" style={{ marginBottom: '10px' }} />
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#334155' }}>No staff records found</div>
                    <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Try adjusting your search query or department/status filters.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                                <th style={{ padding: '14px 16px' }}>Staff Member</th>
                                <th style={{ padding: '14px 16px' }}>PF Number</th>
                                <th style={{ padding: '14px 16px' }}>Department & Rank</th>
                                <th style={{ padding: '14px 16px' }}>Contact</th>
                                <th style={{ padding: '14px 16px' }}>Documents</th>
                                <th style={{ padding: '14px 16px' }}>Audit Status</th>
                                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => {
                                const badge = getBadgeConfig(s.status);
                                const docCount = s.documents?.length || 0;
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.15s ease' }}>
                                        
                                        {/* Staff Photo & Name */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {s.photo_url ? (
                                                    <img
                                                        src={s.photo_url}
                                                        alt={s.full_name}
                                                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '38px',
                                                        height: '38px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #014737, #0B6B53)',
                                                        color: '#FFFFFF',
                                                        display: 'grid',
                                                        placeItems: 'center',
                                                        fontWeight: '700',
                                                        fontSize: '13px',
                                                        flexShrink: 0
                                                    }}>
                                                        {getInitials(s.full_name)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '14px' }}>
                                                        {s.full_name}
                                                    </div>
                                                    <div style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>
                                                        {s.email || 'No email registered'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PF Number */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                background: '#F1F5F9',
                                                border: '1px solid #E2E8F0',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontWeight: '800',
                                                color: '#014737',
                                                fontFamily: 'monospace',
                                                fontSize: '13px'
                                            }}>
                                                {s.pf_number}
                                            </span>
                                        </td>

                                        {/* Department & Rank */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ fontWeight: '600', color: '#1E293B' }}>{s.department || 'General'}</div>
                                            <div style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>
                                                {s.rank || 'Staff'} {s.category ? `• ${s.category}` : ''}
                                            </div>
                                        </td>

                                        {/* Contact Phone */}
                                        <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>
                                            {s.phone || '—'}
                                        </td>

                                        {/* Documents Count */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                color: docCount > 0 ? '#014737' : '#94A3B8',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: docCount > 0 ? '#E8F5E9' : '#F8FAFC',
                                                border: docCount > 0 ? '1px solid #C8E6C9' : '1px solid #E2E8F0',
                                                padding: '3px 8px',
                                                borderRadius: '8px'
                                            }}>
                                                <FileText size={13} />
                                                {docCount} {docCount === 1 ? 'doc' : 'docs'}
                                            </span>
                                        </td>

                                        {/* Audit Status */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                background: badge.bg,
                                                color: badge.color,
                                                border: `1px solid ${badge.border}`,
                                                padding: '5px 12px',
                                                borderRadius: '20px',
                                                fontWeight: '700',
                                                fontSize: '12px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}>
                                                {badge.label}
                                            </span>
                                        </td>

                                        {/* Action Button */}
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStaff(s)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '7px 12px',
                                                    background: '#F0FDF4',
                                                    color: '#166534',
                                                    border: '1px solid #BBF7D0',
                                                    borderRadius: '8px',
                                                    fontWeight: '700',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="View Staff Profile & Audit Documents"
                                            >
                                                <Eye size={14} /> Particulars
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Staff Audit Details Modal */}
            {selectedStaff && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '24px',
                        width: '720px',
                        maxWidth: '95vw',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #E2E8F0'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '24px 28px',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#F8FAFC',
                            borderRadius: '24px 24px 0 0'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#014737' }}>
                                    Staff Audit Particulars
                                </h3>
                                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                                    PF Number: <strong>{selectedStaff.pf_number}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedStaff(null)}
                                style={{
                                    border: 'none',
                                    background: '#E2E8F0',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'grid',
                                    placeItems: 'center',
                                    cursor: 'pointer',
                                    color: '#475569'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Profile Header Card */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '18px',
                                padding: '20px',
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '16px'
                            }}>
                                {selectedStaff.photo_url ? (
                                    <img
                                        src={selectedStaff.photo_url}
                                        alt={selectedStaff.full_name}
                                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #014737' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #014737, #0B6B53)',
                                        color: '#FFFFFF',
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontWeight: '800',
                                        fontSize: '22px',
                                        flexShrink: 0
                                    }}>
                                        {getInitials(selectedStaff.full_name)}
                                    </div>
                                )}

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>
                                            {selectedStaff.full_name}
                                        </h4>
                                        <span style={{
                                            ...getBadgeConfig(selectedStaff.status),
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            border: `1px solid ${getBadgeConfig(selectedStaff.status).border}`
                                        }}>
                                            {getBadgeConfig(selectedStaff.status).label}
                                        </span>
                                    </div>
                                    <div style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>
                                        {selectedStaff.rank} • {selectedStaff.department}
                                    </div>
                                    <div style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>
                                        Category: <strong>{selectedStaff.category || 'Teaching (Academic)'}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Particulars Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                                <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</span>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginTop: '2px' }}>
                                        {selectedStaff.email || 'Not Provided'}
                                    </div>
                                </div>
                                <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Phone Number</span>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginTop: '2px' }}>
                                        {selectedStaff.phone || 'Not Provided'}
                                    </div>
                                </div>
                                <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Profile Completion</span>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginTop: '2px' }}>
                                        {selectedStaff.profile_completion || 100}%
                                    </div>
                                </div>
                                <div style={{ padding: '12px 16px', background: '#FAFAFA', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Submission Timestamp</span>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginTop: '2px' }}>
                                        {selectedStaff.submitted_at || 'Not submitted'}
                                    </div>
                                </div>
                            </div>

                            {/* Submitted Documents Section */}
                            <div>
                                <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '800', color: '#014737', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={18} /> Audit Verification Documents ({selectedStaff.documents?.length || 0})
                                </h4>

                                {(!selectedStaff.documents || selectedStaff.documents.length === 0) ? (
                                    <div style={{ padding: '28px', textAlign: 'center', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '12px', color: '#64748B' }}>
                                        <AlertCircle size={28} color="#94A3B8" style={{ marginBottom: '8px' }} />
                                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#334155' }}>No verification documents submitted</div>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                                            This staff member has not yet uploaded screening documents on the audit portal.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {selectedStaff.documents.map((doc) => (
                                            <div
                                                key={doc.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '14px 18px',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '12px'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>
                                                        {doc.type_name}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                                        {doc.original_name} {doc.file_size ? `• ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                                                        {doc.screener_name && ` • Screened by ${doc.screener_name}`}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        background: doc.decision === 'legit' ? '#DCFCE7' : doc.decision === 'rejected' ? '#FEE2E2' : doc.decision === 'requires_correction' ? '#FFEDD5' : '#FEF9C3',
                                                        color: doc.decision === 'legit' ? '#15803D' : doc.decision === 'rejected' ? '#B91C1C' : doc.decision === 'requires_correction' ? '#C2410C' : '#A16207',
                                                        padding: '4px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {doc.decision === 'legit' ? 'Verified' : doc.decision || 'Pending'}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        title="Mark as Legitimate"
                                                        disabled={decidingDocId === doc.id}
                                                        onClick={() => handleDocDecision(doc.id, 'legit')}
                                                        style={{
                                                            padding: '5px 9px',
                                                            background: doc.decision === 'legit' ? '#15803D' : '#F0FDF4',
                                                            color: doc.decision === 'legit' ? '#FFFFFF' : '#15803D',
                                                            border: '1px solid #86EFAC',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ✓ Verify
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Requires Correction"
                                                        disabled={decidingDocId === doc.id}
                                                        onClick={() => handleDocDecision(doc.id, 'requires_correction')}
                                                        style={{
                                                            padding: '5px 9px',
                                                            background: doc.decision === 'requires_correction' ? '#D97706' : '#FFFBEB',
                                                            color: doc.decision === 'requires_correction' ? '#FFFFFF' : '#D97706',
                                                            border: '1px solid #FDE68A',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Fix
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Reject Document"
                                                        disabled={decidingDocId === doc.id}
                                                        onClick={() => handleDocDecision(doc.id, 'rejected')}
                                                        style={{
                                                            padding: '5px 9px',
                                                            background: doc.decision === 'rejected' ? '#DC2626' : '#FEF2F2',
                                                            color: doc.decision === 'rejected' ? '#FFFFFF' : '#DC2626',
                                                            border: '1px solid #FECACA',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Reject
                                                    </button>

                                                    {doc.file_url && (
                                                        <a
                                                            href={doc.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                padding: '5px 10px',
                                                                background: '#014737',
                                                                color: '#FFFFFF',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                textDecoration: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px'
                                                            }}
                                                        >
                                                            <Eye size={12} /> View
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer with Staff Decision Controls */}
                        <div style={{
                            padding: '16px 28px',
                            borderTop: '1px solid #E2E8F0',
                            background: '#F8FAFC',
                            borderRadius: '0 0 24px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Overall Staff Status:</span>
                                <button
                                    type="button"
                                    disabled={decidingStaff}
                                    onClick={() => handleStaffDecision('verify')}
                                    style={{
                                        padding: '7px 14px',
                                        background: '#15803D',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        cursor: decidingStaff ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ✓ Approve & Verify Staff
                                </button>
                                <button
                                    type="button"
                                    disabled={decidingStaff}
                                    onClick={() => handleStaffDecision('require_correction')}
                                    style={{
                                        padding: '7px 14px',
                                        background: '#D97706',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        cursor: decidingStaff ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ⚠ Request Correction
                                </button>
                                <button
                                    type="button"
                                    disabled={decidingStaff}
                                    onClick={() => handleStaffDecision('reject')}
                                    style={{
                                        padding: '7px 14px',
                                        background: '#DC2626',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        cursor: decidingStaff ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ✕ Reject Staff
                                </button>
                                {actionMessage && (
                                    <span style={{ fontSize: '12px', color: '#166534', fontWeight: '700' }}>
                                        {actionMessage}
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => { setSelectedStaff(null); setActionMessage(''); }}
                                style={{
                                    padding: '8px 18px',
                                    background: '#014737',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Close Particulars
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

{/* Full Working Panel Members Tab */}
function PanelMembersTab() {
    const [panelMembers, setPanelMembers] = useState(() => {
        const saved = localStorage.getItem('audit_panel_members');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [
            { id: 1, member_code: 'PANEL001', title: 'Dr.', full_name: 'Panel Screener', email: 'panel@jostum.edu.ng', phone: '08012345678', status: 'active' },
            { id: 2, member_code: 'MEMBER-0002', title: 'Dr.', full_name: 'GADDAFI UMAR', email: 'gaddafiumar4445@gmail.com', phone: '09042340091', status: 'active' }
        ];
    });

    const [showAddForm, setShowAddForm] = useState(false);
    const [form, setForm] = useState({ title: 'Dr.', full_name: '', email: '', phone: '' });
    const [search, setSearch] = useState('');

    // Modal state for Managing Panel Member
    const [editingMember, setEditingMember] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        localStorage.setItem('audit_panel_members', JSON.stringify(panelMembers));
    }, [panelMembers]);

    function handleAdd(e) {
        e.preventDefault();
        if (!form.full_name || !form.email) return;
        const newMember = {
            id: Date.now(),
            member_code: `MEMBER-${String(panelMembers.length + 1).padStart(4, '0')}`,
            title: form.title,
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            status: 'active'
        };
        setPanelMembers([...panelMembers, newMember]);
        setForm({ title: 'Dr.', full_name: '', email: '', phone: '' });
        setShowAddForm(false);
        setToastMsg(`Panel member ${newMember.member_code} added successfully.`);
        setTimeout(() => setToastMsg(''), 3000);
    }

    function openManageModal(member) {
        setEditingMember(member);
        setEditForm({ ...member });
    }

    function handleSaveEdit(e) {
        e.preventDefault();
        if (!editForm.full_name || !editForm.email) return;

        setPanelMembers(prev => prev.map(m => m.id === editForm.id ? editForm : m));
        setEditingMember(null);
        setToastMsg(`Panel member ${editForm.member_code} details updated successfully.`);
        setTimeout(() => setToastMsg(''), 3000);
    }

    function handleDelete(id, memberCode) {
        if (window.confirm(`Are you sure you want to delete panel member ${memberCode}? This action cannot be undone.`)) {
            setPanelMembers(prev => prev.filter(m => m.id !== id));
            if (editingMember && editingMember.id === id) {
                setEditingMember(null);
            }
            setToastMsg(`Panel member ${memberCode} deleted successfully.`);
            setTimeout(() => setToastMsg(''), 3000);
        }
    }

    function handleResetPassword(id, memberCode) {
        if (window.confirm(`Are you sure you want to reset the password for panel member ${memberCode} to '12345678'?`)) {
            setPanelMembers(prev => {
                const updated = prev.map(m => m.id === id ? { ...m, password: '12345678', password_reset: true } : m);
                localStorage.setItem('audit_panel_members', JSON.stringify(updated));
                return updated;
            });
            if (editForm && editForm.id === id) {
                setEditForm(prev => prev ? { ...prev, password: '12345678', password_reset: true } : null);
            }
            setToastMsg(`Password for panel member ${memberCode} has been reset to: 12345678`);
            setTimeout(() => setToastMsg(''), 4000);
        }
    }

    const filtered = panelMembers.filter(p =>
        !search ||
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.member_code?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header & Add Button */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ color: '#014737', margin: 0, fontSize: '18px', fontWeight: '800' }}>Panel Members Management</h2>
                        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>Create, update, and manage audit panel screeners and accounts.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#014737', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                    >
                        {showAddForm ? <X size={16} /> : <Plus size={16} />}
                        {showAddForm ? 'Cancel' : 'Add Panel Member'}
                    </button>
                </div>

                {/* Notification Toast */}
                {toastMsg && (
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', borderRadius: '10px', fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✓ {toastMsg}</span>
                        <button type="button" onClick={() => setToastMsg('')} style={{ border: 'none', background: 'transparent', color: '#166534', cursor: 'pointer', fontWeight: '700' }}>✕</button>
                    </div>
                )}

                {/* Add Form */}
                {showAddForm && (
                    <form onSubmit={handleAdd} style={{ marginTop: '20px', padding: '20px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 2fr auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>TITLE</label>
                            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                            <input type="text" required placeholder="e.g. Dr. John Doe" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                            <input type="email" required placeholder="panel@jostum.edu.ng" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>PHONE</label>
                            <input type="text" placeholder="08012345678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                        <button type="submit" style={{ padding: '9px 18px', background: '#166534', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                            Create & Email
                        </button>
                    </form>
                )}
            </div>

            {/* Table Container */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '280px' }}>
                        <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search panel members..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                                <th style={{ padding: '12px 16px' }}>Code</th>
                                <th style={{ padding: '12px 16px' }}>Name</th>
                                <th style={{ padding: '12px 16px' }}>Email</th>
                                <th style={{ padding: '12px 16px' }}>Phone</th>
                                <th style={{ padding: '12px 16px' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#014737' }}>{p.member_code}</td>
                                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0F172A' }}>{p.title} {p.full_name}</td>
                                    <td style={{ padding: '14px 16px', color: '#475569' }}>{p.email}</td>
                                    <td style={{ padding: '14px 16px', color: '#64748B' }}>{p.phone}</td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{
                                            background: p.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                                            color: p.status === 'active' ? '#166534' : '#B91C1C',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            fontSize: '12px',
                                            textTransform: 'capitalize'
                                        }}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            onClick={() => openManageModal(p)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 14px',
                                                background: '#E8F5E9',
                                                color: '#014737',
                                                border: '1px solid #A7F3D0',
                                                borderRadius: '8px',
                                                fontWeight: '700',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Edit size={14} /> Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manage Panel Member Modal Popup */}
            {editingMember && editForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '16px' }}>
                    <div style={{ background: '#FFFFFF', borderRadius: '16px', width: 'min(500px, 95vw)', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#014737', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Manage Panel Member
                                    <span style={{ fontSize: '12px', background: '#E8F5E9', color: '#014737', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                                        {editForm.member_code}
                                    </span>
                                </h3>
                                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '12px' }}>
                                    Modify member credentials, personal information, and access status.
                                </p>
                            </div>
                            <button type="button" onClick={() => setEditingMember(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>TITLE</label>
                                    <input
                                        type="text"
                                        value={editForm.title || ''}
                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>FULL NAME</label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.full_name || ''}
                                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>EMAIL ADDRESS</label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email || ''}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>PHONE NUMBER</label>
                                <input
                                    type="text"
                                    value={editForm.phone || ''}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>ACCOUNT STATUS</label>
                                <select
                                    value={editForm.status || 'active'}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400E' }}>RESET MEMBER PASSWORD</div>
                                    <div style={{ fontSize: '11px', color: '#B45309' }}>Sets default password to <strong>12345678</strong></div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleResetPassword(editForm.id, editForm.member_code)}
                                    style={{
                                        padding: '8px 14px',
                                        background: '#F59E0B',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <RefreshCw size={14} /> Reset to 12345678
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(editForm.id, editForm.member_code)}
                                    style={{ padding: '10px 16px', border: 'none', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Trash2 size={16} /> Delete Member
                                </button>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingMember(null)}
                                        style={{ padding: '10px 18px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ padding: '10px 22px', background: '#014737', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

{/* Pixel-Perfect Schedule Screening Tab */}
function ScheduleScreeningTab() {
    const [staffRows, setStaffRows] = useState([]);
    const [deptList, setDeptList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All departments');
    const [statusFilter, setStatusFilter] = useState('All statuses');
    const [perPage, setPerPage] = useState('10');
    const [page, setPage] = useState(1);

    // Modal & Toast
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ date: '', time: '', venue: 'Main Senate Chamber' });
    const [message, setMessage] = useState('');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const res = await api('/api/public/audit/submissions');
                if (res && res.submissions) {
                    setStaffRows(res.submissions);
                }
                if (res && res.departments) {
                    setDeptList(res.departments);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const filtered = staffRows.filter((s) => {
        const matchesSearch =
            !search ||
            s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            s.pf_number?.toLowerCase().includes(search.toLowerCase()) ||
            s.phone?.toLowerCase().includes(search.toLowerCase());

        const matchesDept = deptFilter === 'All departments' || s.department?.toLowerCase() === deptFilter.toLowerCase();
        const matchesStatus = statusFilter === 'All statuses' || s.status?.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesDept && matchesStatus;
    });

    const totalStaff = filtered.length;
    const totalPages = Math.ceil(totalStaff / parseInt(perPage, 10)) || 1;
    const paginated = filtered.slice((page - 1) * parseInt(perPage, 10), page * parseInt(perPage, 10));

    async function handleSendInvites(e) {
        e.preventDefault();
        setInviting(true);
        try {
            const targetIds = filtered.map((s) => s.id);
            const res = await api.post('/api/public/audit/schedule/invite', {
                staff_ids: targetIds,
                date: inviteForm.date,
                time: inviteForm.time,
                venue: inviteForm.venue,
            });
            setMessage(res?.message || `Successfully queued ${targetIds.length} screening invitation(s).`);
            setInviteOpen(false);
        } catch (err) {
            console.error('Failed to send screening invitations:', err);
            setMessage(`Failed to send invitations: ${err.message || 'Server error'}`);
        } finally {
            setInviting(false);
        }
    }

    return (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            
            {/* Title Header & Top Action Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ color: '#014737', margin: 0, fontSize: '24px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                        Schedule Screening
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>
                        Filter staff, then send screening invitations.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    style={{
                        padding: '12px 24px',
                        background: '#014737',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(1, 71, 55, 0.15)'
                    }}
                >
                    Invite Staffs
                </button>
            </div>

            {/* Notification Alert Toast */}
            {message && (
                <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✓ {message}</span>
                    <button type="button" onClick={() => setMessage('')} style={{ border: 'none', background: 'transparent', color: '#166534', cursor: 'pointer', fontWeight: '700' }}>✕</button>
                </div>
            )}

            {/* Filter Controls Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 80px', gap: '14px', marginBottom: '24px' }}>
                <input
                    type="text"
                    placeholder="Search PF, name or phone"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    style={{ padding: '10px 16px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', color: '#0F172A' }}
                />
                <select
                    value={deptFilter}
                    onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                    style={{ padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#0F172A', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="All departments">All departments</option>
                    {deptList.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{ padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#0F172A', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="All statuses">All statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                    <option value="Not Submitted">Not Submitted</option>
                    <option value="Requires Correction">Requires Correction</option>
                    <option value="Rejected">Rejected</option>
                </select>
                <select
                    value={perPage}
                    onChange={(e) => { setPerPage(e.target.value); setPage(1); }}
                    style={{ padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#0F172A', outline: 'none', cursor: 'pointer', textAlign: 'center' }}
                >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                </select>
            </div>

            {/* Staff Data Table */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading staff records...</div>
            ) : paginated.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '12px' }}>
                    No staff records match this filter.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>PF NUMBER</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>NAME</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>PHONE</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>DEPARTMENT</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>RANK</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((s) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>{s.pf_number}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{s.full_name}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>{s.phone}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>{s.department}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>{s.rank}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            background: s.status?.toLowerCase() === 'verified' ? '#DCFCE7' : s.status?.toLowerCase() === 'rejected' ? '#FEE2E2' : '#FEF9C3',
                                            color: s.status?.toLowerCase() === 'verified' ? '#15803D' : s.status?.toLowerCase() === 'rejected' ? '#B91C1C' : '#A16207',
                                            padding: '4px 12px',
                                            borderRadius: '14px',
                                            fontSize: '12px',
                                            fontWeight: '700'
                                        }}>
                                            {s.status || 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px' }}>
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    style={{
                        padding: '8px 18px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        background: '#FFFFFF',
                        color: page <= 1 ? '#94A3B8' : '#0F172A',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: page <= 1 ? 'not-allowed' : 'pointer'
                    }}
                >
                    Previous
                </button>
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> - <strong>{totalStaff} staff</strong>
                </span>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    style={{
                        padding: '8px 18px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        background: '#FFFFFF',
                        color: page >= totalPages ? '#94A3B8' : '#0F172A',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                    }}
                >
                    Next
                </button>
            </div>

            {/* Invite Staffs Modal */}
            {inviteOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '16px' }}>
                    <div style={{ background: '#FFFFFF', borderRadius: '16px', width: 'min(440px, 95vw)', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#014737', fontSize: '20px', fontWeight: '800' }}>Invite Staffs</h3>
                                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '12px' }}>
                                    {totalStaff} filtered staff will receive this screening invitation.
                                </p>
                            </div>
                            <button type="button" onClick={() => setInviteOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSendInvites} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>DATE</label>
                                <input type="date" required value={inviteForm.date} onChange={e => setInviteForm({ ...inviteForm, date: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>TIME</label>
                                <input type="time" required value={inviteForm.time} onChange={e => setInviteForm({ ...inviteForm, time: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', display: 'block', marginBottom: '6px' }}>VENUE</label>
                                <input type="text" required value={inviteForm.venue} onChange={e => setInviteForm({ ...inviteForm, venue: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button type="button" onClick={() => setInviteOpen(false)} style={{ padding: '10px 18px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                                <button type="submit" disabled={inviting} style={{ padding: '10px 22px', background: '#014737', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: inviting ? 'not-allowed' : 'pointer', fontSize: '13px' }}>{inviting ? 'Sending...' : 'Invite'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

{/* Full Working System Settings Tab */}
function SettingsTab() {
    const [settings, setSettings] = useState({
        system_name: 'JOSTUM Staff Audit & Screening System',
        university_name: 'Joseph Sarwuan Tarka University, Makurdi',
        audit_venue: 'Main Senate Chamber, JOSTUM Campus',
        audit_start_date: '2026-08-01',
        audit_end_date: '2026-09-30',
        primary_color: '#014737',
        accent_color: '#166534'
    });
    const [savedMsg, setSavedMsg] = useState('');

    function handleSave(e) {
        e.preventDefault();
        setSavedMsg('System settings updated successfully.');
        setTimeout(() => setSavedMsg(''), 3000);
    }

    return (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px', maxWidth: '720px' }}>
            <h2 style={{ color: '#014737', margin: '0 0 6px', fontSize: '20px', fontWeight: '800' }}>System Settings</h2>
            <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '13px' }}>Configure audit exercise dates, location, and global portal metadata.</p>

            {savedMsg && (
                <div style={{ padding: '12px 16px', background: '#DCFCE7', color: '#166534', borderRadius: '8px', marginBottom: '20px', fontWeight: '700', fontSize: '13px' }}>
                    ✓ {savedMsg}
                </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {Object.keys(settings).map((key) => (
                    <div key={key}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            {key.replaceAll('_', ' ')}
                        </label>
                        <input
                            type={key.includes('date') ? 'date' : 'text'}
                            value={settings[key]}
                            onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                ))}

                <button
                    type="submit"
                    style={{
                        marginTop: '10px',
                        padding: '12px',
                        background: '#014737',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    Save Settings
                </button>
            </form>
        </div>
    );
}

{/* Excel XLSX Download Helper */}
function downloadXLSX(data, filename = 'staff_audit_report.xlsx') {
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#014737" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Data">
   <Alignment ss:Horizontal="Left"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Audit Report">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">S/N</Data></Cell>
    <Cell><Data ss:Type="String">PF Number</Data></Cell>
    <Cell><Data ss:Type="String">Full Name</Data></Cell>
    <Cell><Data ss:Type="String">Phone</Data></Cell>
    <Cell><Data ss:Type="String">Department</Data></Cell>
    <Cell><Data ss:Type="String">Rank</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>`;

    data.forEach((row, i) => {
        xml += `
   <Row ss:StyleID="Data">
    <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(row.pf_number || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(row.full_name || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(row.phone || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(row.department || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(row.rank || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(row.status || 'Pending')}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

{/* PDF Download Helper */}
function downloadPDF(data, filename = 'staff_audit_report.pdf') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(1, 71, 55); // #014737
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("JOSEPH SARWUAN TARKA UNIVERSITY, MAKURDI", 15, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("STAFF AUDIT & SCREENING REPORT", 15, 18);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Total: ${data.length} Staff`, 280, 18, { align: 'right' });

    // Table Headers
    const startY = 32;
    doc.setFillColor(240, 244, 248);
    doc.rect(15, startY, 267, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text("S/N", 18, startY + 5.5);
    doc.text("PF NUMBER", 32, startY + 5.5);
    doc.text("STAFF NAME", 70, startY + 5.5);
    doc.text("PHONE", 140, startY + 5.5);
    doc.text("DEPARTMENT", 180, startY + 5.5);
    doc.text("RANK", 230, startY + 5.5);
    doc.text("STATUS", 265, startY + 5.5);

    let currentY = startY + 8;

    data.forEach((row, idx) => {
        if (currentY > 190) {
            doc.addPage();
            // Header for new page
            doc.setFillColor(1, 71, 55);
            doc.rect(0, 0, 297, 16, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text("JOSTUM STAFF AUDIT & SCREENING REPORT (Contd.)", 15, 11);

            currentY = 22;
            doc.setFillColor(240, 244, 248);
            doc.rect(15, currentY, 267, 8, 'F');
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(8);
            doc.text("S/N", 18, currentY + 5.5);
            doc.text("PF NUMBER", 32, currentY + 5.5);
            doc.text("STAFF NAME", 70, currentY + 5.5);
            doc.text("PHONE", 140, currentY + 5.5);
            doc.text("DEPARTMENT", 180, currentY + 5.5);
            doc.text("RANK", 230, currentY + 5.5);
            doc.text("STATUS", 265, currentY + 5.5);
            currentY += 8;
        }

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, currentY, 267, 7, 'F');
        }

        doc.text(String(idx + 1), 18, currentY + 4.5);
        doc.text(row.pf_number || '-', 32, currentY + 4.5);
        doc.text(row.full_name || '-', 70, currentY + 4.5);
        doc.text(row.phone || '-', 140, currentY + 4.5);
        doc.text(row.department || '-', 180, currentY + 4.5);
        doc.text(row.rank || '-', 230, currentY + 4.5);

        const status = row.status || 'Pending';
        if (status.toLowerCase() === 'verified') {
            doc.setTextColor(22, 101, 52);
        } else if (status.toLowerCase() === 'rejected') {
            doc.setTextColor(185, 28, 28);
        } else {
            doc.setTextColor(161, 98, 7);
        }
        doc.text(status, 265, currentY + 4.5);

        currentY += 7;
    });

    doc.save(filename);
}

{/* Reports & Exports Tab Component */}
function ReportsTab() {
    const [records, setRecords] = useState([]);
    const [deptList, setDeptList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All departments');
    const [statusFilter, setStatusFilter] = useState('All statuses');
    const [dateFilter, setDateFilter] = useState('All time');
    const [perPage, setPerPage] = useState('10');
    const [page, setPage] = useState(1);

    useEffect(() => {
        async function fetchReportData() {
            setLoading(true);
            try {
                const res = await api('/api/public/audit/submissions');
                if (res && res.submissions) {
                    setRecords(res.submissions);
                }
                if (res && res.departments) {
                    setDeptList(res.departments);
                }
            } catch (err) {
                console.error('Report data fetch error:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchReportData();
    }, []);

    // Filter Logic
    const filteredRecords = records.filter((r) => {
        const matchesSearch =
            !search ||
            r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.pf_number?.toLowerCase().includes(search.toLowerCase()) ||
            r.phone?.toLowerCase().includes(search.toLowerCase()) ||
            r.rank?.toLowerCase().includes(search.toLowerCase());

        const matchesDept = deptFilter === 'All departments' || r.department?.toLowerCase() === deptFilter.toLowerCase();
        const matchesStatus = statusFilter === 'All statuses' || r.status?.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesDept && matchesStatus;
    });

    const totalFiltered = filteredRecords.length;
    const verifiedCount = filteredRecords.filter(r => r.status?.toLowerCase() === 'verified').length;
    const pendingCount = filteredRecords.filter(r => !r.status || r.status?.toLowerCase() === 'pending').length;
    const actionNeededCount = filteredRecords.filter(r => ['rejected', 'requires correction'].includes(r.status?.toLowerCase())).length;

    const totalPages = Math.ceil(totalFiltered / parseInt(perPage, 10)) || 1;
    const paginatedRecords = filteredRecords.slice((page - 1) * parseInt(perPage, 10), page * parseInt(perPage, 10));

    function handleExportXLSX() {
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadXLSX(filteredRecords, `jostum_staff_audit_report_${timestamp}.xlsx`);
    }

    function handleExportPDF() {
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadPDF(filteredRecords, `jostum_staff_audit_report_${timestamp}.pdf`);
    }

    function handlePrint() {
        window.print();
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header & Export Actions */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ color: '#014737', margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileSpreadsheet size={22} color="#014737" /> Staff Audit Reports & Records
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>
                        Filter, review, and export audit verification records in Excel (.xlsx) or PDF format.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={handleExportXLSX}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            background: '#166534',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(22, 101, 52, 0.15)',
                            transition: 'all 0.15s ease'
                        }}
                        title="Download as Microsoft Excel file (.xlsx)"
                    >
                        <Download size={16} /> Export .XLSX
                    </button>

                    <button
                        type="button"
                        onClick={handleExportPDF}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            background: '#014737',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(1, 71, 55, 0.15)',
                            transition: 'all 0.15s ease'
                        }}
                        title="Download as PDF document (.pdf)"
                    >
                        <FileText size={16} /> Export PDF
                    </button>

                    <button
                        type="button"
                        onClick={handlePrint}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            background: '#FFFFFF',
                            color: '#475569',
                            border: '1px solid #CBD5E1',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                        title="Print Report Table"
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <StatMetricCard icon={ClipboardList} label="Filtered Records" value={totalFiltered} iconBg="#E0F2FE" iconColor="#0369A1" />
                <StatMetricCard icon={CheckCircle2} label="Verified Staff" value={verifiedCount} iconBg="#DCFCE7" iconColor="#15803D" />
                <StatMetricCard icon={RefreshCw} label="Pending Audit" value={pendingCount} iconBg="#FEF9C3" iconColor="#A16207" />
                <StatMetricCard icon={AlertCircle} label="Action Needed" value={actionNeededCount} iconBg="#FEE2E2" iconColor="#B91C1C" />
            </div>

            {/* Filter Controls & Table Container */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 80px', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search PF, Name, Rank..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        />
                    </div>
                    <select
                        value={deptFilter}
                        onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                        style={{ padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="All departments">All departments</option>
                        {deptList.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        style={{ padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="All statuses">All statuses</option>
                        <option value="Verified">Verified</option>
                        <option value="Pending">Pending</option>
                        <option value="Not Submitted">Not Submitted</option>
                        <option value="Requires Correction">Requires Correction</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <select
                        value={dateFilter}
                        onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                        style={{ padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="All time">All time</option>
                        <option value="Today">Today</option>
                        <option value="This Week">This Week</option>
                        <option value="This Month">This Month</option>
                    </select>
                    <select
                        value={perPage}
                        onChange={(e) => { setPerPage(e.target.value); setPage(1); }}
                        style={{ padding: '9px 8px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none', cursor: 'pointer', textAlign: 'center' }}
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading report records...</div>
                ) : paginatedRecords.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '12px' }}>
                        No records match the selected filters.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                                    <th style={{ padding: '12px 16px', width: '50px' }}>S/N</th>
                                    <th style={{ padding: '12px 16px' }}>PF Number</th>
                                    <th style={{ padding: '12px 16px' }}>Staff Name</th>
                                    <th style={{ padding: '12px 16px' }}>Phone</th>
                                    <th style={{ padding: '12px 16px' }}>Department</th>
                                    <th style={{ padding: '12px 16px' }}>Rank</th>
                                    <th style={{ padding: '12px 16px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRecords.map((r, idx) => {
                                    const serialNo = (page - 1) * parseInt(perPage, 10) + idx + 1;
                                    const st = (r.status || 'Pending').toLowerCase();
                                    return (
                                        <tr key={r.id || idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                            <td style={{ padding: '12px 16px', color: '#64748B', fontWeight: '600' }}>{serialNo}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#014737' }}>{r.pf_number}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0F172A' }}>{r.full_name}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748B' }}>{r.phone}</td>
                                            <td style={{ padding: '12px 16px', color: '#475569' }}>{r.department}</td>
                                            <td style={{ padding: '12px 16px', color: '#475569' }}>{r.rank}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    background: st === 'verified' ? '#DCFCE7' : st === 'rejected' ? '#FEE2E2' : '#FEF9C3',
                                                    color: st === 'verified' ? '#15803D' : st === 'rejected' ? '#B91C1C' : '#A16207',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontWeight: '700',
                                                    fontSize: '12px'
                                                }}>
                                                    {r.status || 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748B' }}>
                        Showing <strong>{paginatedRecords.length}</strong> of <strong>{totalFiltered}</strong> filtered records
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            style={{
                                padding: '6px 14px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                background: '#FFFFFF',
                                color: page <= 1 ? '#94A3B8' : '#0F172A',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: page <= 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Previous
                        </button>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            style={{
                                padding: '6px 14px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                background: '#FFFFFF',
                                color: page >= totalPages ? '#94A3B8' : '#0F172A',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
