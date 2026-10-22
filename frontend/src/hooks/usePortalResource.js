import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getErrorMessage } from '../utils/formatters';

export function usePortalResource(endpoint) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function load(showLoading = false) {
        if (showLoading || data === null) {
            setLoading(true);
        }
        setError('');

        try {
            const result = await api(endpoint);
            setData(result);
            return { ok: true, result };
        } catch (loadError) {
            if (showLoading || data === null) {
                setData(null);
            }
            setError(getErrorMessage(loadError));
            return { ok: false, error: loadError };
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load(true);
    }, [endpoint]);

    return { data, setData, loading, error, load };
}
