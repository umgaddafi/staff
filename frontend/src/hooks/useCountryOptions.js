import { useEffect, useState } from 'react';
import { fetchCountryOptions } from '../lib/countryApi';

export function useCountryOptions() {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadCountries() {
            setLoading(true);
            setError('');

            try {
                const result = await fetchCountryOptions(controller.signal);
                setCountries(result);
            } catch (loadError) {
                if (loadError.name === 'AbortError') {
                    return;
                }

                setCountries([]);
                setError(loadError.message || 'Unable to load countries right now.');
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadCountries();

        return () => controller.abort();
    }, []);

    return { countries, loading, error };
}
