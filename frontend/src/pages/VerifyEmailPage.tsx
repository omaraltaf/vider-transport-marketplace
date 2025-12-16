/**
 * Email Verification Page
 * Handles email verification via token
 */

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import Layout from '../components/Layout';
import { Button, Card, Container, Stack, Icon, Spinner } from '../design-system/components';
import { X, Check } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
  });

  useEffect(() => {
    if (token && !verificationAttempted) {
      setVerificationAttempted(true);
      verifyMutation.mutate(token);
    }
  }, [token, verificationAttempted]);

  if (!token) {
    return (
      <Layout showNavbar={false}>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
          <Container>
            <div className="max-w-md mx-auto">
              <Card padding="lg">
                <Stack direction="vertical" spacing={6} align="center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full ds-bg-error-100">
                    <Icon icon={X} size="lg" color="#DC2626" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold ds-text-gray-900">
                      Invalid Verification Link
                    </h2>
                    <p className="text-sm ds-text-gray-600">
                      The verification link is invalid or missing. Please check your email and try again.
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
          </Container>
        </div>
      </Layout>
    );
  }

  if (verifyMutation.isPending) {
    return (
      <Layout showNavbar={false}>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
          <Container>
            <div className="max-w-md mx-auto">
              <Card padding="lg">
                <Stack direction="vertical" spacing={6} align="center">
                  <Spinner size="lg" />
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold ds-text-gray-900">
                      Verifying Your Email
                    </h2>
                    <p className="text-sm ds-text-gray-600">
                      Please wait while we verify your email address...
                    </p>
                  </div>
                </Stack>
              </Card>
            </div>
          </Container>
        </div>
      </Layout>
    );
  }

  if (verifyMutation.isError) {
    return (
      <Layout showNavbar={false}>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
          <Container>
            <div className="max-w-md mx-auto">
              <Card padding="lg">
                <Stack direction="vertical" spacing={6} align="center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full ds-bg-error-100">
                    <Icon icon={X} size="lg" color="#DC2626" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold ds-text-gray-900">
                      Verification Failed
                    </h2>
                    <p className="text-sm ds-text-gray-600">
                      {verifyMutation.error instanceof Error
                        ? verifyMutation.error.message
                        : 'Unable to verify your email. The link may be invalid or expired.'}
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
          </Container>
        </div>
      </Layout>
    );
  }

  if (verifyMutation.isSuccess) {
    return (
      <Layout showNavbar={false}>
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
          <Container>
            <div className="max-w-md mx-auto">
              <Card padding="lg">
                <Stack direction="vertical" spacing={6} align="center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full ds-bg-success-100">
                    <Icon icon={Check} size="lg" color="#059669" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold ds-text-gray-900">
                      Email Verified!
                    </h2>
                    <p className="text-sm ds-text-gray-600">
                      Your email has been successfully verified. You can now log in to your account.
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
          </Container>
        </div>
      </Layout>
    );
  }

  return null;
}
