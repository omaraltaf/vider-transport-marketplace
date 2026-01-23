import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { config } from '../config/config';

export const RegisterPage: React.FC = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        companyName: '',
        organizationNumber: '',
        businessAddress: '',
        city: '',
        postalCode: '',
        fylke: '',
        kommune: '',
        vatRegistered: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleNext = () => {
        if (step === 1 && (!formData.email || !formData.password || !formData.firstName || !formData.lastName)) {
            setError('Please fill in all required fields.');
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // In Vider 2.0, the backend handles both Firebase and DB creation in one go
            await axios.post(config.api.auth.register, formData);
            navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
        } catch (err: any) {

            console.error(err);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl"
            >
                <Card className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">Join Vider</h1>
                        <p className="text-slate-400">Step {step} of 2: {step === 1 ? 'Personal Details' : 'Company Information'}</p>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                            <motion.div
                                className="bg-primary h-full"
                                animate={{ width: step === 1 ? '50%' : '100%' }}
                            />
                        </div>
                    </div>

                    <form onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                                        <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                                    </div>
                                    <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
                                    <Input label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
                                    <Input label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <Input label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} required />
                                    <Input label="Organization Number (9 digits)" name="organizationNumber" value={formData.organizationNumber} onChange={handleChange} required />
                                    <Input label="Business Address" name="businessAddress" value={formData.businessAddress} onChange={handleChange} required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="City" name="city" value={formData.city} onChange={handleChange} required />
                                        <Input label="Postal Code" name="postalCode" value={formData.postalCode} onChange={handleChange} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Fylke (Region)" name="fylke" value={formData.fylke} onChange={handleChange} required />
                                        <Input label="Kommune" name="kommune" value={formData.kommune} onChange={handleChange} required />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && <p className="text-sm text-red-400 text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}

                        <div className="flex gap-4 pt-4">
                            {step === 2 && (
                                <Button variant="outline" type="button" onClick={() => setStep(1)} className="flex-1">
                                    Back
                                </Button>
                            )}
                            {step === 1 ? (
                                <Button type="button" onClick={handleNext} className="flex-1">
                                    Next Step
                                </Button>
                            ) : (
                                <Button type="submit" className="flex-1" isLoading={loading}>
                                    Create Account
                                </Button>
                            )}
                        </div>
                    </form>

                    <div className="text-center">
                        <p className="text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:text-primary-light transition-colors font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};
