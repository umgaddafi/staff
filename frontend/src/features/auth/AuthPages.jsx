import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import jostumMark from '../../assets/jostum.jpeg';
import { LoadingScreen } from '../../components/common/states';
import { Field } from '../../components/common/ui';
import { EyeFieldIcon, EyeOffFieldIcon, LockFieldIcon, UserFieldIcon } from '../../components/icons/AppIcons';
import { LegacyAuthShell } from '../../components/layouts/AuthShells';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/formatters';

function resolvesToAdminPortal(role) {
    return role === 'Admin' || role === 'Moderator';
}

function LoginPage({ user, onLogin }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    if (user) {
        return <Navigate to={resolvesToAdminPortal(user.role) ? '/admin' : '/staff'} replace />;
    }

    async function submit(event) {
        event.preventDefault();
        setSubmitting(true);
        setMessage('');

        try {
            const result = await api('/api/auth/login', { method: 'POST', data: form });
            const bootstrapResult = await onLogin();
            if (!bootstrapResult?.ok) {
                setMessage(getErrorMessage(bootstrapResult?.error));
                return;
            }
            navigate(result.redirectTo, { replace: true });
        } catch (error) {
            setMessage(error.payload?.message || error.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-view">
            <main className="auth-wrap">
                <form className="login-panel" onSubmit={submit}>
                    <div className="login-panel-header">
                        <div className="login-panel-copy">
                            <p className="page-eyebrow">Staff Workspace</p>
                            <div className="login-mark" aria-hidden="true">
                                <img src={jostumMark} alt="" />
                            </div>
                            <h1>Staff Login</h1>
                        </div>
                    </div>

                    {message ? <div className="login-message">{message}</div> : null}

                    <Field label="Email or PF Number">
                        <div className="login-input-shell">
                            <span className="login-input-icon" aria-hidden="true">
                                <UserFieldIcon />
                            </span>
                            <input
                                className="input"
                                value={form.username}
                                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                                required
                                autoComplete="username"
                                placeholder="Enter Email or PF Number"
                            />
                        </div>
                    </Field>

                    <Field label="Password">
                        <div className="login-input-shell has-toggle">
                            <span className="login-input-icon" aria-hidden="true">
                                <LockFieldIcon />
                            </span>
                            <input
                                className="input"
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                required
                                autoComplete="current-password"
                                placeholder="Enter password (or phone number if first time)"
                            />
                            <button
                                className="login-input-toggle"
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOffFieldIcon /> : <EyeFieldIcon />}
                            </button>
                        </div>
                    </Field>

                    <div style={{ margin: '-4px 0 16px', fontSize: '0.82rem', color: 'var(--muted, #94a3b8)', lineHeight: 1.4 }}>
                        First time logging in? Enter your <strong>Email or PF Number</strong> above and use your registered <strong>Phone Number</strong> as your password. You will be prompted to set a new password.
                    </div>

                    <button className="button login-submit" disabled={submitting}>
                        {submitting ? 'Signing in...' : 'Sign in'}
                    </button>

                    <div className="login-links">
                        <Link className="link-button" to="/forgot-password">Forgot password?</Link>
                        <Link className="link-button" to="/">Back to public directory</Link>
                    </div>


                </form>
            </main>
        </div>
    );
}

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function submit(event) {
        event.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        try {
            const result = await api('/api/auth/forgot-password', { method: 'POST', data: { email } });
            setFeedback({ type: 'success', text: result.message });
        } catch (error) {
            setFeedback({ type: 'error', text: error.payload?.message || error.message });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <LegacyAuthShell
            title="Reset Password"
            copy="Enter your registered staff email to receive a reset link."
            message={feedback?.text || null}
            messageType={feedback?.type === 'success' ? 'success' : 'error'}
            footer={<Link to="/login">Back to Login</Link>}
        >
            <form className="legacy-auth-form" onSubmit={submit}>
                <Field label="Registered Staff Email">
                    <input className="input legacy-auth-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="Enter your staff email" />
                </Field>
                <button className="legacy-auth-submit" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
        </LegacyAuthShell>
    );
}

function ResetPasswordPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [valid, setValid] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [form, setForm] = useState({ new_password: '', new_password_confirmation: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function validate() {
            try {
                await api(`/api/auth/reset-password/${token}`);
                if (!cancelled) {
                    setValid(true);
                    setLoading(false);
                }
            } catch (error) {
                if (!cancelled) {
                    setMessage(error.payload?.message || error.message);
                    setLoading(false);
                }
            }
        }

        validate();

        return () => {
            cancelled = true;
        };
    }, [token]);

    async function submit(event) {
        event.preventDefault();
        setSubmitting(true);
        try {
            const result = await api('/api/auth/reset-password', {
                method: 'POST',
                data: { token, ...form },
            });
            setMessage(result.message);
            setTimeout(() => navigate('/login', { replace: true }), 1200);
        } catch (error) {
            setMessage(error.payload?.message || error.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <LoadingScreen label="Validating reset link..." />;
    }

    return (
        <LegacyAuthShell
            title="Set New Password"
            copy="Create a new password for your account."
            message={message || null}
            messageType={valid ? 'success' : 'error'}
            footer={!valid ? <Link to="/forgot-password">Request another reset link</Link> : null}
        >
            {valid ? (
                <form className="legacy-auth-form" onSubmit={submit}>
                    <Field label="New Password">
                        <input className="input legacy-auth-input" type="password" value={form.new_password} onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))} required minLength={8} />
                    </Field>
                    <Field label="Confirm New Password">
                        <input className="input legacy-auth-input" type="password" value={form.new_password_confirmation} onChange={(event) => setForm((current) => ({ ...current, new_password_confirmation: event.target.value }))} required minLength={8} />
                    </Field>
                    <button className="legacy-auth-submit" disabled={submitting}>
                        {submitting ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            ) : null}
        </LegacyAuthShell>
    );
}

