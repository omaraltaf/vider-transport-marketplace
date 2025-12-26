/**
 * FeatureImpactAnalysis Component
 * Displays feature usage analytics, impact analysis, and rollout preview
 */

import React, { useState, useEffect } from 'react';
import { tokenManager } from '../../services/error-handling/TokenManager';
import type { PlatformFeature } from './FeatureTogglePanel';

export interface FeatureImpactAnalysisProps {
  features: PlatformFeature[];
  selectedFeature: PlatformFeature | null;
}

interface FeatureUsageStats {
  featureId: string;
  totalUsage: number;
  activeUsers: number;
  companiesUsing: number;
  usageGrowth: number;
  lastUsed: Date;
}

interface ImpactMetrics {
  userImpact: {
    affectedUsers: number;
    activeBookings: number;
    potentialDisruption: 'low' | 'medium' | 'high' | 'critical';
  };
  businessImpact: {
    revenueAtRisk: number;
    companiesAffected: number;
    operationalImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
  };
  technicalImpact: {
    dependentFeatures: string[];
    systemLoad: number;
    performanceImpact: 'positive' | 'neutral' | 'negative';
  };
}

interface RolloutSimulation {
  strategy: 'immediate' | 'gradual' | 'staged' | 'canary';
  phases: Array<{
    phase: number;
    percentage: number;
    duration: string;
    estimatedUsers: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  totalDuration: string;
  rollbackTime: string;
  monitoringRequired: boolean;
}

interface FeatureDependency {
  featureId: string;
  featureName: string;
  dependencyType: 'blocks' | 'requires' | 'enhances' | 'conflicts';
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface AnalyticsData {
  usageTrends: Array<{
    date: string;
    usage: number;
    users: number;
    errors: number;
  }>;
  geographicDistribution: Array<{
    region: string;
    usage: number;
    percentage: number;
  }>;
  companyAdoption: Array<{
    companyId: string;
    companyName: string;
    adoptionDate: Date;
    usageLevel: 'low' | 'medium' | 'high';
  }>;
}

export const FeatureImpactAnalysis: React.FC<FeatureImpactAnalysisProps> = ({
  features,
  selectedFeature
}) => {
  const [usageStats, setUsageStats] = useState<FeatureUsageStats[]>([]);
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics | null>(null);
  const [rolloutSimulation, setRolloutSimulation] = useState<RolloutSimulation | null>(null);
  const [dependencies, setDependencies] = useState<FeatureDependency[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'overview' | 'simulation' | 'dependencies' | 'analytics'>('overview');

  useEffect(() => {
    loadUsageStats();
  }, [features, timeRange]);

  useEffect(() => {
    if (selectedFeature) {
      loadImpactMetrics(selectedFeature);
      loadRolloutSimulation(selectedFeature);
      loadDependencies(selectedFeature);
      loadAnalyticsData(selectedFeature);
    }
  }, [selectedFeature]);

  const loadUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real usage statistics from API
      const validToken = await tokenManager.getValidToken();
      const response = await fetch('/api/platform-admin/features/usage-stats', {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsageStats(data.stats || []);
      } else {
        // Set empty stats instead of mock data
        const emptyStats: FeatureUsageStats[] = features.map(feature => ({
          featureId: feature.id,
          totalUsage: 0,
          activeUsers: 0,
          companiesUsing: 0,
          usageGrowth: 0,
          lastUsed: new Date()
        }));
        setUsageStats(emptyStats);
      }
    } catch (err) {
      console.error('Error loading usage stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage statistics');
      
      // Set empty stats on error
      const emptyStats: FeatureUsageStats[] = features.map(feature => ({
        featureId: feature.id,
        totalUsage: 0,
        activeUsers: 0,
        companiesUsing: 0,
        usageGrowth: 0,
        lastUsed: new Date()
      }));
      setUsageStats(emptyStats);
    } finally {
      setLoading(false);
    }
  };

  const loadImpactMetrics = async (feature: PlatformFeature) => {
    try {
      // Fetch real impact analysis from API
      const validToken = await tokenManager.getValidToken();
      const response = await fetch(`/api/platform-admin/features/${feature.id}/impact`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setImpactMetrics(data.impact);
      } else {
        // Set empty impact metrics instead of mock data
        const emptyImpact: ImpactMetrics = {
          userImpact: {
            affectedUsers: 0,
            activeBookings: 0,
            potentialDisruption: feature.impactLevel as any
          },
          businessImpact: {
            revenueAtRisk: 0,
            companiesAffected: 0,
            operationalImpact: 'minimal'
          },
          technicalImpact: {
            dependentFeatures: feature.dependencies || [],
            systemLoad: 0,
            performanceImpact: 'neutral'
          }
        };

        setImpactMetrics(emptyImpact);
      }
    } catch (err) {
      console.error('Error loading impact metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load impact metrics');
      
      // Set empty impact on error
      const emptyImpact: ImpactMetrics = {
        userImpact: {
          affectedUsers: 0,
          activeBookings: 0,
          potentialDisruption: feature.impactLevel as any
        },
        businessImpact: {
          revenueAtRisk: 0,
          companiesAffected: 0,
          operationalImpact: 'minimal'
        },
        technicalImpact: {
          dependentFeatures: feature.dependencies || [],
          systemLoad: 0,
          performanceImpact: 'neutral'
        }
      };

      setImpactMetrics(emptyImpact);
    }
  };

  const loadRolloutSimulation = async (feature: PlatformFeature) => {
    try {
      // Mock rollout simulation based on feature impact level
      const mockSimulation: RolloutSimulation = {
        strategy: feature.impactLevel === 'critical' ? 'canary' :
                 feature.impactLevel === 'high' ? 'gradual' :
                 feature.impactLevel === 'medium' ? 'staged' : 'immediate',
        phases: feature.impactLevel === 'critical' ? [
          { phase: 1, percentage: 5, duration: '2 hours', estimatedUsers: 50, riskLevel: 'low' },
          { phase: 2, percentage: 25, duration: '6 hours', estimatedUsers: 250, riskLevel: 'medium' },
          { phase: 3, percentage: 50, duration: '12 hours', estimatedUsers: 500, riskLevel: 'medium' },
          { phase: 4, percentage: 100, duration: '24 hours', estimatedUsers: 1000, riskLevel: 'high' }
        ] : feature.impactLevel === 'high' ? [
          { phase: 1, percentage: 25, duration: '1 hour', estimatedUsers: 250, riskLevel: 'low' },
          { phase: 2, percentage: 100, duration: '4 hours', estimatedUsers: 1000, riskLevel: 'medium' }
        ] : feature.impactLevel === 'medium' ? [
          { phase: 1, percentage: 50, duration: '30 minutes', estimatedUsers: 500, riskLevel: 'low' },
          { phase: 2, percentage: 100, duration: '2 hours', estimatedUsers: 1000, riskLevel: 'low' }
        ] : [
          { phase: 1, percentage: 100, duration: 'Immediate', estimatedUsers: 1000, riskLevel: 'low' }
        ],
        totalDuration: feature.impactLevel === 'critical' ? '44 hours' :
                      feature.impactLevel === 'high' ? '5 hours' :
                      feature.impactLevel === 'medium' ? '2.5 hours' : 'Immediate',
        rollbackTime: feature.impactLevel === 'critical' ? '5 minutes' :
                     feature.impactLevel === 'high' ? '2 minutes' : '1 minute',
        monitoringRequired: feature.impactLevel === 'critical' || feature.impactLevel === 'high'
      };

      setRolloutSimulation(mockSimulation);
    } catch (err) {
      console.error('Error loading rollout simulation:', err);
    }
  };

  const loadDependencies = async (feature: PlatformFeature) => {
    try {
      // Mock dependencies based on feature type
      const mockDependencies: FeatureDependency[] = [];
      
      if (feature.id === 'without-driver-listings') {
        mockDependencies.push(
          { featureId: 'instant-booking', featureName: 'Instant Booking', dependencyType: 'enhances', impact: 'medium', description: 'Without-driver listings work better with instant booking enabled' },
          { featureId: 'auto-approval', featureName: 'Auto Approval', dependencyType: 'requires', impact: 'high', description: 'Auto approval is required for without-driver listings to function properly' }
        );
      }
      
      if (feature.id === 'hourly-bookings') {
        mockDependencies.push(
          { featureId: 'instant-booking', featureName: 'Instant Booking', dependencyType: 'enhances', impact: 'low', description: 'Hourly bookings benefit from instant booking capability' },
          { featureId: 'recurring-bookings', featureName: 'Recurring Bookings', dependencyType: 'conflicts', impact: 'medium', description: 'Hourly and recurring bookings may conflict in scheduling' }
        );
      }

      if (feature.id === 'maintenance-mode') {
        mockDependencies.push(
          { featureId: 'instant-booking', featureName: 'Instant Booking', dependencyType: 'blocks', impact: 'critical', description: 'Maintenance mode disables all booking functionality' },
          { featureId: 'hourly-bookings', featureName: 'Hourly Bookings', dependencyType: 'blocks', impact: 'critical', description: 'Maintenance mode disables all booking functionality' },
          { featureId: 'recurring-bookings', featureName: 'Recurring Bookings', dependencyType: 'blocks', impact: 'critical', description: 'Maintenance mode disables all booking functionality' }
        );
      }

      setDependencies(mockDependencies);
    } catch (err) {
      console.error('Error loading dependencies:', err);
    }
  };

  const loadAnalyticsData = async (feature: PlatformFeature) => {
    try {
      // Fetch real analytics data from API
      const validToken = await tokenManager.getValidToken();
      const response = await fetch(`/api/platform-admin/features/${feature.id}/analytics`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
      } else {
        // Set empty analytics data instead of mock data
        const emptyAnalytics: AnalyticsData = {
          usageTrends: [],
          geographicDistribution: [],
          companyAdoption: []
        };

        setAnalyticsData(emptyAnalytics);
      }
    } catch (err) {
      console.error('Error loading analytics data:', err);
    }
  };

  const getUsageStatsForFeature = (featureId: string) => {
    return usageStats.find(stat => stat.featureId === featureId);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 10) return 'text-green-600';
    if (growth > 0) return 'text-green-500';
    if (growth > -10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'low': case 'minimal': case 'positive': return 'text-green-600 bg-green-100';
      case 'medium': case 'moderate': case 'neutral': return 'text-yellow-600 bg-yellow-100';
      case 'high': case 'significant': case 'negative': return 'text-orange-600 bg-orange-100';
      case 'critical': case 'severe': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="feature-impact-analysis space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Feature Impact Analysis</h3>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: '90d', label: '90 Days' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as any)}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                timeRange === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Usage Statistics Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-base font-medium text-gray-900 mb-4">Feature Usage Statistics</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Companies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {features.map((feature) => {
                  const stats = getUsageStatsForFeature(feature.id);
                  return (
                    <tr key={feature.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                            <div className="text-sm text-gray-500">{feature.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          feature.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {feature.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats?.totalUsage.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats?.activeUsers.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stats?.companiesUsing || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {stats && (
                          <span className={getGrowthColor(stats.usageGrowth)}>
                            {stats.usageGrowth > 0 ? '+' : ''}{stats.usageGrowth.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Impact Analysis for Selected Feature */}
      {selectedFeature && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-base font-medium text-gray-900">
                Impact Analysis: {selectedFeature.name}
              </h4>
              
              {/* Analysis Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'overview', name: 'Overview', icon: '📊' },
                  { id: 'simulation', name: 'Rollout Simulation', icon: '🚀' },
                  { id: 'dependencies', name: 'Dependencies', icon: '🔗' },
                  { id: 'analytics', name: 'Advanced Analytics', icon: '📈' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAnalysisTab(tab.id as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-md flex items-center space-x-1 ${
                      activeAnalysisTab === tab.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Overview Tab */}
            {activeAnalysisTab === 'overview' && impactMetrics && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* User Impact */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-3">👥 User Impact</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Affected Users:</span>
                    <span className="text-sm font-medium text-blue-900">
                      {impactMetrics.userImpact.affectedUsers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Active Bookings:</span>
                    <span className="text-sm font-medium text-blue-900">
                      {impactMetrics.userImpact.activeBookings.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-700">Disruption Level:</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getImpactColor(impactMetrics.userImpact.potentialDisruption)}`}>
                      {impactMetrics.userImpact.potentialDisruption}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Impact */}
              <div className="bg-green-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-green-900 mb-3">💼 Business Impact</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Revenue at Risk:</span>
                    <span className="text-sm font-medium text-green-900">
                      {impactMetrics.businessImpact.revenueAtRisk.toLocaleString()} NOK
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Companies Affected:</span>
                    <span className="text-sm font-medium text-green-900">
                      {impactMetrics.businessImpact.companiesAffected}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-green-700">Operational Impact:</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getImpactColor(impactMetrics.businessImpact.operationalImpact)}`}>
                      {impactMetrics.businessImpact.operationalImpact}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Impact */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-purple-900 mb-3">⚙️ Technical Impact</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Dependencies:</span>
                    <span className="text-sm font-medium text-purple-900">
                      {impactMetrics.technicalImpact.dependentFeatures.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">System Load:</span>
                    <span className="text-sm font-medium text-purple-900">
                      {impactMetrics.technicalImpact.systemLoad.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-700">Performance:</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getImpactColor(impactMetrics.technicalImpact.performanceImpact)}`}>
                      {impactMetrics.technicalImpact.performanceImpact}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            )}

            {/* Dependencies */}
            {impactMetrics && impactMetrics.technicalImpact.dependentFeatures.length > 0 && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h5 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Feature Dependencies</h5>
                <p className="text-sm text-yellow-700 mb-2">
                  Changing this feature may affect the following dependent features:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {impactMetrics?.technicalImpact.dependentFeatures.map((dep, index) => (
                    <li key={index}>{dep}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rollout Preview */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">🚀 Rollout Preview</h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Estimated rollout time:</span>
                  <span className="font-medium text-gray-900">
                    {selectedFeature.impactLevel === 'critical' ? '15-30 minutes' : 
                     selectedFeature.impactLevel === 'high' ? '5-15 minutes' : 
                     selectedFeature.impactLevel === 'medium' ? '2-5 minutes' : 'Immediate'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Recommended rollout strategy:</span>
                  <span className="font-medium text-gray-900">
                    {selectedFeature.impactLevel === 'critical' ? 'Gradual (10% → 50% → 100%)' : 
                     selectedFeature.impactLevel === 'high' ? 'Staged (25% → 100%)' : 
                     'Immediate (100%)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Monitoring required:</span>
                  <span className="font-medium text-gray-900">
                    {selectedFeature.impactLevel === 'critical' || selectedFeature.impactLevel === 'high' ? 'Yes (24h)' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rollout Simulation Tab */}
            {activeAnalysisTab === 'simulation' && rolloutSimulation && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-blue-900 mb-3">🚀 Rollout Strategy: {rolloutSimulation.strategy.toUpperCase()}</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Total Duration:</span>
                      <span className="ml-1 text-blue-900">{rolloutSimulation.totalDuration}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Rollback Time:</span>
                      <span className="ml-1 text-blue-900">{rolloutSimulation.rollbackTime}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Monitoring:</span>
                      <span className="ml-1 text-blue-900">{rolloutSimulation.monitoringRequired ? 'Required' : 'Standard'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">Phases:</span>
                      <span className="ml-1 text-blue-900">{rolloutSimulation.phases.length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h6 className="text-sm font-medium text-gray-900">Rollout Phases</h6>
                  {rolloutSimulation.phases.map((phase, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Phase {phase.phase}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(phase.riskLevel)}`}>
                          {phase.riskLevel} risk
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Coverage:</span>
                          <span className="ml-1 text-gray-900">{phase.percentage}%</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Duration:</span>
                          <span className="ml-1 text-gray-900">{phase.duration}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Est. Users:</span>
                          <span className="ml-1 text-gray-900">{phase.estimatedUsers.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>0%</span>
                          <span>{phase.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              phase.riskLevel === 'low' ? 'bg-green-500' :
                              phase.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${phase.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h6 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Rollout Recommendations</h6>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Monitor error rates closely during each phase</li>
                    <li>• Have rollback procedures ready before starting</li>
                    <li>• Notify affected companies before major phases</li>
                    {rolloutSimulation.monitoringRequired && (
                      <li>• 24/7 monitoring required for this feature</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Dependencies Tab */}
            {activeAnalysisTab === 'dependencies' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium text-gray-900">Feature Dependencies</h5>
                  <span className="text-xs text-gray-500">{dependencies.length} dependencies found</span>
                </div>

                {dependencies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <p className="mt-2 text-sm">No dependencies found for this feature.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dependencies.map((dep, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-sm font-medium text-gray-900">{dep.featureName}</h6>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              dep.dependencyType === 'blocks' ? 'bg-red-100 text-red-800' :
                              dep.dependencyType === 'requires' ? 'bg-orange-100 text-orange-800' :
                              dep.dependencyType === 'enhances' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {dep.dependencyType}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(dep.impact)}`}>
                              {dep.impact} impact
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{dep.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h6 className="text-sm font-medium text-blue-800 mb-2">💡 Dependency Guidelines</h6>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li><strong>Blocks:</strong> This feature will prevent the dependent feature from working</li>
                    <li><strong>Requires:</strong> This feature needs the dependent feature to be enabled</li>
                    <li><strong>Enhances:</strong> This feature works better when the dependent feature is enabled</li>
                    <li><strong>Conflicts:</strong> This feature may cause issues with the dependent feature</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Advanced Analytics Tab */}
            {activeAnalysisTab === 'analytics' && analyticsData && (
              <div className="space-y-6">
                {/* Usage Trends Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h6 className="text-sm font-medium text-gray-900 mb-4">📈 Usage Trends (Last 30 Days)</h6>
                  <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Chart visualization would go here</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">
                        {analyticsData.usageTrends.reduce((sum, day) => sum + day.usage, 0).toLocaleString()}
                      </div>
                      <div className="text-gray-500">Total Usage</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">
                        {Math.round(analyticsData.usageTrends.reduce((sum, day) => sum + day.users, 0) / analyticsData.usageTrends.length)}
                      </div>
                      <div className="text-gray-500">Avg Daily Users</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">
                        {analyticsData.usageTrends.reduce((sum, day) => sum + day.errors, 0)}
                      </div>
                      <div className="text-gray-500">Total Errors</div>
                    </div>
                  </div>
                </div>

                {/* Geographic Distribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h6 className="text-sm font-medium text-gray-900 mb-4">🌍 Geographic Distribution</h6>
                  <div className="space-y-3">
                    {analyticsData.geographicDistribution.map((region, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">{region.region}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${region.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{region.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Company Adoption */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h6 className="text-sm font-medium text-gray-900 mb-4">🏢 Company Adoption</h6>
                  <div className="space-y-3">
                    {analyticsData.companyAdoption.map((company, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.companyName}</div>
                          <div className="text-xs text-gray-500">Adopted: {company.adoptionDate.toLocaleDateString()}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          company.usageLevel === 'high' ? 'bg-green-100 text-green-800' :
                          company.usageLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {company.usageLevel} usage
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedFeature && (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Feature</h3>
          <p className="mt-1 text-sm text-gray-500">
            Choose a feature from the list to view detailed impact analysis.
          </p>
        </div>
      )}
    </div>
  );
};