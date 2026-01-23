/**
 * Platform Configuration Panel Component
 * Unified interface for managing all platform configurations including commission rates, tax rates, etc.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { getApiUrl } from '../../config/app.config';
import { 
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Globe,
  Shield,
  Zap
} from 'lucide-react';

interface PlatformConfig {
  id: string;
  category: 'financial' | 'system' | 'features' | 'security' | 'performance';
  key: string;
  value: any;
  displayName: string;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  isEditable: boolean;
  requiresRestart: boolean;
  updatedAt: Date;
  updatedBy: string;
}

interface ConfigurationPanelProps {
  className?: string;
}

const PlatformConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ className = '' }) => {
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('financial');
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());

  // Fetch platform configurations
  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(getApiUrl('/platform-admin/config/config'), {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.data || []);
      } else {
        throw new Error('Failed to fetch configurations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
      console.error('Error fetching configurations:', err);
      setConfigs([]); // Set empty array instead of mock data
    } finally {
      setLoading(false);
    }
  };



  // Handle configuration value change
  const handleConfigChange = (key: string, value: any) => {
    const newPendingChanges = new Map(pendingChanges);
    newPendingChanges.set(key, value);
    setPendingChanges(newPendingChanges);
  };

  // Save all pending changes
  const saveChanges = async () => {
    if (pendingChanges.size === 0) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updates = Array.from(pendingChanges.entries()).map(([key, value]) => ({
        key,
        value
      }));

      const validToken = await tokenManager.getValidToken();
      const response = await fetch(getApiUrl('/platform-admin/config/config/bulk-update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({ updates })
      });

      if (response.ok) {
        await response.json();
        
        // Update local state
        setConfigs(prevConfigs => 
          prevConfigs.map(config => {
            const newValue = pendingChanges.get(config.key);
            if (newValue !== undefined) {
              return { ...config, value: newValue, updatedAt: new Date() };
            }
            return config;
          })
        );

        setPendingChanges(new Map());
        setSuccess(`Successfully updated ${updates.length} configuration(s)`);

        // Check if any changes require restart
        const requiresRestart = updates.some(update => {
          const config = configs.find(c => c.key === update.key);
          return config?.requiresRestart;
        });

        if (requiresRestart) {
          setSuccess(prev => `${prev}. Some changes require a system restart to take effect.`);
        }
      } else {
        throw new Error('Failed to save configurations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configurations');
    } finally {
      setSaving(false);
    }
  };

  // Reset pending changes
  const resetChanges = () => {
    setPendingChanges(new Map());
    setError(null);
    setSuccess(null);
  };

  // Get current value (pending or saved)
  const getCurrentValue = (config: PlatformConfig) => {
    return pendingChanges.has(config.key) ? pendingChanges.get(config.key) : config.value;
  };

  // Check if config has pending changes
  const hasPendingChange = (config: PlatformConfig) => {
    return pendingChanges.has(config.key);
  };

  // Render configuration input
  const renderConfigInput = (config: PlatformConfig) => {
    const currentValue = getCurrentValue(config);
    const isPending = hasPendingChange(config);

    if (!config.isEditable) {
      return (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
            {config.dataType === 'boolean' ? (currentValue ? 'Enabled' : 'Disabled') : String(currentValue)}
          </span>
          <Badge variant="secondary">Read Only</Badge>
        </div>
      );
    }

    switch (config.dataType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={currentValue}
              onCheckedChange={(checked: boolean) => handleConfigChange(config.key, checked)}
            />
            <span className="text-sm">{currentValue ? 'Enabled' : 'Disabled'}</span>
            {isPending && <Badge variant="outline">Changed</Badge>}
          </div>
        );

      case 'select':
        return (
          <div className="flex items-center space-x-2">
            <select
              value={currentValue}
              onChange={(e) => handleConfigChange(config.key, e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {config.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {isPending && <Badge variant="outline">Changed</Badge>}
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => handleConfigChange(config.key, parseFloat(e.target.value) || 0)}
              min={config.min}
              max={config.max}
              className="w-32"
            />
            {config.unit && <span className="text-sm text-gray-500">{config.unit}</span>}
            {isPending && <Badge variant="outline">Changed</Badge>}
          </div>
        );

      default:
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              value={currentValue}
              onChange={(e) => handleConfigChange(config.key, e.target.value)}
              className="w-48"
            />
            {isPending && <Badge variant="outline">Changed</Badge>}
          </div>
        );
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return <DollarSign className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'features': return <Zap className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'performance': return <Globe className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading configurations...</span>
        </div>
      </div>
    );
  }

  const categories = ['financial', 'system', 'features', 'security', 'performance'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Platform Configuration</h1>
          <p className="text-muted-foreground">
            Configure commission rates, tax rates, and other platform settings
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {pendingChanges.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={resetChanges}>
                Reset Changes
              </Button>
              <Button 
                size="sm" 
                onClick={saveChanges}
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes ({pendingChanges.size})
              </Button>
            </>
          )}

          <Button variant="outline" size="sm" onClick={fetchConfigurations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Messages */}
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

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          {categories.map(category => (
            <TabsTrigger key={category} value={category} className="flex items-center space-x-2">
              {getCategoryIcon(category)}
              <span className="capitalize">{category}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getCategoryIcon(category)}
                  <span className="capitalize">{category} Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {configs
                    .filter(config => config.category === category)
                    .map(config => (
                      <div key={config.key} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Label className="font-medium">{config.displayName}</Label>
                            {config.requiresRestart && (
                              <Badge variant="outline" className="text-xs">
                                Requires Restart
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {config.description}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            Last updated: {config.updatedAt.toLocaleString()} by {config.updatedBy}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {renderConfigInput(config)}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default PlatformConfigurationPanel;