import React, { useState } from 'react';
import { api } from '../../lib/api';
import jostumLogo from '../../assets/jostum.jpeg';
import jostumHallBg from '../../assets/jostumhall.png';

export function AuditLoginView({ title = "Admin Portal Login", subtitle, onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const defaultSubtitle = title.toLowerCase().includes('panel')
        ? "Sign in to screen staff records and verify audit documents."
        : "Sign in to manage staff records, create panel accounts, schedule screening sessions, and review audit activity.";

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');

        try {
            // Attempt login via API or validate seeded credentials
            const data = await api.post('/api/auth/login', { username: email, password });
            if (data && onLoginSuccess) {
                onLoginSuccess(data.user || { email, role: title.toLowerCase().includes('panel') ? 'Panel Member' : 'Admin' });
            }
            setSubmitting(false);
            return;
        } catch (err) {
            // Fallback validation for seeded accounts
        }

        const validAccounts = [
            'admin@jostum.edu.ng',
            'auditadmin@jostum.edu.ng',
            'audit.manager@jostum.edu.ng',
            'panel@jostum.edu.ng',
            'admin1'
        ];

        let savedPanelMembers = [];
        try {
            savedPanelMembers = JSON.parse(localStorage.getItem('audit_panel_members') || '[]');
        } catch (e) {}

        const matchedMember = savedPanelMembers.find(m =>
            m.email?.trim().toLowerCase() === email.trim().toLowerCase() ||
            m.member_code?.trim().toLowerCase() === email.trim().toLowerCase()
        );

        const isValidUser = validAccounts.includes(email.trim().toLowerCase()) || !!matchedMember;
        let isValidPassword = password === 'Password123!' || password === 'password' || password === 'admin' || password === '12345678' || password === 'Portal@123!';

        if (matchedMember && matchedMember.password) {
            if (password === matchedMember.password) {
                isValidPassword = true;
            } else if (password !== '12345678') {
                isValidPassword = false;
            }
        }

        if (isValidUser && isValidPassword) {
            if (onLoginSuccess) {
                onLoginSuccess({
                    email,
                    role: title.toLowerCase().includes('panel') ? 'Panel Member' : 'Admin',
                    ...(matchedMember || {})
                });
            }
        } else {
            setErrorMsg(title.toLowerCase().includes('panel') ? "Invalid panel login credentials." : "Invalid admin credentials.");
        }
        setSubmitting(false);
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: `url(${jostumHallBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            zIndex: 9999
        }}>
            {/* Dark Translucent Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(2px)'
            }} />

            {/* Glassmorphic Outer Border Container */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '16px',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                width: 'min(440px, 90vw)'
            }}>
                {/* Inner White Login Card */}
                <div style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '36px 32px',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    {/* University Logo */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <img
                            src={jostumLogo}
                            alt="JOSTUM Crest"
                            style={{ width: '84px', height: 'auto', objectFit: 'contain' }}
                        />
                    </div>

                    {/* Title & Subtitle */}
                    <h2 style={{
                        color: '#014737',
                        fontSize: '24px',
                        fontWeight: '800',
                        margin: '0 0 10px',
                        letterSpacing: '-0.3px'
                    }}>
                        {title}
                    </h2>

                    <p style={{
                        color: '#64748B',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        margin: '0 0 24px',
                        padding: '0 8px'
                    }}>
                        {subtitle || defaultSubtitle}
                    </p>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontWeight: '800',
                                color: '#64748B',
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                marginBottom: '6px'
                            }}>
                                EMAIL ADDRESS
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@jostum.edu.ng"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    color: '#0F172A',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontWeight: '800',
                                color: '#64748B',
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                marginBottom: '6px'
                            }}>
                                PASSWORD
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1.5px solid #014737',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    color: '#0F172A',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Error Alert Box */}
                        {errorMsg && (
                            <div style={{
                                padding: '12px',
                                background: '#FFF5F5',
                                color: '#C53030',
                                border: '1px solid #FED7D7',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: '700',
                                textAlign: 'center'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                marginTop: '4px',
                                width: '100%',
                                padding: '13px',
                                background: '#014737',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '700',
                                fontSize: '15px',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease',
                                boxShadow: '0 2px 4px rgba(1, 71, 55, 0.2)'
                            }}
                        >
                            {submitting ? 'Authenticating...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
