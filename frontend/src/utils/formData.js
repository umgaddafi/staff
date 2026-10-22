export function uploadData(record) {
    const formData = new FormData();
    Object.entries(record).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }

        formData.append(key, value);
    });

    return formData;
}
