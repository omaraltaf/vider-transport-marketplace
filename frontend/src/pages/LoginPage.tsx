/**
 * Login Page
 * User authentication page
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authService, type LoginData } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/EnhancedAuthContext';
import Layout from '../components/Layout';
import { Button, Card, FormField, Icon } from '../design-system/components';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import PasswordChangeModal from '../components/auth/PasswordChangeModal';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, requiresPasswordChange, clearPasswordChangeRequirement } = useAuth();
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Redirect already authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('LoginPage - User already authenticated, redirecting...');
      console.log('LoginPage - User role:', user.role);
      
      if (user.role === 'PLATFORM_ADMIN') {
        console.log('LoginPage - Redirecting to /platform-admin');
        navigate('/platform-admin', { replace: true });
      } else if (user.role === 'COMPANY_ADMIN') {
        console.log('LoginPage - Redirecting to /dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('LoginPage - Redirecting to /');
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const email = watch('email', '');
  const password = watch('password', '');

  const loginMutation = useMutation({
    mutationFn: (data: LoginData) => authService.login(data),
    onSuccess: (response) => {
      login(response.accessToken, response.refreshToken, response.user, response.requiresPasswordChange);
      
      if (response.requiresPasswordChange) {
        // Show password change modal instead of navigating
        setUserEmail(response.user.email);
        setShowPasswordChangeModal(true);
      } else {
        // Navigate to root and let RootRoute handle the redirect based on role
        navigate('/');
      }
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <Layout showNavbar={false}>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card padding="lg">
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold ds-text-gray-900">
                  Sign in to Vider
                </h1>
                <p className="mt-2 text-sm ds-text-gray-600">
                  Access your company account
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-label="Login form">
                <FormField
                  type="email"
                  label="Email Address"
                  value={email}
                  onChange={(value) => {
                    register('email').onChange({ target: { value, name: 'email' } });
                  }}
                  error={errors.email?.message}
                  required
                  autoComplete="email"
                  leftIcon={<Icon icon={Mail} size="sm" />}
                  placeholder="your.email@company.com"
                />

                <FormField
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(value) => {
                    register('password').onChange({ target: { value, name: 'password' } });
                  }}
                  error={errors.password?.message}
                  required
                  autoComplete="current-password"
                  leftIcon={<Icon icon={Lock} size="sm" />}
                  placeholder="Enter your password"
                />

                {loginMutation.isError && (
                  <div 
                    className="rounded-md ds-bg-error-light p-4 border ds-border-error" 
                    role="alert" 
                    aria-live="assertive"
                  >
                    <div className="flex items-start">
                      <Icon icon={AlertCircle} size="md" color="#DC2626" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium ds-text-error">
                          Login failed
                        </h3>
                        <div className="mt-1 text-sm ds-text-error">
                          {loginMutation.error instanceof Error
                            ? loginMutation.error.message
                            : 'Invalid email or password'}
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
                  loading={loginMutation.isPending}
                >
                  Sign in
                </Button>

                <div className="text-center">
                  <p className="text-sm ds-text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                      Create one
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordChangeModal}
        onClose={() => {
          // Don't allow closing without changing password
        }}
        onSuccess={() => {
          clearPasswordChangeRequirement();
          setShowPasswordChangeModal(false);
          // Navigate after successful password change
          navigate('/');
        }}
        userEmail={userEmail}
      />
    </Layout>
  );
}
