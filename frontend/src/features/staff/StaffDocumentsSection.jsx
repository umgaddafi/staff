import { useEffect, useState } from 'react';
import { useConfirm } from '../../contexts/ConfirmContext';
import { usePendingAction } from '../../hooks/usePendingAction';
import { api } from '../../lib/api';
import { formatDateTime, getErrorMessage } from '../../utils/formatters';
import { StaffModal, StaffPageHeader } from './StaffShared';

const DOCUMENT_TYPES = [
    { id: 'appointment_letter', label: 'Appointment Letter', shortLabel: 'Appointment' },
    { id: 'promotion_letter', label: 'Promotion Letter', shortLabel: 'Promotion' },
    { id: 'confirmation_letter', label: 'Confirmation Letter', shortLabel: 'Confirmation' },
    { id: 'other', label: 'Other Document', shortLabel: 'Other' },
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
    const [showModal, setShowModal] = useState(false);
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

    function openUploadModal(category = null) {
        if (category && category !== 'all') {
            setSelectedType(category);
        }
        setTitle('');
        setFile(null);
        setErrorMessage(null);
        setShowModal(true);
    }

    function closeUploadModal() {
        setShowModal(false);
        setTitle('');
        setFile(null);
        setErrorMessage(null);
        const fileInput = document.getElementById('staff-doc-file-input');
        if (fileInput) fileInput.value = '';
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
            setErrorMessage('File size exceeds 250 KB limit. Please upload a smaller compressed file.');
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
                    data: formData,
                });

                setStatusMessage(res.message || 'Document uploaded successfully.');
                closeUploadModal();
                await loadDocuments();
            } catch (err) {
                setErrorMessage(getErrorMessage(err));
            }
        });
    }

    async function handleDelete(doc) {
        await confirm({
            title: 'Delete Document',
            message: `Delete "${doc.title || doc.original_filename}"? This action cannot be undone.`,
            confirmText: 'Delete',
            danger: true,
            action: async () => {
                return runPending(`delete-doc-${doc.id}`, async () => {
                    try {
                        await api(`/api/staff/documents/${doc.id}`, { method: 'DELETE' });
                        setStatusMessage('Document deleted successfully.');
                        await loadDocuments();
                        return { ok: true };
                    } catch (err) {
                        setStatusMessage(null);
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
                title="Basic Documents"
                copy="Upload your official appointment, promotion, and reference records."
                action={(
                    <button
                        type="button"
                        className="staff-button staff-button-primary"
                        onClick={() => openUploadModal(activeTab)}
                    >
                        + Upload Document
                    </button>
                )}
            />

            {statusMessage && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.65rem 0.95rem', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{statusMessage}</span>
                    <button type="button" onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1, padding: 0 }} aria-label="Dismiss">&times;</button>
                </div>
            )}

            {errorMessage && !showModal && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.65rem 0.95rem', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{errorMessage}</span>
                    <button type="button" onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1, padding: 0 }} aria-label="Dismiss">&times;</button>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="staff-docs-tabs">
                <button
                    type="button"
                    className={`staff-docs-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <span>All</span>
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
                            <span>{type.shortLabel}</span>
                            <span className="staff-docs-tab-count">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Document Listing */}
            {loading && documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                    Loading documents...
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="staff-empty-card" style={{ textAlign: 'center', padding: '1.75rem 1rem' }}>
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: '#334155', fontSize: '0.92rem' }}>
                        {activeTab === 'all' ? 'No documents uploaded yet.' : `No ${docTypeLabel(activeTab)} uploaded yet.`}
                    </p>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748b' }}>
                        Upload your official career documents for administrative reference.
                    </p>
                    <button
                        type="button"
                        className="staff-button staff-button-primary"
                        onClick={() => openUploadModal(activeTab)}
                        style={{ fontSize: '0.84rem' }}
                    >
                        + Upload Document
                    </button>
                </div>
            ) : (
                <div className="staff-docs-grid">
                    {filteredDocs.map((doc) => (
                        <div className="staff-doc-card" key={doc.id}>
                            <div className="staff-doc-card-header">
                                <div className="staff-doc-icon-wrap" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '1.25rem', height: '1.25rem' }}>
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                </div>
                                <div className="staff-doc-info">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                        <span className="staff-doc-type-badge">{docTypeLabel(doc.document_type)}</span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>• {formatBytes(doc.file_size)}</span>
                                    </div>
                                    <h4 className="staff-doc-title">{doc.title || doc.original_filename || 'Untitled Document'}</h4>
                                    <div className="staff-doc-date">Uploaded {formatDateTime(doc.created_at)}</div>
                                </div>
                            </div>

                            <div className="staff-doc-card-actions">
                                {doc.file_url ? (
                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="staff-button staff-button-secondary"
                                        style={{ flex: 1, textAlign: 'center', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                                    >
                                        View
                                    </a>
                                ) : null}
                                <button
                                    type="button"
                                    className="staff-pill-button is-danger"
                                    onClick={() => handleDelete(doc)}
                                    disabled={isPending(`delete-doc-${doc.id}`)}
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                    {isPending(`delete-doc-${doc.id}`) ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <StaffModal
                open={showModal}
                title="Upload Document"
                onClose={closeUploadModal}
                actions={(
                    <>
                        <button
                            type="button"
                            className="staff-button staff-button-secondary"
                            onClick={closeUploadModal}
                            disabled={isPending('upload-doc')}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="staff-doc-upload-form"
                            className="staff-button staff-button-primary"
                            disabled={isPending('upload-doc')}
                        >
                            {isPending('upload-doc') ? 'Uploading...' : 'Upload Document'}
                        </button>
                    </>
                )}
            >
                <form id="staff-doc-upload-form" onSubmit={handleUpload} className="staff-modal-form">
                    {errorMessage && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: 6, fontSize: '0.84rem' }}>
                            {errorMessage}
                        </div>
                    )}

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
                            placeholder="e.g. Appointment as Lecturer / 2024 Promotion"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
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
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                            Accepted: PDF, JPG, PNG, WEBP (Max: 250 KB).
                        </p>
                    </div>
                </form>
            </StaffModal>
        </div>
    );
}

export { StaffDocumentsSection };
