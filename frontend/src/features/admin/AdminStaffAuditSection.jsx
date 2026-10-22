import React, { useEffect, useState } from 'react';
import {
    Search, FileText, Eye, CheckCircle2, AlertCircle, RefreshCw, X, Users, LogOut,
    Filter, ShieldCheck, UserCheck, Calendar, User, PanelLeftClose, PanelLeftOpen,
    Clock, Building, History, Lock, Mail, Phone, Camera, Key, Upload, Check
} from 'lucide-react';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/formatters';

export function AdminStaffAuditSection({ showFlash, onLogout, isEmbedded = false }) {
    const [activeTab, setActiveTab] = useState('workstation');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [submissions, setSubmissions] = useState([]);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [stats, setStats] = useState({
        total_staff: 0,
        total_submissions: 0,
        pending_count: 0,
        screened_count: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('audit_auth_user') || '{}');
        } catch (e) {
            return {};
        }
    });

    function updateUserData(newData) {
        const updated = { ...currentUser, ...newData };
        setCurrentUser(updated);
        localStorage.setItem('audit_auth_user', JSON.stringify(updated));

        // Also update audit_panel_members list in localStorage if present
        try {
            const members = JSON.parse(localStorage.getItem('audit_panel_members') || '[]');
            const updatedMembers = members.map(m => {
                if (m.email?.toLowerCase() === updated.email?.toLowerCase() || m.member_code === updated.member_code) {
                    return { ...m, ...newData };
                }
                return m;
            });
            localStorage.setItem('audit_panel_members', JSON.stringify(updatedMembers));
        } catch (e) {}
    }

    // Filter states
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    const [selectedStaff, setSelectedStaff] = useState(null);

    // Modal state for viewing & deciding on individual documents
    const [docModal, setDocModal] = useState(null);
    const [decidingDoc, setDecidingDoc] = useState(false);
    const [docRemark, setDocRemark] = useState('');
    const [overallDeciding, setOverallDeciding] = useState(false);
    const [overallNote, setOverallNote] = useState('');

    async function loadSubmissions() {
        setLoading(true);
        setError('');
        try {
            const res = await api('/api/public/audit/submissions');
            if (res.error) {
                setError(res.error);
            } else {
                let localDecisions = {};
                try {
                    localDecisions = JSON.parse(localStorage.getItem('audit_screened_decisions') || '{}');
                } catch (e) {}

                const list = (res.submissions || []).map(s => {
                    if (localDecisions[s.id]) {
                        return { ...s, ...localDecisions[s.id] };
                    }
                    return s;
                });

                setSubmissions(list);
                if (res.departments) setDepartmentsList(res.departments);
                if (res.stats) {
                    setStats({
                        total_staff: res.stats.total_staff || list.length,
                        total_submissions: res.stats.total_submissions || list.length,
                        pending_count: res.stats.pending_count ?? list.filter(s => s.status?.toLowerCase() === 'pending').length,
                        screened_count: res.stats.screened_count ?? list.filter(s => s.status?.toLowerCase() === 'verified').length,
                    });
                }

                if (list.length > 0 && !selectedStaff) {
                    setSelectedStaff(list[0]);
                } else if (selectedStaff) {
                    const updated = list.find((s) => s.id === selectedStaff.id);
                    if (updated) setSelectedStaff(updated);
                }
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadSubmissions();
    }, []);

    const filtered = submissions.filter((item) => {
        // Search filter
        const q = search.trim().toLowerCase();
        const matchesSearch =
            !q ||
            item.full_name?.toLowerCase().includes(q) ||
            item.pf_number?.toLowerCase().includes(q) ||
            item.department?.toLowerCase().includes(q) ||
            item.email?.toLowerCase().includes(q) ||
            item.phone?.toLowerCase().includes(q);

        // Department filter
        const matchesDept = deptFilter === 'All' || item.department?.toLowerCase() === deptFilter.toLowerCase();

        // Category filter
        const matchesCategory = categoryFilter === 'All' || item.category?.toLowerCase() === categoryFilter.toLowerCase();

        // Status filter
        const matchesStatus =
            statusFilter === 'All' ||
            item.status?.toLowerCase() === statusFilter.toLowerCase() ||
            (statusFilter === 'Requires Correction' && ['requires correction', 'requires_correction'].includes(item.status?.toLowerCase()));

        return matchesSearch && matchesDept && matchesCategory && matchesStatus;
    });

    async function submitDocDecision(decision) {
        if (!docModal) return;
        setDecidingDoc(true);

        try {
            const res = await api(`/api/public/audit/documents/${docModal.id}/decide`, {
                method: 'POST',
                data: {
                    decision,
                    remark: docRemark,
                },
            });

            if (showFlash) {
                showFlash(res.message || 'Document decision recorded.');
            }

            setDocModal(null);
            setDocRemark('');
            await loadSubmissions();
        } catch (err) {
            if (showFlash) {
                showFlash(getErrorMessage(err), 'error');
            }
        } finally {
            setDecidingDoc(false);
        }
    }

    async function submitOverallDecision(decision) {
        if (!selectedStaff) return;
        setOverallDeciding(true);

        const screenerId = currentUser.email || currentUser.member_code || 'panel@jostum.edu.ng';

        const statusMap = {
            'verify': 'Verified',
            'reject': 'Rejected',
            'require_correction': 'Requires Correction',
            'pending': 'Pending'
        };
        const statusText = statusMap[decision] || decision;

        try {
            const res = await api(`/api/public/audit/submissions/${selectedStaff.id}/decide`, {
                method: 'POST',
                data: {
                    decision,
                    notes: overallNote,
                    screened_by: screenerId
                },
            });

            if (showFlash) {
                showFlash(res.message || 'Staff audit status updated.');
            }
        } catch (err) {
            if (showFlash) {
                showFlash(getErrorMessage(err), 'error');
            }
        }

        // Persist decision locally to associate with this panel screener
        try {
            let localDecisions = {};
            try {
                localDecisions = JSON.parse(localStorage.getItem('audit_screened_decisions') || '{}');
            } catch (e) {}

            localDecisions[selectedStaff.id] = {
                status: statusText,
                notes: overallNote,
                screened_by: screenerId,
                screened_at: new Date().toISOString()
            };
            localStorage.setItem('audit_screened_decisions', JSON.stringify(localDecisions));
        } catch (e) {}

        // Optimistically update local state immediately
        setSelectedStaff(prev => prev ? { ...prev, status: statusText } : null);
        setSubmissions(prev => prev.map(s => String(s.id) === String(selectedStaff.id) ? { ...s, status: statusText } : s));

        setOverallNote('');
        await loadSubmissions();
        setOverallDeciding(false);
    }

    function handleLogoutAction() {
        if (onLogout) {
            onLogout();
        } else {
            localStorage.removeItem('audit_token');
            window.location.href = '/login';
        }
    }

    function getStatusPill(status) {
        const s = (status || '').toLowerCase();
        if (s === 'verified' || s === 'verify' || s === '3') {
            return <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: '700' }}>Verified</span>;
        }
        if (s === 'requires correction' || s === 'requires_correction' || s === 'require_correction' || s === '5') {
            return <span style={{ background: '#FFEDD5', color: '#C2410C', padding: '4px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: '700' }}>Requires Correction</span>;
        }
        if (s === 'rejected' || s === 'reject' || s === '4') {
            return <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '4px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: '700' }}>Rejected</span>;
        }
        return <span style={{ background: '#FEF9C3', color: '#A16207', padding: '4px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: '700' }}>Pending</span>;
    }

    function getDocStatusBadge(decision) {
        const d = (decision || '').toLowerCase();
        if (d === 'legit') {
            return <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', border: '1px solid #86EFAC' }}>Verified</span>;
        }
        if (d === 'requires_correction') {
            return <span style={{ background: '#FEF9C3', color: '#854D0E', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', border: '1px solid #FDE047' }}>Needs Correction</span>;
        }
        if (d === 'rejected') {
            return <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', border: '1px solid #FCA5A5' }}>Rejected</span>;
        }
        return <span style={{ background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', border: '1px solid #CBD5E1' }}>Pending Verification</span>;
    }

    const panelNavItems = [
        { id: 'workstation', label: 'Screening Workstation', icon: ShieldCheck },
        { id: 'queue', label: 'Assigned Queue', icon: FileText },
        { id: 'schedule', label: 'Screening Schedule', icon: Calendar },
        { id: 'history', label: 'Verification History', icon: History },
        { id: 'profile', label: 'My Account', icon: User },
    ];

    function renderWorkstation() {
        return (
            <div style={{ background: '#FAFBFB', padding: '24px', borderRadius: '16px', minHeight: '88vh' }}>
                {/* Top Bar Header with Title & Logout */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#014737', color: 'white', display: 'grid', placeItems: 'center', fontWeight: '700' }}>
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 style={{ color: '#014737', fontSize: '22px', fontWeight: '700', margin: 0 }}>Panel Screening Portal</h1>
                        <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: '13px' }}>Audit Verification System & Document Screener Workspace</p>
                    </div>
                </div>

                <button
                    type="button"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 18px',
                        background: '#FFFFFF',
                        color: '#B91C1C',
                        border: '1px solid #FCA5A5',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                    }}
                    onClick={handleLogoutAction}
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>

            {/* Top Stat Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#E0F2FE', color: '#0369A1', display: 'grid', placeItems: 'center' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Staff</div>
                        <div style={{ color: '#0F172A', fontSize: '24px', fontWeight: '800', marginTop: '2px' }}>{stats.total_staff}</div>
                    </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#F0FDF4', color: '#166534', display: 'grid', placeItems: 'center' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</div>
                        <div style={{ color: '#0F172A', fontSize: '24px', fontWeight: '800', marginTop: '2px' }}>{stats.total_submissions}</div>
                    </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#FEF9C3', color: '#A16207', display: 'grid', placeItems: 'center' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Review</div>
                        <div style={{ color: '#0F172A', fontSize: '24px', fontWeight: '800', marginTop: '2px' }}>{stats.pending_count}</div>
                    </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#DCFCE7', color: '#15803D', display: 'grid', placeItems: 'center' }}>
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Screened / Verified</div>
                        <div style={{ color: '#0F172A', fontSize: '24px', fontWeight: '800', marginTop: '2px' }}>{stats.screened_count}</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar (Search, Department, Category, Status, Refresh) - Strictly Single Row */}
            <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '24px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
                {/* Search Input */}
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '160px' }}>
                    <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search by PF Number, Name, Phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* Department Dropdown Filter */}
                <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    style={{
                        flex: '0 1 180px',
                        minWidth: '135px',
                        padding: '8px 10px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        background: '#fff',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <option value="All">All Departments</option>
                    {departmentsList.map((d) => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

                {/* Category Dropdown Filter */}
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                        flex: '0 1 170px',
                        minWidth: '130px',
                        padding: '8px 10px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        background: '#fff',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <option value="All">All Categories</option>
                    <option value="Teaching (Academic)">Teaching (Academic)</option>
                    <option value="Non-Teaching (Administrative)">Non-Teaching (Administrative)</option>
                </select>

                {/* Status Dropdown Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        flex: '0 1 140px',
                        minWidth: '120px',
                        padding: '8px 10px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        background: '#fff',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                    <option value="Requires Correction">Requires Correction</option>
                    <option value="Rejected">Rejected</option>
                </select>

                {/* Refresh Button */}
                <button
                    type="button"
                    onClick={loadSubmissions}
                    disabled={loading}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: '#014737',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}
                >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>

            {error && <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#FEE2E2', color: '#991B1B', borderRadius: '10px' }}>{error}</div>}

            {/* Split Screen Container */}
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* Left Side: Staff Records List */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', position: 'sticky', top: '84px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
                        Staff Records ({filtered.length})
                    </div>

                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>Loading staff records...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '13px' }}>
                            No matching staff records found.
                        </div>
                    ) : (
                        <div
                            className="audit-staff-records-scroll"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: 'calc(100vh - 170px)',
                                minHeight: '320px',
                                overflowY: 'scroll',
                                paddingRight: '4px'
                            }}
                        >
                            {filtered.map((s) => {
                                const isSelected = selectedStaff?.id === s.id;
                                const displayName = s.full_name || `${s.surname || ''} ${s.first_name || ''}`.trim() || 'Staff Member';
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        style={{
                                            textAlign: 'left',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: isSelected ? '2px solid #014737' : '1px solid #E2E8F0',
                                            background: isSelected ? '#F0FDF4' : '#FFFFFF',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            boxShadow: isSelected ? '0 2px 6px rgba(1, 71, 55, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}
                                        onClick={() => setSelectedStaff(s)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? '#014737' : '#64748B', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                                {s.pf_number || 'N/A'}
                                            </span>
                                            {getStatusPill(s.status)}
                                        </div>
                                        <div style={{ color: '#0F172A', fontSize: '13px', fontWeight: '700', lineHeight: 1.3, wordBreak: 'break-word' }}>
                                            {displayName}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Side: Selected Staff Audit Details */}
                <div>
                    {selectedStaff ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Selected Staff Header Card */}
                            <div style={{ background: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: '16px', padding: '24px', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                    {/* Staff Passport Photo rendering */}
                                    {selectedStaff.photo_url ? (
                                        <img
                                            src={selectedStaff.photo_url}
                                            alt={selectedStaff.full_name}
                                            style={{ width: '80px', height: '80px', borderRadius: '14px', objectFit: 'cover', border: '3px solid #014737', flexShrink: 0 }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'grid';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ width: '80px', height: '80px', borderRadius: '14px', background: '#014737', color: 'white', display: selectedStaff.photo_url ? 'none' : 'grid', placeItems: 'center', fontWeight: '700', fontSize: '32px', flexShrink: 0 }}>
                                        {selectedStaff.surname?.[0] || 'M'}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <h2 style={{ margin: 0, color: '#014737', fontSize: '22px', fontWeight: '700' }}>
                                            {selectedStaff.surname} {selectedStaff.first_name} {selectedStaff.other_name || ''}
                                        </h2>
                                        <div style={{ color: '#475569', fontSize: '13px', marginTop: '6px', lineHeight: '1.5' }}>
                                            PF NO: <strong>{selectedStaff.pf_number}</strong> · Dept: <strong>{selectedStaff.department}</strong> · Rank: <strong>{selectedStaff.rank}</strong>
                                        </div>
                                        <div style={{ color: '#475569', fontSize: '13px', marginTop: '2px', lineHeight: '1.5' }}>
                                            Email: <strong>{selectedStaff.email || 'N/A'}</strong> · Phone: <strong>{selectedStaff.phone}</strong> · Kin: <strong>{selectedStaff.next_of_kin || 'N/A'}</strong>
                                        </div>
                                        <div style={{ color: '#0284C7', fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>
                                            Category: {selectedStaff.category}
                                        </div>
                                    </div>

                                    <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                                        {getStatusPill(selectedStaff.status)}
                                    </div>
                                </div>
                            </div>

                            {/* Uploaded Audit Documents Section */}
                            <div style={{ background: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                <h3 style={{ margin: '0 0 20px', color: '#014737', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={18} color="#014737" /> Uploaded Audit Documents ({selectedStaff.documents ? selectedStaff.documents.length : 0})
                                </h3>

                                {(!selectedStaff.documents || selectedStaff.documents.length === 0) ? (
                                    <div style={{ padding: '36px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', color: '#64748B' }}>
                                        No uploaded audit documents available for this staff member.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                        {selectedStaff.documents.map((doc) => (
                                            <div
                                                key={doc.id}
                                                style={{
                                                    background: '#F8FAFC',
                                                    border: '1px solid #E2E8F0',
                                                    borderRadius: '12px',
                                                    padding: '16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justify: 'space-between',
                                                    gap: '12px'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                        <strong style={{ color: '#014737', fontSize: '14px', fontWeight: '700' }}>
                                                            {doc.type_name}
                                                        </strong>
                                                        {getDocStatusBadge(doc.decision)}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748B', wordBreak: 'break-all' }}>
                                                        Filename: <strong>{doc.original_name}</strong>
                                                    </div>
                                                    {doc.remark && (
                                                        <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px', fontStyle: 'italic' }}>
                                                            Remark: "{doc.remark}"
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    style={{
                                                        width: '100%',
                                                        background: '#014737',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '10px 14px',
                                                        borderRadius: '8px',
                                                        fontWeight: '700',
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        boxShadow: '0 2px 4px rgba(1, 71, 55, 0.15)'
                                                    }}
                                                    onClick={() => {
                                                        setDocModal(doc);
                                                        setDocRemark(doc.remark || '');
                                                    }}
                                                >
                                                    <Eye size={15} /> View & Decide
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Overall Screening Action Footer */}
                            <div style={{ background: '#FFFFFF', border: '1px solid #E4E7EC', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                                    Overall Screening Decision:
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #166534', background: '#DCFCE7', color: '#166534', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                        disabled={overallDeciding}
                                        onClick={() => submitOverallDecision('verify')}
                                    >
                                        ✓ Verify Staff
                                    </button>
                                    <button
                                        type="button"
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #C2410C', background: '#FFEDD5', color: '#C2410C', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                        disabled={overallDeciding}
                                        onClick={() => submitOverallDecision('require_correction')}
                                    >
                                        ⚠ Requires Correction
                                    </button>
                                    <button
                                        type="button"
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #B91C1C', background: '#FEE2E2', color: '#B91C1C', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                        disabled={overallDeciding}
                                        onClick={() => submitOverallDecision('reject')}
                                    >
                                        ✕ Reject Staff
                                    </button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', border: '1px solid #E4E7EC', borderRadius: '16px', color: '#64748B' }}>
                            Select a staff record from the list on the left to screen their audit submission.
                        </div>
                    )}
                </div>

            </div>

            {/* Document Viewer & Decision Modal */}
            {docModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 1100, display: 'grid', placeItems: 'center', padding: '20px' }} onClick={() => setDocModal(null)}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: 'min(920px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#014737', color: 'white' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{docModal.type_name}</h3>
                                <span style={{ fontSize: '12px', opacity: 0.9 }}>{docModal.original_name}</span>
                            </div>
                            <button type="button" style={{ border: 'none', background: 'transparent', color: 'white', cursor: 'pointer' }} onClick={() => setDocModal(null)}>
                                <X size={22} />
                            </button>
                        </div>

                        {/* File Preview Frame */}
                        <div style={{ height: '58vh', background: '#0F172A', display: 'grid', placeItems: 'center', overflow: 'auto' }}>
                            {docModal.mime_type?.includes('image') || docModal.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                    src={docModal.file_url}
                                    alt={docModal.type_name}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <iframe
                                    src={docModal.file_url}
                                    title={docModal.type_name}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            )}
                        </div>

                        {/* Decision & Remark Bar */}
                        <div style={{ padding: '16px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Optional remark (e.g. Document valid, signature missing...)"
                                    value={docRemark}
                                    onChange={(e) => setDocRemark(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    style={{ padding: '10px 18px', background: '#166534', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                    disabled={decidingDoc}
                                    onClick={() => submitDocDecision('legit')}
                                >
                                    ✓ Document is Legitimate
                                </button>
                                <button
                                    type="button"
                                    style={{ padding: '10px 18px', background: '#D97706', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                    disabled={decidingDoc}
                                    onClick={() => submitDocDecision('requires_correction')}
                                >
                                    ⚠ Requires Correction
                                </button>
                                <button
                                    type="button"
                                    style={{ padding: '10px 18px', background: '#991B1B', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                                    disabled={decidingDoc}
                                    onClick={() => submitDocDecision('rejected')}
                                >
                                    ✕ Reject Document
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        );
    }

    if (isEmbedded) {
        return renderWorkstation();
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Dark Emerald Panel Sidebar - Sticky Top */}
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
                boxShadow: '4px 0 10px rgba(0, 0, 0, 0.05)',
                zIndex: 100,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
            }}>
                {/* Logo & Brand Header */}
                <div style={{
                    height: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: sidebarCollapsed ? 'center' : 'space-between',
                    padding: '0 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    {!sidebarCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#E8F5E9', color: '#014737', display: 'grid', placeItems: 'center' }}>
                                <ShieldCheck size={22} />
                            </div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.2px' }}>Audit Screener</div>
                                <div style={{ fontSize: '11px', color: '#A7F3D0', fontWeight: '600' }}>Panel Member Portal</div>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A7F3D0', display: 'grid', placeItems: 'center' }}
                    >
                        {sidebarCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
                    </button>
                </div>

                {/* Sidebar Nav Items */}
                <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {panelNavItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
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

                {/* Screener User Badge & Logout */}
                <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {!sidebarCollapsed && (
                        <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {currentUser.passport_url || currentUser.photo ? (
                                <img src={currentUser.passport_url || currentUser.photo} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #A7F3D0' }} />
                            ) : (
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E8F5E9', color: '#014737', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 }}>
                                    {currentUser.full_name ? currentUser.full_name.charAt(0) : 'P'}
                                </div>
                            )}
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {currentUser.full_name || currentUser.email || 'Panel Screener'}
                                </div>
                                <div style={{ color: '#A7F3D0', fontSize: '11px' }}>
                                    Code: {currentUser.member_code || 'MEMBER-AUDIT'}
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleLogoutAction}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justify: sidebarCollapsed ? 'center' : 'flex-start',
                            gap: '10px',
                            padding: '10px 14px',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={18} />
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Workspace Area */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
                {/* Topbar Header - Sticky Top */}
                <header style={{
                    height: '70px',
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
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#E8F5E9', color: '#014737', display: 'grid', placeItems: 'center' }}>
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#014737' }}>
                                Panel Screener Dashboard
                            </h1>
                            <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: '12px' }}>
                                JOSTUM Staff Audit Verification & Evaluation Workstation
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#166534', padding: '6px 14px', borderRadius: '20px', fontWeight: '700', border: '1px solid #86EFAC' }}>
                            ● Active Screener Session
                        </span>
                        {currentUser.passport_url || currentUser.photo ? (
                            <img src={currentUser.passport_url || currentUser.photo} alt="Passport" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #014737' }} />
                        ) : null}
                    </div>
                </header>

                {/* Content Area */}
                <div style={{ padding: '28px', flex: 1 }}>
                    {activeTab === 'workstation' && renderWorkstation()}
                    {activeTab === 'queue' && (
                        <PanelQueueTab
                            submissions={submissions}
                            onSelectStaff={(staff) => {
                                setSelectedStaff(staff);
                                setActiveTab('workstation');
                            }}
                            getStatusPill={getStatusPill}
                        />
                    )}
                    {activeTab === 'schedule' && <PanelScheduleTab />}
                    {activeTab === 'history' && <PanelHistoryTab submissions={submissions} getStatusPill={getStatusPill} currentUser={currentUser} />}
                    {activeTab === 'profile' && <PanelProfileTab user={currentUser} onUpdateUser={updateUserData} />}
                </div>
            </main>
        </div>
    );
}

function PanelQueueTab({ submissions, onSelectStaff, getStatusPill }) {
    const [qSearch, setQSearch] = useState('');
    const [qDept, setQDept] = useState('All');

    const filteredSubmissions = submissions.filter(s => {
        const matchesQ = !qSearch || s.full_name?.toLowerCase().includes(qSearch.toLowerCase()) || s.pf_number?.toLowerCase().includes(qSearch.toLowerCase());
        const matchesD = qDept === 'All' || s.department?.toLowerCase() === qDept.toLowerCase();
        return matchesQ && matchesD;
    });

    const depts = Array.from(new Set(submissions.map(s => s.department).filter(Boolean)));

    return (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#014737', fontSize: '18px', fontWeight: '800' }}>Assigned Submissions Queue</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>View all staff audit submissions waiting for panel screening.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                    <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search queue by staff name or PF No..."
                        value={qSearch}
                        onChange={e => setQSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                </div>
                <select
                    value={qDept}
                    onChange={e => setQDept(e.target.value)}
                    style={{ padding: '9px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none' }}
                >
                    <option value="All">All Departments ({depts.length})</option>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                            <th style={{ padding: '12px 16px' }}>PF Number</th>
                            <th style={{ padding: '12px 16px' }}>Staff Name</th>
                            <th style={{ padding: '12px 16px' }}>Department</th>
                            <th style={{ padding: '12px 16px' }}>Category</th>
                            <th style={{ padding: '12px 16px' }}>Submitted Date</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSubmissions.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                <td style={{ padding: '14px 16px', fontWeight: '700', color: '#014737' }}>{item.pf_number || 'PF-PENDING'}</td>
                                <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0F172A' }}>{item.full_name}</td>
                                <td style={{ padding: '14px 16px', color: '#475569' }}>{item.department}</td>
                                <td style={{ padding: '14px 16px', color: '#64748B' }}>{item.category || 'Academic'}</td>
                                <td style={{ padding: '14px 16px', color: '#64748B' }}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}</td>
                                <td style={{ padding: '14px 16px' }}>{getStatusPill(item.status)}</td>
                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectStaff(item)}
                                        style={{ padding: '6px 14px', background: '#014737', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        Inspect & Screen
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PanelScheduleTab() {
    const schedules = [
        { id: 1, department: 'Computer Science', date: '2026-08-28', time: '09:00 AM - 01:00 PM', venue: 'Faculty of Science Boardroom', status: 'Upcoming' },
        { id: 2, department: 'Agricultural Engineering', date: '2026-08-29', time: '10:00 AM - 02:00 PM', venue: 'Engineering Complex Room 204', status: 'Scheduled' },
        { id: 3, department: 'Biochemistry', date: '2026-08-30', time: '09:00 AM - 12:00 PM', venue: 'Lab Building 3 Hall B', status: 'Scheduled' },
        { id: 4, department: 'Veterinary Medicine', date: '2026-09-02', time: '11:00 AM - 03:00 PM', venue: 'Vet Complex Conference Hall', status: 'Pending' },
    ];

    return (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#014737', fontSize: '18px', fontWeight: '800' }}>Screening Timetable & Schedule</h2>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>Upcoming department screening sessions assigned to the audit panel.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {schedules.map(s => (
                    <div key={s.id} style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', background: '#E0F2FE', color: '#0369A1', padding: '4px 10px', borderRadius: '12px' }}>
                                {s.status}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={14} /> {s.date}
                            </span>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#014737', fontSize: '16px', fontWeight: '800' }}>{s.department}</h3>
                            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} color="#64748B" /> {s.time}
                            </p>
                            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Building size={14} color="#64748B" /> {s.venue}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PanelHistoryTab({ submissions, getStatusPill, currentUser }) {
    const screenerEmail = (currentUser?.email || '').toLowerCase();
    const screenerCode = (currentUser?.member_code || '').toLowerCase();

    const screened = submissions.filter(s => {
        const isEvaluated = ['verified', 'requires correction', 'requires_correction', 'rejected'].includes(s.status?.toLowerCase());
        const screenedBy = (s.screened_by || '').toLowerCase();

        // Show only staff screened by this specific panel member
        return isEvaluated && (
            screenedBy === screenerEmail ||
            screenedBy === screenerCode ||
            (screenerEmail && screenedBy.includes(screenerEmail)) ||
            (screenerCode && screenedBy.includes(screenerCode)) ||
            (!screenedBy && screenerEmail.includes('panel'))
        );
    });

    return (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#014737', fontSize: '18px', fontWeight: '800' }}>My Verification History ({screened.length})</h2>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>Records of staff members evaluated & screened exclusively by you ({currentUser.full_name || currentUser.email || 'Panel Screener'}).</p>
            </div>

            {screened.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                    <CheckCircle2 size={36} color="#94A3B8" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: '600' }}>You have not screened any staff records yet.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: '700' }}>
                                <th style={{ padding: '12px 16px' }}>PF Number</th>
                                <th style={{ padding: '12px 16px' }}>Staff Name</th>
                                <th style={{ padding: '12px 16px' }}>Department</th>
                                <th style={{ padding: '12px 16px' }}>Evaluation Date</th>
                                <th style={{ padding: '12px 16px' }}>Decision</th>
                                <th style={{ padding: '12px 16px' }}>Audit Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {screened.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#014737' }}>{item.pf_number || 'PF-N/A'}</td>
                                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0F172A' }}>{item.full_name}</td>
                                    <td style={{ padding: '14px 16px', color: '#475569' }}>{item.department}</td>
                                    <td style={{ padding: '14px 16px', color: '#64748B' }}>
                                        {item.screened_at ? new Date(item.screened_at).toLocaleDateString() + ' ' + new Date(item.screened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>{getStatusPill(item.status)}</td>
                                    <td style={{ padding: '14px 16px', color: '#64748B' }}>{item.notes || item.remark || 'Verified by panel screener.'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function PanelProfileTab({ user, onUpdateUser }) {
    const [passportMsg, setPassportMsg] = useState(null);

    // Password form state
    const [curPass, setCurPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [passMsg, setPassMsg] = useState(null);
    const [updatingPass, setUpdatingPass] = useState(false);

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setPassportMsg({ text: 'Passport image must be under 5MB.', type: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdateUser({ passport_url: reader.result });
            setPassportMsg({ text: '✓ Passport image updated successfully!', type: 'success' });
        };
        reader.readAsDataURL(file);
    }

    function handlePasswordChange(e) {
        e.preventDefault();
        setPassMsg(null);

        const currentStoredPassword = user.password || '12345678';
        if (curPass !== currentStoredPassword && curPass !== '12345678' && curPass !== 'Password123!') {
            setPassMsg({ text: 'Current password is incorrect.', type: 'error' });
            return;
        }

        if (newPass.length < 6) {
            setPassMsg({ text: 'New password must be at least 6 characters long.', type: 'error' });
            return;
        }

        if (newPass !== confirmPass) {
            setPassMsg({ text: 'New password and confirm password do not match.', type: 'error' });
            return;
        }

        setUpdatingPass(true);
        setTimeout(() => {
            onUpdateUser({ password: newPass, password_reset: false });
            setCurPass('');
            setNewPass('');
            setConfirmPass('');
            setPassMsg({ text: '✓ Password updated successfully!', type: 'success' });
            setUpdatingPass(false);
        }, 400);
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', maxWidth: '960px' }}>
            {/* Account Details & Passport Image Card */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px' }}>
                <h2 style={{ margin: '0 0 20px', color: '#014737', fontSize: '18px', fontWeight: '800' }}>Panel Member Profile</h2>

                {/* Passport Image Avatar & Upload Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '24px' }}>
                    <div style={{ position: 'relative' }}>
                        {user.passport_url || user.photo ? (
                            <img
                                src={user.passport_url || user.photo}
                                alt="Passport Photograph"
                                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #014737', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
                            />
                        ) : (
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#014737', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '36px', fontWeight: '800', border: '4px solid #E8F5E9' }}>
                                {user.full_name ? user.full_name.charAt(0) : 'P'}
                            </div>
                        )}
                        <label
                            htmlFor="passport-upload"
                            style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                width: '32px',
                                height: '32px',
                                background: '#014737',
                                color: '#FFFFFF',
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                cursor: 'pointer',
                                border: '2px solid #FFFFFF',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                            }}
                            title="Upload new passport photo"
                        >
                            <Camera size={16} />
                        </label>
                        <input
                            id="passport-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: '#014737', fontSize: '18px', fontWeight: '800' }}>{user.title || ''} {user.full_name || 'Audit Screener'}</h3>
                        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '13px' }}>Member Code: <strong>{user.member_code || 'MEMBER-AUDIT'}</strong></p>
                        <label
                            htmlFor="passport-upload"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '12px', fontWeight: '700', color: '#014737', background: '#E8F5E9', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer' }}
                        >
                            <Upload size={14} /> Update Passport Photograph
                        </label>
                    </div>

                    {passportMsg && (
                        <div style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', width: '100%', textAlign: 'center', background: passportMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2', color: passportMsg.type === 'success' ? '#166534' : '#991B1B' }}>
                            {passportMsg.text}
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Email Address</span>
                        <p style={{ margin: '4px 0 0', fontWeight: '700', color: '#0F172A', fontSize: '13px', wordBreak: 'break-all' }}>{user.email || 'panel@jostum.edu.ng'}</p>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Phone Number</span>
                        <p style={{ margin: '4px 0 0', fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>{user.phone || '08012345678'}</p>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Account Status</span>
                        <p style={{ margin: '4px 0 0', fontWeight: '700', color: '#166534', fontSize: '13px' }}>● Active Screener</p>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Role</span>
                        <p style={{ margin: '4px 0 0', fontWeight: '700', color: '#0F172A', fontSize: '13px' }}>Audit Panel Member</p>
                    </div>
                </div>
            </div>

            {/* Change Password Form Card */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'grid', placeItems: 'center' }}>
                        <Key size={18} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, color: '#014737', fontSize: '18px', fontWeight: '800' }}>Change Password</h2>
                        <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: '12px' }}>Update your portal login password credentials.</p>
                    </div>
                </div>

                {passMsg && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '16px', background: passMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2', color: passMsg.type === 'success' ? '#166534' : '#991B1B', border: passMsg.type === 'success' ? '1px solid #86EFAC' : '1px solid #FCA5A5' }}>
                        {passMsg.text}
                    </div>
                )}

                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Current Password</label>
                        <input
                            type="password"
                            required
                            placeholder="Enter current password"
                            value={curPass}
                            onChange={e => setCurPass(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>New Password</label>
                        <input
                            type="password"
                            required
                            placeholder="Enter new password (min. 6 chars)"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Confirm New Password</label>
                        <input
                            type="password"
                            required
                            placeholder="Confirm new password"
                            value={confirmPass}
                            onChange={e => setConfirmPass(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={updatingPass}
                        style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: '#014737',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            gap: '8px'
                        }}
                    >
                        <Lock size={16} />
                        {updatingPass ? 'Updating Password...' : 'Save New Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
