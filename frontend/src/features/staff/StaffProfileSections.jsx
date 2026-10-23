import { useEffect, useState } from 'react';
import { Avatar } from '../../components/common/states';
import { Field } from '../../components/common/ui';
import { StaffCrudIcon, StaffDashboardActionIcon } from '../../components/icons/AppIcons';
import { useCountryOptions } from '../../hooks/useCountryOptions';
import { usePendingAction } from '../../hooks/usePendingAction';
import { uploadData } from '../../utils/formData';
import {
    publicationFormDefaults,
    publicationTone,
    qualificationFormDefaults,
    qualificationDegreeOptions,
} from './constants';
import { StaffModal, StaffPageHeader } from './StaffShared';
import { useConfirm } from '../../contexts/ConfirmContext';

function ProfileSection({ staff, ranks, departments = [], onSubmit }) {
    const [form, setForm] = useState({});
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const { isPending, runPending } = usePendingAction();
    const isSaving = isPending('save-profile');

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    useEffect(() => {
        setForm({
            first_name: staff.first_name || '',
            other_name: staff.other_name || '',
            last_name: staff.last_name || '',
            gender: staff.gender || 'Male',
            date_of_birth: staff.date_of_birth || '',
            rank_id: staff.rank_id || '',
            department_id: staff.department_id || '',
            phone: staff.phone || '',
            office_location: staff.office_location || '',
            biography: staff.biography || '',
        });
    }, [staff]);

    function updateField(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    async function submit(event) {
        event.preventDefault();
        const result = await runPending('save-profile', async () => {
            const formData = uploadData(form);
            if (file) {
                formData.append('profile_photo', file);
            }

            return onSubmit(formData);
        });

        if (result?.ok) {
            setFile(null);
        }
    }

    return (
        <form className="staff-profile-layout" onSubmit={submit}>
            <div className="staff-profile-shell">
                <aside className="staff-profile-summary">
                    <div className="staff-profile-avatar-wrap">
                        <Avatar name={staff.full_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim()} photoUrl={previewUrl || staff.profile_photo_url} className="staff-profile-avatar" />
                        <label className="staff-profile-avatar-edit" htmlFor="profile-photo-upload" title="Upload new photo (max 250 KB)">
                            <span aria-hidden="true">+</span>
                        </label>
                        <input
                            id="profile-photo-upload"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={(event) => {
                                const selected = event.target.files?.[0] ?? null;
                                if (selected && selected.size > 250 * 1024) {
                                    alert('Profile photo size exceeds 250 KB limit. Please choose a smaller image.');
                                    event.target.value = '';
                                    return;
                                }
                                setFile(selected);
                            }}
                            hidden
                        />
                    </div>
                    {file && <span className="staff-form-note" style={{ display: 'block', textAlign: 'center', color: '#1b4d3e', fontWeight: 600, marginTop: 4 }}>Previewing selected photo</span>}
                    <h3>{[form.first_name || staff.first_name, form.other_name || staff.other_name, form.last_name || staff.last_name].filter(Boolean).join(' ') || staff.full_name || 'Staff Profile'}</h3>
                    <p>{staff.rank_name || 'Not Set'}</p>
                    <div className="staff-profile-meta">
                        <div>
                            <span>Primary Department</span>
                            <strong>{staff.department_name || 'Not Set'}</strong>
                        </div>
                        <div>
                            <span>Official Email</span>
                            <strong>{staff.email || 'No email set'}</strong>
                        </div>
                    </div>
                    <button className="staff-button staff-button-primary" type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                </aside>
                <section className="staff-profile-form">
                    <div className="staff-form-panel">
                        <div className="staff-form-section-head">
                            <h3>Identity Details</h3>
                            <p>Profile edits save immediately. Rank and department changes require admin approval.</p>
                        </div>
                        <div className="staff-form-grid is-profile">
                            <Field label="First Name"><input className="input" value={form.first_name || ''} onChange={(event) => updateField('first_name', event.target.value)} required /></Field>
                            <Field label="Other Names"><input className="input" value={form.other_name || ''} onChange={(event) => updateField('other_name', event.target.value)} placeholder="Optional" /></Field>
                            <Field label="Last Name"><input className="input" value={form.last_name || ''} onChange={(event) => updateField('last_name', event.target.value)} required /></Field>
                            <Field label="Gender">
                                <select className="select" value={form.gender || ''} onChange={(event) => updateField('gender', event.target.value)}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </Field>
                            <Field label="Date of Birth"><input className="input" type="date" value={form.date_of_birth || ''} onChange={(event) => updateField('date_of_birth', event.target.value)} /></Field>
                            <Field label="Academic Rank">
                                <select className="select" value={form.rank_id || ''} onChange={(event) => updateField('rank_id', event.target.value)}>
                                    <option value="">Select rank</option>
                                    {ranks.map((rank) => (
                                        <option key={rank.id} value={rank.id}>{rank.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Primary Department">
                                <select className="select" value={form.department_id || ''} onChange={(event) => updateField('department_id', event.target.value)}>
                                    <option value="">Select department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}{dept.collegeName ? ` (${dept.collegeName})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <p className="staff-form-note">Rank and department changes require admin approval before they appear publicly.</p>
                    </div>
                    <div className="staff-form-panel">
                        <div className="staff-form-section-head">
                            <h3>Contact &amp; Office</h3>
                        </div>
                        <div className="staff-form-grid is-contact">
                            <Field label="Phone Number"><input className="input" value={form.phone || ''} onChange={(event) => updateField('phone', event.target.value)} /></Field>
                            <Field label="Office Location"><input className="input" value={form.office_location || ''} onChange={(event) => updateField('office_location', event.target.value)} /></Field>
                        </div>
                    </div>
                    <div className="staff-form-panel">
                        <div className="staff-form-section-head">
                            <h3>Academic Biography</h3>
                        </div>
                        <Field label="Biography">
                            <textarea className="textarea" rows={6} value={form.biography || ''} onChange={(event) => updateField('biography', event.target.value)} placeholder="Share your academic journey..." />
                        </Field>
                        <p className="staff-form-note">Tip: Highlight research interests and key teaching philosophies.</p>
                    </div>
                    <div className="profile-form-bottom-actions">
                        <button className="staff-button staff-button-primary" type="submit" disabled={isSaving} style={{ minWidth: '180px', padding: '0.75rem 1.75rem', fontSize: '1rem', fontWeight: 700 }}>
                            {isSaving ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </div>
                </section>
            </div>
        </form>
    );
}

function QualificationsSection({ items, onCreate, onDelete }) {
    const [form, setForm] = useState(qualificationFormDefaults);
    const [file, setFile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const { countries, loading: countriesLoading, error: countriesError } = useCountryOptions();
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSubmitting = isPending('create-qualification');

    function openModal() {
        setForm(qualificationFormDefaults());
        setFile(null);
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setForm(qualificationFormDefaults());
        setFile(null);
    }

    async function submit(event) {
        event.preventDefault();
        const result = await runPending('create-qualification', async () => {
            const formData = uploadData(form);
            if (file) {
                formData.append('evidence_file', file);
            }

            return onCreate(formData);
        });

        if (result?.ok) {
            closeModal();
        }
    }

    return (
        <>
            <StaffPageHeader
                title="Educational Background"
                copy="Your verified academic credentials and certifications."
                action={<button type="button" className="staff-button staff-button-dark" onClick={openModal}>Add Qualification</button>}
            />
            {items.length === 0 ? (
                <div className="staff-empty-card">
                    <p>No qualifications found. Click "Add" to start your profile.</p>
                </div>
            ) : (
                <div className="staff-qualification-timeline">
                    {items.map((item) => (
                        <article className="staff-qualification-card" key={item.qualification_id}>
                            <div className="staff-qualification-main">
                                <div className="staff-qualification-heading">
                                    <span className="staff-qualification-badge">{item.degree}</span>
                                    <h3>{item.field_of_study}</h3>
                                </div>
                                <div className="staff-qualification-meta">
                                    <div className="staff-qualification-place">
                                        <span className="staff-qualification-icon" aria-hidden="true">
                                            <StaffCrudIcon name="university" />
                                        </span>
                                        <div>
                                        <strong>{item.institution}</strong>
                                        <span>{item.country}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="staff-qualification-side">
                                <strong>{item.year_awarded}</strong>
                                <span>Year Awarded</span>
                                <button
                                    type="button"
                                    className="staff-pill-button is-danger"
                                    onClick={async () => {
                                        await confirm({
                                            title: 'Confirm Deletion',
                                            message: 'Request removal of this qualification?',
                                            confirmText: 'Remove',
                                            danger: true,
                                            action: () => runPending(`delete-qualification-${item.qualification_id}`, () => onDelete(item.qualification_id))
                                        });
                                    }}
                                    disabled={isPending(`delete-qualification-${item.qualification_id}`)}
                                >
                                    {isPending(`delete-qualification-${item.qualification_id}`) ? 'Removing...' : 'Remove'}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            <StaffModal
                open={showModal}
                title="Add New Qualification"
                onClose={closeModal}
                actions={(
                    <>
                        <button type="button" className="staff-button staff-button-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="staff-qualification-form" className="staff-button staff-button-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                        </button>
                    </>
                )}
            >
                <form id="staff-qualification-form" className="staff-modal-form" onSubmit={submit}>
                    <Field label="Degree Type">
                        <select
                            className="select"
                            value={form.degree}
                            onChange={(event) => setForm((current) => ({ ...current, degree: event.target.value }))}
                            required
                        >
                            <option value="">Select degree type</option>
                            {qualificationDegreeOptions.map((degree) => (
                                <option key={degree} value={degree}>{degree}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Field of Study"><input className="input" value={form.field} onChange={(event) => setForm((current) => ({ ...current, field: event.target.value }))} placeholder="e.g. Computer Science" required /></Field>
                    <Field label="Institution Name"><input className="input" value={form.institution} onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))} required /></Field>
                    <div className="staff-modal-grid">
                        <Field label="Country">
                            {countriesError ? (
                                <input
                                    className="input"
                                    value={form.country}
                                    onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                                    placeholder="Country service unavailable. Type country name"
                                    required
                                />
                            ) : (
                                <select
                                    className="select"
                                    value={form.country}
                                    onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                                    disabled={countriesLoading}
                                    required
                                >
                                    <option value="">{countriesLoading ? 'Loading countries...' : 'Select country'}</option>
                                    {countries.map((country) => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            )}
                        </Field>
                        <Field label="Year"><input className="input" type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} required /></Field>
                    </div>
                    {countriesError ? <p className="staff-form-note">{countriesError} You can still type the country manually.</p> : null}
                    <Field label="Upload Certificate (Image/PDF, max 250 KB)">
                        <input
                            className="input"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(event) => {
                                const selected = event.target.files?.[0] ?? null;
                                if (selected && selected.size > 250 * 1024) {
                                    alert('Certificate file size exceeds the 250 KB limit. Please choose a smaller file.');
                                    event.target.value = '';
                                    return;
                                }
                                setFile(selected);
                            }}
                            required
                        />
                    </Field>
                </form>
            </StaffModal>
        </>
    );
}

function ResearchSection({ items, onCreate, onDelete }) {
    const [name, setName] = useState('');
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSubmitting = isPending('create-research-area');

    return (
        <>
            <StaffPageHeader
                title="Research Interests"
                copy="Manage the academic areas and topics you are currently exploring."
                meta={<span className="staff-count-pill">Total Areas: {items.length}</span>}
            />
            <div className="staff-research-layout">
                <form className="staff-research-form" onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await runPending('create-research-area', () => onCreate(name));
                    if (result?.ok) {
                        setName('');
                    }
                }}>
                    <h3>Add New Interest</h3>
                    <p>Type a field of study to add it to your profile.</p>
                    <Field label="Area Name"><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter area name..." required /></Field>
                    <button className="staff-button staff-button-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add to Profile'}
                    </button>
                </form>
                <section className="staff-research-areas">
                    <h3>Active Research Areas</h3>
                    {items.length === 0 ? (
                        <div className="staff-empty-inline">You haven't added any research areas yet.</div>
                    ) : (
                        <div className="staff-research-tags">
                            {items.map((item) => (
                                <div className="staff-research-tag" key={item.research_area_id || item.name}>
                                    <span>{item.name}</span>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await confirm({
                                                title: 'Confirm Deletion',
                                                message: 'Remove this research area?',
                                                confirmText: 'Remove',
                                                danger: true,
                                                action: () => runPending(`delete-research-${item.research_area_id}`, () => onDelete(item.research_area_id))
                                            });
                                        }}
                                        disabled={isPending(`delete-research-${item.research_area_id}`)}
                                    >
                                        {isPending(`delete-research-${item.research_area_id}`) ? '...' : '×'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

function PublicationsSection({ items, onSave, onDelete }) {
    const [editing, setEditing] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(publicationFormDefaults);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSubmitting = isPending('save-publication');

    useEffect(() => {
        if (editing) {
            setForm({
                publication_id: editing.publication_id,
                title: editing.title || '',
                type: editing.publication_type || 'Journal',
                venue: editing.journal_or_venue || '',
                publisher: editing.publisher || 'N/A',
                year: editing.year_published || new Date().getFullYear(),
                doi: editing.doi || '',
                url: editing.url || '',
            });
        } else {
            setForm(publicationFormDefaults());
        }
    }, [editing]);

    function openCreate() {
        setEditing(null);
        setForm(publicationFormDefaults());
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditing(null);
        setForm(publicationFormDefaults());
    }

    async function submit(event) {
        event.preventDefault();
        const result = await runPending('save-publication', () => onSave(form));
        if (result?.ok) {
            closeModal();
        }
    }

    return (
        <>
            <StaffPageHeader
                title="Academic Output"
                copy="Record your research output to keep your academic portfolio current."
                action={<button type="button" className="staff-button staff-button-primary staff-page-action-desktop" onClick={openCreate}>New Entry</button>}
            />
            <button type="button" className="staff-publication-fab" onClick={openCreate} aria-label="Add new publication">
                <StaffDashboardActionIcon name="plus" />
            </button>
            {items.length === 0 ? (
                <div className="staff-empty-card">
                    <p>Start building your profile by adding your first publication.</p>
                </div>
            ) : (
                <div className="staff-publication-list">
                    {items.map((item) => (
                        <article className="staff-publication-card" key={item.publication_id}>
                            <div className="staff-publication-year">{item.year_published}</div>
                            <div className="staff-publication-body">
                                <div className="staff-publication-meta">
                                    <span className={`staff-publication-badge is-${publicationTone(item.publication_type)}`}>{String(item.publication_type || '').toUpperCase()}</span>
                                </div>
                                <h3>{item.title}</h3>
                                <p>{item.journal_or_venue} {item.publisher ? `| ${item.publisher}` : ''}</p>
                                <div className="staff-publication-links">
                                    {item.doi ? <a href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">DOI: {item.doi}</a> : null}
                                    {item.url ? <a href={item.url} target="_blank" rel="noreferrer">View Source</a> : null}
                                </div>
                            </div>
                            <div className="staff-publication-actions">
                                <button type="button" className="staff-icon-text-button" onClick={() => {
                                    setEditing(item);
                                    setShowModal(true);
                                }}>Edit</button>
                                <button
                                    type="button"
                                    className="staff-icon-text-button is-danger"
                                    onClick={async () => {
                                        await confirm({
                                            title: 'Confirm Deletion',
                                            message: 'Remove this publication?',
                                            confirmText: 'Remove',
                                            danger: true,
                                            action: () => runPending(`delete-publication-${item.publication_id}`, () => onDelete(item.publication_id))
                                        });
                                    }}
                                    disabled={isPending(`delete-publication-${item.publication_id}`)}
                                >
                                    {isPending(`delete-publication-${item.publication_id}`) ? 'Removing...' : 'Remove'}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            <StaffModal
                open={showModal}
                wide
                title={editing ? 'Edit Publication Entry' : 'New Publication'}
                onClose={closeModal}
                actions={(
                    <>
                        <button type="button" className="staff-button staff-button-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="staff-publication-form" className="staff-button staff-button-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (editing ? 'Submit Update Request' : 'Confirm & Save Entry')}
                        </button>
                    </>
                )}
            >
                <form id="staff-publication-form" className="staff-modal-form" onSubmit={submit}>
                    <Field label="Full Publication Title"><textarea className="textarea" rows={4} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></Field>
                    <div className="staff-modal-grid">
                        <Field label="Publication Type">
                            <select className="select" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                                <option>Journal</option>
                                <option>Conference</option>
                                <option>Book</option>
                                <option>Book Chapter</option>
                            </select>
                        </Field>
                        <Field label="Year Published"><input className="input" type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} required /></Field>
                    </div>
                    <Field label="Journal or Conference Name"><input className="input" value={form.venue} onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))} /></Field>
                    <Field label="Publisher"><input className="input" value={form.publisher} onChange={(event) => setForm((current) => ({ ...current, publisher: event.target.value }))} /></Field>
                    <div className="staff-modal-grid">
                        <Field label="DOI (Optional)"><input className="input" value={form.doi} onChange={(event) => setForm((current) => ({ ...current, doi: event.target.value }))} /></Field>
                        <Field label="Website Link"><input className="input" type="url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} /></Field>
                    </div>
                </form>
            </StaffModal>
        </>
    );
}

export { ProfileSection, QualificationsSection, ResearchSection, PublicationsSection };
