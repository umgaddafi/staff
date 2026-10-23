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

export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

