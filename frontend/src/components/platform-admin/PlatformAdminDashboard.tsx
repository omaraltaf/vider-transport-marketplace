import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlatformAdminLayout } from './PlatformAdminLayout';
import { PlatformAdminOverview } from './PlatformAdminOverview';
import { FeatureTogglePanel } from './FeatureTogglePanel';
import PlatformAnalyticsDashboard from './PlatformAnalyticsDashboard';
import FinancialManagementPanel from './FinancialManagementPanel';
import { CompanyManagementPanel } from './CompanyManagementPanel';
import UserManagementPanel from './UserManagementPanel';
import SystemAdministrationPanel from './SystemAdministrationPanel';
import { CommunicationCenter } from './CommunicationCenter';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { getApiUrl } from '../../config/app.config';
import { useAuth } from '../../contexts/AuthContext';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { 
  Search, 
  Download, 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Users,
  DollarSign,
  MessageSquare
} from 'lucide-react';

interface GlobalNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source: string;
}

interface GlobalSearchResult {
  id: string;
  title: string;
  description: string;
  type: 'user' | 'company' | 'transaction' | 'ticket' | 'article' | 'feature';
  section: string;
  url: string;
  metadata?: any;
}

interface CrossPanelData {
  notifications: GlobalNotification[];
  searchResults: GlobalSearchResult[];
  systemStatus: {
    overall: 'healthy' | 'warning' | 'critical';
    services: { [key: string]: 'up' | 'down' | 'degraded' };
    lastUpdate: Date;
  };
  quickStats: {
    activeUsers: number;
    pendingTickets: number;
    systemAlerts: number;
    revenueToday: number;
  };
}

export const PlatformAdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState('overview');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [crossPanelData, setCrossPanelData] = useState<CrossPanelData | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle section changes with URL updates
  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    
    // Update URL based on section (including sub-sections)
    const sectionPaths: { [key: string]: string } = {
      'overview': '/platform-admin',
      'companies': '/platform-admin/companies',
      'company-overview': '/platform-admin/companies',
      'company-verification': '/platform-admin/companies',
      'company-analytics': '/platform-admin/companies',
      'company-management': '/platform-admin/companies',
      'management': '/platform-admin/users',
      'user-overview': '/platform-admin/users',
      'bulk-operations': '/platform-admin/users',
      'activity-monitoring': '/platform-admin/users',
      'content-moderation': '/platform-admin/users',
      'fraud-detection': '/platform-admin/users',
      'analytics': '/platform-admin/analytics',
      'dashboard': '/platform-admin/analytics',
      'growth': '/platform-admin/analytics',
      'geographic': '/platform-admin/analytics',
      'financial': '/platform-admin/financial',
      'revenue': '/platform-admin/financial',
      'commissions': '/platform-admin/financial',
      'disputes': '/platform-admin/financial',
      'features': '/platform-admin/features',
      'feature-toggles': '/platform-admin/features',
      'feature-config': '/platform-admin/features',
      'system': '/platform-admin/system',
      'system-health': '/platform-admin/system',
      'backups': '/platform-admin/system',
      'audit-logs': '/platform-admin/system',
      'configuration': '/platform-admin/system',
      'communication': '/platform-admin/communication',
      'announcements': '/platform-admin/communication',
      'support-tickets': '/platform-admin/communication',
      'help-center': '/platform-admin/communication'
    };
    
    const newPath = sectionPaths[section] || '/platform-admin';
    if (location.pathname !== newPath) {
      navigate(newPath, { replace: true });
    }
  };

  // Handle URL-based routing
  useEffect(() => {
    const path = location.pathname;
    
    // Only update section if it's not already a sub-section of the current main section
    const isCompanySubSection = ['companies', 'company-overview', 'company-verification', 'company-analytics', 'company-management'].includes(currentSection);
    const isUserSubSection = ['management', 'user-overview', 'bulk-operations', 'activity-monitoring', 'content-moderation', 'fraud-detection'].includes(currentSection);
    const isAnalyticsSubSection = ['analytics', 'dashboard', 'growth', 'geographic'].includes(currentSection);
    const isFinancialSubSection = ['financial', 'revenue', 'commissions', 'disputes'].includes(currentSection);
    const isFeaturesSubSection = ['features', 'feature-toggles', 'feature-config'].includes(currentSection);
    const isSystemSubSection = ['system', 'system-health', 'backups', 'audit-logs', 'configuration'].includes(currentSection);
    const isCommunicationSubSection = ['communication', 'announcements', 'support-tickets', 'help-center'].includes(currentSection);
    
    if (path.includes('/companies') && !isCompanySubSection) {
      setCurrentSection('companies');
    } else if (path.includes('/users') && !isUserSubSection) {
      setCurrentSection('management');
    } else if (path.includes('/analytics') && !isAnalyticsSubSection) {
      setCurrentSection('analytics');
    } else if (path.includes('/financial') && !isFinancialSubSection) {
      setCurrentSection('financial');
    } else if (path.includes('/features') && !isFeaturesSubSection) {
      setCurrentSection('features');
    } else if (path.includes('/system') && !isSystemSubSection) {
      setCurrentSection('system');
    } else if (path.includes('/communication') && !isCommunicationSubSection) {
      setCurrentSection('communication');
    } else if (path === '/platform-admin' || path === '/platform-admin/') {
      setCurrentSection('overview');
    }
  }, [location.pathname, currentSection]);

  useEffect(() => {
    fetchCrossPanelData();
    
    // Set up real-time updates
    const interval = setInterval(fetchCrossPanelData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (globalSearchQuery.length > 2) {
      performGlobalSearch(globalSearchQuery);
      setShowGlobalSearch(true);
    } else {
      setShowGlobalSearch(false);
      setGlobalSearchResults([]);
    }
  }, [globalSearchQuery]);

  const fetchCrossPanelData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      
      // Get valid token using TokenManager and create headers
      const validToken = await tokenManager.getValidToken();
      
      const headers = {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      };

      // Fetch global notifications
      const notificationsResponse = await fetch(getApiUrl('/platform-admin/notifications/global'), { headers });
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.notifications || []);
      } else {
        console.error('Failed to fetch notifications:', notificationsResponse.status);
      }

      // Fetch cross-panel data
      const crossPanelResponse = await fetch(getApiUrl('/platform-admin/cross-panel/data'), { headers });
      if (crossPanelResponse.ok) {
        const crossPanelDataResult = await crossPanelResponse.json();
        setCrossPanelData(crossPanelDataResult);
      } else {
        console.error('Failed to fetch cross-panel data:', crossPanelResponse.status);
        // Set mock data for development
        setCrossPanelData({
          notifications: [],
          searchResults: [],
          systemStatus: {
            overall: 'healthy',
            services: {},
            lastUpdate: new Date()
          },
          quickStats: {
            activeUsers: 0,
            pendingTickets: 0,
            systemAlerts: 0,
            revenueToday: 0
          }
        });
      }

    } catch (error) {
      console.error('Error fetching cross-panel data:', error);
      // Set mock data for development
      setCrossPanelData({
        notifications: [],
        searchResults: [],
        systemStatus: {
          overall: 'healthy',
          services: {},
          lastUpdate: new Date()
        },
        quickStats: {
          activeUsers: 0,
          pendingTickets: 0,
          systemAlerts: 0,
          revenueToday: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const performGlobalSearch = async (query: string) => {
    if (!token) return;
    
    try {
      // Get valid token using TokenManager
      const validToken = await tokenManager.getValidToken();
      
      const headers = {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(`/api/platform-admin/search/global?q=${encodeURIComponent(query)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setGlobalSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Error performing global search:', error);
    }
  };

  const handleGlobalExport = async (format: 'csv' | 'excel' | 'json') => {
    try {
      const response = await fetch(`/api/platform-admin/export/global?format=${format}&section=${currentSection}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-admin-${currentSection}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/platform-admin/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSearchResultIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'transaction':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'ticket':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'overview':
        return <PlatformAdminOverview />;
      case 'features':
        return <FeatureTogglePanel initialSubSection="list" />;
      case 'feature-toggles':
        return <FeatureTogglePanel initialSubSection="feature-toggles" />;
      case 'feature-config':
        return <FeatureTogglePanel initialSubSection="feature-config" />;
      case 'analytics':
        return <PlatformAnalyticsDashboard initialSubSection="dashboard" />;
      case 'dashboard':
        return <PlatformAnalyticsDashboard initialSubSection="dashboard" />;
      case 'growth':
        return <PlatformAnalyticsDashboard initialSubSection="growth" />;
      case 'geographic':
        return <PlatformAnalyticsDashboard initialSubSection="geographic" />;
      case 'financial':
        return <FinancialManagementPanel initialSubSection="dashboard" />;
      case 'revenue':
        return <FinancialManagementPanel initialSubSection="revenue" />;
      case 'commissions':
        return <FinancialManagementPanel initialSubSection="commissions" />;
      case 'disputes':
        return <FinancialManagementPanel initialSubSection="disputes" />;
      case 'companies':
        return <CompanyManagementPanel initialSubSection="overview" />;
      case 'company-overview':
        return <CompanyManagementPanel initialSubSection="company-overview" />;
      case 'company-verification':
        return <CompanyManagementPanel initialSubSection="company-verification" />;
      case 'company-analytics':
        return <CompanyManagementPanel initialSubSection="company-analytics" />;
      case 'company-management':
        return <CompanyManagementPanel initialSubSection="company-management" />;
      case 'management':
        return <UserManagementPanel initialSubSection="overview" />;
      case 'user-overview':
        return <UserManagementPanel initialSubSection="user-overview" />;
      case 'bulk-operations':
        return <UserManagementPanel initialSubSection="bulk-operations" />;
      case 'activity-monitoring':
        return <UserManagementPanel initialSubSection="activity-monitoring" />;
      case 'content-moderation':
        return <UserManagementPanel initialSubSection="content-moderation" />;
      case 'fraud-detection':
        return <UserManagementPanel initialSubSection="fraud-detection" />;
      case 'system':
        return <SystemAdministrationPanel initialSubSection="health" />;
      case 'system-health':
        return <SystemAdministrationPanel initialSubSection="system-health" />;
      case 'backups':
        return <SystemAdministrationPanel initialSubSection="backups" />;
      case 'audit-logs':
        return <SystemAdministrationPanel initialSubSection="audit-logs" />;
      case 'configuration':
        return <SystemAdministrationPanel initialSubSection="configuration" />;
      case 'communication':
        return <CommunicationCenter initialSubSection="announcements" />;
      case 'announcements':
        return <CommunicationCenter initialSubSection="announcements" />;
      case 'support-tickets':
        return <CommunicationCenter initialSubSection="support-tickets" />;
      case 'help-center':
        return <CommunicationCenter initialSubSection="help-center" />;
      default:
        return <PlatformAdminOverview />;
    }
  };

  return (
    <div className="relative">
      <PlatformAdminLayout 
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      >
        {/* Global Features Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Global Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search across all data..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="pl-10"
            />
            
            {/* Global Search Results */}
            {showGlobalSearch && globalSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {globalSearchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      handleSectionChange(result.section);
                      setShowGlobalSearch(false);
                      setGlobalSearchQuery('');
                    }}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 text-left"
                  >
                    {getSearchResultIcon(result.type)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{result.title}</p>
                      <p className="text-sm text-gray-600">{result.description}</p>
                      <p className="text-xs text-gray-500">{result.section}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Global Actions */}
          <div className="flex items-center space-x-2">
            {/* Quick Stats */}
            {crossPanelData && crossPanelData.quickStats && (
              <div className="hidden lg:flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {crossPanelData.quickStats.activeUsers || 0} active
                </span>
                <span className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {crossPanelData.quickStats.pendingTickets || 0} tickets
                </span>
                <span className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {crossPanelData.quickStats.systemAlerts || 0} alerts
                </span>
              </div>
            )}

            {/* Global Notifications */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">Notifications</h4>
                  </div>
                  <div className="space-y-1">
                    {notifications.slice(0, 5).map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => markNotificationAsRead(notification.id)}
                        className={`w-full flex items-start space-x-3 p-3 hover:bg-gray-50 text-left ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                          <p className="text-sm text-gray-600">{notification.message}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500">{notification.source}</p>
                            <p className="text-xs text-gray-500">
                              {notification.timestamp.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                  {notifications.length > 5 && (
                    <div className="p-3 border-t border-gray-200">
                      <Button variant="outline" size="sm" className="w-full">
                        View All Notifications
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Global Export */}
            <div className="relative group">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => handleGlobalExport('csv')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleGlobalExport('excel')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  Export Excel
                </button>
                <button
                  onClick={() => handleGlobalExport('json')}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCrossPanelData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* System Status Banner */}
        {crossPanelData && crossPanelData.systemStatus && crossPanelData.systemStatus.overall !== 'healthy' && (
          <div className={`mb-6 p-4 rounded-lg border ${
            crossPanelData.systemStatus.overall === 'critical' 
              ? 'border-red-200 bg-red-50' 
              : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`h-5 w-5 ${
                  crossPanelData.systemStatus.overall === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`} />
                <span className="font-medium">
                  System Status: {crossPanelData.systemStatus.overall === 'critical' ? 'Critical Issues Detected' : 'Performance Degraded'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSectionChange('system')}
              >
                View Details
              </Button>
            </div>
          </div>
        )}



        {/* Main Content */}
        {renderCurrentSection()}
      </PlatformAdminLayout>

      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span>Loading platform data...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};