/**
 * FeatureConfigurationForm Component
 * Advanced configuration form for individual features
 */

import React, { useState, useEffect } from 'react';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { apiClient } from '../../services/api';
import { getApiUrl } from '../../config/app.config';
import type { PlatformFeature } from './FeatureTogglePanel';

export interface FeatureConfigurationFormProps {
  selectedFeature: PlatformFeature | null;
  onFeatureUpdate: () => void;
}

interface GeographicRestriction {
  id?: string;
  region: string;
  regionType: 'COUNTRY' | 'FYLKE' | 'KOMMUNE';
  restrictionType: 'BOOKING_BLOCKED' | 'LISTING_BLOCKED' | 'PAYMENT_BLOCKED' | 'FEATURE_DISABLED';
  isBlocked: boolean;
  reason?: string;
}

interface PaymentMethodConfig {
  id?: string;
  paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'VIPPS' | 'KLARNA' | 'PAYPAL' | 'INVOICE';
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  processingFee?: number;
  processingFeeType: 'FIXED' | 'PERCENTAGE';
  supportedRegions: string[];
}

interface FeatureSchedule {
  id?: string;
  featureId: string;
  scheduledAction: 'ENABLE' | 'DISABLE';
  scheduledTime: Date;
  reason: string;
  createdBy: string;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
}

interface RolloutConfig {
  id?: string;
  featureId: string;
  rolloutType: 'PERCENTAGE' | 'COMPANY_LIST' | 'REGION_BASED';
  rolloutPercentage?: number;
  targetCompanies?: string[];
  targetRegions?: string[];
  startDate: Date;
  endDate?: Date;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
}

