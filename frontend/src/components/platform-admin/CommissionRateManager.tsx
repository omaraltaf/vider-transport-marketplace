/**
 * Commission Rate Manager Component
 * Interface for managing commission rates with editing forms, validation, and bulk operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { 
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Download,
  History,
  Eye,
  Settings
} from 'lucide-react';

interface CommissionRate {
  id: string;
  name: string;
  description: string;
  rateType: 'PERCENTAGE' | 'FIXED' | 'TIERED';
  baseRate: number;
  minRate?: number;
  maxRate?: number;
  tiers?: CommissionTier[];
  applicableRegions: string[];
  companyTypes: string[];
  volumeThresholds?: VolumeThreshold[];
  effectiveDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CommissionTier {
  minVolume: number;
  maxVolume?: number;
  rate: number;
  description: string;
}

interface VolumeThreshold {
  threshold: number;
  rateAdjustment: number;
  adjustmentType: 'PERCENTAGE' | 'FIXED';
}

// Interfaces for future implementation
// interface CommissionRateHistory and RateChangeImpact will be added when needed

interface CommissionRateManagerProps {
  className?: string;
}

const CommissionRateManager: React.FC<CommissionRateManagerProps> = ({ className = '' }) => {
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRates, setSelectedRates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('rates');
  const [selectedRateForView, setSelectedRateForView] = useState<CommissionRate | null>(null);
  const [selectedRateForEdit, setSelectedRateForEdit] = useState<CommissionRate | null>(null);
  const [selectedRateForDelete, setSelectedRateForDelete] = useState<CommissionRate | null>(null);

  // Fetch commission rates
  const fetchCommissionRates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/platform-admin/financial/commission-rates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCommissionRates(data.data || []);
      } else {
        throw new Error('Failed to fetch commission rates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commission rates');
      console.error('Error fetching commission rates:', err);
      
      // Set mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Set mock data for development
  const setMockData = () => {
    const mockRates: CommissionRate[] = [
      {
        id: 'rate-1',
        name: 'Standard Rate',
        description: 'Default commission rate for all bookings',
        rateType: 'PERCENTAGE',
        baseRate: 15.0,
        applicableRegions: ['ALL'],
        companyTypes: ['ALL'],
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
        createdBy: 'system',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'rate-2',
        name: 'High Volume Discount',
        description: 'Tiered rates for high-volume companies',
        rateType: 'TIERED',
        baseRate: 15.0,
        minRate: 8.0,
        maxRate: 15.0,
        tiers: [
          { minVolume: 0, maxVolume: 100000, rate: 15.0, description: 'Standard tier' },
          { minVolume: 100000, maxVolume: 500000, rate: 12.0, description: 'Volume discount tier 1' },
          { minVolume: 500000, rate: 8.0, description: 'Premium volume tier' }
        ],
        applicableRegions: ['Oslo', 'Bergen', 'Trondheim'],
        companyTypes: ['Logistics', 'Transport'],
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
        createdBy: 'admin-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01')
      },
      {
        id: 'rate-3',
        name: 'Regional Override - Tromsø',
        description: 'Special rate for northern region operations',
        rateType: 'PERCENTAGE',
        baseRate: 12.0,
        applicableRegions: ['Tromsø'],
        companyTypes: ['ALL'],
        effectiveDate: new Date('2024-03-01'),
        isActive: true,
        createdBy: 'admin-2',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01')
      }
    ];

    setCommissionRates(mockRates);
  };

  // Handle export rates
  const handleExportRates = () => {
    const csvContent = generateCSVFromRates(commissionRates);
    downloadCSV(csvContent, `commission-rates-export-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Helper function to generate CSV from rates data
  const generateCSVFromRates = (ratesData: CommissionRate[]) => {
    const headers = ['ID', 'Name', 'Type', 'Base Rate', 'Regions', 'Company Types', 'Active', 'Effective Date'];
    const rows = ratesData.map(rate => [
      rate.id,
      rate.name,
      rate.rateType,
      rate.baseRate.toString(),
      rate.applicableRegions.join(';'),
      rate.companyTypes.join(';'),
      rate.isActive ? 'Yes' : 'No',
      new Date(rate.effectiveDate).toLocaleDateString()
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

  useEffect(() => {
    fetchCommissionRates();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading commission rates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Commission Rate Manager</h1>
          <p className="text-muted-foreground">
            Configure and manage commission rates across the platform
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateForm(true)}
            disabled={showCreateForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Rate
          </Button>

          {selectedRates.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
            >
              <Settings className="h-4 w-4 mr-2" />
              Bulk Update ({selectedRates.length})
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={fetchCommissionRates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportRates}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rates">Commission Rates</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        {/* Commission Rates Tab */}
        <TabsContent value="rates" className="space-y-4">
          {/* Rates List */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionRates.map(rate => (
                  <div key={rate.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedRates.includes(rate.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRates(prev => [...prev, rate.id]);
                          } else {
                            setSelectedRates(prev => prev.filter(id => id !== rate.id));
                          }
                        }}
                      />
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{rate.name}</h4>
                          <Badge variant={rate.isActive ? "default" : "secondary"}>
                            {rate.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {rate.rateType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rate.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                          <span>Rate: {rate.baseRate}%</span>
                          <span>Regions: {rate.applicableRegions.join(', ')}</span>
                          <span>Types: {rate.companyTypes.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedRateForView(rate)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={showCreateForm}
                        onClick={() => setSelectedRateForEdit(rate)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={rate.isActive}
                        onClick={() => setSelectedRateForDelete(rate)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Change History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Rate change history will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionRateManager;