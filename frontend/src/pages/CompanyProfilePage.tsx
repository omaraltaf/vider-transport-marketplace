/**
 * Company Profile Page
 * Displays public company profile with verification badge and rating
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companyService';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import Layout from '../components/Layout';
import { ReviewsList } from '../components/ReviewsList';
import type { Rating } from '../types';
import { CheckBadgeIcon, StarIcon, MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/solid';
import { Container } from '../design-system/components/Container/Container';
import { Card } from '../design-system/components/Card/Card';
import { Stack } from '../design-system/components/Stack/Stack';
import { Button } from '../design-system/components/Button/Button';
import { colors } from '../design-system/tokens';

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyService.getProfile(id!),
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery<Rating[]>({
    queryKey: ['ratings', 'company', id],
    queryFn: async () => {
      return apiClient.get<Rating[]>(`/ratings/company/${id}`, token || '');
    },
    enabled: !!id,
  });

  const respondToReviewMutation = useMutation({
    mutationFn: async ({ ratingId, response }: { ratingId: string; response: string }) => {
      return apiClient.post(`/ratings/${ratingId}/response`, { response }, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'company', id] });
    },
  });

  const canEdit = user?.companyId === id && (user?.role === 'COMPANY_ADMIN' || user?.role === 'PLATFORM_ADMIN');
  const canRespond = user?.companyId === id;

  if (isLoading) {
    return (
      <Layout>
        <Container>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div style={{ 
              animation: 'spin 1s linear infinite',
              borderRadius: '50%',
              height: '3rem',
              width: '3rem',
              borderBottom: `2px solid ${colors.primary[600]}`
            }}></div>
          </div>
        </Container>
      </Layout>
    );
  }

  if (error || !company) {
    return (
      <Layout>
        <Container>
          <div style={{ paddingTop: '3rem', paddingBottom: '3rem', textAlign: 'center' }}>
            <Stack spacing={6} align="center">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: colors.gray[900] }}>
                Company Not Found
              </h2>
              <p style={{ color: colors.gray[600] }}>
                The company profile you're looking for doesn't exist.
              </p>
              <Button variant="primary" onClick={() => navigate('/')}>
                Return to Home
              </Button>
            </Stack>
          </div>
        </Container>
      </Layout>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-5 w-5 ${
              star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <Container>
        <Stack spacing={6}>
          {/* Header Section */}
          <Card padding="lg">
            <Stack spacing={4}>
              <Stack direction="horizontal" justify="between" align="start">
                <div style={{ flex: 1 }}>
                  <Stack spacing={2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: colors.gray[900] }}>
                        {company.name}
                      </h1>
                      {company.verified && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: colors.primary[600] }} title="Verified Company">
                          <CheckBadgeIcon style={{ height: '2rem', width: '2rem' }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Verified</span>
                        </div>
                      )}
                    </div>
                    <p style={{ color: colors.gray[600] }}>Org. nr.: {company.organizationNumber}</p>
                  </Stack>
                </div>
                {canEdit && (
                  <Button variant="primary" onClick={() => navigate(`/companies/${id}/edit`)}>
                    Edit Profile
                  </Button>
                )}
              </Stack>

              {/* Rating Section */}
              {company.aggregatedRating !== null && company.aggregatedRating !== undefined && (
                <div style={{ paddingTop: '1rem', borderTop: `1px solid ${colors.gray[200]}` }}>
                  <Stack direction="horizontal" align="center" spacing={3}>
                    {renderStars(company.aggregatedRating)}
                    <span style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.gray[900] }}>
                      {company.aggregatedRating.toFixed(1)}
                    </span>
                    <span style={{ color: colors.gray[600] }}>
                      ({company.totalRatings} {company.totalRatings === 1 ? 'rating' : 'ratings'})
                    </span>
                  </Stack>
                </div>
              )}
            </Stack>
          </Card>

          {/* Company Information */}
          <Card padding="lg">
            <Stack spacing={4}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.gray[900] }}>
                Company Information
              </h2>
              
              <Stack spacing={4}>
                {/* Location */}
                <Stack direction="horizontal" align="start" spacing={3}>
                  <MapPinIcon style={{ height: '1.25rem', width: '1.25rem', color: colors.gray[400], marginTop: '0.125rem' }} />
                  <Stack spacing={1}>
                    <p style={{ fontWeight: '500', color: colors.gray[900] }}>Location</p>
                    <p style={{ color: colors.gray[600] }}>{company.businessAddress}</p>
                    <p style={{ color: colors.gray[600] }}>
                      {company.postalCode} {company.city}
                    </p>
                    <p style={{ color: colors.gray[600] }}>
                      {company.kommune}, {company.fylke}
                    </p>
                  </Stack>
                </Stack>

                {/* VAT Status */}
                <Stack direction="horizontal" align="start" spacing={3}>
                  <BuildingOfficeIcon style={{ height: '1.25rem', width: '1.25rem', color: colors.gray[400], marginTop: '0.125rem' }} />
                  <Stack spacing={1}>
                    <p style={{ fontWeight: '500', color: colors.gray[900] }}>VAT Registration</p>
                    <p style={{ color: colors.gray[600] }}>
                      {company.vatRegistered ? 'VAT Registered' : 'Not VAT Registered'}
                    </p>
                  </Stack>
                </Stack>

                {/* Description */}
                {company.description && (
                  <div style={{ paddingTop: '1rem', borderTop: `1px solid ${colors.gray[200]}` }}>
                    <Stack spacing={2}>
                      <h3 style={{ fontWeight: '500', color: colors.gray[900] }}>About</h3>
                      <p style={{ color: colors.gray[600], whiteSpace: 'pre-wrap' }}>{company.description}</p>
                    </Stack>
                  </div>
                )}
              </Stack>
            </Stack>
          </Card>

          {/* Additional Info */}
          <Card padding="lg">
            <Stack spacing={4}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.gray[900] }}>
                Additional Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                <Stack spacing={1}>
                  <p style={{ color: colors.gray[600] }}>Member Since</p>
                  <p style={{ fontWeight: '500', color: colors.gray[900] }}>
                    {new Date(company.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </Stack>
                {company.verifiedAt && (
                  <Stack spacing={1}>
                    <p style={{ color: colors.gray[600] }}>Verified On</p>
                    <p style={{ fontWeight: '500', color: colors.gray[900] }}>
                      {new Date(company.verifiedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </Stack>
                )}
              </div>
            </Stack>
          </Card>

          {/* Reviews Section */}
          <Card padding="lg">
            <Stack spacing={4}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: colors.gray[900] }}>
                Reviews
              </h2>
              <ReviewsList
                reviews={reviews}
                canRespond={canRespond}
                onRespond={async (ratingId, response) => {
                  await respondToReviewMutation.mutateAsync({ ratingId, response });
                }}
              />
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Layout>
  );
}
