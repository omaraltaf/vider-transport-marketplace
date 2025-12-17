/**
 * User Management Panel Component
 * Interface for managing users with search, filtering, and bulk operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import AdminCreationForm from './AdminCreationForm';
import UserCreationModal from './UserCreationModal';
import BulkOperationsPanel from './BulkOperationsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import UserActivityTimeline from './UserActivityTimeline';
import ContentModerationPanel from './ContentModerationPanel';
import FraudDetectionDashboard from './FraudDetectionDashboard';
import { 
  Search,
  Plus,
  Edit,
  Flag,
  Eye,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Activity,
  Settings,
  X,
  Users,
  Shield,
  Key
} from 'lucide-react';

interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'COMPANY_ADMIN' | 'PLATFORM_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION' | 'DEACTIVATED';
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  kycStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  companyId?: string;
  companyName?: string;
  registrationDate: Date;
  lastLoginDate?: Date;
  loginCount: number;
  profileCompleteness: number;
  riskScore: number;
  flags: UserFlag[];
  permissions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface UserFlag {
  id: string;
  type: 'SUSPICIOUS_ACTIVITY' | 'POLICY_VIOLATION' | 'FRAUD_RISK' | 'MANUAL_REVIEW' | 'SECURITY_CONCERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  description: string;
  flaggedBy: string;
  flaggedAt: Date;
  resolved: boolean;
}

interface UserManagementPanelProps {
  className?: string;
  initialSubSection?: string;
}

const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ 
  className = '',
  initialSubSection = 'overview'
}) => {
  const { token } = useAuth();
  const [activeSubSection, setActiveSubSection] = useState(initialSubSection);

  // Update activeSubSection when initialSubSection prop changes
  useEffect(() => {
    // Map external sub-section names to internal tab names
    const sectionMapping: { [key: string]: string } = {
      'user-overview': 'overview',
      'bulk-operations': 'bulk-operations',
      'activity-monitoring': 'activity-monitoring', 
      'content-moderation': 'content-moderation',
      'fraud-detection': 'fraud-detection',
      'overview': 'overview' // Default case
    };
    
    const mappedSection = sectionMapping[initialSubSection] || 'overview';
    setActiveSubSection(mappedSection);
  }, [initialSubSection]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    verificationStatus: 'all',
    riskScore: 'all',
    companyId: 'all'
  });

  // Modal states
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showUserCreationModal, setShowUserCreationModal] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<string | null>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<PlatformUser | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<PlatformUser | null>(null);
  const [selectedUserForFlag, setSelectedUserForFlag] = useState<PlatformUser | null>(null);
  const [companies, setCompanies] = useState<Array<{id: string, name: string}>>([]);

  // Fetch companies for filter dropdown
  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/platform-admin/users/companies/options?limit=100', {
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
        { id: 'company-1', name: 'Oslo Logistics AS' },
        { id: 'company-2', name: 'Bergen Transport' }
      ]);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        query: searchQuery,
        limit: '50',
        offset: '0'
      });

      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/platform-admin/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to fetch users');
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error fetching users:', err);
      
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Set mock data for development
  const setMockData = () => {
    const mockUsers: PlatformUser[] = [
      {
        id: 'user-1',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+47 123 45 678',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        kycStatus: 'COMPLETED',
        registrationDate: new Date('2024-01-15'),
        lastLoginDate: new Date('2024-12-13'),
        loginCount: 45,
        profileCompleteness: 95,
        riskScore: 15,
        flags: [],
        permissions: [],
        metadata: {},
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-12-13')
      },
      {
        id: 'user-2',
        email: 'jane.smith@logistics.no',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+47 987 65 432',
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        kycStatus: 'COMPLETED',
        companyId: 'company-1',
        companyName: 'Oslo Logistics AS',
        registrationDate: new Date('2024-02-20'),
        lastLoginDate: new Date('2024-12-12'),
        loginCount: 128,
        profileCompleteness: 100,
        riskScore: 8,
        flags: [],
        permissions: ['MANAGE_DRIVERS', 'VIEW_BOOKINGS'],
        metadata: { companyRole: 'CEO' },
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-12-12')
      },
      {
        id: 'user-3',
        email: 'suspicious.user@temp.com',
        firstName: 'Suspicious',
        lastName: 'User',
        role: 'CUSTOMER',
        status: 'SUSPENDED',
        verificationStatus: 'PENDING',
        kycStatus: 'IN_PROGRESS',
        registrationDate: new Date('2024-12-10'),
        lastLoginDate: new Date('2024-12-11'),
        loginCount: 25,
        profileCompleteness: 60,
        riskScore: 85,
        flags: [
          {
            id: 'flag-1',
            type: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            reason: 'Multiple failed payment attempts',
            description: 'User attempted 10 payments with different cards in 5 minutes',
            flaggedBy: 'SYSTEM',
            flaggedAt: new Date('2024-12-11'),
            resolved: false
          }
        ],
        permissions: [],
        metadata: { suspiciousPatterns: ['rapid_payments', 'multiple_cards'] },
        createdAt: new Date('2024-12-10'),
        updatedAt: new Date('2024-12-11')
      }
    ];

    setUsers(mockUsers);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800';
      case 'BANNED': return 'bg-red-100 text-red-800';
      case 'PENDING_VERIFICATION': return 'bg-blue-100 text-blue-800';
      case 'DEACTIVATED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get risk score color
  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 20) return 'text-blue-600';
    return 'text-green-600';
  };

  // Format date safely (handles both Date objects and strings)
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, filters]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Handle admin creation
  const handleCreateAdmin = async (adminData: any) => {
    try {
      const response = await fetch('/api/platform-admin/users/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adminData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        await fetchUsers(); // Refresh the user list
      } else {
        throw new Error(data.error || 'Failed to create admin');
      }
    } catch (err) {
      throw err; // Re-throw to be handled by the form
    }
  };

  // Handle user creation
  const handleCreateUser = async (userData: any) => {
    try {
      const response = await fetch('/api/platform-admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Display the temporary password to the admin
        const tempPassword = data.data.tempPassword;
        const userEmail = data.data.email;
        
        alert(`✅ User created successfully!\n\nEmail: ${userEmail}\nTemporary Password: ${tempPassword}\n\nPlease share this password with the user securely.\nThe user should change this password on first login.`);
        
        await fetchUsers(); // Refresh the user list
      } else {
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (err) {
      throw err; // Re-throw to be handled by the form
    }
  };

  // Handle password reset
  const handleResetPassword = async (user: PlatformUser) => {
    if (!confirm(`Are you sure you want to reset the password for ${user.firstName} ${user.lastName} (${user.email})?\n\nThis will generate a new temporary password that the user must change on their next login.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/platform-admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Display the new temporary password to the admin
        const tempPassword = data.data.tempPassword;
        const userEmail = data.data.email;
        
        alert(`🔑 Password reset successfully!\n\nUser: ${user.firstName} ${user.lastName}\nEmail: ${userEmail}\nNew Temporary Password: ${tempPassword}\n\nPlease share this password with the user securely.\nThe user must change this password on their next login.`);
        
        await fetchUsers(); // Refresh the user list
      } else {
        throw new Error(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      alert(`❌ Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle user export
  const handleExportUsers = async () => {
    try {
      const response = await fetch('/api/platform-admin/users/export', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
        // Fallback: create CSV from current data
        const csvContent = generateCSVFromUsers(users);
        downloadCSV(csvContent, `users-export-${new Date().toISOString().split('T')[0]}.csv`);
      }
    } catch (error) {
      console.error('Export error:', error);
      // Fallback: create CSV from current data
      const csvContent = generateCSVFromUsers(users);
      downloadCSV(csvContent, `users-export-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  // Helper function to generate CSV from users data
  const generateCSVFromUsers = (userData: PlatformUser[]) => {
    const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'Status', 'Company', 'Registration Date', 'Last Login'];
    const rows = userData.map(user => [
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      user.role,
      user.status,
      user.companyName || '',
      new Date(user.registrationDate).toLocaleDateString(),
      user.lastLoginDate ? new Date(user.lastLoginDate).toLocaleDateString() : 'Never'
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  };

  // Helper function to download CSV
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage platform users, roles, and permissions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowUserCreationModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setShowAdminForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => alert('Import Users functionality - CSV/Excel import will be implemented here')}>
            <Upload className="h-4 w-4 mr-2" />
            Import Users
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportUsers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sub-section Tabs */}
      <Tabs value={activeSubSection} onValueChange={setActiveSubSection}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Overview
          </TabsTrigger>
          <TabsTrigger value="bulk-operations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="activity-monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Monitoring
          </TabsTrigger>
          <TabsTrigger value="content-moderation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Content Moderation
            <Badge variant="secondary" className="ml-1">5</Badge>
          </TabsTrigger>
          <TabsTrigger value="fraud-detection" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Fraud Detection
            <Badge variant="destructive" className="ml-1">2</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* User Overview Content */}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select 
                value={filters.role} 
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Roles</option>
                <option value="CUSTOMER">Customer</option>
                <option value="DRIVER">Driver</option>
                <option value="COMPANY_ADMIN">Company Admin</option>
                <option value="PLATFORM_ADMIN">Platform Admin</option>
              </select>

              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
                <option value="PENDING_VERIFICATION">Pending</option>
              </select>

              <select 
                value={filters.verificationStatus} 
                onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Verification</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select 
                value={filters.companyId} 
                onChange={(e) => setFilters(prev => ({ ...prev, companyId: e.target.value }))}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Users ({users.length})</CardTitle>
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.length} selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowBulkOperations(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Bulk Actions
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers(prev => [...prev, user.id]);
                      } else {
                        setSelectedUsers(prev => prev.filter(id => id !== user.id));
                      }
                    }}
                  />
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{user.firstName} {user.lastName}</h4>
                      <Badge className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                      <Badge variant="outline">
                        {user.role}
                      </Badge>
                      {user.flags.length > 0 && (
                        <Badge variant="destructive">
                          {user.flags.length} Flag{user.flags.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                      <span>Risk: <span className={getRiskScoreColor(user.riskScore)}>{user.riskScore}</span></span>
                      <span>Logins: {user.loginCount}</span>
                      <span>Registered: {formatDate(user.registrationDate)}</span>
                      {user.companyName && <span>Company: {user.companyName}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedUserForView(user)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => setSelectedUserForEdit(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => handleResetPassword(user)}>
                    <Key className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => setSelectedUserForFlag(user)}>
                    <Flag className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={() => setSelectedUserForActivity(user.id)}>
                    <Activity className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="bulk-operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Perform mass operations on multiple users at once
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Bulk Operations</h3>
                <p className="text-muted-foreground mb-4">
                  Select users from the User Overview tab to perform bulk operations
                </p>
                <Button onClick={() => setActiveSubSection('overview')}>
                  Go to User Overview
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Monitoring</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor user activity and behavior patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Activity Monitoring</h3>
                <p className="text-muted-foreground mb-4">
                  Real-time user activity tracking and analytics
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold">Active Users</h4>
                    <p className="text-2xl font-bold text-green-600">1,234</p>
                    <p className="text-sm text-muted-foreground">Currently online</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold">Daily Logins</h4>
                    <p className="text-2xl font-bold text-blue-600">5,678</p>
                    <p className="text-sm text-muted-foreground">Last 24 hours</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold">Suspicious Activity</h4>
                    <p className="text-2xl font-bold text-red-600">12</p>
                    <p className="text-sm text-muted-foreground">Flagged events</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-moderation" className="space-y-6">
          <ContentModerationPanel />
        </TabsContent>

        <TabsContent value="fraud-detection" className="space-y-6">
          <FraudDetectionDashboard />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AdminCreationForm
        isOpen={showAdminForm}
        onClose={() => setShowAdminForm(false)}
        onSubmit={handleCreateAdmin}
      />

      <UserCreationModal
        isOpen={showUserCreationModal}
        onClose={() => setShowUserCreationModal(false)}
        onSubmit={handleCreateUser}
        loading={loading}
      />

      {showBulkOperations && (
        <BulkOperationsPanel
          selectedUsers={selectedUsers}
          onClose={() => setShowBulkOperations(false)}
        />
      )}

      {selectedUserForActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Activity Timeline</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUserForActivity(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UserActivityTimeline userId={selectedUserForActivity} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* User View Modal */}
      {selectedUserForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUserForView(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Name:</strong> {selectedUserForView.firstName} {selectedUserForView.lastName}</div>
                <div><strong>Email:</strong> {selectedUserForView.email}</div>
                <div><strong>Phone:</strong> {selectedUserForView.phone || 'Not provided'}</div>
                <div><strong>Role:</strong> <Badge>{selectedUserForView.role}</Badge></div>
                <div><strong>Status:</strong> <Badge>{selectedUserForView.status}</Badge></div>
                <div><strong>Company:</strong> {selectedUserForView.companyName || 'None'}</div>
                <div><strong>Registered:</strong> {new Date(selectedUserForView.registrationDate).toLocaleDateString()}</div>
                <div><strong>Last Login:</strong> {selectedUserForView.lastLoginDate ? new Date(selectedUserForView.lastLoginDate).toLocaleDateString() : 'Never'}</div>
                <div><strong>Login Count:</strong> {selectedUserForView.loginCount}</div>
                <div><strong>Profile Complete:</strong> {selectedUserForView.profileCompleteness}%</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Edit Modal */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit User</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUserForEdit(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <Input defaultValue={selectedUserForEdit.firstName} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <Input defaultValue={selectedUserForEdit.lastName} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input defaultValue={selectedUserForEdit.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input defaultValue={selectedUserForEdit.phone || ''} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedUserForEdit(null)}>Cancel</Button>
                  <Button onClick={() => {
                    // TODO: Implement save functionality
                    console.log('Save user changes');
                    setSelectedUserForEdit(null);
                  }}>Save Changes</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Flag Modal */}
      {selectedUserForFlag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Flag User</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUserForFlag(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Flag Reason</label>
                  <select className="w-full p-2 border rounded">
                    <option>Suspicious Activity</option>
                    <option>Policy Violation</option>
                    <option>Fraud Suspicion</option>
                    <option>Spam/Abuse</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea className="w-full p-2 border rounded h-20" placeholder="Additional details..."></textarea>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedUserForFlag(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => {
                    // TODO: Implement flag functionality
                    console.log('Flag user');
                    setSelectedUserForFlag(null);
                  }}>Flag User</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagementPanel;