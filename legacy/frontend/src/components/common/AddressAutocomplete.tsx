import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';

interface AddressAutocompleteProps {
    onAddressSelect: (address: {
        address: string;
        city: string;
        fylke: string;
        kommune: string;
        lat: number;
        lng: number;
        postalCode: string;
    }) => void;
    defaultValue?: string;
    placeholder?: string;
    label?: string;
}

export const AddressAutocomplete = ({
    onAddressSelect,
    defaultValue = '',
    placeholder = 'Search for address...',
    label = 'Address'
}: AddressAutocompleteProps) => {
    const { google, error } = useGoogleMaps();
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(defaultValue);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        if (!google || !inputRef.current) return;

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'no' }, // Restrict to Norway
            fields: ['address_components', 'geometry', 'formatted_address'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (!place || !place.geometry || !place.geometry.location) return;

            const components = place.address_components || [];
            const addressData = {
                address: place.formatted_address || '',
                city: '',
                fylke: '',
                kommune: '',
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                postalCode: '',
            };

            components.forEach((component) => {
                if (component.types.includes('locality')) addressData.city = component.long_name;
                if (component.types.includes('administrative_area_level_1')) addressData.fylke = component.long_name;
                if (component.types.includes('administrative_area_level_2')) addressData.kommune = component.long_name;
                if (component.types.includes('postal_code')) addressData.postalCode = component.long_name;
            });

            setInputValue(place.formatted_address || '');
            onAddressSelect(addressData);
        });

        return () => {
            if (google.maps.event) {
                google.maps.event.clearInstanceListeners(autocompleteRef.current!);
            }
        };
    }, [google, onAddressSelect]);

    if (error) {
        return <div className="text-red-500 text-sm">Error loading Google Maps</div>;
    }

    return (
        <div className="w-full">
            <label className="block text-sm font-medium ds-text-gray-700 mb-1">{label}</label>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="block w-full rounded-md ds-border-gray-300 shadow-sm ds-focus-border-primary ds-focus-ring-primary sm:text-sm p-2 border"
            />
        </div>
    );
};
