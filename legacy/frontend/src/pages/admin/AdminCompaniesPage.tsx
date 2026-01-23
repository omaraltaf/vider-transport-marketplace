/**
 * Platform Admin Companies Page
 * Comprehensive company management for platform administrators
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminPanelPage from '../AdminPanelPage';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';
import { apiClient } from '../../services/api';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { 
  Container, 
  Table, 
  Badge, 
  Button, 
  SearchBar, 
  Spinner, 
  Select, 
  Card,
  Grid,
  Modal,
  FormField,
  Textarea
} from '../../design-system/components';
import { 
  CheckBadgeIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  FunnelIcon,
  Bars3Icon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

interface CompanyMetrics {
  totalListings: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  activeUsers: number;
}

interface Company {
  id: string;
  name: string;
  organizationNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
  description?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  verificationNotes?: string;
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspensionReason?: string;
  totalBookings: number;
  totalRevenue: number;
  aggregatedRating: number | null;
  createdAt: string;
  metrics: CompanyMetrics;
}

interface CompanySearchResult {
  companies: Company[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type ViewMode = 'table' | 'grid';
type SortField = 'name' | 'createdAt' | 'totalBookings' | 'totalRevenue' | 'aggregatedRating';
type SortOrder = 'asc' | 'desc';

const AdminCompaniesPage = () => {
  const { user } = useEnhancedAuth();
  const queryClient = useQueryClient();
  
  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('');
  const [fylkeFilter, setFylkeFilter] = useState<string>('');
  
  // Pagination and sorting state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  
  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // Form state
  const [suspensionReason, setSuspensionReason] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedQuery(value), 500);
  };

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.append('search', debouncedQuery);
    if (statusFilter) params.append('status', statusFilter);
    if (verifiedFilter) params.append('verified', verifiedFilter);
    if (fylkeFilter) params.append('fylke', fylkeFilter);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);
    return params.toString();
  };

  const { data, isLoading, error } = useQuery<CompanySearchResult>({
    queryKey: ['platform-admin-companies', debouncedQuery, statusFilter, verifiedFilter, fylkeFilter, page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get(`/platform-admin/companies?${buildQueryParams()}`, validToken);
    },
    enabled: !!user,
  });

  // Mutations
  const verifyMutation = useMutation({
    mutationFn: async ({ companyId, notes }: { companyId: string; notes?: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post(`/platform-admin/companies/${companyId}/verify`, { notes }, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin-companies'] });
      setShowVerifyModal(false);
      setVerificationNotes('');
      setSelectedCompany(null);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ companyId, reason }: { companyId: string; reason: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post(`/platform-admin/companies/${companyId}/suspend`, { reason }, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin-companies'] });
      setShowSuspendModal(false);
      setSuspensionReason('');
      setSelectedCompany(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ companyId, status, reason }: { companyId: string; status: string; reason?: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.put(`/platform-admin/companies/${companyId}/status`, { status, reason }, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin-companies'] });
    },
  });

  const bulkSuspendMutation = useMutation({
    mutationFn: async ({ companyIds, reason }: { companyIds: string[]; reason: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post('/platform-admin/companies/bulk-suspend', { companyIds, reason }, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin-companies'] });
      setSelectedCompanies([]);
    },
  });

  const bulkVerifyMutation = useMutation({
    mutationFn: async ({ companyIds, notes }: { companyIds: string[]; notes?: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post('/platform-admin/companies/bulk-verify', { companyIds, notes }, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin-companies'] });
      setSelectedCompanies([]);
    },
  });

  // Event handlers
  const handleVerify = (company: Company) => {
    setSelectedCompany(company);
    setShowVerifyModal(true);
  };

  const handleSuspend = (company: Company) => {
    setSelectedCompany(company);
    setShowSuspendModal(true);
  };

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
  };

  const handleActivate = async (company: Company) => {
    if (confirm(`Are you sure you want to activate ${company.name}?`)) {
      try {
        await updateStatusMutation.mutateAsync({
          companyId: company.id,
          status: 'ACTIVE',
          reason: 'Reactivated by platform admin'
        });
      } catch (error: any) {
        alert(error.message || 'Failed to activate company');
      }
    }
  };

  const handleBulkSuspend = async () => {
    const reason = prompt('Enter suspension reason:');
    if (reason && selectedCompanies.length > 0) {
      try {
        await bulkSuspendMutation.mutateAsync({
          companyIds: selectedCompanies,
          reason
        });
      } catch (error: any) {
        alert(error.message || 'Failed to suspend companies');
      }
    }
  };

  const handleBulkVerify = async () => {
    const notes = prompt('Enter verification notes (optional):');
    if (selectedCompanies.length > 0) {
      try {
        await bulkVerifyMutation.mutateAsync({
          companyIds: selectedCompanies,
          notes: notes || undefined
        });
      } catch (error: any) {
        alert(error.message || 'Failed to verify companies');
      }
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSelectAll = () => {
    if (data?.companies) {
      const allIds = data.companies.map(c => c.id);
      setSelectedCompanies(
        selectedCompanies.length === allIds.length ? [] : allIds
      );
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setStatusFilter('');
    setVerifiedFilter('');
    setFylkeFilter('');
    setPage(1);
  };

  const getStatusBadge = (company: Company) => {
    if (company.status === 'SUSPENDED') {
      return <Badge variant="error">Suspended</Badge>;
    }
    if (company.status === 'PENDING_VERIFICATION') {
      return <Badge variant="warning">Pending</Badge>;
    }
    if (company.verified) {
      return <Badge variant="success">Verified</Badge>;
    }
    return <Badge variant="warning">Unverified</Badge>;
  };

  const getMetricsDisplay = (metrics: CompanyMetrics) => (
    <div className="text-xs text-neutral-500 space-y-1">
      <div>Listings: {metrics.totalListings}</div>
      <div>Bookings: {metrics.totalBookings}</div>
      <div>Revenue: ${metrics.totalRevenue.toLocaleString()}</div>
      <div>Rating: {metrics.averageRating ? metrics.averageRating.toFixed(1) : 'N/A'}</div>
    </div>
  );

  return (
    <AdminPanelPage>
      <Container>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Company Management</h1>
          <p className="text-neutral-600">Manage and monitor all companies on the platform</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <div className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search by name, organization number, or city..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                >
                  {viewMode === 'table' ? <Squares2X2Icon className="h-4 w-4" /> : <Bars3Icon className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <FunnelIcon className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING_VERIFICATION">Pending</option>
              </select>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">All Verification</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
              <select
                value={fylkeFilter}
                onChange={(e) => setFylkeFilter(e.target.value)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">All Regions</option>
                <option value="Oslo">Oslo</option>
                <option value="Viken">Viken</option>
                <option value="Innlandet">Innlandet</option>
                <option value="Vestfold og Telemark">Vestfold og Telemark</option>
                <option value="Agder">Agder</option>
                <option value="Rogaland">Rogaland</option>
                <option value="Vestland">Vestland</option>
                <option value="Møre og Romsdal">Møre og Romsdal</option>
                <option value="Trøndelag">Trøndelag</option>
                <option value="Nordland">Nordland</option>
                <option value="Troms og Finnmark">Troms og Finnmark</option>
              </select>
              <select
                value={pageSize.toString()}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Bulk Actions */}
        {selectedCompanies.length > 0 && (
          <Card className="mb-4">
            <div className="p-4 flex items-center justify-between bg-blue-50">
              <span className="text-sm font-medium text-blue-900">
                {selectedCompanies.length} companies selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkVerify}
                  disabled={bulkVerifyMutation.isPending}
                >
                  Bulk Verify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkSuspend}
                  disabled={bulkSuspendMutation.isPending}
                >
                  Bulk Suspend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCompanies([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 text-neutral-600">Loading companies...</p>
          </div>
        ) : error ? (
          <Card>
            <div className="p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-800">Failed to load companies. Please try again.</p>
            </div>
          </Card>
        ) : data && data.companies.length > 0 ? (
          <>
            {viewMode === 'table' ? (
              <Card>
                <Table
                  columns={[
                    {
                      key: 'select',
                      header: 'Select',
                      render: (company) => (
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => handleSelectCompany(company.id)}
                          className="rounded border-neutral-300"
                        />
                      ),
                    },
                    {
                      key: 'company',
                      header: 'Company',
                      render: (company) => (
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-neutral-900 flex items-center">
                              {company.name}
                              {company.verified && (
                                <CheckBadgeIcon className="ml-2 h-4 w-4 text-green-600" title="Verified" />
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">{company.organizationNumber}</div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'location',
                      header: 'Location',
                      render: (company) => (
                        <div className="text-sm">
                          <div className="text-neutral-900">{company.city}</div>
                          <div className="text-neutral-500">{company.fylke}</div>
                        </div>
                      ),
                    },
                    {
                      key: 'metrics',
                      header: 'Metrics',
                      render: (company) => getMetricsDisplay(company.metrics),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (company) => (
                        <div className="space-y-1">
                          {getStatusBadge(company)}
                          {company.suspendedAt && (
                            <div className="text-xs text-red-600">
                              Suspended: {new Date(company.suspendedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'created',
                      header: 'Created',
                      render: (company) => (
                        <div className="text-sm text-neutral-500">
                          {new Date(company.createdAt).toLocaleDateString()}
                        </div>
                      ),
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (company) => (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(company)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          {company.status === 'SUSPENDED' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivate(company)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckBadgeIcon className="h-4 w-4 text-green-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuspend(company)}
                              disabled={suspendMutation.isPending}
                            >
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          {!company.verified && company.status !== 'SUSPENDED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerify(company)}
                              disabled={verifyMutation.isPending}
                            >
                              <CheckBadgeIcon className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  data={data.companies}
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.companies.map((company) => (
                  <Card key={company.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.id)}
                          onChange={() => handleSelectCompany(company.id)}
                          className="rounded border-neutral-300 mr-3"
                        />
                        <div>
                          <h3 className="font-medium text-neutral-900 flex items-center">
                            {company.name}
                            {company.verified && (
                              <CheckBadgeIcon className="ml-2 h-4 w-4 text-green-600" />
                            )}
                          </h3>
                          <p className="text-sm text-neutral-500">{company.organizationNumber}</p>
                        </div>
                      </div>
                      {getStatusBadge(company)}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-neutral-600">
                        📍 {company.city}, {company.fylke}
                      </div>
                      {getMetricsDisplay(company.metrics)}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(company)}
                        className="flex-1"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {company.status === 'SUSPENDED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(company)}
                          disabled={updateStatusMutation.isPending}
                        >
                          Activate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspend(company)}
                          disabled={suspendMutation.isPending}
                        >
                          Suspend
                        </Button>
                      )}
                      {!company.verified && company.status !== 'SUSPENDED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleVerify(company)}
                          disabled={verifyMutation.isPending}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-neutral-700">
                  Showing page {data.page} of {data.totalPages} ({data.total} total companies)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card>
            <div className="text-center py-12">
              <p className="text-neutral-500">No companies found</p>
              {(searchQuery || statusFilter || verifiedFilter || fylkeFilter) && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">
                  Clear filters to see all companies
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Company Details Modal */}
        {showDetailsModal && selectedCompany && (
          <Modal
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            title="Company Details"
            size="lg"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedCompany.name}</div>
                    <div><strong>Org Number:</strong> {selectedCompany.organizationNumber}</div>
                    <div><strong>VAT Registered:</strong> {selectedCompany.vatRegistered ? 'Yes' : 'No'}</div>
                    <div><strong>Status:</strong> {getStatusBadge(selectedCompany)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Location</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Address:</strong> {selectedCompany.businessAddress}</div>
                    <div><strong>City:</strong> {selectedCompany.city}</div>
                    <div><strong>Postal Code:</strong> {selectedCompany.postalCode}</div>
                    <div><strong>Fylke:</strong> {selectedCompany.fylke}</div>
                    <div><strong>Kommune:</strong> {selectedCompany.kommune}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-neutral-900 mb-2">Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-neutral-50 rounded">
                    <div className="text-2xl font-bold text-neutral-900">{selectedCompany.metrics.totalListings}</div>
                    <div className="text-sm text-neutral-600">Listings</div>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded">
                    <div className="text-2xl font-bold text-neutral-900">{selectedCompany.metrics.totalBookings}</div>
                    <div className="text-sm text-neutral-600">Bookings</div>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded">
                    <div className="text-2xl font-bold text-neutral-900">${selectedCompany.metrics.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-neutral-600">Revenue</div>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded">
                    <div className="text-2xl font-bold text-neutral-900">{selectedCompany.metrics.averageRating?.toFixed(1) || 'N/A'}</div>
                    <div className="text-sm text-neutral-600">Rating</div>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded">
                    <div className="text-2xl font-bold text-neutral-900">{selectedCompany.metrics.activeUsers}</div>
                    <div className="text-sm text-neutral-600">Users</div>
                  </div>
                </div>
              </div>

              {selectedCompany.description && (
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Description</h4>
                  <p className="text-sm text-neutral-600">{selectedCompany.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCompany.verified && (
                  <div>
                    <h4 className="font-medium text-neutral-900 mb-2">Verification</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Verified:</strong> {new Date(selectedCompany.verifiedAt!).toLocaleString()}</div>
                      <div><strong>Verified By:</strong> {selectedCompany.verifiedBy}</div>
                      {selectedCompany.verificationNotes && (
                        <div><strong>Notes:</strong> {selectedCompany.verificationNotes}</div>
                      )}
                    </div>
                  </div>
                )}
                {selectedCompany.suspendedAt && (
                  <div>
                    <h4 className="font-medium text-neutral-900 mb-2">Suspension</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Suspended:</strong> {new Date(selectedCompany.suspendedAt).toLocaleString()}</div>
                      <div><strong>Suspended By:</strong> {selectedCompany.suspendedBy}</div>
                      {selectedCompany.suspensionReason && (
                        <div><strong>Reason:</strong> {selectedCompany.suspensionReason}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Suspend Company Modal */}
        {showSuspendModal && selectedCompany && (
          <Modal
            isOpen={showSuspendModal}
            onClose={() => setShowSuspendModal(false)}
            title="Suspend Company"
          >
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  You are about to suspend <strong>{selectedCompany.name}</strong>. 
                  This will disable all company operations and notify affected users.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Suspension Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Enter the reason for suspension..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowSuspendModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!suspensionReason.trim()) {
                      alert('Please enter a suspension reason');
                      return;
                    }
                    try {
                      await suspendMutation.mutateAsync({
                        companyId: selectedCompany.id,
                        reason: suspensionReason
                      });
                    } catch (error: any) {
                      alert(error.message || 'Failed to suspend company');
                    }
                  }}
                  disabled={suspendMutation.isPending || !suspensionReason.trim()}
                >
                  {suspendMutation.isPending ? 'Suspending...' : 'Suspend Company'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Verify Company Modal */}
        {showVerifyModal && selectedCompany && (
          <Modal
            isOpen={showVerifyModal}
            onClose={() => setShowVerifyModal(false)}
            title="Verify Company"
          >
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  You are about to verify <strong>{selectedCompany.name}</strong>. 
                  This will activate the company and enable full platform access.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Verification Notes (Optional)
                </label>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Enter any verification notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowVerifyModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    try {
                      await verifyMutation.mutateAsync({
                        companyId: selectedCompany.id,
                        notes: verificationNotes || undefined
                      });
                    } catch (error: any) {
                      alert(error.message || 'Failed to verify company');
                    }
                  }}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? 'Verifying...' : 'Verify Company'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </Container>
    </AdminPanelPage>
  );
};

export default AdminCompaniesPage;
