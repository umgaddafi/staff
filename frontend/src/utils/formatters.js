export function initials(name = 'U') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((chunk) => chunk[0]?.toUpperCase() ?? '')
        .join('');
}

export function formatDateTime(value) {
    if (!value) {
        return 'N/A';
    }

    return new Date(value).toLocaleString();
}

export function formatMoney(value) {
    const numeric = Number(value || 0);
    return `₦ ${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function getErrorMessage(error) {
    return error?.payload?.message || error?.message || 'Something went wrong. Please try again.';
}
