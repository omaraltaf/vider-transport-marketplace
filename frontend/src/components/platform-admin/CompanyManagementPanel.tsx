import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { formatCurrency } from '../../utils/currency';
import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  Eye,
  Plus,
  MapPin,
  DollarSign,
  Star,
  Activity
} from 'lucide-react';

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
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  suspendedAt?: Date;
  suspendedBy?: string;
  suspensionReason?: string;
  totalBookings: number;
  totalRevenue: number;
  aggregatedRating?: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
  verificationNotes?: string;
  userCount: number;
  vehicleCount: number;
  driverCount: number;
  activeListings: number;
}

interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  pendingVerification: number;
  suspendedCompanies: number;
  totalRevenue: number;
  averageRating: number;
  monthlyGrowth: number;
  verificationRate: number;
}

interface CompanyManagementPanelProps {
  initialSubSection?: string;
}

interface CompanyCreationModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    organizationNumber: string;
    businessAddress: string;
    city: string;
    postalCode: string;
    fylke: string;
    kommune: string;
    vatRegistered: boolean;
    description?: string;
  }) => void;
  loading: boolean;
}

const CompanyCreationModal: React.FC<CompanyCreationModalProps> = ({ onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    organizationNumber: '',
    businessAddress: '',
    city: '',
    postalCode: '',
    fylke: '',
    kommune: '',
    vatRegistered: false,
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add New Company</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter company name"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Organization Number *</label>
                <Input
                  value={formData.organizationNumber}
                  onChange={(e) => handleChange('organizationNumber', e.target.value)}
                  placeholder="e.g., 123456789"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Business Address *</label>
              <Input
                value={formData.businessAddress}
                onChange={(e) => handleChange('businessAddress', e.target.value)}
                placeholder="Enter business address"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Enter city"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Postal Code *</label>
                <Input
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  placeholder="e.g., 0123"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fylke *</label>
                <Input
                  value={formData.fylke}
                  onChange={(e) => handleChange('fylke', e.target.value)}
                  placeholder="Enter fylke"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Kommune *</label>
              <Input
                value={formData.kommune}
                onChange={(e) => handleChange('kommune', e.target.value)}
                placeholder="Enter kommune"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Optional company description"
                disabled={loading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="vatRegistered"
                checked={formData.vatRegistered}
                onChange={(e) => handleChange('vatRegistered', e.target.checked)}
                disabled={loading}
                className="rounded"
              />
              <label htmlFor="vatRegistered" className="text-sm font-medium">
                VAT Registered
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const CompanyManagementPanel: React.FC<CompanyManagementPanelProps> = ({
  initialSubSection = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState(initialSubSection);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Sync external prop changes with internal state
  useEffect(() => {
    const sectionMapping: { [key: string]: string } = {
      'company-overview': 'overview',
      'company-verification': 'verification',
      'company-analytics': 'analytics',
      'company-management': 'management'
    };
    
    const mappedSection = sectionMapping[initialSubSection] || initialSubSection;
    setActiveTab(mappedSection);
  }, [initialSubSection]);

  useEffect(() => {
    loadCompanies();
    loadStats();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/platform-admin/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        setStats(data.stats || null);
      } else {
        console.error('Failed to load companies:', response.statusText);
        // Fallback to mock data if API fails
        setCompanies([]);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      // Fallback to mock data if API fails
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: {
    name: string;
    organizationNumber: string;
    businessAddress: string;
    city: string;
    postalCode: string;
    fylke: string;
    kommune: string;
    vatRegistered: boolean;
    description?: string;
  }) => {
    setCreateLoading(true);
    try {
      const response = await fetch('/api/platform-admin/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create company');
      }

      const result = await response.json();
      
      // Refresh the companies list
      await loadCompanies();
      
      // Close the modal
      setShowCreateModal(false);
      
      // Show success message (you could add a toast notification here)
      console.log('Company created successfully:', result);
      
    } catch (error) {
      console.error('Error creating company:', error);
      // You could add error handling/toast notification here
      alert(error instanceof Error ? error.message : 'Failed to create company');
    } finally {
      setCreateLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/platform-admin/companies/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to load stats:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleVerifyCompany = async (companyId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/companies/${companyId}/verify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: 'Verified by platform admin'
        })
      });
      
      if (response.ok) {
        // Update local state
        setCompanies(prev => prev.map(company => 
          company.id === companyId 
            ? { ...company, verified: true, status: 'ACTIVE', verifiedAt: new Date() }
            : company
        ));
        // Reload stats
        loadStats();
      } else {
        console.error('Failed to verify company:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to verify company:', error);
    }
  };

  const handleSuspendCompany = async (companyId: string, reason: string) => {
    try {
      const response = await fetch(`/api/platform-admin/companies/${companyId}/suspend`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        // Update local state
        setCompanies(prev => prev.map(company => 
          company.id === companyId 
            ? { 
                ...company, 
                status: 'SUSPENDED', 
                suspendedAt: new Date(),
                suspensionReason: reason 
              }
            : company
        ));
        // Reload stats
        loadStats();
      } else {
        console.error('Failed to suspend company:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to suspend company:', error);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.organizationNumber.includes(searchQuery) ||
                         company.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Company['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'SUSPENDED':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      case 'PENDING_VERIFICATION':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Companies</p>
                  <p className="text-2xl font-bold">{stats.totalCompanies}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                +{stats.monthlyGrowth}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Companies</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeCompanies}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {((stats.activeCompanies / stats.totalCompanies) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingVerification}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Verification rate: {stats.verificationRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Avg rating: {stats.averageRating}/5.0
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Company List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_VERIFICATION">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading companies...</div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No companies found</div>
            ) : (
              filteredCompanies.map((company) => (
                <div key={company.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-lg">{company.name}</h3>
                        {getStatusBadge(company.status)}
                        {company.verified && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          {company.organizationNumber}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {company.city}, {company.fylke}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {company.userCount} users
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatCurrency(company.totalRevenue)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                        <div>Vehicles: {company.vehicleCount}</div>
                        <div>Drivers: {company.driverCount}</div>
                        <div>Bookings: {company.totalBookings}</div>
                        <div className="flex items-center">
                          {company.aggregatedRating && (
                            <>
                              <Star className="h-4 w-4 mr-1 text-yellow-500" />
                              {company.aggregatedRating.toFixed(1)} ({company.totalRatings})
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedCompany(company)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {company.status === 'PENDING_VERIFICATION' && (
                        <Button size="sm" onClick={() => handleVerifyCompany(company.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      )}
                      {company.status === 'ACTIVE' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const reason = prompt('Suspension reason:');
                            if (reason) handleSuspendCompany(company.id, reason);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companies.filter(c => c.status === 'PENDING_VERIFICATION').map((company) => (
              <div key={company.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{company.name}</h3>
                    <p className="text-sm text-gray-600">Org: {company.organizationNumber}</p>
                    <p className="text-sm text-gray-600">{company.businessAddress}, {company.city}</p>
                    <p className="text-sm text-gray-600">VAT Registered: {company.vatRegistered ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => handleSuspendCompany(company.id, 'Failed verification')}>
                      Reject
                    </Button>
                    <Button onClick={() => handleVerifyCompany(company.id)}>
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Company Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+15.3%</div>
            <p className="text-sm text-gray-600">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(676667)}</div>
            <p className="text-sm text-gray-600">Per company</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Verification Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">66.7%</div>
            <p className="text-sm text-gray-600">Companies verified</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderManagement = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Management Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center">
              <Plus className="h-6 w-6 mb-2" />
              Create New Company
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Download className="h-6 w-6 mb-2" />
              Bulk Export
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Activity className="h-6 w-6 mb-2" />
              Audit Trail
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <AlertTriangle className="h-6 w-6 mb-2" />
              Compliance Check
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Management</h1>
          <p className="text-gray-600">Manage companies, verification, and compliance</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          {renderVerification()}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {renderAnalytics()}
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          {renderManagement()}
        </TabsContent>
      </Tabs>

      {/* Company Creation Modal */}
      {showCreateModal && (
        <CompanyCreationModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createCompany}
          loading={createLoading}
        />
      )}

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-6 w-6" />
                  <CardTitle>{selectedCompany.name}</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  <div className="space-y-2">
                    <div><strong>Organization Number:</strong> {selectedCompany.organizationNumber}</div>
                    <div><strong>Address:</strong> {selectedCompany.businessAddress}</div>
                    <div><strong>City:</strong> {selectedCompany.city}, {selectedCompany.postalCode}</div>
                    <div><strong>Region:</strong> {selectedCompany.fylke}, {selectedCompany.kommune}</div>
                    <div><strong>VAT Registered:</strong> {selectedCompany.vatRegistered ? 'Yes' : 'No'}</div>
                    <div><strong>Status:</strong> 
                      <Badge className="ml-2" variant={
                        selectedCompany.status === 'ACTIVE' ? 'default' :
                        selectedCompany.status === 'SUSPENDED' ? 'destructive' : 'secondary'
                      }>
                        {selectedCompany.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Business Metrics</h3>
                  <div className="space-y-2">
                    <div><strong>Total Bookings:</strong> {selectedCompany.totalBookings}</div>
                    <div><strong>Total Revenue:</strong> {formatCurrency(selectedCompany.totalRevenue)}</div>
                    <div><strong>User Count:</strong> {selectedCompany.userCount}</div>
                    <div><strong>Rating:</strong> {selectedCompany.aggregatedRating ? `${selectedCompany.aggregatedRating.toFixed(1)}/5.0 (${selectedCompany.totalRatings} reviews)` : 'No ratings'}</div>
                    <div><strong>Created:</strong> {new Date(selectedCompany.createdAt).toLocaleDateString()}</div>
                    <div><strong>Last Updated:</strong> {new Date(selectedCompany.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
              {selectedCompany.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{selectedCompany.description}</p>
                </div>
              )}
              {selectedCompany.verified && selectedCompany.verifiedAt && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Verification Details</h3>
                  <div className="space-y-1">
                    <div><strong>Verified:</strong> {new Date(selectedCompany.verifiedAt).toLocaleDateString()}</div>
                    {selectedCompany.verifiedBy && <div><strong>Verified By:</strong> {selectedCompany.verifiedBy}</div>}
                    {selectedCompany.verificationNotes && <div><strong>Notes:</strong> {selectedCompany.verificationNotes}</div>}
                  </div>
                </div>
              )}
              {selectedCompany.status === 'SUSPENDED' && selectedCompany.suspendedAt && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Suspension Details</h3>
                  <div className="space-y-1">
                    <div><strong>Suspended:</strong> {new Date(selectedCompany.suspendedAt).toLocaleDateString()}</div>
                    {selectedCompany.suspendedBy && <div><strong>Suspended By:</strong> {selectedCompany.suspendedBy}</div>}
                    {selectedCompany.suspensionReason && <div><strong>Reason:</strong> {selectedCompany.suspensionReason}</div>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};