/**
 * FeatureTogglePanel Component
 * Main panel for managing platform-wide feature toggles
 */

import React, { useState, useEffect } from 'react';
import { FeatureToggleList } from './FeatureToggleList';
import { FeatureConfigurationForm } from './FeatureConfigurationForm';
import { FeatureImpactAnalysis } from './FeatureImpactAnalysis';
import { useAuth } from '../../contexts/AuthContext';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { apiClient } from '../../services/api';

export interface PlatformFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'core' | 'booking' | 'payment' | 'geographic' | 'system';
  scope: 'global' | 'regional' | 'company';
  lastModified: Date;
  modifiedBy: string;
  dependencies?: string[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface FeatureTogglePanelProps {
  className?: string;
  initialSubSection?: string;
}

export const FeatureTogglePanel: React.FC<FeatureTogglePanelProps> = ({ 
  className = '',
  initialSubSection = 'list'
}) => {
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<PlatformFeature | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'config' | 'analysis'>('list');

  // Update activeTab when initialSubSection prop changes
  useEffect(() => {
    // Map external sub-section names to internal tab names
    const sectionMapping: { [key: string]: 'list' | 'config' | 'analysis' } = {
      'feature-toggles': 'list',
      'feature-config': 'config',
      'list': 'list',
      'config': 'config',
      'analysis': 'analysis'
    };
    
    const mappedSection = sectionMapping[initialSubSection] || 'list';
    setActiveTab(mappedSection);
  }, [initialSubSection]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load features on component mount
  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiClient.get('/platform-admin/config/features', token || '');
      
      // Transform API response to match our interface
      const transformedFeatures: PlatformFeature[] = [
        {
          id: 'without-driver-listings',
          name: 'Without Driver Listings',
          description: 'Allow vehicle listings without requiring a driver',
          enabled: data.withoutDriverListings || false,
          category: 'core',
          scope: 'global',
          lastModified: new Date(),
          modifiedBy: 'System',
          impactLevel: 'high'
        },
        {
          id: 'hourly-bookings',
          name: 'Hourly Bookings',
          description: 'Enable hourly booking options for short-term rentals',
          enabled: data.hourlyBookings || false,
          category: 'booking',
          scope: 'global',
          lastModified: new Date(),
          modifiedBy: 'System',
          impactLevel: 'medium'
        },
        {
          id: 'recurring-bookings',
          name: 'Recurring Bookings',
          description: 'Allow users to create recurring booking schedules',
          enabled: data.recurringBookings || false,
          category: 'booking',
          scope: 'global',
          lastModified: new Date(),
          modifiedBy: 'System',
          impactLevel: 'medium'
        },
        {
          id: 'instant-booking',
          name: 'Instant Booking',
          description: 'Enable instant booking without approval',
          enabled: data.instantBooking || false,
          category: 'booking',
          scope: 'global',
          lastModified: new Date(),
          modifiedBy: 'System',
          impactLevel: 'high'
        },
        {
          id: 'auto-approval',
          name: 'Auto Approval',
          description: 'Automatically approve bookings that meet criteria',
          enabled: data.autoApprovalEnabled || false,
          category: 'booking',
          scope: 'global',
          lastModified: new Date(),
          modifiedBy: 'System',
          impactLevel: 'high'
        },
        {
          id: 'maintenance-mode',
          name: 'Maintenance Mode',
          description: 'Put the platform in maintenance mode',
          enabled: data.maintenanceMode || false,
          category: 'system',
          scope: 'global',
          lastModified: new Date(),
          modifiedBy: 'System',
          impactLevel: 'critical'
        }
      ];

      setFeatures(transformedFeatures);
    } catch (err) {
      console.error('Error loading features:', err);
      setError(err instanceof Error ? err.message : 'Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = async (featureId: string, enabled: boolean) => {
    try {
      const feature = features.find(f => f.id === featureId);
      if (!feature) return;

      // Show confirmation for critical features
      if (feature.impactLevel === 'critical') {
        const confirmed = window.confirm(
          `Are you sure you want to ${enabled ? 'enable' : 'disable'} ${feature.name}? ` +
          'This is a critical feature that may significantly impact the platform.'
        );
        if (!confirmed) return;
      }

      await apiClient.put(`/platform-admin/config/features/${featureId}`, { enabled }, token || '');

      // Update local state
      setFeatures(prev => prev.map(f => 
        f.id === featureId 
          ? { ...f, enabled, lastModified: new Date() }
          : f
      ));

      // Show success message
      console.log(`Feature ${feature.name} ${enabled ? 'enabled' : 'disabled'} successfully`);
      
    } catch (err) {
      console.error('Error toggling feature:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle feature');
    }
  };

  const handleBulkUpdate = async (updates: Array<{ featureId: string; enabled: boolean }>) => {
    try {
      await apiClient.post('/platform-admin/config/features/bulk-update', { updates }, token || '');

      // Reload features to get updated state
      await loadFeatures();
      
    } catch (err) {
      console.error('Error bulk updating features:', err);
      setError(err instanceof Error ? err.message : 'Failed to bulk update features');
    }
  };

  if (loading) {
    return (
      <div className={`feature-toggle-panel ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading features...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`feature-toggle-panel ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Features</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadFeatures}
                className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`feature-toggle-panel bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Feature Toggle Management</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage platform-wide feature toggles and configurations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { id: 'list', name: 'Feature List', icon: '📋' },
            { id: 'config', name: 'Configuration', icon: '⚙️' },
            { id: 'analysis', name: 'Impact Analysis', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'list' && (
          <FeatureToggleList
            features={features}
            onToggle={handleFeatureToggle}
            onBulkUpdate={handleBulkUpdate}
            onSelectFeature={setSelectedFeature}
          />
        )}
        
        {activeTab === 'config' && (
          <FeatureConfigurationForm
            selectedFeature={selectedFeature}
            onFeatureUpdate={loadFeatures}
          />
        )}
        
        {activeTab === 'analysis' && (
          <FeatureImpactAnalysis
            features={features}
            selectedFeature={selectedFeature}
          />
        )}
      </div>
    </div>
  );
};