function ForcePasswordPage({ user, onPasswordChanged }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ new_password: '', new_password_confirmation: '' });
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    async function submit(event) {
        event.preventDefault();
        setSubmitting(true);
        try {
            const result = await api('/api/auth/change-password', {
                method: 'POST',
                data: form,
            });
            const bootstrapResult = await onPasswordChanged();
            if (!bootstrapResult?.ok) {
                setMessage(getErrorMessage(bootstrapResult?.error));
                return;
            }
            navigate(result.redirectTo, { replace: true });
        } catch (error) {
            setMessage(error.payload?.message || error.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <LegacyAuthShell
            title="Security Update"
            copy="First login detected. Set a new password to continue."
            message={message || null}
            messageType="error"
        >
            <form className="legacy-auth-form" onSubmit={submit}>
                <Field label="New Password">
                    <input className="input legacy-auth-input" type="password" value={form.new_password} onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))} required minLength={8} />
                </Field>
                <Field label="Confirm New Password">
                    <input className="input legacy-auth-input" type="password" value={form.new_password_confirmation} onChange={(event) => setForm((current) => ({ ...current, new_password_confirmation: event.target.value }))} required minLength={8} />
                </Field>
                <button className="legacy-auth-submit" disabled={submitting}>
                    {submitting ? 'Please wait...' : 'Update & Continue'}
                </button>
            </form>
        </LegacyAuthShell>
    );
}

function ProtectedRoute({ user, role, roles, children }) {
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.forcePasswordChange && location.pathname !== '/security/update-password') {
        return <Navigate to="/security/update-password" replace />;
    }

    const allowedRoles = Array.isArray(roles)
        ? roles
        : (role ? [role] : []);

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to={resolvesToAdminPortal(user.role) ? '/admin' : '/staff'} replace />;
    }

    return children;
}

export {
    LoginPage,
    ForgotPasswordPage,
    ResetPasswordPage,
    ForcePasswordPage,
    ProtectedRoute,
};
