import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

let googleMapsLoader: Loader | null = null;

export const getGoogleMapsLoader = () => {
    if (!googleMapsLoader) {
        googleMapsLoader = new Loader({
            apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
            version: 'weekly',
            libraries: ['places'],
        });
    }
    return googleMapsLoader;
};

export const useGoogleMaps = () => {
    const [google, setGoogle] = useState<typeof window.google | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loader = getGoogleMapsLoader();
        loader.load()
            .then((googleInstance) => {
                setGoogle(googleInstance);
            })
            .catch((err) => {
                setError(err);
            });
    }, []);

    return { google, error };
};
