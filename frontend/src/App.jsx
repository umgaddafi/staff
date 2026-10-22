import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Flash } from './components/common/ui';
import { ErrorState, LoadingScreen } from './components/common/states';
import { AdminPortalPage } from './features/admin/AdminPortalPage';
import { ExternalAdminPage } from './features/admin/ExternalAdminPage';
import {
    ForcePasswordPage,
    ForgotPasswordPage,
    LoginPage,
    ProtectedRoute,
    ResetPasswordPage,
} from './features/auth/AuthPages';
import { PublicDirectoryPage } from './features/public/PublicDirectoryPage';
import { PublicProfilePage } from './features/public/PublicProfilePage';
import { StaffPortalPage } from './features/staff/StaffPortalPage';
import { api } from './lib/api';
import { getErrorMessage } from './utils/formatters';

export default function App() {
    const [boot, setBoot] = useState({ loading: true, user: null });
    const [bootError, setBootError] = useState('');
    const [flash, setFlash] = useState(null);

    async function refreshBootstrap() {
        setBoot((current) => ({ ...current, loading: true }));
        setBootError('');

        try {
            const result = await api('/api/bootstrap');
            setBoot({ loading: false, user: result.user });
            return { ok: true, result };
        } catch (bootstrapError) {
            setBoot({ loading: false, user: null });
            setBootError(getErrorMessage(bootstrapError));
            return { ok: false, error: bootstrapError };
        }
    }

    useEffect(() => {
        void refreshBootstrap();
    }, []);

    useEffect(() => {
        if (!flash) {
            return undefined;
        }

        const timer = window.setTimeout(() => setFlash(null), 4500);
        return () => window.clearTimeout(timer);
    }, [flash]);

    async function logout() {
        try {
            await api('/api/auth/logout', { method: 'POST' });
            const bootstrapResult = await refreshBootstrap();
            if (bootstrapResult?.ok) {
                setFlash({ type: 'success', message: 'Logged out successfully.' });
            } else {
                setFlash({ type: 'error', message: getErrorMessage(bootstrapResult?.error) });
            }
        } catch (logoutError) {
            setFlash({ type: 'error', message: getErrorMessage(logoutError) });
        }
    }

    if (boot.loading) {
        return <LoadingScreen />;
    }

    if (bootError) {
        return <ErrorState message={bootError} onRetry={refreshBootstrap} fullScreen />;
    }

    return (
        <div className="app-shell">
            <Flash flash={flash} onClear={() => setFlash(null)} />
            <Routes>
                <Route path="/" element={<PublicDirectoryPage user={boot.user} onLogout={logout} />} />
                <Route path="/portfolio/:staffId" element={<PublicProfilePage user={boot.user} onLogout={logout} />} />
                <Route path="/login" element={<LoginPage user={boot.user} onLogin={refreshBootstrap} />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/security/update-password" element={<ForcePasswordPage user={boot.user} onPasswordChanged={refreshBootstrap} />} />
                <Route
                    path="/staff/*"
                    element={(
                        <ProtectedRoute user={boot.user} role="Staff">
                            <StaffPortalPage user={boot.user} onLogout={logout} showFlash={(message, type = 'success') => setFlash({ message, type })} />
                        </ProtectedRoute>
                    )}
                />
                <Route
                    path="/admin/*"
                    element={(
                        <ProtectedRoute user={boot.user} roles={['Admin', 'Moderator']}>
                            <AdminPortalPage user={boot.user} onLogout={logout} showFlash={(message, type = 'success') => setFlash({ message, type })} />
                        </ProtectedRoute>
                    )}
                />
                <Route path="/audit" element={<ExternalAdminPage overrideSystem="audit-admin" />} />
                <Route path="/audit/dashboard" element={<ExternalAdminPage overrideSystem="audit-admin" />} />
                <Route path="/audit/login" element={<ExternalAdminPage overrideSystem="audit-login" />} />
                <Route path="/audit/admin" element={<Navigate to="/audit" replace />} />
                <Route path="/audit/panel" element={<ExternalAdminPage overrideSystem="audit-panel" />} />
                <Route path="/audit/:system" element={<ExternalAdminPage />} />
                <Route path="/appraisal" element={<ExternalAdminPage overrideSystem="appraisal" />} />
                <Route path="/appraisal/dashboards" element={<ExternalAdminPage overrideSystem="appraisal-supervisor" />} />
                <Route path="/appraisal/:system" element={<ExternalAdminPage />} />
                <Route path="/appraisal/*" element={<ExternalAdminPage overrideSystem="appraisal" />} />
                <Route path="/admin-logins/audit-admin" element={<Navigate to="/audit/login" replace />} />
                <Route path="/admin-logins/audit" element={<Navigate to="/audit/login" replace />} />
                <Route path="/admin-logins/:system" element={<ExternalAdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}
