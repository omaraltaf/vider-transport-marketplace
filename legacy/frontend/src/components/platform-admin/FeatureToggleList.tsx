/**
 * FeatureToggleList Component
 * Displays a list of platform features with toggle controls, search, and filtering
 */

import React, { useState, useMemo } from 'react';
import type { PlatformFeature } from './FeatureTogglePanel';

export interface FeatureToggleListProps {
  features: PlatformFeature[];
  onToggle: (featureId: string, enabled: boolean) => void;
  onBulkUpdate: (updates: Array<{ featureId: string; enabled: boolean }>) => void;
  onSelectFeature: (feature: PlatformFeature | null) => void;
}

export const FeatureToggleList: React.FC<FeatureToggleListProps> = ({
  features,
  onToggle,
  onBulkUpdate,
  onSelectFeature
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter and search features
  const filteredFeatures = useMemo(() => {
    return features.filter(feature => {
      const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feature.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || feature.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'enabled' && feature.enabled) ||
                           (statusFilter === 'disabled' && !feature.enabled);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [features, searchTerm, categoryFilter, statusFilter]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(features.map(f => f.category)));
    return uniqueCategories.sort();
  }, [features]);

  const handleFeatureSelect = (featureId: string, selected: boolean) => {
    const newSelected = new Set(selectedFeatures);
    if (selected) {
      newSelected.add(featureId);
    } else {
      newSelected.delete(featureId);
    }
    setSelectedFeatures(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedFeatures(new Set(filteredFeatures.map(f => f.id)));
      setShowBulkActions(true);
    } else {
      setSelectedFeatures(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkEnable = () => {
    const updates = Array.from(selectedFeatures).map(featureId => ({
      featureId,
      enabled: true
    }));
    onBulkUpdate(updates);
    setSelectedFeatures(new Set());
    setShowBulkActions(false);
  };

  const handleBulkDisable = () => {
    const updates = Array.from(selectedFeatures).map(featureId => ({
      featureId,
      enabled: false
    }));
    onBulkUpdate(updates);
    setSelectedFeatures(new Set());
    setShowBulkActions(false);
  };

  const getImpactLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return '🏗️';
      case 'booking': return '📅';
      case 'payment': return '💳';
      case 'geographic': return '🌍';
      case 'system': return '⚙️';
      default: return '📋';
    }
  };

  return (
    <div className="feature-toggle-list">
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Search features</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <label htmlFor="category" className="sr-only">Filter by category</label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <label htmlFor="status" className="sr-only">Filter by status</label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedFeatures.size} feature{selectedFeatures.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkEnable}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Enable Selected
                </button>
                <button
                  onClick={handleBulkDisable}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Disable Selected
                </button>
                <button
                  onClick={() => {
                    setSelectedFeatures(new Set());
                    setShowBulkActions(false);
                  }}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sm:px-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedFeatures.size === filteredFeatures.length && filteredFeatures.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              Select All ({filteredFeatures.length})
            </label>
          </div>
        </div>

        <ul className="divide-y divide-gray-200">
          {filteredFeatures.map((feature) => (
            <li key={feature.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFeatures.has(feature.id)}
                    onChange={(e) => handleFeatureSelect(feature.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  
                  <div className="ml-4 flex-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getCategoryIcon(feature.category)}</span>
                      <div>
                        <button
                          onClick={() => onSelectFeature(feature)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {feature.name}
                        </button>
                        <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <span className="font-medium">Category:</span>
                        <span className="ml-1 capitalize">{feature.category}</span>
                      </span>
                      <span className="flex items-center">
                        <span className="font-medium">Scope:</span>
                        <span className="ml-1 capitalize">{feature.scope}</span>
                      </span>
                      <span className="flex items-center">
                        <span className="font-medium">Impact:</span>
                        <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${getImpactLevelColor(feature.impactLevel)}`}>
                          {feature.impactLevel}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className={`text-sm font-medium mr-3 ${feature.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {feature.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => onToggle(feature.id, !feature.enabled)}
                      className={`${
                        feature.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      role="switch"
                      aria-checked={feature.enabled}
                    >
                      <span
                        className={`${
                          feature.enabled ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredFeatures.length === 0 && (
          <div className="px-4 py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No features found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No features are available.'}
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📊</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Features</dt>
                  <dd className="text-lg font-medium text-gray-900">{features.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">✅</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Enabled</dt>
                  <dd className="text-lg font-medium text-green-600">
                    {features.filter(f => f.enabled).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">❌</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Disabled</dt>
                  <dd className="text-lg font-medium text-red-600">
                    {features.filter(f => !f.enabled).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">⚠️</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Critical</dt>
                  <dd className="text-lg font-medium text-orange-600">
                    {features.filter(f => f.impactLevel === 'critical').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};