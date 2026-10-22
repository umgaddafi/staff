import { useEffect, useState } from 'react';
import { fetchStaffDepartmentOptions } from '../lib/staffDepartmentApi';

export function useStaffDepartmentOptions() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadDepartments() {
            setLoading(true);
            setError('');

            try {
                const result = await fetchStaffDepartmentOptions(controller.signal);
                setDepartments(result);
            } catch (loadError) {
                if (loadError.name === 'AbortError') {
                    return;
                }

                setDepartments([]);
                setError(loadError.message || 'Unable to load departments right now.');
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadDepartments();

        return () => controller.abort();
    }, []);

    return { departments, loading, error };
}
