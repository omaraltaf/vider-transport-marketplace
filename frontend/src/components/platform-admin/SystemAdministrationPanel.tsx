import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SystemHealthDashboard from './SystemHealthDashboard';
import BackupManager from './BackupManager';
import SystemAuditViewer from './SystemAuditViewer';
import PlatformConfigurationPanel from './PlatformConfigurationPanel';

interface SystemAdministrationPanelProps {
  className?: string;
  initialSubSection?: string;
  onSystemHealthRefresh?: () => void;
  onBackupCreated?: (backup: any) => void;
  onRestoreStarted?: (restore: any) => void;
  onAuditExport?: (data: any[]) => void;
}

const SystemAdministrationPanel: React.FC<SystemAdministrationPanelProps> = ({
  initialSubSection = 'health',
  onSystemHealthRefresh,
  onBackupCreated,
  onRestoreStarted,
  onAuditExport
}) => {
  const [activeTab, setActiveTab] = useState('health');

  // Update activeTab when initialSubSection prop changes
  useEffect(() => {
    // Map external sub-section names to internal tab names
    const sectionMapping: { [key: string]: string } = {
      'system-health': 'health',
      'backups': 'backup',
      'audit-logs': 'audit',
      'configuration': 'config',
      'health': 'health',
      'backup': 'backup',
      'audit': 'audit',
      'config': 'config'
    };
    
    const mappedSection = sectionMapping[initialSubSection] || 'health';
    setActiveTab(mappedSection);
  }, [initialSubSection]);
  const [systemStatus, setSystemStatus] = useState({
    overallHealth: 'healthy' as 'healthy' | 'warning' | 'critical',
    activeAlerts: 0,
    runningBackups: 0,
    lastBackup: null as Date | null,
    systemUptime: '99.9%'
  });

  const handleSystemHealthRefresh = () => {
    onSystemHealthRefresh?.();
    // Update system status based on health check
    // This would typically come from the SystemHealthDashboard component
  };

  const handleBackupCreated = (backup: any) => {
    setSystemStatus(prev => ({
      ...prev,
      runningBackups: prev.runningBackups + 1
    }));
    onBackupCreated?.(backup);
  };

  const handleRestoreStarted = (restore: any) => {
    onRestoreStarted?.(restore);
  };

  const handleAuditExport = (data: any[]) => {
    // Create CSV export
    const csvContent = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Admin', 'IP Address'],
      ...data.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.entityType,
        log.entityId,
        log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : log.adminId,
        log.ipAddress
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    onAuditExport?.(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with System Overview */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-gray-600 mt-1">
            Monitor system health, manage backups, and configure access controls
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.overallHealth)}`}></div>
              <Badge variant={getStatusBadgeVariant(systemStatus.overallHealth)}>
                System {systemStatus.overallHealth}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Uptime: {systemStatus.systemUptime}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System Health</p>
              <p className="text-2xl font-bold capitalize">{systemStatus.overallHealth}</p>
            </div>
            <div className={`w-4 h-4 rounded-full ${getStatusColor(systemStatus.overallHealth)}`}></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold">{systemStatus.activeAlerts}</p>
            </div>
            <div className={`w-4 h-4 rounded-full ${
              systemStatus.activeAlerts > 0 ? 'bg-red-500' : 'bg-green-500'
            }`}></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Running Backups</p>
              <p className="text-2xl font-bold">{systemStatus.runningBackups}</p>
            </div>
            <div className={`w-4 h-4 rounded-full ${
              systemStatus.runningBackups > 0 ? 'bg-blue-500' : 'bg-gray-300'
            }`}></div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Backup</p>
              <p className="text-lg font-bold">
                {systemStatus.lastBackup 
                  ? systemStatus.lastBackup.toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full ${
              systemStatus.lastBackup && 
              (Date.now() - systemStatus.lastBackup.getTime()) < 24 * 60 * 60 * 1000
                ? 'bg-green-500' 
                : 'bg-yellow-500'
            }`}></div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
          <TabsTrigger value="audit">Audit & Access Control</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <SystemHealthDashboard 
            onRefresh={handleSystemHealthRefresh}
            autoRefresh={true}
            refreshInterval={30000}
          />
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <BackupManager 
            onBackupCreated={handleBackupCreated}
            onRestoreStarted={handleRestoreStarted}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <SystemAuditViewer 
            onExport={handleAuditExport}
          />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <PlatformConfigurationPanel />
        </TabsContent>
      </Tabs>

      {/* Quick Actions Footer */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Quick Actions</h3>
            <p className="text-sm text-gray-600">Common system administration tasks</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setActiveTab('health')}
            >
              Check System Health
            </Button>
            <Button 
              variant="outline"
              onClick={() => setActiveTab('backup')}
            >
              Create Backup
            </Button>
            <Button 
              variant="outline"
              onClick={() => setActiveTab('audit')}
            >
              View Audit Logs
            </Button>
            <Button 
              variant="outline"
              onClick={() => setActiveTab('config')}
            >
              Configure Platform
            </Button>
            <Button>
              Emergency Procedures
            </Button>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Platform Version</p>
            <p className="font-mono">v2.1.0</p>
          </div>
          <div>
            <p className="text-gray-600">Environment</p>
            <p className="font-mono">Production</p>
          </div>
          <div>
            <p className="text-gray-600">Last Deployment</p>
            <p className="font-mono">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Database Version</p>
            <p className="font-mono">PostgreSQL 14.9</p>
          </div>
          <div>
            <p className="text-gray-600">Redis Version</p>
            <p className="font-mono">Redis 7.0.12</p>
          </div>
          <div>
            <p className="text-gray-600">Node.js Version</p>
            <p className="font-mono">v18.17.0</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemAdministrationPanel;