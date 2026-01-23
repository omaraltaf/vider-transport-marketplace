import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useNavigate, Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to login. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">Welcome Back</h1>
                        <p className="text-slate-400">Sign in to your Vider account</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {error && (
                            <p className="text-sm text-red-400 text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                                {error}
                            </p>
                        )}

                        <Button type="submit" className="w-full" isLoading={loading}>
                            Sign In
                        </Button>
                    </form>

                    <div className="text-center pt-4">
                        <p className="text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary hover:text-primary-light transition-colors font-medium">
                                Create one now
                            </Link>
                        </p>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};
