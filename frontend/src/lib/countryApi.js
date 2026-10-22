const COUNTRY_API_URL = 'https://restcountries.com/v3.1/all?fields=name';

export async function fetchCountryOptions(signal) {
    const response = await fetch(COUNTRY_API_URL, {
        headers: {
            Accept: 'application/json',
        },
        signal,
    });

    if (!response.ok) {
        throw new Error(`Unable to load countries right now (status ${response.status}).`);
    }

    const payload = await response.json();
    const countries = [...new Set(
        payload
            .map((item) => item?.name?.common?.trim())
            .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right));

    if (!countries.length) {
        throw new Error('No countries were returned by the country service.');
    }

    return countries;
}

export { COUNTRY_API_URL };
