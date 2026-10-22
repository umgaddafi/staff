import axios from 'axios';

const baseURL = import.meta.env.DEV
    ? ''
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost/university-portfolio/backend/public');

const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

function normalizeErrorMessage(error, payload) {
    if (payload.message) {
        return payload.message;
    }

    if (error.code === 'ERR_NETWORK') {
        return 'Unable to reach the backend service. Confirm the API server is running and reachable.';
    }

    if (error.response?.status) {
        return `Request failed with status ${error.response.status}.`;
    }

    return error.message || 'Request failed.';
}

export async function api(path, options = {}) {
    const { method = 'GET', data, formData } = options;

    try {
        const response = await client.request({
            url: path,
            method,
            data: formData instanceof FormData ? formData : data,
            headers: formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        });

        return response.data;
    } catch (error) {
        const payload = error.response?.data ?? {};
        const message = normalizeErrorMessage(error, payload);
        const wrapped = new Error(message);
        wrapped.status = error.response?.status;
        wrapped.payload = payload;
        throw wrapped;
    }
}

api.get = (path, options = {}) => api(path, { ...options, method: 'GET' });
api.post = (path, data, options = {}) => api(path, { ...options, method: 'POST', data });
api.put = (path, data, options = {}) => api(path, { ...options, method: 'PUT', data });
api.patch = (path, data, options = {}) => api(path, { ...options, method: 'PATCH', data });
api.delete = (path, options = {}) => api(path, { ...options, method: 'DELETE' });
