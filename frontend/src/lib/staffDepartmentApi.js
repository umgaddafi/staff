const STAFF_DEPARTMENTS_API_URL = 'https://jostumservices.com/backend/public/api/v1/staff/departments';

export async function fetchStaffDepartmentOptions(signal) {
    const response = await fetch(STAFF_DEPARTMENTS_API_URL, {
        headers: {
            Accept: 'application/json',
        },
        signal,
    });

    if (!response.ok) {
        throw new Error(`Unable to load departments right now (status ${response.status}).`);
    }

    const payload = await response.json();
    const source = Array.isArray(payload?.departments) ? payload.departments : [];
    const departments = [...new Set(
        source
            .map((item) => String(item || '').trim())
            .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right));

    if (!departments.length) {
        throw new Error('No departments were returned by the department service.');
    }

    return departments;
}

export { STAFF_DEPARTMENTS_API_URL };
