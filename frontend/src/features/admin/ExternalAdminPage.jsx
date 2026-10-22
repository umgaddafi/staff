import React, { useState } from 'react';
import { useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AdminStaffAuditSection } from './AdminStaffAuditSection';
import { AuditAdminDashboard } from './AuditAdminDashboard';
import { AuditLoginView } from '../auth/AuditLoginView';
import { AppraisalLoginView } from '../auth/AppraisalLoginView';
import { SupervisorAppraisalPortal } from './SupervisorAppraisalPortal';

export function ExternalAdminPage({ overrideSystem }) {
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const isAppraisalPath = location.pathname.includes('/appraisal') || (overrideSystem && overrideSystem.includes('appraisal'));
    const isAuditPath = location.pathname.startsWith('/audit') || (overrideSystem && overrideSystem.startsWith('audit'));
    const system = overrideSystem || params.system || (isAppraisalPath ? 'appraisal' : isAuditPath ? 'audit' : 'admin');

    const [auditAuth, setAuditAuth] = useState(() => {
        try {
            const stored = localStorage.getItem('audit_auth_user');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    });

    const [appraisalAuth, setAppraisalAuth] = useState(() => {
        try {
            const stored = localStorage.getItem('appraisal_auth_user');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    });

    // 1. Appraisal System Routes
    const isAppraisalRoute = isAppraisalPath || system.startsWith('appraisal') || ['supervisor', 'hod', 'dept-chairman', 'apc', 'apc-chairman', 'dept_chairman', 'staff', 'dashboards'].includes(system);

    if (isAppraisalRoute) {
        let roleKey = system.replace('appraisal-', '');
        if (roleKey === 'dashboards' || roleKey === 'dashboard' || roleKey === 'appraisal') roleKey = 'supervisor';

        if (!appraisalAuth) {
            return (
                <AppraisalLoginView
                    roleKey={roleKey}
                    onLoginSuccess={(user) => {
                        localStorage.setItem('appraisal_auth_user', JSON.stringify(user));
                        setAppraisalAuth(user);
                    }}
                />
            );
        }

        return (
            <SupervisorAppraisalPortal
                user={appraisalAuth}
                onLogout={() => {
                    localStorage.removeItem('appraisal_auth_user');
                    setAppraisalAuth(null);
                }}
            />
        );
    }

    // 2. Audit System Routes
    const isAuditLogin = location.pathname === '/audit/login' || system === 'audit-login' || system === 'login';
    const isPanel = location.pathname === '/audit/panel' || system === 'audit-panel' || system === 'panel';

    // A. Dedicated Audit Login View (/audit/login)
    if (isAuditLogin) {
        if (auditAuth) {
            return <Navigate to="/audit" replace />;
        }
        return (
            <AuditLoginView
                title="Audit Admin Login"
                subtitle="Sign in to access the Independent Audit Administration Portal."
                onLoginSuccess={(user) => {
                    localStorage.setItem('audit_auth_user', JSON.stringify(user));
                    setAuditAuth(user);
                    navigate('/audit', { replace: true });
                }}
            />
        );
    }

    // B. Panel Member Screening Route (/audit/panel)
    if (isPanel) {
        if (!auditAuth) {
            return (
                <AuditLoginView
                    title="Panel Member Login"
                    subtitle="Sign in to screen staff records and verify audit documents."
                    onLoginSuccess={(user) => {
                        localStorage.setItem('audit_auth_user', JSON.stringify(user));
                        setAuditAuth(user);
                    }}
                />
            );
        }

        return (
            <AdminStaffAuditSection
                showFlash={(msg, type) => console.log(type, msg)}
                onLogout={() => {
                    localStorage.removeItem('audit_auth_user');
                    setAuditAuth(null);
                    navigate('/audit/login', { replace: true });
                }}
            />
        );
    }

    // C. Independent Audit Admin Dashboard (/audit, /audit/dashboard, etc.)
    if (!auditAuth) {
        return <Navigate to="/audit/login" replace />;
    }

    return (
        <AuditAdminDashboard
            user={auditAuth}
            onLogout={() => {
                localStorage.removeItem('audit_auth_user');
                setAuditAuth(null);
                navigate('/audit/login', { replace: true });
            }}
        />
    );
}
