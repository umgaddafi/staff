import { useEffect, useState } from 'react';
import { useConfirm } from '../../contexts/ConfirmContext';
import { usePendingAction } from '../../hooks/usePendingAction';
import { api } from '../../lib/api';
import { formatDateTime, getErrorMessage } from '../../utils/formatters';
import { StaffPageHeader } from './StaffShared';

const DOCUMENT_TYPES = [
    { id: 'appointment_letter', label: 'Appointment Letter', description: 'Official letter of first employment / offer of appointment.' },
    { id: 'promotion_letter', label: 'Promotion Letters', description: 'Latest promotion letter or past promotion notices.' },
    { id: 'confirmation_letter', label: 'Confirmation Letter', description: 'Letter of confirmation of appointment with the university.' },
    { id: 'other', label: 'Other Reference Documents', description: 'Other supporting administrative or service documents.' },
];

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function StaffDocumentsSection({ initialDocuments = [] }) {
    const [documents, setDocuments] = useState(initialDocuments);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedType, setSelectedType] = useState('appointment_letter');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();

    useEffect(() => {
        loadDocuments();
    }, []);

    async function loadDocuments() {
        setLoading(true);
        try {
            const res = await api('/api/staff/documents');
            if (res?.documents) {
                setDocuments(res.documents);
            }
        } catch (err) {
            console.error('Failed to load documents:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpload(e) {
        e.preventDefault();
        setStatusMessage(null);
        setErrorMessage(null);

        if (!file) {
            setErrorMessage('Please select a file to upload.');
            return;
        }

        if (file.size > 250 * 1024) {
            setErrorMessage('File size exceeds 250 KB limit. Please upload a compressed PDF or image.');
            return;
        }

        await runPending('upload-doc', async () => {
            const formData = new FormData();
            formData.append('document_type', selectedType);
            if (title.trim()) {
                formData.append('title', title.trim());
            }
            formData.append('file', file);

            try {
                const res = await api('/api/staff/documents', {
                    method: 'POST',
                    body: formData,
                });

                setStatusMessage(res.message || 'Document uploaded successfully.');
                setTitle('');
                setFile(null);
                const fileInput = document.getElementById('staff-doc-file-input');
                if (fileInput) fileInput.value = '';
                await loadDocuments();
            } catch (err) {
                setErrorMessage(getErrorMessage(err));
            }
        });
    }

    async function handleDelete(doc) {
        await confirm({
            title: 'Delete Reference Document',
            message: `Are you sure you want to delete "${doc.title || doc.original_filename}"? This action cannot be undone.`,
            confirmText: 'Delete Document',
            danger: true,
            action: async () => {
                return runPending(`delete-doc-${doc.id}`, async () => {
                    try {
                        await api(`/api/staff/documents/${doc.id}`, { method: 'DELETE' });
                        setStatusMessage('Document deleted successfully.');
                        await loadDocuments();
                        return { ok: true };
                    } catch (err) {
                        setErrorMessage(getErrorMessage(err));
                        return { ok: false, error: err };
                    }
                });
            },
        });
    }

    const filteredDocs = activeTab === 'all'
        ? documents
        : documents.filter((d) => d.document_type === activeTab);

    const docTypeLabel = (type) => DOCUMENT_TYPES.find((t) => t.id === type)?.label || type;

    return (
        <div className="section-stack">
            <StaffPageHeader
                title="Basic Reference Documents"
                copy="Upload and manage essential career reference records (Appointment letter, Promotion letters, etc.) for administrative review."
                meta={<span className="staff-count-pill">Total Documents: {documents.length}</span>}
            />

            {statusMessage && (
                <div className="staff-panel is-highlight" style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#166534', padding: '1rem', borderRadius: 8 }}>
                    <strong>Success: </strong> {statusMessage}
                </div>
            )}

            {errorMessage && (
                <div className="staff-panel is-highlight" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', padding: '1rem', borderRadius: 8 }}>
                    <strong>Error: </strong> {errorMessage}
                </div>
            )}

            {/* Document Upload Box */}
            <div className="staff-form-panel">
                <div className="staff-form-section-head">
                    <h3>Upload New Reference Document</h3>
                    <p>Accepted formats: PDF, JPG, PNG, WEBP. Maximum file size: <strong>250 KB</strong>.</p>
                </div>

                <form onSubmit={handleUpload} style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="staff-modal-grid">
                        <div className="field">
                            <label className="field-label">Document Category *</label>
                            <select
                                className="select"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                required
                            >
                                {DOCUMENT_TYPES.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label className="field-label">Document Title / Note (Optional)</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="e.g. Appointment as Assistant Lecturer / 2024 Promotion"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="field-label">Select File (max 250 KB) *</label>
                        <input
                            id="staff-doc-file-input"
                            className="input"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const selected = e.target.files?.[0] || null;
                                if (selected && selected.size > 250 * 1024) {
                                    alert('Selected file exceeds 250 KB limit. Please choose a file smaller than 250 KB.');
                                    e.target.value = '';
                                    setFile(null);
                                    return;
                                }
                                setFile(selected);
                            }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button
                            type="submit"
                            className="staff-button staff-button-primary"
                            disabled={isPending('upload-doc')}
                            style={{ minWidth: '160px' }}
                        >
                            {isPending('upload-doc') ? 'Uploading...' : 'Upload Document'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Filter Tabs */}
            <div className="staff-docs-tabs">
                <button
                    type="button"
                    className={`staff-docs-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <span>All Documents</span>
                    <span className="staff-docs-tab-count">{documents.length}</span>
                </button>
                {DOCUMENT_TYPES.map((type) => {
                    const count = documents.filter((d) => d.document_type === type.id).length;
                    return (
                        <button
                            key={type.id}
                            type="button"
                            className={`staff-docs-tab-btn ${activeTab === type.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(type.id)}
                        >
                            <span>{type.label}</span>
                            <span className="staff-docs-tab-count">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Document Listing */}
            {loading && documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    Loading documents...
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="staff-empty-card" style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>
                        {activeTab === 'all'
                            ? 'No reference documents uploaded yet.'
                            : `No ${docTypeLabel(activeTab)} uploaded yet.`}
                    </p>
                    <small style={{ color: '#94a3b8' }}>Use the form above to add your official reference records.</small>
                </div>
            ) : (
                <div className="staff-docs-grid">
                    {filteredDocs.map((doc) => (
                        <div className="staff-doc-card" key={doc.id}>
                            <div className="staff-doc-card-header">
                                <div className="staff-doc-icon-wrap" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.4rem', height: '1.4rem' }}>
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <div className="staff-doc-info">
                                    <h4 className="staff-doc-title">{doc.title || doc.original_filename || 'Untitled Document'}</h4>
                                    <div className="staff-doc-meta">
                                        <span style={{ fontWeight: 600, color: '#0f766e' }}>{docTypeLabel(doc.document_type)}</span>
                                        <span>Size: {formatBytes(doc.file_size)}</span>
                                        <span>Uploaded: {formatDateTime(doc.created_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="staff-doc-card-actions">
                                {doc.file_url ? (
                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="staff-button staff-button-secondary"
                                        style={{ flex: 1, textAlign: 'center', padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                                    >
                                        View / Open
                                    </a>
                                ) : null}
                                <button
                                    type="button"
                                    className="staff-pill-button is-danger"
                                    onClick={() => handleDelete(doc)}
                                    disabled={isPending(`delete-doc-${doc.id}`)}
                                    style={{ padding: '0.45rem 0.85rem' }}
                                >
                                    {isPending(`delete-doc-${doc.id}`) ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export { StaffDocumentsSection };
