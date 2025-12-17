/**
 * User Creation Modal Component
 * Modal for creating new users with company assignment
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { X, User, Building, Mail, Shield, AlertCircle, Loader2 } from 'lucide-react';

interface CompanyOption {
  id: string;
  name: string;
  organizationNumber: string;
  city: string;
  fylke: string;
  status: string;
  verified: boolean;
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'COMPANY_ADMIN';
  companyId: string;
  permissions?: string[];
  driverLicense?: string;
  vehicleTypes?: string[];
}

interface UserCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserData) => Promise<void>;
  loading?: boolean;
}

const UserCreationModal: React.FC<UserCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CUSTOMER',
    companyId: '',
    permissions: [],
    driverLicense: '',
    vehicleTypes: []
  });

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Available permissions for Company Admin role
  const availablePermissions = [
    { id: 'MANAGE_DRIVERS', label: 'Manage Drivers', description: 'Add, edit, and remove drivers' },
    { id: 'VIEW_BOOKINGS', label: 'View Bookings', description: 'Access booking information' },
    { id: 'MANAGE_VEHICLES', label: 'Manage Vehicles', description: 'Add and manage company vehicles' },
    { id: 'VIEW_REPORTS', label: 'View Reports', description: 'Access company reports and analytics' },
    { id: 'MANAGE_BILLING', label: 'Manage Billing', description: 'Handle billing and payments' }
  ];

  // Available vehicle types for Driver role
  const availableVehicleTypes = [
    'CAR', 'VAN', 'TRUCK', 'MOTORCYCLE', 'BICYCLE'
  ];

  // Fetch companies for dropdown
  const fetchCompanies = async (search: string = '') => {
    try {
      setLoadingCompanies(true);
      const queryParams = new URLSearchParams({
        limit: '50'
      });
      
      if (search) {
        queryParams.append('search', search);
      }

      const response = await fetch(`/api/platform-admin/users/companies/options?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCompanies(data.data.companies || []);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      // Set mock data for development
      setCompanies([
        {
          id: 'company-1',
          name: 'Oslo Logistics AS',
          organizationNumber: '123456789',
          city: 'Oslo',
          fylke: 'Oslo',
          status: 'ACTIVE',
          verified: true
        },
        {
          id: 'company-2', 
          name: 'Bergen Transport',
          organizationNumber: '987654321',
          city: 'Bergen',
          fylke: 'Vestland',
          status: 'ACTIVE',
          verified: true
        }
      ]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load companies when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen]);

  // Search companies when search term changes
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        fetchCompanies(companySearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [companySearch, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'CUSTOMER',
        companyId: '',
        permissions: [],
        driverLicense: '',
        vehicleTypes: []
      });
      setCompanySearch('');
      setErrors({});
    }
  }, [isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.companyId) {
      newErrors.companyId = 'Company selection is required';
    }

    if (formData.role === 'COMPANY_ADMIN' && (!formData.permissions || formData.permissions.length === 0)) {
      newErrors.permissions = 'At least one permission is required for Company Admin role';
    }

    if (formData.role === 'DRIVER' && !formData.driverLicense) {
      newErrors.driverLicense = 'Driver license is required for Driver role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to create user' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof CreateUserData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionId: string) => {
    const currentPermissions = formData.permissions || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(p => p !== permissionId)
      : [...currentPermissions, permissionId];
    
    handleInputChange('permissions', newPermissions);
  };

  // Handle vehicle type toggle
  const handleVehicleTypeToggle = (vehicleType: string) => {
    const currentTypes = formData.vehicleTypes || [];
    const newTypes = currentTypes.includes(vehicleType)
      ? currentTypes.filter(t => t !== vehicleType)
      : [...currentTypes, vehicleType];
    
    handleInputChange('vehicleTypes', newTypes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <CardTitle>Create New User</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {errors.submit && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{errors.submit}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Basic Information</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number (optional)"
                />
              </div>
            </div>

            {/* Company Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>Company Assignment</span>
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Search Companies <span className="text-red-500">*</span>
                </label>
                <Input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search by company name, org number, or city..."
                  className={errors.companyId ? 'border-red-500' : ''}
                />
                {errors.companyId && (
                  <p className="text-sm text-red-500 mt-1">{errors.companyId}</p>
                )}
              </div>

              {/* Company Options */}
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {loadingCompanies ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Loading companies...</span>
                  </div>
                ) : companies.length > 0 ? (
                  <div className="space-y-1 p-2">
                    {companies.map(company => (
                      <div
                        key={company.id}
                        className={`p-3 rounded cursor-pointer border ${
                          formData.companyId === company.id 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-50 border-transparent'
                        }`}
                        onClick={() => handleInputChange('companyId', company.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{company.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Org: {company.organizationNumber} • {company.city}, {company.fylke}
                            </p>
                          </div>
                          {company.verified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No companies found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Role & Permissions</span>
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  User Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value as 'CUSTOMER' | 'DRIVER' | 'COMPANY_ADMIN')}
                  className="w-full p-2 border border-input bg-background rounded-md"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="DRIVER">Driver</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                </select>
              </div>

              {/* Company Admin Permissions */}
              {formData.role === 'COMPANY_ADMIN' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Permissions <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                    {availablePermissions.map(permission => (
                      <label key={permission.id} className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.permissions?.includes(permission.id) || false}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">{permission.label}</div>
                          <div className="text-xs text-muted-foreground">{permission.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.permissions && (
                    <p className="text-sm text-red-500 mt-1">{errors.permissions}</p>
                  )}
                </div>
              )}

              {/* Driver Specific Fields */}
              {formData.role === 'DRIVER' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Driver License <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.driverLicense}
                      onChange={(e) => handleInputChange('driverLicense', e.target.value)}
                      placeholder="Enter driver license number"
                      className={errors.driverLicense ? 'border-red-500' : ''}
                    />
                    {errors.driverLicense && (
                      <p className="text-sm text-red-500 mt-1">{errors.driverLicense}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Vehicle Types</label>
                    <div className="flex flex-wrap gap-2">
                      {availableVehicleTypes.map(vehicleType => (
                        <label key={vehicleType} className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.vehicleTypes?.includes(vehicleType) || false}
                            onChange={() => handleVehicleTypeToggle(vehicleType)}
                          />
                          <span className="text-sm">{vehicleType}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting || loading}
                className="min-w-[120px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserCreationModal;