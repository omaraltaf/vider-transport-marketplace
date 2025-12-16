import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Home,
  ToggleLeft,
  BarChart3,
  DollarSign,
  Users,
  Shield,
  Server,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Building2,
  CheckCircle
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: NavigationItem[];
  badge?: string;
  active?: boolean;
}

interface PlatformAdminLayoutProps {
  children: React.ReactNode;
  currentSection?: string;
  onSectionChange?: (section: string) => void;
}

export const PlatformAdminLayout: React.FC<PlatformAdminLayoutProps> = ({
  children,
  currentSection = 'overview',
  onSectionChange
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState(3);
  const [expandedSections, setExpandedSections] = useState<string[]>(['companies', 'management']);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; path: string }[]>([]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails on server, clear local state and navigate
      navigate('/login');
    }
  };

  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home className="h-5 w-5" />,
      path: '/platform-admin/overview'
    },
    {
      id: 'features',
      label: 'Feature Management',
      icon: <ToggleLeft className="h-5 w-5" />,
      path: '/platform-admin/features',
      children: [
        {
          id: 'feature-toggles',
          label: 'Feature Toggles',
          icon: <ToggleLeft className="h-4 w-4" />,
          path: '/platform-admin/features/toggles'
        },
        {
          id: 'feature-config',
          label: 'Configuration',
          icon: <Settings className="h-4 w-4" />,
          path: '/platform-admin/features/config'
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/platform-admin/analytics',
      children: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <BarChart3 className="h-4 w-4" />,
          path: '/platform-admin/analytics/dashboard'
        },
        {
          id: 'growth',
          label: 'Growth Analytics',
          icon: <BarChart3 className="h-4 w-4" />,
          path: '/platform-admin/analytics/growth'
        },
        {
          id: 'geographic',
          label: 'Geographic Data',
          icon: <BarChart3 className="h-4 w-4" />,
          path: '/platform-admin/analytics/geographic'
        }
      ]
    },
    {
      id: 'financial',
      label: 'Financial Management',
      icon: <DollarSign className="h-5 w-5" />,
      path: '/platform-admin/financial',
      children: [
        {
          id: 'revenue',
          label: 'Revenue Dashboard',
          icon: <DollarSign className="h-4 w-4" />,
          path: '/platform-admin/financial/revenue'
        },
        {
          id: 'commissions',
          label: 'Commission Rates',
          icon: <DollarSign className="h-4 w-4" />,
          path: '/platform-admin/financial/commissions'
        },
        {
          id: 'disputes',
          label: 'Disputes & Refunds',
          icon: <Shield className="h-4 w-4" />,
          path: '/platform-admin/financial/disputes'
        }
      ]
    },
    {
      id: 'companies',
      label: 'Company Management',
      icon: <Building2 className="h-5 w-5" />,
      path: '/platform-admin/companies',
      badge: '3',
      children: [
        {
          id: 'company-overview',
          label: 'Company Overview',
          icon: <Building2 className="h-4 w-4" />,
          path: '/platform-admin/companies/overview'
        },
        {
          id: 'company-verification',
          label: 'Verification Queue',
          icon: <CheckCircle className="h-4 w-4" />,
          path: '/platform-admin/companies/verification',
          badge: '1'
        },
        {
          id: 'company-analytics',
          label: 'Company Analytics',
          icon: <BarChart3 className="h-4 w-4" />,
          path: '/platform-admin/companies/analytics'
        },
        {
          id: 'company-management',
          label: 'Management Tools',
          icon: <Settings className="h-4 w-4" />,
          path: '/platform-admin/companies/management'
        }
      ]
    },
    {
      id: 'management',
      label: 'User Management',
      icon: <Users className="h-5 w-5" />,
      path: '/platform-admin/users',
      badge: '12',
      children: [
        {
          id: 'user-overview',
          label: 'User Overview',
          icon: <Users className="h-4 w-4" />,
          path: '/platform-admin/users/overview'
        },
        {
          id: 'bulk-operations',
          label: 'Bulk Operations',
          icon: <Users className="h-4 w-4" />,
          path: '/platform-admin/users/bulk'
        },
        {
          id: 'activity-monitoring',
          label: 'Activity Monitoring',
          icon: <Shield className="h-4 w-4" />,
          path: '/platform-admin/users/activity'
        },
        {
          id: 'content-moderation',
          label: 'Content Moderation',
          icon: <Shield className="h-4 w-4" />,
          path: '/platform-admin/users/moderation',
          badge: '5'
        },
        {
          id: 'fraud-detection',
          label: 'Fraud Detection',
          icon: <Shield className="h-4 w-4" />,
          path: '/platform-admin/users/fraud',
          badge: '2'
        }
      ]
    },
    {
      id: 'system',
      label: 'System Administration',
      icon: <Server className="h-5 w-5" />,
      path: '/platform-admin/system',
      children: [
        {
          id: 'system-health',
          label: 'System Health',
          icon: <Server className="h-4 w-4" />,
          path: '/platform-admin/system/health'
        },
        {
          id: 'backups',
          label: 'Backup Management',
          icon: <Server className="h-4 w-4" />,
          path: '/platform-admin/system/backups'
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: <Shield className="h-4 w-4" />,
          path: '/platform-admin/system/audit'
        },
        {
          id: 'configuration',
          label: 'Configuration',
          icon: <Settings className="h-4 w-4" />,
          path: '/platform-admin/system/configuration'
        }
      ]
    },
    {
      id: 'communication',
      label: 'Communication Center',
      icon: <MessageSquare className="h-5 w-5" />,
      path: '/platform-admin/communication',
      children: [
        {
          id: 'announcements',
          label: 'Announcements',
          icon: <Bell className="h-4 w-4" />,
          path: '/platform-admin/communication/announcements'
        },
        {
          id: 'support-tickets',
          label: 'Support Tickets',
          icon: <MessageSquare className="h-4 w-4" />,
          path: '/platform-admin/communication/tickets',
          badge: '8'
        },
        {
          id: 'help-center',
          label: 'Help Center',
          icon: <MessageSquare className="h-4 w-4" />,
          path: '/platform-admin/communication/help'
        }
      ]
    }
  ];

  useEffect(() => {
    // Update breadcrumbs based on current section
    updateBreadcrumbs(currentSection);
  }, [currentSection]);

  const updateBreadcrumbs = (section: string) => {
    const crumbs: { label: string; path: string }[] = [
      { label: 'Platform Admin', path: '/platform-admin' }
    ];

    // Find the current item and build breadcrumbs
    for (const item of navigationItems) {
      if (item.id === section) {
        crumbs.push({ label: item.label, path: item.path });
        break;
      }
      if (item.children) {
        for (const child of item.children) {
          if (child.id === section) {
            crumbs.push({ label: item.label, path: item.path });
            crumbs.push({ label: child.label, path: child.path });
            break;
          }
        }
      }
    }

    setBreadcrumbs(crumbs);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleNavigation = (item: NavigationItem) => {
    onSectionChange?.(item.id);
    
    // Auto-expand parent section if navigating to child
    const parentItem = navigationItems.find(nav => 
      nav.children?.some(child => child.id === item.id)
    );
    if (parentItem && !expandedSections.includes(parentItem.id)) {
      setExpandedSections(prev => [...prev, parentItem.id]);
    }
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isExpanded = expandedSections.includes(item.id);
    const isActive = currentSection === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.id);
            } else {
              handleNavigation(item);
            }
          }}
          className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors ${
            isActive 
              ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' 
              : 'text-gray-700 hover:bg-gray-100'
          } ${level > 0 ? 'ml-4' : ''}`}
        >
          <div className="flex items-center space-x-3">
            {item.icon}
            <span className={`${sidebarOpen ? 'block' : 'hidden'} font-medium`}>
              {item.label}
            </span>
            {item.badge && sidebarOpen && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </div>
          {hasChildren && sidebarOpen && (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          )}
        </button>
        
        {hasChildren && isExpanded && sidebarOpen && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">Platform Admin</h1>
                <p className="text-sm text-gray-600">Management Dashboard</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        {sidebarOpen && (
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map(item => renderNavigationItem(item))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen ? (
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <ChevronRight className="h-4 w-4" />}
                  <button
                    onClick={() => onSectionChange?.(crumb.path.split('/').pop() || 'overview')}
                    className={`hover:text-gray-900 ${
                      index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''
                    }`}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </nav>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Quick Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Quick search..."
                    className="pl-10 w-64"
                  />
                </div>
              </div>

              {/* Notifications */}
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {notifications}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Admin User
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};