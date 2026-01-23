/**
 * Bulk Operations Panel Component
 * Interface for performing bulk operations on users
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { getApiUrl } from '../../config/app.config';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { 
  Settings,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  FileText,
  Flag
} from 'lucide-react';

interface BulkOperation {
  id: string;
  type: 'STATUS_UPDATE' | 'ROLE_ASSIGNMENT' | 'PERMISSION_UPDATE' | 'FLAG_USERS' | 'SEND_NOTIFICATION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  targetUsers: string[];
  parameters: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
}

interface BulkOperationsPanelProps {
  selectedUsers: string[];
  onClose: () => void;
  className?: string;
}

const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  selectedUsers,
  onClose,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('operations');
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Status Update Form
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: 'SUSPENDED',
    reason: ''
  });

  // Role Assignment Form
  const [roleAssignmentForm, setRoleAssignmentForm] = useState({
    role: 'CUSTOMER',
    removeExistingRoles: false
  });

  // Flag Users Form
  const [flagUsersForm, setFlagUsersForm] = useState({
    type: 'MANUAL_REVIEW',
    severity: 'MEDIUM',
    reason: '',
    description: ''
  });

  // Notification Form
  const [notificationForm, setNotificationForm] = useState({
    subject: '',
    message: '',
    type: 'INFO'
  });



  const handleStatusUpdate = async () => {
    if (!statusUpdateForm.reason.trim()) {
      setError('Please provide a reason for the status update');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(getApiUrl('/platform-admin/users/bulk-operations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          type: 'STATUS_UPDATE',
          targetUsers: selectedUsers,
          parameters: statusUpdateForm
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOperations(prev => [result.data, ...prev]);
          setActiveTab('history');
          setSuccess('Status update operation started successfully!');
          // Clear form
          setStatusUpdateForm({ status: 'SUSPENDED', reason: '' });
        } else {
          throw new Error(result.error || 'Failed to start bulk operation');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start bulk operation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleAssignment = async () => {
    try {
      setLoading(true);
      setError(null);

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(getApiUrl('/platform-admin/users/bulk-operations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          type: 'ROLE_ASSIGNMENT',
          targetUsers: selectedUsers,
          parameters: roleAssignmentForm
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOperations(prev => [result.data, ...prev]);
          setActiveTab('history');
          setSuccess('Role assignment operation started successfully!');
          // Clear form
          setRoleAssignmentForm({ role: 'CUSTOMER', removeExistingRoles: false });
        } else {
          throw new Error(result.error || 'Failed to start role assignment');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start role assignment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFlagUsers = async () => {
    if (!flagUsersForm.reason.trim() || !flagUsersForm.description.trim()) {
      setError('Please provide both reason and description for flagging');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(getApiUrl('/platform-admin/users/bulk-operations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          type: 'FLAG_USERS',
          targetUsers: selectedUsers,
          parameters: flagUsersForm
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOperations(prev => [result.data, ...prev]);
          setActiveTab('history');
          setSuccess('Flag users operation started successfully!');
          // Clear form
          setFlagUsersForm({ type: 'MANUAL_REVIEW', severity: 'MEDIUM', reason: '', description: '' });
        } else {
          throw new Error(result.error || 'Failed to flag users');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to flag users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.subject.trim() || !notificationForm.message.trim()) {
      setError('Please provide both subject and message');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(getApiUrl('/platform-admin/users/bulk-operations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          type: 'SEND_NOTIFICATION',
          targetUsers: selectedUsers,
          parameters: notificationForm
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOperations(prev => [result.data, ...prev]);
          setActiveTab('history');
          setSuccess('Notification sent successfully!');
          // Clear form
          setNotificationForm({ subject: '', message: '', type: 'INFO' });
        } else {
          throw new Error(result.error || 'Failed to send notifications');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'IN_PROGRESS': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'CANCELLED': return <X className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div 
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg ${className}`}
        style={{
          width: '90%',
          maxWidth: '56rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          border: '1px solid #e5e7eb'
        }}
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-6 w-6" />
              <h2 className="text-2xl font-semibold">Bulk Operations</h2>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                {selectedUsers.length} users selected
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>{success}</span>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="import">Import/Export</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="operations" className="space-y-6">
              {/* Status Update */}
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-lg font-semibold mb-4">Update User Status</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-1">New Status</label>
                    <select 
                      id="status"
                      value={statusUpdateForm.status}
                      onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="BANNED">Banned</option>
                      <option value="PENDING_VERIFICATION">Pending Verification</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium mb-1">Reason *</label>
                    <input
                      id="reason"
                      type="text"
                      value={statusUpdateForm.reason}
                      onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Provide a reason for this status change"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <button 
                    onClick={handleStatusUpdate} 
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Update Status'}
                  </button>
                </div>
              </div>

              {/* Role Assignment */}
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-lg font-semibold mb-4">Assign Roles</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium mb-1">Role</label>
                    <select 
                      id="role"
                      value={roleAssignmentForm.role}
                      onChange={(e) => setRoleAssignmentForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="CUSTOMER">Customer</option>
                      <option value="DRIVER">Driver</option>
                      <option value="COMPANY_ADMIN">Company Admin</option>
                      <option value="PLATFORM_ADMIN">Platform Admin</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleRoleAssignment} 
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Assign Role'}
                  </button>
                </div>
              </div>

              {/* Flag Users */}
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-lg font-semibold mb-4">Flag Users</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="flagType" className="block text-sm font-medium mb-1">Flag Type</label>
                      <select 
                        id="flagType"
                        value={flagUsersForm.type}
                        onChange={(e) => setFlagUsersForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                        <option value="POLICY_VIOLATION">Policy Violation</option>
                        <option value="FRAUD_RISK">Fraud Risk</option>
                        <option value="MANUAL_REVIEW">Manual Review</option>
                        <option value="SECURITY_CONCERN">Security Concern</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="severity" className="block text-sm font-medium mb-1">Severity</label>
                      <select 
                        id="severity"
                        value={flagUsersForm.severity}
                        onChange={(e) => setFlagUsersForm(prev => ({ ...prev, severity: e.target.value }))}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="flagReason" className="block text-sm font-medium mb-1">Reason *</label>
                    <input
                      id="flagReason"
                      type="text"
                      value={flagUsersForm.reason}
                      onChange={(e) => setFlagUsersForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Brief reason for flagging"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="flagDescription" className="block text-sm font-medium mb-1">Description *</label>
                    <textarea
                      id="flagDescription"
                      value={flagUsersForm.description}
                      onChange={(e) => setFlagUsersForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the issue"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      rows={3}
                    />
                  </div>

                  <button 
                    onClick={handleFlagUsers} 
                    disabled={loading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    {loading ? 'Processing...' : 'Flag Users'}
                  </button>
                </div>
              </div>

              {/* Send Notification */}
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-lg font-semibold mb-4">Send Notification</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="notificationType" className="block text-sm font-medium mb-1">Type</label>
                    <select 
                      id="notificationType"
                      value={notificationForm.type}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="INFO">Information</option>
                      <option value="WARNING">Warning</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject *</label>
                    <input
                      id="subject"
                      type="text"
                      value={notificationForm.subject}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Notification subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-1">Message *</label>
                    <textarea
                      id="message"
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Notification message"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      rows={4}
                    />
                  </div>

                  <button 
                    onClick={handleSendNotification} 
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-6">
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-lg font-semibold mb-4">Import/Export Users</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="h-20 flex flex-col items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
                      <Upload className="h-6 w-6 mb-2" />
                      Import Users
                    </button>
                    
                    <button className="h-20 flex flex-col items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
                      <Download className="h-6 w-6 mb-2" />
                      Export Selected
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>• Import: Upload CSV file with user data</p>
                    <p>• Export: Download selected users as CSV</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {operations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bulk operations yet</p>
                </div>
              ) : (
                operations.map(operation => (
                  <div key={operation.id} className="border rounded-lg p-4 bg-white">
                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(operation.status)}
                          <div>
                            <h4 className="font-medium">{operation.type.replace('_', ' ')}</h4>
                            <p className="text-sm text-muted-foreground">
                              {operation.targetUsers.length} users • {operation.createdAt.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(operation.status)}`}>
                          {operation.status}
                        </span>
                      </div>
                      
                      {operation.status !== 'PENDING' && (
                        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <span className="ml-1 font-medium">{operation.progress.total}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Processed:</span>
                            <span className="ml-1 font-medium">{operation.progress.processed}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Successful:</span>
                            <span className="ml-1 font-medium text-green-600">{operation.progress.successful}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Failed:</span>
                            <span className="ml-1 font-medium text-red-600">{operation.progress.failed}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BulkOperationsPanel;