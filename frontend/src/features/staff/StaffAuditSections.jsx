import React, { useEffect, useState } from 'react';
import { Award, Building2, Camera, Check, Clock3, FileCheck, FileText, IdCard, Mail, Phone, RefreshCw, Upload, UserRound, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

import Badge from './audit-components/Badge';
import DocumentModal from './audit-components/DocumentModal';
import LoadingButton from './audit-components/LoadingButton';
import StatCard from './audit-components/StatCard';
import '../../styles/app.css';
const PUBLIC_BASE_URL = import.meta.env.VITE_AUDIT_API_URL || 'http://localhost/audit-system/backend/public';

const api = axios.create({
  baseURL: `${PUBLIC_BASE_URL}/api`,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('audit_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const currentPf = localStorage.getItem('audit_token_pf');
  if (currentPf) config.headers['X-Staff-PF'] = currentPf;
  return config;
});

const documentHelp = {
  staff_id_card: 'Upload one file only. The front and back of the ID card should be placed on a single page.',
};

const stepLabels = {
  appointment_letter: 'Appointment Letter',
  confirmation_letter: 'Appointment Confirmation',
  last_promotion_letter: 'Last Promotion',
  staff_id_card: 'Staff ID Card',
};

const MAX_DOCUMENT_SIZE = 250 * 1024;

const statusText = {
  Pending: 'Pending review',
  Verified: 'Verified',
  'Not Submitted': 'Not submitted',
  Rejected: 'Rejected',
  'Requires Correction': 'Requires correction',
};

const statusClass = {
  Pending: 'pending',
  Verified: 'verified',
  'Not Submitted': 'not-submitted',
  Rejected: 'rejected',
  'Requires Correction': 'correction',
};

const issueDecisionText = {
  rejected: 'Rejected',
  requires_correction: 'Requires correction',
};

export function StaffAuditSections({ staff: currentStaff }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathParts = location.pathname.split('/');
  const tab = pathParts[3] || 'overview';
  
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [loadingDocumentId, setLoadingDocumentId] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentPf = currentStaff?.pf_number || currentStaff?.staffNumber || currentStaff?.staff_number;

  const load = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/staff/overview', {
        headers: currentPf ? { 'X-Staff-PF': currentPf } : {},
      });
      setData(res.data?.data || res.data);
      if (isManual) setMessage('Audit status refreshed.');
    } catch (err) {
      if (isManual) setError('Failed to refresh status: ' + (err.response?.data?.message || err.message));
      throw err;
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const authenticate = async () => {
      const pf = currentStaff?.pf_number || currentStaff?.staffNumber || currentStaff?.staff_number;
      if (!pf) {
        setAuthChecking(false);
        return;
      }
      setAuthChecking(true);
      setError('');
      try {
        const cachedPf = localStorage.getItem('audit_token_pf');
        const cachedToken = localStorage.getItem('audit_token');

        if (cachedToken && cachedPf === pf) {
          try {
            await load();
            if (isMounted) setAuthChecking(false);
            return;
          } catch (e) {
            localStorage.removeItem('audit_token');
            localStorage.removeItem('audit_token_pf');
          }
        }

        const phone = currentStaff?.phone || '';
        const res = await axios.post(
          `${PUBLIC_BASE_URL}/api/auth/staff-login`,
          { pf_number: pf, phone },
          { headers: { Accept: 'application/json' } }
        );

        const token = res.data?.data?.token || res.data?.token;
        if (token) {
          localStorage.setItem('audit_token', token);
          localStorage.setItem('audit_token_pf', pf);
        }
        await load();
      } catch (err) {
        console.error('Audit authentication error:', err);
        setError(`Audit sync failed: ${err.response?.data?.message || err.message}`);
      } finally {
        if (isMounted) setAuthChecking(false);
      }
    };

    authenticate();
    return () => {
      isMounted = false;
    };
  }, [currentStaff?.pf_number, currentStaff?.staffNumber, currentStaff?.phone]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!viewingDocument) return undefined;
    setLoadingDocumentId(viewingDocument.id);
    const pf = currentStaff?.pf_number || currentStaff?.staffNumber || currentStaff?.staff_number;
    api.get(`/staff/documents/${viewingDocument.id}`, {
      responseType: 'blob',
      headers: pf ? { 'X-Staff-PF': pf } : {},
    })
      .then((res) => {
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
        setDocumentUrl(URL.createObjectURL(blob));
      })
      .catch((err) => {
        console.error('Failed to preview document:', err);
        setError('Failed to preview document.');
      })
      .finally(() => setLoadingDocumentId(null));
    return () => {
      setDocumentUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return '';
      });
    };
  }, [viewingDocument, currentStaff]);

  useEffect(() => {
    if (!data?.required_documents?.length) return;
    setCurrentStep((step) => Math.min(step, data.required_documents.length - 1));
  }, [data?.required_documents?.length]);

  if (authChecking || !data) {
    return (
      <div className="main-content">
        {error ? <div className="alert page-alert">{error}</div> : <div className="loading">Connecting to audit system...</div>}
      </div>
    );
  }

  const { staff, required_documents } = data;
  const resolvePassportUrl = () => {
    if (staff?.passport_path) {
      if (staff.passport_path.startsWith('http')) return staff.passport_path;
      return `${PUBLIC_BASE_URL}/storage/${staff.passport_path.replace(/^\/?storage\//, '')}`;
    }
    if (currentStaff?.profile_photo_url) {
      return currentStaff.profile_photo_url;
    }
    if (currentStaff?.profile_photo) {
      if (currentStaff.profile_photo.startsWith('http')) return currentStaff.profile_photo;
      const clean = currentStaff.profile_photo.replace(/^uploads\//, '');
      return `/uploads/${clean}`;
    }
    return '/jostum.png';
  };

  const staffPassportUrl = resolvePassportUrl();
  
  const displayName = currentStaff?.full_name 
    || [currentStaff?.first_name, currentStaff?.other_name, currentStaff?.last_name].filter(Boolean).join(' ') 
    || `${currentStaff?.first_name || ''} ${currentStaff?.last_name || ''}`.trim() 
    || staff.full_name;

  const displayPfNumber = currentStaff?.pf_number 
    || currentStaff?.staffNumber 
    || currentStaff?.staff_number 
    || staff.pf_number;

  const displayDepartment = currentStaff?.department_name 
    || currentStaff?.department?.name 
    || (typeof currentStaff?.department === 'string' ? currentStaff.department : '') 
    || staff.department?.name 
    || 'Not provided';

  const displayRank = currentStaff?.rank_name 
    || currentStaff?.rank?.name 
    || (typeof currentStaff?.rank === 'string' ? currentStaff.rank : '') 
    || staff.rank?.name 
    || 'Not provided';

  const displayPhone = currentStaff?.phone 
    || staff.phone 
    || 'Not provided';

  const displayEmail = currentStaff?.email 
    || staff.email 
    || 'Not provided';

  const isVerified = staff.status?.name === 'Verified';
  const issueDocuments = staff.documents.filter((doc) => ['rejected', 'requires_correction'].includes(doc.latest_verification?.decision));
  const nextStepText = staff.status?.name === 'Not Submitted'
    ? 'Complete your profile, upload every required document, then submit for physical screening.'
    : staff.status?.name === 'Pending'
      ? 'Visit the audit venue with photocopies of your credentials while the panel reviews your uploaded records.'
      : staff.status?.name === 'Requires Correction'
        ? 'Review the document listed above and replace it with the corrected file.'
        : staff.status?.name === 'Rejected'
          ? 'Review the rejected document listed above and contact the audit office if you need guidance.'
          : 'Contact the audit office for guidance on your verification status.';
  const uploadedDocumentIds = new Set(staff.documents.map((doc) => doc.document_type_id));
  const uploadedRequiredCount = required_documents.filter((type) => uploadedDocumentIds.has(type.id)).length;
  const allRequiredUploaded = required_documents.length > 0 && uploadedRequiredCount === required_documents.length;
  const submissionLocked = staff.status?.name === 'Verified';
  const isLastStep = currentStep === required_documents.length - 1;
  const currentDocument = required_documents[currentStep];
  const currentUploadedDocument = currentDocument ? staff.documents.find((item) => item.document_type_id === currentDocument.id) : null;

  const upload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    if (uploadingType) return;
    if (file.size >= MAX_DOCUMENT_SIZE) {
      setError('The document must be less than 250KB.');
      event.target.value = '';
      return;
    }
    const pf = currentStaff?.pf_number || currentStaff?.staffNumber || currentStaff?.staff_number;
    const body = new FormData();
    body.append('document_type_id', type.id);
    body.append('file', file);
    if (pf) body.append('pf_number', pf);

    setUploadingType(type.id);
    setError('');
    try {
      await api.post('/staff/documents', body, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(pf ? { 'X-Staff-PF': pf } : {}),
        },
      });
      setMessage(`${type.name} uploaded successfully.`);
      await load();
      const nextMissingIndex = required_documents.findIndex((docType) => docType.id !== type.id && !uploadedDocumentIds.has(docType.id));
      if (nextMissingIndex >= 0) setCurrentStep(nextMissingIndex);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploadingType(null);
      event.target.value = '';
    }
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const pf = currentStaff?.pf_number || currentStaff?.staffNumber || currentStaff?.staff_number;
    try {
      await api.post('/staff/submit', pf ? { pf_number: pf } : {}, {
        headers: pf ? { 'X-Staff-PF': pf } : {},
      });
      setMessage('Submitted for verification.');
      setConfirmSubmit(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      {message && <div className="toast"><span>{message}</span><button className="toast-close" type="button" onClick={() => setMessage('')}><X size={16} /></button></div>}
      {error && <div className="alert page-alert">{error}</div>}

      {/* Top Audit Navigation & Live Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        padding: '12px 18px',
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/staff/audit')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              border: tab === 'overview' ? 'none' : '1px solid #E2E8F0',
              background: tab === 'overview' ? '#014737' : '#F8FAFC',
              color: tab === 'overview' ? '#FFFFFF' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <UserRound size={15} /> Overview & Status
          </button>
          <button
            type="button"
            onClick={() => navigate('/staff/audit/verification')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              border: tab === 'verification' ? 'none' : '1px solid #E2E8F0',
              background: tab === 'verification' ? '#014737' : '#F8FAFC',
              color: tab === 'verification' ? '#FFFFFF' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <Upload size={15} /> Upload Documents ({uploadedRequiredCount}/{required_documents.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
            Audit PF: <strong>{staff.pf_number}</strong>
          </span>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => load(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#F1F5F9',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Syncing...' : 'Refresh Status'}
          </button>
        </div>
      </div>
      {tab === 'overview' && (
        <>
          <div className={`overview-identity ${isVerified ? 'is-verified' : ''}`}>
            <div className="status-row">
              <div className={`status-pill status-${statusClass[staff.status?.name] || 'not-submitted'}`}>
                {isVerified ? <Check size={16} /> : <Clock3 size={16} />}
                <span>Status: {statusText[staff.status?.name] || staff.status?.name || 'Unknown'}</span>
              </div>
            </div>
            {issueDocuments.length > 0 && (
              <div className="document-issue-panel">
                <strong>Document attention required</strong>
                <div>
                  {issueDocuments.map((doc) => (
                    <span className={`document-issue document-issue-${doc.latest_verification?.decision}`} key={doc.id}>
                      {doc.type?.name || 'Document'}: {issueDecisionText[doc.latest_verification?.decision] || doc.latest_verification?.decision}
                      {doc.latest_verification?.remark ? ` - ${doc.latest_verification.remark}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {isVerified && (
              <div className="verified-panel">
                <span><Check size={18} /></span>
                <div>
                  <strong>Verified</strong>
                  <small>Staff audit completed</small>
                </div>
              </div>
            )}
            <div className="identity-main">
              <img
                src={staffPassportUrl}
                alt="Passport Photograph"
                onError={(e) => {
                  e.target.onerror = null;
                  if (currentStaff?.profile_photo && !e.target.src.includes('uploads/')) {
                    const clean = currentStaff.profile_photo.replace(/^uploads\//, '');
                    e.target.src = `/uploads/${clean}`;
                  } else {
                    e.target.src = '/jostum.png';
                  }
                }}
              />
              <div>
                <span className="identity-kicker">{displayPfNumber}</span>
                <h2>{displayName}</h2>
                <p>{displayDepartment} · {displayRank}</p>
              </div>
            </div>
          </div>

          <div className="overview-details">
            <div><UserRound size={17} /><span>Name</span><strong>{displayName}</strong></div>
            <div><FileText size={17} /><span>PF Number</span><strong>{displayPfNumber}</strong></div>
            <div><Building2 size={17} /><span>Department</span><strong>{displayDepartment}</strong></div>
            <div><Award size={17} /><span>Rank</span><strong>{displayRank}</strong></div>
            <div><Phone size={17} /><span>Phone</span><strong>{displayPhone}</strong></div>
            <div><Mail size={17} /><span>Email</span><strong>{displayEmail}</strong></div>
          </div>

          {data.notifications?.filter((item) => item.type === 'screening_schedule').length > 0 && (
            <div className="panel notification-panel">
              <div className="notification-head">
                <CalendarNoticeIcon />
                <div>
                  <h3 >Screening Schedule</h3>
                </div>
              </div>
              {data.notifications.filter((item) => item.type === 'screening_schedule').map((item) => (
                <div className="notification-item" key={item.id}>
                  <strong style={{ color: 'red' }}>{item.title}</strong>
                  <ScreeningMessage message={item.message} />
                </div>
              ))}
            </div>
          )}

          {!isVerified && <div className="panel next-step-panel"><h3>Next step</h3><p>{nextStepText}</p></div>}
        </>
      )}
      {tab === 'verification' && (
        <div className="panel">
          <div className="section-title">
            <div>
              <h2>Required Documents</h2>
              <p className="section-subtitle">{uploadedRequiredCount} of {required_documents.length} documents uploaded</p>
            </div>
          </div>

          <div className="upload-progress" aria-label="Document upload progress">
            <div className="upload-steps">
              {required_documents.map((type, index) => {
                const uploaded = uploadedDocumentIds.has(type.id);
                const active = index === currentStep;
                return (
                  <button
                    className={`upload-step ${uploaded ? 'is-complete' : ''} ${active ? 'is-active' : ''}`}
                    key={type.id}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                  >
                    <span className="step-dot">{uploaded ? <Check size={15} /> : index + 1}</span>
                    <span className="step-label">{stepLabels[type.slug] || type.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {currentDocument && (
            <div className="document-step-card">
              <div className="document-step-meta">
                <span>Step {currentStep + 1} of {required_documents.length}</span>
                <Badge>{currentUploadedDocument ? 'Uploaded' : 'Not Submitted'}</Badge>
              </div>
              <h3>{currentDocument.name}</h3>
              {documentHelp[currentDocument.slug] && <p>{documentHelp[currentDocument.slug]}</p>}
              <div className="document-file-state">
                <strong>{currentUploadedDocument ? currentUploadedDocument.original_filename : 'No file uploaded yet'}</strong>
                <span style={{ color: currentUploadedDocument?.latest_verification?.decision ? (currentUploadedDocument.latest_verification.decision === 'rejected' ? 'red' : 'orange') : 'inherit' }}>
                  {currentUploadedDocument?.latest_verification?.decision
                    ? `${issueDecisionText[currentUploadedDocument.latest_verification.decision] || 'Marked legit'}${currentUploadedDocument.latest_verification.remark ? ` - ${currentUploadedDocument.latest_verification.remark}` : ''}`
                    : currentUploadedDocument
                      ? 'You can replace this file before final verification.'
                      : 'Accept files of type PDF, JPG, JPEG, or PNG.'}
                </span>
                {currentUploadedDocument && (
                  <LoadingButton
                    className="btn ghost document-view-btn"
                    loading={loadingDocumentId === currentUploadedDocument.id}
                    disabled={!!loadingDocumentId}
                    loadingText="Opening..."
                    onClick={() => setViewingDocument(currentUploadedDocument)}
                  >
                    View File
                  </LoadingButton>
                )}
              </div>
              <label className={`file-picker ${uploadingType === currentDocument.id ? 'is-loading' : ''}`}>
                {uploadingType === currentDocument.id && <span className="spinner" aria-hidden="true" />}
                <span>{uploadingType === currentDocument.id ? `Uploading ${currentDocument.name}...` : currentUploadedDocument ? 'Replace file' : 'Choose file'}</span>
                <input type="file" accept="application/pdf,image/*" disabled={!!uploadingType || submitting || submissionLocked} onChange={(e) => upload(e, currentDocument)} />
              </label>
              <div className="step-actions">
                <button className="btn" type="button" disabled={currentStep === 0 || !!uploadingType} onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}>Previous</button>
                {isLastStep ? (
                  <button className="btn primary" type="button" disabled={!allRequiredUploaded || !!uploadingType || submissionLocked} onClick={() => setConfirmSubmit(true)}>Submit</button>
                ) : (
                  <button className="btn" type="button" disabled={!!uploadingType} onClick={() => setCurrentStep((step) => Math.min(required_documents.length - 1, step + 1))}>Next</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* {tab === 'profile' && <ProfileForm staff={staff} currentStaff={currentStaff} onSaved={load} />} */}
      <DocumentModal document={viewingDocument} url={documentUrl} onClose={() => setViewingDocument(null)} />
      {confirmSubmit && (
        <ConfirmSubmitModal
          submitting={submitting}
          onCancel={() => setConfirmSubmit(false)}
          onConfirm={submit}
        />
      )}
    </div>
  );
}

