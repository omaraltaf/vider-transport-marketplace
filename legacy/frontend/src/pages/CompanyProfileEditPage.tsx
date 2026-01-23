/**
 * Company Profile Edit Page
 * Form for company admins to update their company profile
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { companyService, type UpdateCompanyProfileData } from '../services/companyService';
import { useAuth } from '../contexts/EnhancedAuthContext';
import Layout from '../components/Layout';
import { useEffect } from 'react';
import { Button, Card, Container, Stack, Input, Textarea, Select, Spinner, Icon } from '../design-system/components';
import { AlertCircle, MapPin } from 'lucide-react';
import type { SelectOption } from '../design-system/components';

const FYLKER = [
  'Oslo',
  'Rogaland',
  'Møre og Romsdal',
  'Nordland',
  'Viken',
  'Innlandet',
  'Vestfold og Telemark',
  'Agder',
  'Vestland',
  'Trøndelag',
  'Troms og Finnmark',
];

export default function CompanyProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyService.getProfile(id!),
    enabled: !!id,
  });

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<UpdateCompanyProfileData>();

  const formValues = watch();

  // Populate form with existing data
  useEffect(() => {
    if (company) {
      reset({
        description: company.description || '',
        businessAddress: company.businessAddress,
        city: company.city,
        postalCode: company.postalCode,
        fylke: company.fylke,
        kommune: company.kommune,
      });
    }
  }, [company, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCompanyProfileData) =>
      companyService.updateProfile(id!, data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      navigate(`/companies/${id}`);
    },
  });

  // Check authorization
  const canEdit = user?.companyId === id && (user?.role === 'COMPANY_ADMIN' || user?.role === 'PLATFORM_ADMIN');

  if (!canEdit) {
    return (
      <Layout>
        <Container>
          <Card padding="lg">
            <Stack direction="vertical" spacing={6} align="center">
              <h2 className="text-2xl font-bold ds-text-gray-900">Access Denied</h2>
              <p className="ds-text-gray-600">You don't have permission to edit this company profile.</p>
              <Button variant="primary" onClick={() => navigate(`/companies/${id}`)}>
                View Profile
              </Button>
            </Stack>
          </Card>
        </Container>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <Container>
          <div className="flex justify-center items-center min-h-[400px]">
            <Spinner size="lg" />
          </div>
        </Container>
      </Layout>
    );
  }

  const onSubmit = (data: UpdateCompanyProfileData) => {
    updateMutation.mutate(data);
  };

  const fylkeOptions: SelectOption[] = FYLKER.map(fylke => ({
    value: fylke,
    label: fylke,
  }));

  return (
    <Layout>
      <Container>
        <div className="max-w-3xl mx-auto">
          <Stack direction="vertical" spacing={6}>
            <div>
              <h1 className="text-3xl font-bold ds-text-gray-900">Edit Company Profile</h1>
              <p className="ds-text-gray-600 mt-2">Update your company's public information</p>
            </div>

            <Card padding="lg">
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack direction="vertical" spacing={6}>
                  {/* Company Name (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Company Name
                    </label>
                    <Input
                      type="text"
                      value={company?.name || ''}
                      onChange={() => {}}
                      disabled
                    />
                    <p className="text-xs ds-text-gray-500 mt-1">Contact support to change company name</p>
                  </div>

                  {/* Organization Number (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Organization Number
                    </label>
                    <Input
                      type="text"
                      value={company?.organizationNumber || ''}
                      onChange={() => {}}
                      disabled
                    />
                    <p className="text-xs ds-text-gray-500 mt-1">Organization number cannot be changed</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Company Description
                    </label>
                    <Textarea
                      value={formValues.description || ''}
                      onChange={(value) => setValue('description', value)}
                      rows={4}
                      placeholder="Tell potential partners about your company..."
                    />
                  </div>

                  {/* Business Address */}
                  <div>
                    <label htmlFor="businessAddress" className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Business Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formValues.businessAddress || ''}
                      onChange={(value) => setValue('businessAddress', value)}
                      error={errors.businessAddress?.message}
                      leftIcon={<Icon icon={MapPin} size="sm" />}
                      placeholder="Storgata 1"
                    />
                  </div>

                  {/* City and Postal Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium ds-text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formValues.city || ''}
                        onChange={(value) => setValue('city', value)}
                        error={errors.city?.message}
                        placeholder="Oslo"
                      />
                    </div>

                    <div>
                      <label htmlFor="postalCode" className="block text-sm font-medium ds-text-gray-700 mb-2">
                        Postal Code <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formValues.postalCode || ''}
                        onChange={(value) => setValue('postalCode', value)}
                        error={errors.postalCode?.message}
                        placeholder="0123"
                      />
                    </div>
                  </div>

                  {/* Fylke */}
                  <div>
                    <label htmlFor="fylke" className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Fylke (County) <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formValues.fylke || ''}
                      onChange={(value) => setValue('fylke', value)}
                      options={fylkeOptions}
                      placeholder="Select a fylke"
                      error={errors.fylke?.message}
                    />
                  </div>

                  {/* Kommune */}
                  <div>
                    <label htmlFor="kommune" className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Kommune (Municipality) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formValues.kommune || ''}
                      onChange={(value) => setValue('kommune', value)}
                      error={errors.kommune?.message}
                      placeholder="Oslo"
                    />
                  </div>

                  {/* Error Message */}
                  {updateMutation.isError && (
                    <div 
                      className="rounded-md ds-bg-error-light p-4 border ds-border-error" 
                      role="alert" 
                      aria-live="assertive"
                    >
                      <div className="flex items-start">
                        <Icon icon={AlertCircle} size="md" color="#DC2626" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium ds-text-error">
                            Update failed
                          </h3>
                          <div className="mt-1 text-sm ds-text-error">
                            {updateMutation.error instanceof Error
                              ? updateMutation.error.message
                              : 'Failed to update profile. Please try again.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <Stack direction="horizontal" spacing={4} className="pt-4 border-t ds-border-gray-200">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={!isDirty || updateMutation.isPending}
                      loading={updateMutation.isPending}
                    >
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      fullWidth
                      onClick={() => navigate(`/companies/${id}`)}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </Card>
          </Stack>
        </div>
      </Container>
    </Layout>
  );
}
