/**
 * Register Page
 * Company registration page
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authService, type RegisterData } from '../services/authService';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Card, FormField, Icon, Stack } from '../design-system/components';
import { Mail, Phone, Lock, User, Building, MapPin, Check, AlertCircle } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  companyName: z.string().min(1, 'Company name is required'),
  organizationNumber: z.string().regex(/^\d{9}$/, 'Organization number must be 9 digits'),
  businessAddress: z.string().min(1, 'Business address is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  fylke: z.string().min(1, 'Fylke is required'),
  kommune: z.string().min(1, 'Kommune is required'),
  vatRegistered: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      vatRegistered: false,
    },
  });

  // Watch all form fields
  const formValues = watch();

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (response, variables) => {
      setVerificationToken(response.verificationToken);
      setRegisteredEmail(variables.email);
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  if (verificationToken && registeredEmail) {
    return (
      <Layout showNavbar={false}>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <Card padding="lg">
              <Stack direction="vertical" spacing={6} align="center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full ds-bg-success-100">
                  <Icon icon={Check} size="xl" color="#059669" />
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold ds-text-gray-900">
                    Registration Successful!
                  </h2>
                  <p className="text-sm ds-text-gray-600">
                    We've sent a verification email to <strong>{registeredEmail}</strong>
                  </p>
                  <p className="text-sm ds-text-gray-600">
                    Please check your email and click the verification link to activate your account.
                  </p>
                </div>

                <Link to="/login" className="w-full">
                  <Button variant="primary" size="lg" fullWidth>
                    Go to Login
                  </Button>
                </Link>
              </Stack>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavbar={false}>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl w-full">
          <Card padding="lg">
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold ds-text-gray-900">
                  Create Company Account
                </h2>
                <p className="mt-2 text-sm ds-text-gray-600">
                  Join the Vider marketplace for Norwegian B2B transport
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* User Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium ds-text-gray-900 border-b pb-2">User Information</h3>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      type="text"
                      label="First Name"
                      value={formValues.firstName || ''}
                      onChange={(value) => setValue('firstName', value)}
                      error={errors.firstName?.message}
                      required
                      leftIcon={<Icon icon={User} size="sm" />}
                      placeholder="John"
                    />

                    <FormField
                      type="text"
                      label="Last Name"
                      value={formValues.lastName || ''}
                      onChange={(value) => setValue('lastName', value)}
                      error={errors.lastName?.message}
                      required
                      leftIcon={<Icon icon={User} size="sm" />}
                      placeholder="Doe"
                    />
                  </div>

                  <FormField
                    type="email"
                    label="Email Address"
                    value={formValues.email || ''}
                    onChange={(value) => setValue('email', value)}
                    error={errors.email?.message}
                    required
                    autoComplete="email"
                    leftIcon={<Icon icon={Mail} size="sm" />}
                    placeholder="john.doe@company.com"
                  />

                  <FormField
                    type="tel"
                    label="Phone Number"
                    value={formValues.phone || ''}
                    onChange={(value) => setValue('phone', value)}
                    error={errors.phone?.message}
                    required
                    leftIcon={<Icon icon={Phone} size="sm" />}
                    placeholder="+47 123 45 678"
                  />

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      type="password"
                      label="Password"
                      value={formValues.password || ''}
                      onChange={(value) => setValue('password', value)}
                      error={errors.password?.message}
                      required
                      autoComplete="new-password"
                      leftIcon={<Icon icon={Lock} size="sm" />}
                      placeholder="Min. 8 characters"
                      helperText="At least 8 characters"
                    />

                    <FormField
                      type="password"
                      label="Confirm Password"
                      value={formValues.confirmPassword || ''}
                      onChange={(value) => setValue('confirmPassword', value)}
                      error={errors.confirmPassword?.message}
                      required
                      autoComplete="new-password"
                      leftIcon={<Icon icon={Lock} size="sm" />}
                      placeholder="Repeat password"
                    />
                  </div>
                </div>

                {/* Company Information */}
                <div className="space-y-6 pt-6 border-t ds-border-gray-200">
                  <h3 className="text-lg font-medium ds-text-gray-900 border-b pb-2">Company Information</h3>
                  
                  <FormField
                    type="text"
                    label="Company Name"
                    value={formValues.companyName || ''}
                    onChange={(value) => setValue('companyName', value)}
                    error={errors.companyName?.message}
                    required
                    leftIcon={<Icon icon={Building} size="sm" />}
                    placeholder="Acme Transport AS"
                  />

                  <FormField
                    type="text"
                    label="Organization Number (Org. nr.)"
                    value={formValues.organizationNumber || ''}
                    onChange={(value) => setValue('organizationNumber', value)}
                    error={errors.organizationNumber?.message}
                    required
                    maxLength={9}
                    placeholder="123456789"
                    helperText="9 digits"
                  />

                  <FormField
                    type="text"
                    label="Business Address"
                    value={formValues.businessAddress || ''}
                    onChange={(value) => setValue('businessAddress', value)}
                    error={errors.businessAddress?.message}
                    required
                    leftIcon={<Icon icon={MapPin} size="sm" />}
                    placeholder="Storgata 1"
                  />

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      type="text"
                      label="City"
                      value={formValues.city || ''}
                      onChange={(value) => setValue('city', value)}
                      error={errors.city?.message}
                      required
                      placeholder="Oslo"
                    />

                    <FormField
                      type="text"
                      label="Postal Code"
                      value={formValues.postalCode || ''}
                      onChange={(value) => setValue('postalCode', value)}
                      error={errors.postalCode?.message}
                      required
                      placeholder="0123"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      type="text"
                      label="Fylke (County)"
                      value={formValues.fylke || ''}
                      onChange={(value) => setValue('fylke', value)}
                      error={errors.fylke?.message}
                      required
                      placeholder="Oslo"
                    />

                    <FormField
                      type="text"
                      label="Kommune (Municipality)"
                      value={formValues.kommune || ''}
                      onChange={(value) => setValue('kommune', value)}
                      error={errors.kommune?.message}
                      required
                      placeholder="Oslo"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('vatRegistered')}
                      type="checkbox"
                      id="vatRegistered"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 ds-border-gray-300 rounded"
                    />
                    <label htmlFor="vatRegistered" className="ml-2 block text-sm ds-text-gray-900">
                      VAT Registered
                    </label>
                  </div>
                </div>

                {registerMutation.isError && (
                  <div 
                    className="rounded-md ds-bg-error-light p-4 border ds-border-error" 
                    role="alert" 
                    aria-live="assertive"
                  >
                    <div className="flex items-start">
                      <Icon icon={AlertCircle} size="md" color="#DC2626" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium ds-text-error">
                          Registration failed
                        </h3>
                        <div className="mt-1 text-sm ds-text-error">
                          {registerMutation.error instanceof Error
                            ? registerMutation.error.message
                            : 'An error occurred during registration'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={registerMutation.isPending}
                >
                  Create Account
                </Button>

                <div className="text-center">
                  <p className="text-sm ds-text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
