import React, { useState } from 'react';
import { Mail, Lock, LogIn, ShieldCheck, UserCheck, CheckCircle2, ChevronRight, Award } from 'lucide-react';
import jostumLogo from '../../assets/jostum.jpeg';
import jostumHallBg from '../../assets/jostumhall.png';

export function AppraisalLoginView({ roleKey = 'supervisor', title, onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const roleTitles = {
        'supervisor': 'Appraisal Supervisor Login',
        'hod': 'Departmental Chairman / HOD Login',
        'dept-chairman': 'Departmental Chairman / HOD Login',
        'apc': 'A&P Committee Chairman Login',
        'apc-chairman': 'A&P Committee Chairman Login',
        'admin': 'Appraisal System Admin Login',
        'staff': 'Staff Appraisal Login'
    };

    const roleSubtitles = {
        'supervisor': 'Sign in as a Departmental Supervisor to assess staff performance evaluations.',
        'hod': 'Sign in to review and make departmental recommendations for staff appraisals.',
        'dept-chairman': 'Sign in to review and make departmental recommendations for staff appraisals.',
        'apc': 'Sign in to grant final Appointments & Promotions Committee (A&P) approvals.',
        'apc-chairman': 'Sign in to grant final Appointments & Promotions Committee (A&P) approvals.',
        'admin': 'Sign in to manage annual appraisal cycles, staff evaluations, and committee members.',
        'staff': 'Sign in to complete and track your annual performance appraisal.'
    };

    const displayTitle = title || roleTitles[roleKey] || 'Appraisal System Login';
    const displaySubtitle = roleSubtitles[roleKey] || 'Sign in to access the JOSTUM Performance Appraisal Portal.';

    function handleFormSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');

        setTimeout(() => {
            let assignedRole = roleKey;
            if (roleKey === 'dept-chairman' || roleKey === 'hod') assignedRole = 'dept_chairman';
            if (roleKey === 'apc' || roleKey === 'apc-chairman') assignedRole = 'apc_chairman';

            const userObj = {
                email: email || `${assignedRole}@jostum.edu.ng`,
                name: assignedRole.toUpperCase().replace('_', ' '),
                role: assignedRole
            };

            setSubmitting(false);
            if (onLoginSuccess) {
                onLoginSuccess(userObj);
            }
        }, 500);
    }

    function quickRoleLogin(selectedRole, defaultEmail) {
        setEmail(defaultEmail);
        setPassword('password123');
        
        let assignedRole = selectedRole;
        if (selectedRole === 'dept-chairman' || selectedRole === 'hod') assignedRole = 'dept_chairman';
        if (selectedRole === 'apc' || selectedRole === 'apc-chairman') assignedRole = 'apc_chairman';

        const userObj = {
            email: defaultEmail,
            name: assignedRole.toUpperCase().replace('_', ' '),
            role: assignedRole
        };

        if (onLoginSuccess) {
            onLoginSuccess(userObj);
        }
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(6, 78, 59, 0.85)), url(${jostumHallBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '460px',
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(16px)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                overflow: 'hidden'
            }}>
                {/* Top Banner Accent */}
                <div style={{ height: '6px', background: 'linear-gradient(90deg, #15803d, #047857, #065f46)' }} />

                <div style={{ padding: '36px 32px' }}>
                    {/* Institution Header */}
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <img
                            src={jostumLogo}
                            alt="JOSTUM Logo"
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #15803d',
                                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)',
                                margin: '0 auto 14px'
                            }}
                        />
                        <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0f172a', margin: 0, tracking: '-0.02em' }}>
                            {displayTitle}
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                            {displaySubtitle}
                        </p>
                    </div>

                    {errorMsg && (
                        <div style={{
                            marginBottom: '20px',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#991b1b',
                            fontSize: '0.83rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit}>
                        <div style={{ marginBottom: '18px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Staff Email / ID
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '18px', height: '18px' }} />
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={`${roleKey}@jostum.edu.ng`}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 42px',
                                        fontSize: '0.92rem',
                                        borderRadius: '10px',
                                        border: '1.5px solid #cbd5e1',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#15803d'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '22px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: '18px', height: '18px' }} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 42px',
                                        fontSize: '0.92rem',
                                        borderRadius: '10px',
                                        border: '1.5px solid #cbd5e1',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#15803d'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                width: '100%',
                                padding: '13px',
                                background: 'linear-gradient(135deg, #15803d, #047857)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.3)',
                                transition: 'transform 0.1s ease'
                            }}
                        >
                            <LogIn style={{ width: '18px', height: '18px' }} />
                            <span>{submitting ? 'Authenticating...' : 'Sign In to Appraisal Portal'}</span>
                        </button>
                    </form>

                    {/* Demo Quick Access */}
                    <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                            <Award style={{ width: '14px', height: '14px', color: '#15803d' }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Demo Appraisal Role Logins
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => quickRoleLogin('supervisor', 'supervisor@jostum.edu.ng')}
                                style={{
                                    padding: '8px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#1e293b',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                Supervisor
                            </button>
                            <button
                                type="button"
                                onClick={() => quickRoleLogin('dept_chairman', 'dept@jostum.edu.ng')}
                                style={{
                                    padding: '8px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#1e293b',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                Dept HOD
                            </button>
                            <button
                                type="button"
                                onClick={() => quickRoleLogin('apc_chairman', 'apc@jostum.edu.ng')}
                                style={{
                                    padding: '8px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#1e293b',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                A&P Chairman
                            </button>
                            <button
                                type="button"
                                onClick={() => quickRoleLogin('admin', 'admin@jostum.edu.ng')}
                                style={{
                                    padding: '8px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    color: '#1e293b',
                                    cursor: 'pointer',
                                    textAlign: 'center'
                                }}
                            >
                                System Admin
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