function CalendarNoticeIcon() {
  return (
    <span className="notice-icon" aria-hidden="true">
      <Upload size={20} />
    </span>
  );
}

function ScreeningMessage({ message }) {
  const match = message?.match(/on (.+) at (.+) - Venue: (.+)\.?$/);
  if (!match) return <span>{message}</span>;
  const formattedDate = formatScheduleDate(match[1]);
  const formattedTime = formatScheduleTime(match[2]);
  return (
    <div className="screening-message">
      <span>You are invited for audit screening.</span>
      <div>
        <mark>Date: {formattedDate}</mark>
        <mark>Time: {formattedTime}</mark>
        <mark>Venue: {match[3]}</mark>
      </div>
    </div>
  );
}

function formatScheduleDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00`);
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(date);
  const year = date.getFullYear();
  return `${weekday} ${day}${ordinalSuffix(day)}, ${month} ${year}`;
}

function ordinalSuffix(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th';
}

function formatScheduleTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value;
  const [hourValue, minute] = value.split(':');
  const hour = Number(hourValue);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

function ConfirmSubmitModal({ submitting, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop">
      <div className="modal confirm-modal">
        <div className="modal-head">
          <div>
            <h3>Submit documents?</h3>
            <span>Please confirm before sending your documents for verification.</span>
          </div>
          <button className="icon-btn" type="button" disabled={submitting} onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="confirm-body">
          <p>Once submitted, you cannot undo this action or replace documents unless the panel requests a correction.</p>
        </div>
        <div className="decision-row">
          <button className="btn" type="button" disabled={submitting} onClick={onCancel}>Cancel</button>
          <LoadingButton className="btn primary" loading={submitting} loadingText="Submitting..." onClick={onConfirm}>Confirm Submit</LoadingButton>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ staff, currentStaff, onSaved }) {
  const displayName = currentStaff?.full_name 
    || [currentStaff?.first_name, currentStaff?.other_name, currentStaff?.last_name].filter(Boolean).join(' ') 
    || `${currentStaff?.first_name || ''} ${currentStaff?.last_name || ''}`.trim() 
    || staff.full_name;

  const displayPfNumber = currentStaff?.pf_number 
    || currentStaff?.staffNumber 
    || currentStaff?.staff_number 
    || staff.pf_number;

  const displayDepartment = currentStaff?.department_name 
    || currentStaff?.department?.name 
    || (typeof currentStaff?.department === 'string' ? currentStaff.department : '') 
    || staff.department?.name 
    || '';

  const displayRank = currentStaff?.rank_name 
    || currentStaff?.rank?.name 
    || (typeof currentStaff?.rank === 'string' ? currentStaff.rank : '') 
    || staff.rank?.name 
    || '';

  const [form, setForm] = useState({ phone: currentStaff?.phone || staff.phone || '', email: currentStaff?.email || staff.email || '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [error, setError] = useState('');
  const resolvePassportUrl = () => {
    if (staff?.passport_path) {
      if (staff.passport_path.startsWith('http')) return staff.passport_path;
      return `${PUBLIC_BASE_URL}/storage/${staff.passport_path.replace(/^\/?storage\//, '')}`;
    }
    if (currentStaff?.profile_photo_url) {
      return currentStaff.profile_photo_url;
    }
    if (currentStaff?.profile_photo) {
      if (currentStaff.profile_photo.startsWith('http')) return currentStaff.profile_photo;
      const clean = currentStaff.profile_photo.replace(/^uploads\//, '');
      return `/uploads/${clean}`;
    }
    return '/jostum.png';
  };

  const passportUrl = resolvePassportUrl();

  useEffect(() => {
    setForm({
      phone: currentStaff?.phone || staff.phone || '',
      email: currentStaff?.email || staff.email || ''
    });
  }, [currentStaff, staff]);

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await api.put('/staff/profile', form);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const uploadPassport = async (event) => {
    const file = event.target.files[0];
    if (!file || uploadingPassport) return;
    if (file.size >= 250 * 1024) {
      setError('The passport photograph must be less than 250KB.');
      event.target.value = '';
      return;
    }
    const body = new FormData();
    body.append('passport', file);
    setUploadingPassport(true);
    setError('');
    try {
      await api.post('/staff/profile/passport', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPassport(false);
      event.target.value = '';
    }
  };
  return (
    <form className="panel form-grid profile-form" onSubmit={save}>
      <h2>Profile</h2>
      {error && <div className="alert">{error}</div>}
      <div className="passport-profile">
        <div className="passport-frame">
          <img
            src={passportUrl}
            alt="Passport"
            onError={(e) => {
              e.target.onerror = null;
              if (currentStaff?.profile_photo && !e.target.src.includes('uploads/')) {
                const clean = currentStaff.profile_photo.replace(/^uploads\//, '');
                e.target.src = `/uploads/${clean}`;
              } else {
                e.target.src = '/jostum.png';
              }
            }}
          />
          <label className={`passport-edit ${uploadingPassport ? 'is-loading' : ''}`} title="Edit passport photograph">
            {uploadingPassport ? <span className="spinner" aria-hidden="true" /> : <Camera size={17} />}
            <input type="file" accept="image/png,image/jpeg" disabled={saving || uploadingPassport} onChange={uploadPassport} />
          </label>
        </div>
        <div className="passport-copy">
          <strong>Passport Photograph</strong>
          <span>JPG or PNG, maximum 250KB.</span>
          {uploadingPassport && <em>Uploading passport...</em>}
        </div>
      </div>
      <div className="profile-section">
        <h3>Official Details</h3>
        <div className="profile-fields">
          <label>PF Number<input disabled value={displayPfNumber} /></label>
          <label>Full Name<input disabled value={displayName} /></label>
          <label>Department<input disabled value={displayDepartment} /></label>
          <label>Rank<input disabled value={displayRank} /></label>
        </div>
      </div>
      <div className="profile-section">
        <h3>Contact Details</h3>
        <div className="profile-fields">
          <label>Phone<input disabled={saving} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Email<input disabled={saving} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        </div>
      </div>
      <LoadingButton className="btn primary" type="submit" loading={saving} loadingText="Saving...">Save Profile</LoadingButton>
    </form>
  );
}