export const FeatureConfigurationForm: React.FC<FeatureConfigurationFormProps> = ({
  selectedFeature,
  onFeatureUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geographicRestrictions, setGeographicRestrictions] = useState<GeographicRestriction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [featureSchedules, setFeatureSchedules] = useState<FeatureSchedule[]>([]);
  const [rolloutConfigs, setRolloutConfigs] = useState<RolloutConfig[]>([]);
  const [activeSection, setActiveSection] = useState<'basic' | 'geographic' | 'payment' | 'scheduling' | 'rollout'>('basic');

  // Load configuration data when feature is selected
  useEffect(() => {
    if (selectedFeature) {
      loadFeatureConfiguration();
    }
  }, [selectedFeature]);

  const loadFeatureConfiguration = async () => {
    if (!selectedFeature) return;

    try {
      setLoading(true);
      setError(null);

      const validToken = await tokenManager.getValidToken();

      // Load geographic restrictions
      try {
        const geoData = await apiClient.get('/platform-admin/config/geographic-restrictions', validToken);
        setGeographicRestrictions(geoData.restrictions || []);
      } catch (err) {
        console.warn('Geographic restrictions not available:', err);
        setGeographicRestrictions([]);
      }

      // Load payment method configurations
      try {
        const paymentData = await apiClient.get('/platform-admin/config/payment-methods', validToken);
        setPaymentMethods(paymentData.paymentMethods || []);
      } catch (err) {
        console.warn('Payment methods not available:', err);
        setPaymentMethods([]);
      }

      // Feature schedules and rollouts endpoints don't exist yet - set empty arrays
      setFeatureSchedules([]);
      setRolloutConfigs([]);

    } catch (err) {
      console.error('Error loading feature configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGeographicRestriction = async (restriction: Omit<GeographicRestriction, 'id'>) => {
    try {
      const validToken = await tokenManager.getValidToken();
      await apiClient.post('/platform-admin/config/geographic-restrictions', restriction, validToken);
      await loadFeatureConfiguration();
    } catch (err) {
      console.error('Error adding geographic restriction:', err);
      setError(err instanceof Error ? err.message : 'Failed to add restriction');
    }
  };

  const handleUpdatePaymentMethod = async (config: PaymentMethodConfig) => {
    try {
      const validToken = await tokenManager.getValidToken();
      await apiClient.put(`/platform-admin/config/payment-methods/${config.paymentMethod}`, config, validToken);
      await loadFeatureConfiguration();
    } catch (err) {
      console.error('Error updating payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to update payment method');
    }
  };

  const handleScheduleFeature = async (schedule: Omit<FeatureSchedule, 'id' | 'status'>) => {
    try {
      const validToken = await tokenManager.getValidToken();
      await apiClient.post(`/platform-admin/config/features/${selectedFeature?.id}/schedules`, {
        ...schedule,
        status: 'PENDING'
      }, validToken);
      await loadFeatureConfiguration();
    } catch (err) {
      console.error('Error scheduling feature:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule feature');
    }
  };

  const handleCreateRollout = async (rollout: Omit<RolloutConfig, 'id' | 'status'>) => {
    try {
      const validToken = await tokenManager.getValidToken();
      await apiClient.post(`/platform-admin/config/features/${selectedFeature?.id}/rollouts`, {
        ...rollout,
        status: 'DRAFT'
      }, validToken);
      await loadFeatureConfiguration();
    } catch (err) {
      console.error('Error creating rollout:', err);
      setError(err instanceof Error ? err.message : 'Failed to create rollout');
    }
  };

  const handleBulkFeatureUpdate = async (updates: Array<{ featureId: string; enabled: boolean; reason: string }>) => {
    try {
      const validToken = await tokenManager.getValidToken();
      // Backend expects 'features' array, not 'updates'
      const features = updates.map(({ featureId, enabled }) => ({ featureId, enabled }));
      const reason = updates[0]?.reason || 'Bulk feature update';
      
      await apiClient.post('/platform-admin/config/features/bulk-update', { features, reason }, validToken);
      onFeatureUpdate();
    } catch (err) {
      console.error('Error bulk updating features:', err);
      setError(err instanceof Error ? err.message : 'Failed to bulk update features');
    }
  };

  const handleRollbackFeature = async (featureId: string, reason: string) => {
    try {
      const validToken = await tokenManager.getValidToken();
      // Backend expects different structure - need targetConfigId and features array
      // For now, we'll use a placeholder implementation
      console.warn('Rollback feature not fully implemented - endpoint mismatch');
      setError('Rollback feature is not available at this time');
    } catch (err) {
      console.error('Error rolling back feature:', err);
      setError(err instanceof Error ? err.message : 'Failed to rollback feature');
    }
  };

  if (!selectedFeature) {
    return (
      <div className="feature-configuration-form">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Feature Selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a feature from the list to configure its settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-configuration-form">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Configure {selectedFeature.name}</h3>
        <p className="mt-1 text-sm text-gray-600">{selectedFeature.description}</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'basic', name: 'Basic Settings', icon: '⚙️' },
            { id: 'geographic', name: 'Geographic Restrictions', icon: '🌍' },
            { id: 'payment', name: 'Payment Methods', icon: '💳' },
            { id: 'scheduling', name: 'Scheduling & Automation', icon: '⏰' },
            { id: 'rollout', name: 'Rollout & Bulk Operations', icon: '🚀' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`${
                activeSection === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading configuration...</span>
        </div>
      ) : (
        <>
          {/* Basic Settings */}
          {activeSection === 'basic' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Feature Information</h4>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className={`text-sm font-medium ${selectedFeature.enabled ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedFeature.enabled ? 'Enabled' : 'Disabled'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Category</dt>
                    <dd className="text-sm text-gray-900 capitalize">{selectedFeature.category}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Scope</dt>
                    <dd className="text-sm text-gray-900 capitalize">{selectedFeature.scope}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Impact Level</dt>
                    <dd className="text-sm text-gray-900 capitalize">{selectedFeature.impactLevel}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
                    <dd className="text-sm text-gray-900">{selectedFeature.lastModified.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Modified By</dt>
                    <dd className="text-sm text-gray-900">{selectedFeature.modifiedBy}</dd>
                  </div>
                </dl>
              </div>

              {selectedFeature.dependencies && selectedFeature.dependencies.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Dependencies</h4>
                  <p className="text-sm text-yellow-700 mb-2">
                    This feature depends on the following features:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {selectedFeature.dependencies.map((dep, index) => (
                      <li key={index}>{dep}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Geographic Restrictions */}
          {activeSection === 'geographic' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-900">Geographic Restrictions</h4>
                <button
                  onClick={() => {
                    // This would open a modal or form to add new restriction
                    const region = prompt('Enter region name:');
                    if (region) {
                      handleAddGeographicRestriction({
                        region,
                        regionType: 'COUNTRY',
                        restrictionType: 'FEATURE_DISABLED',
                        isBlocked: true,
                        reason: 'Manual restriction'
                      });
                    }
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Restriction
                </button>
              </div>

              {geographicRestrictions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No geographic restrictions configured.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {geographicRestrictions.map((restriction, index) => (
                      <li key={restriction.id || index} className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{restriction.region}</p>
                            <p className="text-sm text-gray-500">
                              {restriction.regionType} • {restriction.restrictionType}
                            </p>
                            {restriction.reason && (
                              <p className="text-xs text-gray-400 mt-1">{restriction.reason}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              restriction.isBlocked 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {restriction.isBlocked ? 'Blocked' : 'Allowed'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Payment Methods */}
          {activeSection === 'payment' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-900">Payment Method Configuration</h4>
              </div>

              {paymentMethods.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No payment method configurations found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method, index) => (
                    <div key={method.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-900">{method.paymentMethod}</h5>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={method.enabled}
                            onChange={(e) => handleUpdatePaymentMethod({
                              ...method,
                              enabled: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Enabled</span>
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Min Amount:</span>
                          <span className="ml-1 text-gray-900">{method.minAmount || 'None'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Max Amount:</span>
                          <span className="ml-1 text-gray-900">{method.maxAmount || 'None'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Processing Fee:</span>
                          <span className="ml-1 text-gray-900">
                            {method.processingFee || 0}
                            {method.processingFeeType === 'PERCENTAGE' ? '%' : ' NOK'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Regions:</span>
                          <span className="ml-1 text-gray-900">{method.supportedRegions.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scheduling & Automation */}
          {activeSection === 'scheduling' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-900">Feature Scheduling</h4>
                <button
                  onClick={() => {
                    const action = confirm('Enable or disable feature?') ? 'ENABLE' : 'DISABLE';
                    const timeStr = prompt('Enter scheduled time (YYYY-MM-DD HH:MM):');
                    const reason = prompt('Enter reason for scheduling:');
                    
                    if (timeStr && reason && selectedFeature) {
                      const scheduledTime = new Date(timeStr);
                      if (!isNaN(scheduledTime.getTime())) {
                        handleScheduleFeature({
                          featureId: selectedFeature.id,
                          scheduledAction: action,
                          scheduledTime,
                          reason,
                          createdBy: 'Current Admin'
                        });
                      } else {
                        alert('Invalid date format. Please use YYYY-MM-DD HH:MM');
                      }
                    }
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Schedule Action
                </button>
              </div>

              {featureSchedules.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No scheduled actions for this feature.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {featureSchedules.map((schedule, index) => (
                      <li key={schedule.id || index} className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {schedule.scheduledAction} at {schedule.scheduledTime.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">Reason: {schedule.reason}</p>
                            <p className="text-xs text-gray-400">Created by: {schedule.createdBy}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              schedule.status === 'PENDING' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : schedule.status === 'EXECUTED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {schedule.status}
                            </span>
                            {schedule.status === 'PENDING' && (
                              <button
                                onClick={async () => {
                                  if (confirm('Cancel this scheduled action?')) {
                                    try {
                                      const validToken = await tokenManager.getValidToken();
                                      await apiClient.delete(`/platform-admin/config/features/schedules/${schedule.id}`, validToken);
                                      await loadFeatureConfiguration();
                                    } catch (err) {
                                      setError('Failed to cancel scheduled action');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Emergency Controls */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-red-800 mb-3">Emergency Controls</h5>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const reason = prompt('Enter reason for emergency disable:');
                      if (reason && selectedFeature) {
                        handleRollbackFeature(selectedFeature.id, reason);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Emergency Disable
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('This will immediately disable the feature across the entire platform. Continue?')) {
                        const reason = prompt('Enter reason for immediate disable:');
                        if (reason && selectedFeature) {
                          handleScheduleFeature({
                            featureId: selectedFeature.id,
                            scheduledAction: 'DISABLE',
                            scheduledTime: new Date(),
                            reason: `EMERGENCY: ${reason}`,
                            createdBy: 'Current Admin'
                          });
                        }
                      }
                    }}
                    className="px-3 py-1 text-sm bg-red-800 text-white rounded hover:bg-red-900"
                  >
                    Immediate Disable
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rollout & Bulk Operations */}
          {activeSection === 'rollout' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-900">Feature Rollout Configuration</h4>
                <button
                  onClick={() => {
                    const rolloutType = prompt('Enter rollout type (PERCENTAGE/COMPANY_LIST/REGION_BASED):') as 'PERCENTAGE' | 'COMPANY_LIST' | 'REGION_BASED';
                    if (rolloutType && selectedFeature) {
                      let rolloutConfig: Omit<RolloutConfig, 'id' | 'status'> = {
                        featureId: selectedFeature.id,
                        rolloutType,
                        startDate: new Date()
                      };

                      if (rolloutType === 'PERCENTAGE') {
                        const percentage = prompt('Enter rollout percentage (0-100):');
                        if (percentage) {
                          rolloutConfig.rolloutPercentage = parseInt(percentage);
                        }
                      } else if (rolloutType === 'COMPANY_LIST') {
                        const companies = prompt('Enter company IDs (comma-separated):');
                        if (companies) {
                          rolloutConfig.targetCompanies = companies.split(',').map(c => c.trim());
                        }
                      } else if (rolloutType === 'REGION_BASED') {
                        const regions = prompt('Enter regions (comma-separated):');
                        if (regions) {
                          rolloutConfig.targetRegions = regions.split(',').map(r => r.trim());
                        }
                      }

                      handleCreateRollout(rolloutConfig);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Rollout
                </button>
              </div>

              {rolloutConfigs.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No rollout configurations for this feature.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rolloutConfigs.map((rollout, index) => (
                    <div key={rollout.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-900">
                          {rollout.rolloutType} Rollout
                        </h5>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rollout.status === 'DRAFT' 
                            ? 'bg-gray-100 text-gray-800'
                            : rollout.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : rollout.status === 'PAUSED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {rollout.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Start Date:</span>
                          <span className="ml-1 text-gray-900">{rollout.startDate.toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">End Date:</span>
                          <span className="ml-1 text-gray-900">{rollout.endDate?.toLocaleDateString() || 'Open-ended'}</span>
                        </div>
                        {rollout.rolloutPercentage && (
                          <div>
                            <span className="font-medium text-gray-500">Percentage:</span>
                            <span className="ml-1 text-gray-900">{rollout.rolloutPercentage}%</span>
                          </div>
                        )}
                        {rollout.targetCompanies && (
                          <div>
                            <span className="font-medium text-gray-500">Companies:</span>
                            <span className="ml-1 text-gray-900">{rollout.targetCompanies.length}</span>
                          </div>
                        )}
                        {rollout.targetRegions && (
                          <div>
                            <span className="font-medium text-gray-500">Regions:</span>
                            <span className="ml-1 text-gray-900">{rollout.targetRegions.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bulk Operations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-800 mb-3">Bulk Operations</h5>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const reason = prompt('Enter reason for bulk enable:');
                      if (reason) {
                        // This would typically open a modal to select features
                        const featureIds = prompt('Enter feature IDs to enable (comma-separated):');
                        if (featureIds) {
                          const updates = featureIds.split(',').map(id => ({
                            featureId: id.trim(),
                            enabled: true,
                            reason
                          }));
                          handleBulkFeatureUpdate(updates);
                        }
                      }
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Bulk Enable
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter reason for bulk disable:');
                      if (reason) {
                        const featureIds = prompt('Enter feature IDs to disable (comma-separated):');
                        if (featureIds) {
                          const updates = featureIds.split(',').map(id => ({
                            featureId: id.trim(),
                            enabled: false,
                            reason
                          }));
                          handleBulkFeatureUpdate(updates);
                        }
                      }
                    }}
                    className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Bulk Disable
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('This will rollback ALL recent feature changes. This action cannot be undone. Continue?')) {
                        const reason = prompt('Enter reason for rollback:');
                        if (reason && selectedFeature) {
                          handleRollbackFeature(selectedFeature.id, `BULK ROLLBACK: ${reason}`);
                        }
                      }
                    }}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Rollback Tools
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};