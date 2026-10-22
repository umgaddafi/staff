import { createContext, useContext, useState, useCallback } from 'react';
import { AdminModal } from '../components/common/ui';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        danger: true,
        onConfirm: null,
        onCancel: null,
    });
    const [isLoading, setIsLoading] = useState(false);

    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setConfirmState({
                open: true,
                title: options.title || 'Confirm Action',
                message: options.message || 'Are you sure you want to proceed?',
                confirmText: options.confirmText || 'Confirm',
                danger: options.danger !== false,
                onConfirm: async () => {
                    if (options.action) {
                        setIsLoading(true);
                        try {
                            await options.action();
                        } finally {
                            setIsLoading(false);
                            setConfirmState(prev => ({ ...prev, open: false }));
                            resolve(true);
                        }
                    } else {
                        setConfirmState(prev => ({ ...prev, open: false }));
                        resolve(true);
                    }
                },
                onCancel: () => {
                    setConfirmState(prev => ({ ...prev, open: false }));
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <AdminModal
                open={confirmState.open}
                title={confirmState.title}
                onClose={isLoading ? undefined : confirmState.onCancel}
                actions={(
                    <>
                        <button type="button" className="admin-button admin-button-secondary" onClick={confirmState.onCancel} disabled={isLoading}>Cancel</button>
                        <button 
                            type="button" 
                            className={`admin-button ${confirmState.danger ? 'admin-button-primary' : 'admin-button-primary'}`} 
                            style={confirmState.danger ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}} 
                            onClick={confirmState.onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg className="admin-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }}>
                                        <line x1="12" y1="2" x2="12" y2="6"></line>
                                        <line x1="12" y1="18" x2="12" y2="22"></line>
                                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                        <line x1="2" y1="12" x2="6" y2="12"></line>
                                        <line x1="18" y1="12" x2="22" y2="12"></line>
                                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                    </svg>
                                    Processing...
                                </span>
                            ) : confirmState.confirmText}
                        </button>
                    </>
                )}
            >
                <div style={{ padding: '0.5rem 0', fontSize: '0.95rem', color: 'var(--text-body)' }}>
                    {confirmState.message}
                </div>
            </AdminModal>
            <style>{`
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    return useContext(ConfirmContext);
}
