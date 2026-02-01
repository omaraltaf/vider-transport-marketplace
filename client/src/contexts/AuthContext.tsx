import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';
import { config } from '../config/config';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    token: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    token: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                try {
                    const idToken = await user.getIdToken();
                    setToken(idToken);

                    // Fetch profile from backend to get the source-of-truth role
                    const response = await axios.get(`${config.api.baseUrl}/auth/me`, {
                        headers: { Authorization: `Bearer ${idToken}` }
                    });

                    const dbUser = response.data;
                    setIsAdmin(dbUser.role === 'PLATFORM_ADMIN');
                } catch (err) {
                    console.error('Failed to fetch user profile:', err);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
                setToken(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, token }}>
            {children}
        </AuthContext.Provider>
    );
};
