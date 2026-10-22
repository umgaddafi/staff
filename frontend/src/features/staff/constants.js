function historyEntityLabel(item) {
    const map = {
        staff: 'Personal Profile',
        qualification: 'Academic Degree',
        professional_membership: 'Professional Body',
        grant_project: 'Research Grant',
        supervision: 'Student Supervision',
        external_profile: 'Digital Link',
        research_area: 'Research Area',
        staff_course: 'Course Assignment',
        publication: 'Publication',
    };

    return item.entity_label || map[item.entity_name] || item.entity_name || 'Profile Update';
}

function publicationTone(type = '') {
    const normalized = String(type).toLowerCase();

    if (normalized.includes('conference')) {
        return 'conference';
    }

    if (normalized.includes('book')) {
        return 'book';
    }

    return 'journal';
}

function qualificationFormDefaults() {
    return {
        degree: '',
        field: '',
        institution: '',
        country: '',
        year: new Date().getFullYear(),
    };
}

const qualificationDegreeOptions = [
    'Certificate',
    'Diploma',
    'National Diploma (ND)',
    'Nigeria Certificate in Education (NCE)',
    'Higher National Diploma (HND)',
    'Postgraduate Diploma (PGD)',
    'Associate Degree',
    'Bachelor of Arts (BA)',
    'Bachelor of Science (BSc)',
    'Bachelor of Education (BEd)',
    'Bachelor of Engineering (BEng)',
    'Bachelor of Technology (BTech)',
    'Bachelor of Laws (LLB)',
    'Bachelor of Medicine, Bachelor of Surgery (MBBS)',
    'Bachelor of Pharmacy (BPharm)',
    'Master of Arts (MA)',
    'Master of Science (MSc)',
    'Master of Education (MEd)',
    'Master of Engineering (MEng)',
    'Master of Technology (MTech)',
    'Master of Business Administration (MBA)',
    'Master of Philosophy (MPhil)',
    'Master of Laws (LLM)',
    'Doctor of Philosophy (PhD)',
    'Doctor of Education (EdD)',
    'Doctor of Business Administration (DBA)',
    'Doctor of Medicine (MD)',
    'Doctor of Science (DSc)',
    'Doctor of Engineering (DEng)',
    'Fellowship',
];

function publicationFormDefaults() {
    return {
        title: '',
        type: 'Journal',
        venue: '',
        publisher: 'N/A',
        year: new Date().getFullYear(),
        doi: '',
        url: '',
    };
}

function courseLinkDefaults() {
    const year = new Date().getFullYear();
    return {
        course_id: '',
        session: `${year}/${year + 1}`,
    };
}

function grantFormDefaults() {
    const year = new Date().getFullYear();
    return {
        title: '',
        sponsor: '',
        amount: '',
        start: year,
        end: year + 1,
    };
}

function supervisionFormDefaults() {
    return {
        student: '',
        degree: 'MSc',
        title: '',
        status: 'Ongoing',
        start: new Date().getFullYear(),
        end: '',
    };
}

function membershipFormDefaults() {
    return {
        body_name: '',
        membership_no: '',
        role: '',
    };
}

function externalProfileFormDefaults() {
    return {
        platform: '',
        url: '',
    };
}

function academicSessionOptions(count = 5) {
    const year = new Date().getFullYear();
    return Array.from({ length: count }, (_, index) => `${year - index}/${year - index + 1}`);
}

function platformTone(platform = '') {
    const normalized = String(platform).toLowerCase();

    if (normalized.includes('google')) {
        return 'google';
    }

    if (normalized.includes('orcid')) {
        return 'orcid';
    }

    if (normalized.includes('researchgate')) {
        return 'researchgate';
    }

    if (normalized.includes('scopus')) {
        return 'scopus';
    }

    return 'generic';
}

export {
    historyEntityLabel,
    publicationTone,
    qualificationFormDefaults,
    qualificationDegreeOptions,
    publicationFormDefaults,
    courseLinkDefaults,
    grantFormDefaults,
    supervisionFormDefaults,
    membershipFormDefaults,
    externalProfileFormDefaults,
    academicSessionOptions,
    platformTone,
};
