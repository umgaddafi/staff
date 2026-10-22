import { useState } from 'react';
import { Field } from '../../components/common/ui';
import { StaffCrudIcon } from '../../components/icons/AppIcons';
import { usePendingAction } from '../../hooks/usePendingAction';
import { uploadData } from '../../utils/formData';
import { formatDateTime, formatMoney } from '../../utils/formatters';
import {
    academicSessionOptions,
    courseLinkDefaults,
    externalProfileFormDefaults,
    grantFormDefaults,
    membershipFormDefaults,
    platformTone,
    supervisionFormDefaults,
} from './constants';
import { StaffModal, StaffPageHeader } from './StaffShared';
import { useConfirm } from '../../contexts/ConfirmContext';

function CoursesSection({ items, courseOptions, onLink, onDelete }) {
    const [form, setForm] = useState(courseLinkDefaults);
    const [showModal, setShowModal] = useState(false);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const sessionOptions = academicSessionOptions();
    const isSubmitting = isPending('link-course');
    const groupedCourses = items.reduce((accumulator, item) => {
        const key = item.session || 'Unknown Session';
        if (!accumulator[key]) {
            accumulator[key] = [];
        }
        accumulator[key].push(item);
        return accumulator;
    }, {});

    function openModal() {
        setForm(courseLinkDefaults());
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setForm(courseLinkDefaults());
    }

    return (
        <>
            <StaffPageHeader
                title="Teaching Portfolio"
                copy="Manage the courses you have facilitated across academic sessions."
                action={<button type="button" className="staff-button staff-button-dark" onClick={openModal}>Link Course</button>}
            />
            {items.length === 0 ? (
                <div className="staff-empty-card">
                    <p>No courses linked to your portfolio yet.</p>
                </div>
            ) : (
                Object.entries(groupedCourses).map(([session, courses]) => (
                    <div className="staff-session-group" key={session}>
                        <div className="staff-session-header">Academic Session: {session}</div>
                        <div className="staff-course-list">
                            {courses.map((item) => (
                                <article className="staff-course-card" key={`${item.course_id}-${item.session}`}>
                                    <div className="staff-course-level">
                                        <span>{item.level}L</span>
                                        <strong>{item.course_code}</strong>
                                    </div>
                                    <div className="staff-course-body">
                                        <h3>{item.course_title}</h3>
                                        <p>Faculty Course Record</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="staff-icon-text-button is-danger"
                                        onClick={async () => {
                                            await confirm({
                                                title: 'Confirm Deletion',
                                                message: 'Remove this course from your portfolio for this session?',
                                                confirmText: 'Remove',
                                                danger: true,
                                                action: () => runPending(`delete-course-${item.course_id}-${item.session}`, () => onDelete({ course_id: item.course_id, session: item.session }))
                                            });
                                        }}
                                        disabled={isPending(`delete-course-${item.course_id}-${item.session}`)}
                                    >
                                        {isPending(`delete-course-${item.course_id}-${item.session}`) ? 'Removing...' : 'Remove'}
                                    </button>
                                </article>
                            ))}
                        </div>
                    </div>
                ))
            )}
            <StaffModal
                open={showModal}
                title="Link Course to Session"
                onClose={closeModal}
                actions={(
                    <>
                        <button type="button" className="staff-button staff-button-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="staff-course-form" className="staff-button staff-button-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Add to Portfolio'}
                        </button>
                    </>
                )}
            >
                <form id="staff-course-form" className="staff-modal-form" onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await runPending('link-course', () => onLink(form));
                    if (result?.ok) {
                        closeModal();
                    }
                }}>
                    <Field label="Select Academic Session">
                        <select className="select" value={form.session} onChange={(event) => setForm((current) => ({ ...current, session: event.target.value }))} required>
                            {sessionOptions.map((session) => (
                                <option key={session} value={session}>{session}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Course">
                        <select className="select" value={form.course_id} onChange={(event) => setForm((current) => ({ ...current, course_id: event.target.value }))} required>
                            <option value="">Search for course...</option>
                            {courseOptions.map((course) => (
                                <option key={course.id} value={course.id}>{course.code} - {course.title} ({course.level}L)</option>
                            ))}
                        </select>
                    </Field>
                </form>
            </StaffModal>
        </>
    );
}

function GrantsSection({ items, onCreate, onDelete }) {
    const [form, setForm] = useState(grantFormDefaults);
    const [showModal, setShowModal] = useState(false);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const currentYear = new Date().getFullYear();
    const totalFunding = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const isSubmitting = isPending('create-grant');

    function openModal() {
        setForm(grantFormDefaults());
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setForm(grantFormDefaults());
    }

    return (
        <>
            <div className="staff-grant-banner">
                <div>
                    <span>Total Research Funding Secured</span>
                    <strong>{formatMoney(totalFunding)}</strong>
                </div>
                <button type="button" className="staff-button staff-button-contrast" onClick={openModal}>Register New Grant</button>
            </div>
            <h3 className="staff-subsection-title">Project Portfolio</h3>
            {items.length === 0 ? (
                <div className="staff-empty-card">
                    <p>No research projects recorded yet.</p>
                </div>
            ) : (
                <div className="staff-grant-list">
                    {items.map((item) => {
                        const isActive = currentYear <= Number(item.end_year || currentYear);
                        return (
                            <article className="staff-grant-card" key={item.project_id}>
                                <div className="staff-grant-copy">
                                    <div className="staff-grant-topline">
                                        <span className={`staff-status-pill ${isActive ? 'is-success' : 'is-neutral'}`}>{isActive ? 'Active' : 'Completed'}</span>
                                        <small>{item.start_year} - {item.end_year}</small>
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p>Sponsor: <strong>{item.sponsor}</strong></p>
                                </div>
                                <div className="staff-grant-side">
                                    <strong>{formatMoney(item.amount)}</strong>
                                    <button
                                        type="button"
                                        className="staff-icon-text-button is-danger"
                                        onClick={async () => {
                                            await confirm({
                                                title: 'Confirm Deletion',
                                                message: 'Remove this grant?',
                                                confirmText: 'Delete',
                                                danger: true,
                                                action: () => runPending(`delete-grant-${item.project_id}`, () => onDelete(item.project_id))
                                            });
                                        }}
                                        disabled={isPending(`delete-grant-${item.project_id}`)}
                                    >
                                        {isPending(`delete-grant-${item.project_id}`) ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
            <StaffModal
                open={showModal}
                wide
                title="Add Research Project"
                onClose={closeModal}
                actions={(
                    <>
                        <button type="button" className="staff-button staff-button-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="staff-grant-form" className="staff-button staff-button-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Grant'}
                        </button>
                    </>
                )}
            >
                <form id="staff-grant-form" className="staff-modal-form" onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await runPending('create-grant', () => onCreate(form));
                    if (result?.ok) {
                        closeModal();
                    }
                }}>
                    <Field label="Project Title"><input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></Field>
                    <div className="staff-modal-grid is-grant">
                        <Field label="Sponsor"><input className="input" value={form.sponsor} onChange={(event) => setForm((current) => ({ ...current, sponsor: event.target.value }))} required /></Field>
                        <Field label="Amount (Naira)"><input className="input" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required /></Field>
                    </div>
                    <div className="staff-modal-grid">
                        <Field label="Start Year"><input className="input" type="number" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} required /></Field>
                        <Field label="End Year"><input className="input" type="number" value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} required /></Field>
                    </div>
                </form>
            </StaffModal>
        </>
    );
}

function SupervisionSection({ items, onCreate, onDelete }) {
    const [form, setForm] = useState(supervisionFormDefaults);
    const [showModal, setShowModal] = useState(false);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSubmitting = isPending('create-supervision');

    function openModal() {
        setForm(supervisionFormDefaults());
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setForm(supervisionFormDefaults());
    }

    return (
        <>
            <StaffPageHeader
                title="Supervision & Mentorship"
                copy="Tracking progress for PhD, MSc, and PGD candidates."
                action={<button type="button" className="staff-button staff-button-primary" onClick={openModal}>Register New Student</button>}
            />
            {items.length === 0 ? (
                <div className="staff-empty-card">
                    <p>No supervision records yet.</p>
                </div>
            ) : (
                <div className="staff-supervision-grid">
                    {items.map((item) => (
                        <article className={`staff-supervision-card is-${String(item.degree || '').toLowerCase()}`} key={item.supervision_id}>
                            <div className="staff-supervision-topline">
                                <span className="staff-degree-tag">{item.degree} Candidate</span>
                                <span className={`staff-status-text ${String(item.status || '').toLowerCase() === 'ongoing' ? 'is-warning' : 'is-success'}`}>{item.status}</span>
                            </div>
                            <h3>{item.student_name}</h3>
                            <small>{item.year_started} - {item.year_completed || 'Present'}</small>
                            <p>"{item.thesis_title || 'Thesis title not yet registered.'}"</p>
                            <div className="staff-supervision-actions">
                                <button
                                    type="button"
                                    className="staff-icon-text-button is-danger"
                                    onClick={async () => {
                                        await confirm({
                                            title: 'Confirm Deletion',
                                            message: 'Remove this supervision record?',
                                            confirmText: 'Delete',
                                            danger: true,
                                            action: () => runPending(`delete-supervision-${item.supervision_id}`, () => onDelete(item.supervision_id))
                                        });
                                    }}
                                    disabled={isPending(`delete-supervision-${item.supervision_id}`)}
                                >
                                    {isPending(`delete-supervision-${item.supervision_id}`) ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            <StaffModal
                open={showModal}
                title="Register Student Supervision"
                onClose={closeModal}
                actions={(
                    <>
                        <button type="button" className="staff-button staff-button-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="staff-supervision-form" className="staff-button staff-button-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Add Student to Portfolio'}
                        </button>
                    </>
                )}
            >
                <form id="staff-supervision-form" className="staff-modal-form" onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await runPending('create-supervision', () => onCreate(form));
                    if (result?.ok) {
                        closeModal();
                    }
                }}>
                    <Field label="Full Name of Student"><input className="input" value={form.student} onChange={(event) => setForm((current) => ({ ...current, student: event.target.value }))} required /></Field>
                    <div className="staff-modal-grid">
                        <Field label="Degree Type">
                            <select className="select" value={form.degree} onChange={(event) => setForm((current) => ({ ...current, degree: event.target.value }))}>
                                <option value="PhD">PhD</option>
                                <option value="MSc">MSc</option>
                                <option value="PGD">PGD</option>
                            </select>
                        </Field>
                        <Field label="Current Status">
                            <select className="select" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </Field>
                    </div>
                    <Field label="Research/Thesis Title"><textarea className="textarea" rows={3} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
                    <div className="staff-modal-grid">
                        <Field label="Year Started"><input className="input" type="number" value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} required /></Field>
                        <Field label="Year Completed"><input className="input" type="number" value={form.end} onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))} disabled={form.status !== 'Completed'} /></Field>
                    </div>
                </form>
            </StaffModal>
        </>
    );
}

function MembershipSection({ items, onCreate, onDelete }) {
    const [form, setForm] = useState(membershipFormDefaults);
    const [file, setFile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSubmitting = isPending('create-membership');

    function openModal() {
        setForm(membershipFormDefaults());
        setFile(null);
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setForm(membershipFormDefaults());
        setFile(null);
    }

    return (
        <>
            <StaffPageHeader
                title="Professional Memberships"
                copy="Manage your verified academic and professional affiliations."
                action={<button type="button" className="staff-button staff-button-dark" onClick={openModal}>Add New Body</button>}
            />
            {items.length === 0 ? (
                <div className="staff-empty-card">
                    <p>No memberships found.</p>
                </div>
            ) : (
                <div className="staff-membership-grid">
                    {items.map((item) => (
                        <article className="staff-membership-card" key={item.membership_id}>
                            <div className="staff-membership-top">
                                <div className="staff-membership-logo" aria-hidden="true">
                                    <StaffCrudIcon name="award" />
                                </div>
                                <button
                                    type="button"
                                    className="staff-round-icon is-danger"
                                    onClick={async () => {
                                        await confirm({
                                            title: 'Confirm Deletion',
                                            message: 'Request removal of this membership?',
                                            confirmText: 'Remove',
                                            danger: true,
                                            action: () => runPending(`delete-membership-${item.membership_id}`, () => onDelete(item.membership_id))
                                        });
                                    }}
                                    disabled={isPending(`delete-membership-${item.membership_id}`)}
                                >
                                    {isPending(`delete-membership-${item.membership_id}`) ? '...' : '×'}
                                </button>
                            </div>
                            <h3>{item.body_name}</h3>
                            <span className="staff-membership-role">{item.role || 'Member'}</span>
                            <div className="staff-membership-footer">
                                <div>
                                    <small>ID Number</small>
                                    <strong>{item.membership_no}</strong>
                                </div>
                                <span className="staff-status-pill is-success">Verified</span>
                            </div>
                        </article>
                    ))}
                </div>
            )}
            <StaffModal
                open={showModal}
                title="Link Affiliation"
                onClose={closeModal}
                actions={(
                    <>
                        <button type="button" className="staff-button staff-button-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="staff-membership-form" className="staff-button staff-button-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Record'}
                        </button>
                    </>
                )}
            >
                <form id="staff-membership-form" className="staff-modal-form" onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await runPending('create-membership', async () => {
                        const formData = uploadData(form);
                        if (file) {
                            formData.append('evidence_file', file);
                        }

                        return onCreate(formData);
                    });

                    if (result?.ok) {
                        closeModal();
                    }
                }}>
                    <Field label="Organization Name"><input className="input" value={form.body_name} onChange={(event) => setForm((current) => ({ ...current, body_name: event.target.value }))} placeholder="e.g. ACM, IEEE" required /></Field>
                    <Field label="Membership No."><input className="input" value={form.membership_no} onChange={(event) => setForm((current) => ({ ...current, membership_no: event.target.value }))} placeholder="Registration ID" required /></Field>
                    <Field label="Membership Grade"><input className="input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} placeholder="e.g. Full Member, Fellow" /></Field>
                    <Field label="Upload Evidence (Image/PDF)"><input className="input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></Field>
                </form>
            </StaffModal>
        </>
    );
}

function ExternalProfilesSection({ items, onCreate, onDelete }) {
    const [form, setForm] = useState(externalProfileFormDefaults);
    const [showModal, setShowModal] = useState(false);
    const { isPending, runPending } = usePendingAction();
    const confirm = useConfirm();
    const isSubmitting = isPending('create-external-profile');

    function openModal() {
        setForm(externalProfileFormDefaults());
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setForm(externalProfileFormDefaults());
    }

    return (
        <>
            <StaffPageHeader
                title="Research Profiles"
                copy="Manage your external academic links."
                action={<button type="button" className="staff-button staff-button-primary" onClick={openModal}>Add New Link</button>}
            />
            {items.length === 0 ? (
                <div className="staff-empty-card">
                    <p>No profiles linked yet. Connect ORCID or Google Scholar to boost your visibility.</p>
                </div>
            ) : (
                <div className="staff-platform-grid">
                    {items.map((item) => {
                        const tone = platformTone(item.platform);
                        const iconName = tone === 'google' ? 'google' : tone === 'orcid' ? 'orcid' : tone === 'researchgate' ? 'researchgate' : tone === 'scopus' ? 'scopus' : 'scopus';

                        return (
                        <article className={`staff-platform-card is-${tone}`} key={item.profile_id}>
                            <div className="staff-platform-head">
                                <div className={`staff-platform-icon is-${tone}`} aria-hidden="true">
                                    <StaffCrudIcon name={iconName} />
                                </div>
                                <button
                                    type="button"
                                    className="staff-round-icon is-danger"
                                    onClick={async () => {
                                        await confirm({
                                            title: 'Confirm Deletion',
                                            message: 'Remove this profile?',
                                            confirmText: 'Remove',
                                            danger: true,
                                            action: () => runPending(`delete-external-profile-${item.profile_id}`, () => onDelete(item.profile_id))
                                        });
                                    }}
                                    disabled={isPending(`delete-external-profile-${item.profile_id}`)}
                                >
                                    {isPending(`delete-external-profile-${item.profile_id}`) ? '...' : '×'}
                                </button>
                            </div>
                            <h3>{item.platform}</h3>
                            <p>{item.profile_url}</p>
                            <a className="staff-platform-link" href={item.profile_url} target="_blank" rel="noreferrer">View Profile</a>
                        </article>
                    );
                    })}
                </div>
            )}
            <StaffModal
                open={showModal}
                title="Link Platform"
                onClose={closeModal}
                actions={(
                    <>
                        <button type="button" className="staff-button staff-button-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="staff-external-form" className="staff-button staff-button-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Link'}
                        </button>
                    </>
                )}
            >
                <form id="staff-external-form" className="staff-modal-form" onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await runPending('create-external-profile', () => onCreate(form));
                    if (result?.ok) {
                        closeModal();
                    }
                }}>
                    <Field label="Platform">
                        <select className="select" value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} required>
                            <option value="">Select...</option>
                            <option>ORCID</option>
                            <option>Google Scholar</option>
                            <option>Scopus</option>
                            <option>ResearchGate</option>
                        </select>
                    </Field>
                    <Field label="Profile URL"><input className="input" type="url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." required /></Field>
                    <div className="staff-help-box">Ensure the link is public and starts with <strong>https://</strong></div>
                </form>
            </StaffModal>
        </>
    );
}

export {
    CoursesSection,
    GrantsSection,
    SupervisionSection,
    MembershipSection,
    ExternalProfilesSection,
};
