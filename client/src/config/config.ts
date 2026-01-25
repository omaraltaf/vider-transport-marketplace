/**
 * Vider 2.0 Client Configuration
 * 
 * Centralized configuration for the frontend application.
 * In production, VITE_API_BASE_URL should be set to the Cloud Run backend URL.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD
        ? 'https://vider-backend-vxjlv6ntsa-lz.a.run.app/api'
        : 'http://localhost:3000/api');

export const config = {
    api: {
        baseUrl: API_BASE_URL,
        auth: {
            register: `${API_BASE_URL}/auth/register`,
            login: `${API_BASE_URL}/auth/login`,
            me: `${API_BASE_URL}/auth/me`,
        },
        vehicles: {
            base: `${API_BASE_URL}/vehicles`,
            myFleet: `${API_BASE_URL}/vehicles/my-fleet`,
        },
        shipments: {
            base: `${API_BASE_URL}/shipments`,
        },
        bookings: {
            base: `${API_BASE_URL}/bookings`,
            myBookings: `${API_BASE_URL}/bookings/my-bookings`,
        },
        platformAdmin: {
            users: `${API_BASE_URL}/platform-admin/users`,
            stats: `${API_BASE_URL}/platform-admin/users/stats`,
            bulkStatus: `${API_BASE_URL}/platform-admin/users/bulk-status`,
        },
    },
    version: '2.0.0-alpha',
};

export default config;
