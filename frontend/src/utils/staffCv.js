import { formatMoney, initials } from './formatters';

function escapeHtml(value = '') {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function slugifyFilePart(value = 'staff-cv') {
    const normalized = String(value ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || 'staff-cv';
}

function renderCvEmpty(message = 'Not available.') {
    return `<p class="cv-empty">${escapeHtml(message)}</p>`;
}

function renderCvFactRows(items, emptyMessage = 'Not available.') {
    const rows = items.filter((item) => item?.value);

    if (!rows.length) {
        return renderCvEmpty(emptyMessage);
    }

    return rows.map((item) => `
        <div class="cv-fact-row">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
        </div>
    `).join('');
}

function renderCvTagList(items, emptyMessage = 'Not available.') {
    if (!items.length) {
        return renderCvEmpty(emptyMessage);
    }

    return `
        <div class="cv-tag-list">
            ${items.map((item) => `<span class="cv-tag">${escapeHtml(item)}</span>`).join('')}
        </div>
    `;
}

function renderCvEntryList(entries, emptyMessage = 'Not available.') {
    const rows = entries.filter((entry) => entry && (entry.title || entry.meta || entry.copy || entry.href));

    if (!rows.length) {
        return renderCvEmpty(emptyMessage);
    }

    return rows.map((entry) => `
        <article class="cv-entry">
            ${entry.title ? `<h3>${escapeHtml(entry.title)}</h3>` : ''}
            ${entry.meta ? `<p class="cv-entry-meta">${escapeHtml(entry.meta)}</p>` : ''}
            ${entry.copy ? `<p class="cv-entry-copy">${escapeHtml(entry.copy)}</p>` : ''}
            ${entry.href ? `<p class="cv-entry-link"><a href="${escapeHtml(entry.href)}">${escapeHtml(entry.linkLabel || entry.href)}</a></p>` : ''}
        </article>
    `).join('');
}

function downloadStaffCv(profile, user) {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
        return;
    }

    const staff = profile?.staff || {};
    const fullName = staff.full_name || [staff.title, staff.first_name, staff.last_name].filter(Boolean).join(' ') || user?.name || 'Staff';
    const heading = escapeHtml(fullName);
    const monogram = escapeHtml(initials(fullName));
    const roleLine = [
        staff.rank_name || 'Academic Staff',
        staff.department_name,
        staff.college_name,
    ].filter(Boolean).join(' · ') || 'Academic Staff';
    const contactChips = [
        staff.email ? `Official Email: ${staff.email}` : '',
        staff.phone ? `Phone: ${staff.phone}` : '',
        staff.office_location ? `Office: ${staff.office_location}` : '',
    ].filter(Boolean);
    const profileFacts = [
        { label: 'Academic Rank', value: staff.rank_name || 'Academic Staff' },
        { label: 'Department', value: staff.department_name || 'Not set' },
        { label: 'College / Faculty', value: staff.college_name || 'Not set' },
        { label: 'Staff Number', value: staff.staff_number || user?.staffNumber || 'Not assigned' },
        { label: 'Office Location', value: staff.office_location || 'Not specified' },
    ];
    const contactFacts = [
        { label: 'Official Email', value: staff.email || 'Not available' },
        { label: 'Phone', value: staff.phone || 'Not available' },
    ];
    const qualifications = (profile?.qualifications || []).map((item) => ({
        title: [item.degree, item.field_of_study ? `in ${item.field_of_study}` : ''].filter(Boolean).join(' '),
        meta: [item.institution, item.country].filter(Boolean).join(' • '),
        copy: item.year_awarded ? `Awarded ${item.year_awarded}` : '',
    }));
    const researchAreas = (profile?.researchAreas || []).map((item) => item.name).filter(Boolean);
    const publications = (profile?.publications || []).map((item) => ({
        title: item.title || 'Untitled Publication',
        meta: [item.publication_type || 'Publication', item.journal_or_venue, item.publisher, item.year_published].filter(Boolean).join(' • '),
        href: item.doi ? `https://doi.org/${item.doi}` : (item.url || ''),
        linkLabel: item.doi ? `DOI: ${item.doi}` : (item.url ? 'View publication' : ''),
    }));
    const courses = (profile?.courses || []).map((item) => ({
        title: [item.course_code, item.course_title].filter(Boolean).join(' - '),
        meta: [
            item.level ? `${item.level} Level` : '',
            item.session,
        ].filter(Boolean).join(' • '),
    }));
    const grants = (profile?.grants || []).map((item) => ({
        title: item.title || 'Research Grant',
        meta: [
            item.sponsor,
            [item.start_year, item.end_year].filter(Boolean).join(' - '),
            item.amount ? formatMoney(item.amount) : '',
        ].filter(Boolean).join(' • '),
    }));
    const memberships = (profile?.memberships || []).map((item) => ({
        title: item.body_name || 'Professional Membership',
        meta: [item.role, item.membership_no].filter(Boolean).join(' • '),
    }));
    const externalProfiles = (profile?.externalProfiles || []).map((item) => ({
        title: item.platform || 'External Profile',
        href: item.profile_url || '',
        linkLabel: item.profile_url || '',
    }));
    const generatedDate = new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date());
    const summary = staff.biography || 'Academic profile information has not yet been provided on the staff portal.';
    const summaryHtml = escapeHtml(summary).replaceAll('\n', '<br />');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>${heading} CV</title>
    <style>
        body { margin: 0; padding: 28px; font-family: "Segoe UI", Arial, sans-serif; color: #182433; background: #edf2f7; line-height: 1.6; }
        .cv-page { max-width: 980px; margin: 0 auto; background: #ffffff; border: 1px solid #d8e2ec; }
        .cv-header { padding: 30px 34px 24px; background: #102b46; color: #ffffff; }
        .cv-kicker { margin: 0 0 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: #d8e6f3; }
        .cv-identity { width: 100%; border-collapse: collapse; }
        .cv-identity td { vertical-align: top; }
        .cv-monogram-cell { width: 86px; }
        .cv-monogram { width: 68px; height: 68px; line-height: 68px; text-align: center; font-size: 26px; font-weight: 800; color: #102b46; background: #f2d29a; border-radius: 18px; }
        .cv-title-cell h1 { margin: 0; font-family: Cambria, Georgia, serif; font-size: 34px; line-height: 1.04; color: #ffffff; }
        .cv-role { margin: 8px 0 0; font-size: 15px; color: #d9e6f3; }
        .cv-document-cell { width: 170px; text-align: right; }
        .cv-document-badge { display: inline-block; padding: 8px 14px; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 999px; background: #1b4366; color: #f7fbff; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
        .cv-contact-strip { margin-top: 18px; }
        .cv-contact-chip { display: inline-block; margin: 0 10px 8px 0; padding: 7px 11px; border-radius: 999px; background: #183b5b; color: #edf4fb; font-size: 12px; }
        .cv-body { padding: 28px 32px 32px; }
        .cv-layout { width: 100%; border-collapse: collapse; }
        .cv-sidebar { width: 31%; vertical-align: top; padding-right: 20px; }
        .cv-main { width: 69%; vertical-align: top; }
        .cv-card { margin-bottom: 18px; padding: 16px 18px; border: 1px solid #e2eaf2; border-radius: 16px; background: #f8fafc; }
        .cv-card-accent { background: #fdf8ef; border-color: #edd8a7; }
        .cv-section-title { margin: 0 0 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #5d7286; }
        .cv-summary { margin: 0; font-size: 14px; line-height: 1.72; color: #334559; }
        .cv-fact-row { padding: 0 0 12px; margin: 0 0 12px; border-bottom: 1px solid #e5edf4; }
        .cv-fact-row:last-child { padding-bottom: 0; margin-bottom: 0; border-bottom: 0; }
        .cv-fact-row span { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #8292a2; }
        .cv-fact-row strong { display: block; margin-top: 4px; font-size: 14px; color: #14273c; }
        .cv-entry { padding: 0 0 12px; margin: 0 0 12px; border-bottom: 1px solid #e5edf4; }
        .cv-entry:last-child { padding-bottom: 0; margin-bottom: 0; border-bottom: 0; }
        .cv-entry h3 { margin: 0; font-family: Cambria, Georgia, serif; font-size: 16px; line-height: 1.35; color: #12263d; }
        .cv-entry-meta { margin: 5px 0 0; font-size: 12px; color: #6f8092; }
        .cv-entry-copy { margin: 6px 0 0; font-size: 13px; color: #43576b; }
        .cv-entry-link { margin: 7px 0 0; font-size: 12px; }
        .cv-entry-link a { color: #1d5b88; text-decoration: none; font-weight: 700; }
        .cv-empty { margin: 0; color: #7f8a97; font-style: italic; font-size: 13px; }
        .cv-tag-list { margin: 0 -8px -8px 0; }
        .cv-tag { display: inline-block; margin: 0 8px 8px 0; padding: 6px 10px; border-radius: 999px; background: #e7eef5; color: #274560; font-size: 12px; font-weight: 700; }
        .cv-footer { margin-top: 8px; padding-top: 12px; border-top: 1px solid #e5edf4; font-size: 11px; color: #7d8895; text-align: right; }
        @media print {
            body { padding: 0; background: #ffffff; }
            .cv-page { border: 0; }
        }
    </style>
</head>
<body>
    <div class="cv-page">
        <div class="cv-header">
            <p class="cv-kicker">JOSTUM Academic Portfolio</p>
            <table class="cv-identity" role="presentation">
                <tr>
                    <td class="cv-monogram-cell">
                        <div class="cv-monogram">${monogram}</div>
                    </td>
                    <td class="cv-title-cell">
                        <h1>${heading}</h1>
                        <p class="cv-role">${escapeHtml(roleLine)}</p>
                    </td>
                    <td class="cv-document-cell">
                        <div class="cv-document-badge">Curriculum Vitae</div>
                    </td>
                </tr>
            </table>
            <div class="cv-contact-strip">
                ${(contactChips.length
                    ? contactChips.map((item) => `<span class="cv-contact-chip">${escapeHtml(item)}</span>`).join('')
                    : '<span class="cv-contact-chip">Contact details not available</span>')}
            </div>
        </div>
        <div class="cv-body">
            <table class="cv-layout" role="presentation">
                <tr>
                    <td class="cv-sidebar">
                        <section class="cv-card cv-card-accent">
                            <h2 class="cv-section-title">Profile Snapshot</h2>
                            ${renderCvFactRows(profileFacts, 'Profile details not available.')}
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">Contact Details</h2>
                            ${renderCvFactRows(contactFacts, 'Contact details not available.')}
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">Research Interests</h2>
                            ${renderCvTagList(researchAreas, 'Research interests not yet added.')}
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">External Profiles</h2>
                            ${renderCvEntryList(externalProfiles, 'No external profile links available.')}
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">Professional Memberships</h2>
                            ${renderCvEntryList(memberships, 'Professional memberships not available.')}
                        </section>
                    </td>
                    <td class="cv-main">
                        <section class="cv-card">
                            <h2 class="cv-section-title">Professional Summary</h2>
                            <p class="cv-summary">${summaryHtml}</p>
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">Academic Qualifications</h2>
                            ${renderCvEntryList(qualifications, 'Academic qualifications have not been added yet.')}
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">Selected Publications</h2>
                            ${renderCvEntryList(publications, 'Selected publications are not available yet.')}
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">Teaching Portfolio</h2>
                            ${renderCvEntryList(courses, 'Teaching portfolio entries are not available yet.')}
                        </section>
                        <section class="cv-card">
                            <h2 class="cv-section-title">Research Grants</h2>
                            ${renderCvEntryList(grants, 'Research grant records are not available yet.')}
                        </section>
                    </td>
                </tr>
            </table>
            <div class="cv-footer">Generated from the staff portfolio on ${escapeHtml(generatedDate)}.</div>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${slugifyFilePart(fullName)}-cv.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
}

export { downloadStaffCv };
