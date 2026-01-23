/**
 * Admin Creation Form Component
 * Form for creating new platform admin users
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { 
  UserPlus,
  Shield,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'USER_MANAGEMENT' | 'CONTENT_MODERATION' | 'FINANCIAL' | 'ANALYTICS' | 'SYSTEM';
}

interface AdminCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adminData: any) => Promise<void>;
  className?: string;
}

const AdminCreationForm: React.FC<AdminCreationFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    permissions: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availablePermissions: Permission[] = [
    {
      id: 'MANAGE_USERS',
      name: 'User Management',
      description: 'Create, update, and delete users',
      category: 'USER_MANAGEMENT'
    },
    {
      id: 'VIEW_ANALYTICS',
      name: 'Analytics Access',
      description: 'View platform analytics and reports',
      category: 'ANALYTICS'
    },
    {
      id: 'MODERATE_CONTENT',
      name: 'Content Moderation',
      description: 'Review and moderate platform content',
      category: 'CONTENT_MODERATION'
    },
    {
      id: 'MANAGE_FINANCES',
      name: 'Financial Management',
      description: 'Access financial data and controls',
      category: 'FINANCIAL'
    },
    {
      id: 'SYSTEM_CONFIG',
      name: 'System Configuration',
      description: 'Modify system settings and configurations',
      category: 'SYSTEM'
    },
    {
      id: 'AUDIT_LOGS',
      name: 'Audit Log Access',
      description: 'View and export audit logs',
      category: 'SYSTEM'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.permissions.length === 0) {
      setError('Please select at least one permission');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await onSubmit(formData);
      setSuccess(true);
      
      // Reset form after successful creation
      setTimeout(() => {
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          permissions: []
        });
        setSuccess(false);
        onClose();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const getPermissionsByCategory = (category: string) => {
    return availablePermissions.filter(perm => perm.category === category);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-6 w-6" />
              <CardTitle>Create Platform Admin</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>Admin created successfully!</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-medium">Permissions</h3>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Select the permissions this admin should have. Be careful with system-level permissions.
              </p>

              <div className="space-y-4">
                {['USER_MANAGEMENT', 'ANALYTICS', 'CONTENT_MODERATION', 'FINANCIAL', 'SYSTEM'].map(category => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {category.replace('_', ' ')}
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {getPermissionsByCategory(category).map(permission => (
                        <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={permission.id}
                            checked={formData.permissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          
                          <div className="flex-1">
                            <Label htmlFor={permission.id} className="font-medium cursor-pointer">
                              {permission.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {formData.permissions.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Selected Permissions:</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.permissions.map(permId => {
                      const perm = availablePermissions.find(p => p.id === permId);
                      return perm ? (
                        <Badge key={permId} variant="secondary">
                          {perm.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Admin'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCreationForm;