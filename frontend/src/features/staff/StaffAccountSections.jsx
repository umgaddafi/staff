import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/common/states';
import { Field } from '../../components/common/ui';
import { usePendingAction } from '../../hooks/usePendingAction';
import { formatDateTime } from '../../utils/formatters';
import { StaffPageHeader } from './StaffShared';
import { StaffIdCardFrontPreview } from '../../components/StaffIdCardFrontPreview';
import { PhotoStep } from '../../components/wizard/PhotoStep';
import { SignatureStep } from '../../components/wizard/SignatureStep';
import { ReprintRequestStep } from '../../components/wizard/ReprintRequestStep';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useFaceDetector } from '../../utils/mediapipeFace';

const JOSTUM_API = import.meta.env.DEV ? '/jostum-api' : '/backend/public/jostum-api';

function SettingsSection({ staff, user, notifications, onChangePassword, onMarkAllNotificationsRead, onDownloadCv }) {
    const [form, setForm] = useState({ new_password: '', new_password_confirmation: '' });
    const { isPending, runPending } = usePendingAction();
    const unreadCount = notifications?.unreadCount || 0;
    const staffId = user?.staffId || staff?.staff_id;
    const isSavingPassword = isPending('password');
    const isMarkingNotifications = isPending('notifications');

    async function submit(event) {
        event.preventDefault();

        if (form.new_password !== form.new_password_confirmation) {
            window.alert('The password confirmation does not match.');
            return;
        }

        const result = await runPending('password', () => onChangePassword(form));

        if (result?.ok) {
            setForm({ new_password: '', new_password_confirmation: '' });
        }
    }

    return (
        <>
            <StaffPageHeader
                title="Settings"
                copy="Manage password security, notifications, and portfolio shortcuts."
            />
            <div className="staff-settings-layout">
                <section className="staff-settings-card">
                    <div className="staff-form-section-head">
                        <h3>Account Overview</h3>
                        <p>Your linked portal account and profile details.</p>
                    </div>
                    <div className="staff-settings-grid">
                        <div>
                            <span>Username</span>
                            <strong>{user?.username || 'Not available'}</strong>
                        </div>
                        <div>
                            <span>Role</span>
                            <strong>{user?.role || 'Staff'}</strong>
                        </div>
                        <div>
                            <span>Staff Number</span>
                            <strong>{staff?.staff_number || 'Not assigned'}</strong>
                        </div>
                        <div>
                            <span>Official Email</span>
                            <strong>{staff?.email || 'Not available'}</strong>
                        </div>
                        <div>
                            <span>Department</span>
                            <strong>{staff?.department_name || 'Not set'}</strong>
                        </div>
                        <div>
                            <span>Rank</span>
                            <strong>{staff?.rank_name || 'Not set'}</strong>
                        </div>
                    </div>
                </section>

                <section className="staff-settings-card">
                    <div className="staff-form-section-head">
                        <h3>Change Password</h3>
                        <p>Update your sign-in password for the staff portal.</p>
                    </div>
                    <form className="staff-settings-form" onSubmit={submit}>
                        <Field label="New Password">
                            <input
                                className="input"
                                type="password"
                                value={form.new_password}
                                onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))}
                                minLength={8}
                                required
                            />
                        </Field>
                        <Field label="Confirm New Password">
                            <input
                                className="input"
                                type="password"
                                value={form.new_password_confirmation}
                                onChange={(event) => setForm((current) => ({ ...current, new_password_confirmation: event.target.value }))}
                                minLength={8}
                                required
                            />
                        </Field>
                        <button type="submit" className="staff-button staff-button-primary" disabled={isSavingPassword}>
                            {isSavingPassword ? 'Updating Password...' : 'Update Password'}
                        </button>
                    </form>
                </section>

                <section className="staff-settings-card">
                    <div className="staff-form-section-head">
                        <h3>Notifications</h3>
                        <p>Manage your pending alerts and review updates.</p>
                    </div>
                    <div className="staff-settings-inline">
                        <div className="staff-settings-metric">
                            <strong>{unreadCount}</strong>
                            <span>Unread notification{unreadCount === 1 ? '' : 's'}</span>
                        </div>
                        <button
                            type="button"
                            className="staff-button staff-button-secondary"
                            onClick={() => runPending('notifications', onMarkAllNotificationsRead)}
                            disabled={unreadCount === 0 || isMarkingNotifications}
                        >
                            {isMarkingNotifications ? 'Please wait...' : 'Mark All as Read'}
                        </button>
                    </div>
                </section>

                <section className="staff-settings-card">
                    <div className="staff-form-section-head">
                        <h3>Portfolio Shortcuts</h3>
                        <p>Quick links for your public and internal profile views.</p>
                    </div>
                    <div className="staff-settings-actions">
                        <Link className="staff-button staff-button-secondary" to={`/portfolio/${staffId}`} target="_blank" rel="noreferrer">
                            Public View
                        </Link>
                        <Link className="staff-button staff-button-secondary" to={`/portfolio/${staffId}?private=1`} target="_blank" rel="noreferrer">
                            Private View
                        </Link>
                        <button type="button" className="staff-button staff-button-primary" onClick={onDownloadCv}>
                            Download CV
                        </button>
                    </div>
                </section>
            </div>
        </>
    );
}

function IdCardSection({ staff, idCard, onRequestCard }) {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('preview');
    const [activeUpload, setActiveUpload] = useState(null);
    const [savingPassport, setSavingPassport] = useState(false);
    const [savingSignature, setSavingSignature] = useState(false);
    
    const { detectorRef, loading: detectorLoading, error: detectorError, retry: detectorRetry } = useFaceDetector();
    
    const [enrollmentData, setEnrollmentData] = useState({
        photoProcessed: '',
        signatureProcessed: ''
    });

    useEffect(() => {
        if (!staff?.staff_number) {
            setLoading(false);
            return;
        }
        
        let pfNumber = staff.staff_number;
        // The API route requires pfNumber, but it might contain a slash which might not be safely encoded in some routers.
        
        fetch(`${JOSTUM_API}/v1/staff/${pfNumber}`)
            .then(res => {
                if (!res.ok) throw new Error('API Request Failed');
                return res.json();
            })
            .then(data => {
                if (data?.data) {
                    setApiData(data.data);
                    setEnrollmentData({
                        photoProcessed: data.data.passport_url || '',
                        signatureProcessed: data.data.signature_url || ''
                    });
                } else {
                    throw new Error('Staff not found in ID card registry');
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message || 'Failed to fetch staff data');
                setLoading(false);
            });
    }, [staff?.staff_number]);

    if (loading) {
        return <div className="staff-loading">Loading ID Card details...</div>;
    }
    
    if (error) {
        return <div className="staff-error p-6 text-red-600 bg-red-50 rounded">Error loading ID Card: {error}</div>;
    }

    const previewData = {
        fileNo: apiData?.pf_number || '',
        pfNumber: apiData?.pf_number || '',
        firstName: apiData?.first_name || '',
        lastName: apiData?.last_name || '',
        otherName: apiData?.other_name || '',
        department: apiData?.department || '',
        rank: apiData?.rank || '',
        category: apiData?.category || '',
        photoProcessed: enrollmentData.photoProcessed || apiData?.passport_url || '',
        signatureProcessed: enrollmentData.signatureProcessed || apiData?.signature_url || ''
    };

    async function handleUpdatePassport() {
        if (!apiData?.pf_number) return;
        try {
            setSavingPassport(true);
            const formData = new FormData();
            formData.append('_method', 'PUT');

            if (enrollmentData.photoProcessed?.startsWith('data:')) {
                const res = await fetch(enrollmentData.photoProcessed);
                const blob = await res.blob();
                formData.append('passport', blob, 'passport.jpg');
            } else {
                toast.error("Please process a passport image first.");
                return;
            }

            const response = await fetch(`${JOSTUM_API}/v1/staff/${apiData.pf_number}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to update API records');
            
            const responseData = await response.json();
            if (responseData?.data) {
                setApiData(responseData.data);
                setEnrollmentData(prev => ({
                    ...prev,
                    photoProcessed: responseData.data.passport_url || ''
                }));
                setActiveUpload(null);
                toast.success("Passport updated successfully on server!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error saving passport to server");
        } finally {
            setSavingPassport(false);
        }
    }

    async function handleUpdateSignature() {
        if (!apiData?.pf_number) return;
        try {
            setSavingSignature(true);
            const formData = new FormData();
            formData.append('_method', 'PUT');

            if (enrollmentData.signatureProcessed?.startsWith('data:')) {
                const res = await fetch(enrollmentData.signatureProcessed);
                const blob = await res.blob();
                formData.append('signature', blob, 'signature.png');
            } else {
                toast.error("Please process a signature image first.");
                return;
            }

            const response = await fetch(`${JOSTUM_API}/v1/staff/${apiData.pf_number}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to update API records');
            
            const responseData = await response.json();
            if (responseData?.data) {
                setApiData(responseData.data);
                setEnrollmentData(prev => ({
                    ...prev,
                    signatureProcessed: responseData.data.signature_url || ''
                }));
                setActiveUpload(null);
                toast.success("Signature updated successfully on server!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error saving signature to server");
        } finally {
            setSavingSignature(false);
        }
    }

    return (
        <>
            <StaffPageHeader
                title="ID Card"
                copy="Preview your profile-based staff card and request a fresh print when needed."
            />
            <div className="border-b border-slate-200 mb-6 flex gap-6 px-2">
                <button 
                    className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'preview' ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    onClick={() => { setActiveTab('preview'); setActiveUpload(null); }}
                >
                    ID Card Preview
                </button>
                <button 
                    className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'reprint' ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    onClick={() => { setActiveTab('reprint'); setActiveUpload(null); }}
                >
                    Request Renewal (Reprint)
                </button>
            </div>

            <div className="staff-id-layout">
                {activeTab === 'preview' && (
                    <section className="staff-id-preview-shell bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="staff-id-preview-note mb-6 text-center text-slate-600">Live sample generated from your current profile data.</div>
                        
                        <StaffIdCardFrontPreview data={previewData} size="compact" />
                        
                        <div className="mt-8 flex flex-col items-center sm:flex-row flex-wrap justify-center gap-3 w-full max-w-sm mx-auto sm:max-w-none">
                            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:flex sm:flex-row">
                                <button 
                                    className="staff-button staff-button-primary w-full sm:w-auto text-xs sm:text-sm px-1 sm:px-4 whitespace-nowrap"
                                    onClick={() => setActiveUpload(activeUpload === 'passport' ? null : 'passport')}
                                >
                                    {activeUpload === 'passport' ? 'Close Passport' : 'Change Passport'}
                                </button>
                                <button 
                                    className="staff-button staff-button-primary w-full sm:w-auto text-xs sm:text-sm px-1 sm:px-4 whitespace-nowrap"
                                    onClick={() => setActiveUpload(activeUpload === 'signature' ? null : 'signature')}
                                >
                                    {activeUpload === 'signature' ? 'Close Signature' : 'Change Signature'}
                                </button>
                            </div>
                        </div>
                    </section>
                )}
                
                {activeTab === 'preview' && activeUpload && (
                    <section className="staff-id-request-card space-y-8">
                        {activeUpload === 'passport' && (
                            <div>
                                <PhotoStep 
                                    data={enrollmentData} 
                                    onChange={setEnrollmentData} 
                                    onNext={handleUpdatePassport} 
                                    nextLabel="Save Passport"
                                    isNextLoading={savingPassport}
                                    detector={detectorRef} 
                                    detectorLoading={detectorLoading} 
                                    detectorError={detectorError} 
                                    onRetry={detectorRetry} 
                                    passportUploadFirst={true} 
                                />
                            </div>
                        )}
                        {activeUpload === 'signature' && (
                            <div>
                                <SignatureStep 
                                    data={enrollmentData} 
                                    onChange={setEnrollmentData} 
                                    onNext={handleUpdateSignature}
                                    nextLabel="Save Signature"
                                    isNextLoading={savingSignature}
                                />
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'reprint' && (
                    <ReprintRequestStep staffData={apiData} />
                )}
            </div>
        </>
    );
}

export { SettingsSection, IdCardSection };
