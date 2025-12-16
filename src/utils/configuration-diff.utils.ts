/**
 * Configuration Diff Utilities
 * Provides utilities for comparing and visualizing configuration changes
 */

import { 
  ConfigurationDiff, 
  PlatformConfigData, 
  ChangeType 
} from '../types/platform-config.types.js';

export interface DiffVisualization {
  field: string;
  displayName: string;
  category: string;
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string[];
}

export class ConfigurationDiffUtils {
  
  /**
   * Field display names for UI
   */
  private static readonly FIELD_DISPLAY_NAMES: Record<string, string> = {
    commissionRate: 'Commission Rate',
    taxRate: 'Tax Rate',
    bookingTimeoutHours: 'Booking Timeout (Hours)',
    defaultCurrency: 'Default Currency',
    withoutDriverListings: 'Without Driver Listings',
    hourlyBookings: 'Hourly Bookings',
    recurringBookings: 'Recurring Bookings',
    instantBooking: 'Instant Booking',
    maxBookingDuration: 'Max Booking Duration (Days)',
    minBookingAdvance: 'Min Booking Advance (Hours)',
    autoApprovalEnabled: 'Auto Approval',
    maintenanceMode: 'Maintenance Mode'
  };

  /**
   * Field categories for grouping
   */
  private static readonly FIELD_CATEGORIES: Record<string, string> = {
    commissionRate: 'Financial',
    taxRate: 'Financial',
    defaultCurrency: 'Financial',
    withoutDriverListings: 'Features',
    hourlyBookings: 'Features',
    recurringBookings: 'Features',
    instantBooking: 'Features',
    autoApprovalEnabled: 'Features',
    bookingTimeoutHours: 'System',
    maxBookingDuration: 'System',
    minBookingAdvance: 'System',
    maintenanceMode: 'System'
  };

  /**
   * Convert configuration diffs to visualization format
   */
  static createDiffVisualization(diffs: ConfigurationDiff[]): DiffVisualization[] {
    return diffs.map(diff => ({
      field: diff.field,
      displayName: this.FIELD_DISPLAY_NAMES[diff.field] || diff.field,
      category: this.FIELD_CATEGORIES[diff.field] || 'Other',
      oldValue: diff.oldValue,
      newValue: diff.newValue,
      changeType: diff.changeType,
      severity: this.calculateChangeSeverity(diff),
      description: this.generateChangeDescription(diff),
      impact: this.calculateChangeImpact(diff)
    }));
  }

  /**
   * Group diffs by category
   */
  static groupDiffsByCategory(diffs: DiffVisualization[]): Record<string, DiffVisualization[]> {
    return diffs.reduce((groups, diff) => {
      const category = diff.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(diff);
      return groups;
    }, {} as Record<string, DiffVisualization[]>);
  }

  /**
   * Calculate change severity
   */
  private static calculateChangeSeverity(diff: ConfigurationDiff): 'low' | 'medium' | 'high' | 'critical' {
    // Critical changes
    if (diff.field === 'maintenanceMode' && diff.newValue === true) {
      return 'critical';
    }

    // High severity changes
    const highSeverityFields = ['commissionRate', 'taxRate', 'autoApprovalEnabled'];
    if (highSeverityFields.includes(diff.field)) {
      return 'high';
    }

    // Medium severity changes
    const mediumSeverityFields = [
      'withoutDriverListings', 
      'hourlyBookings', 
      'recurringBookings', 
      'instantBooking',
      'maxBookingDuration'
    ];
    if (mediumSeverityFields.includes(diff.field)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate human-readable change description
   */
  private static generateChangeDescription(diff: ConfigurationDiff): string {
    const fieldName = this.FIELD_DISPLAY_NAMES[diff.field] || diff.field;
    
    switch (diff.field) {
      case 'commissionRate':
        const oldPercent = (diff.oldValue * 100).toFixed(1);
        const newPercent = (diff.newValue * 100).toFixed(1);
        return `Commission rate changed from ${oldPercent}% to ${newPercent}%`;
      
      case 'taxRate':
        const oldTaxPercent = (diff.oldValue * 100).toFixed(1);
        const newTaxPercent = (diff.newValue * 100).toFixed(1);
        return `Tax rate changed from ${oldTaxPercent}% to ${newTaxPercent}%`;
      
      case 'maintenanceMode':
        return diff.newValue 
          ? 'Maintenance mode enabled - platform will be unavailable to users'
          : 'Maintenance mode disabled - platform restored to normal operation';
      
      case 'withoutDriverListings':
      case 'hourlyBookings':
      case 'recurringBookings':
      case 'instantBooking':
      case 'autoApprovalEnabled':
        return `${fieldName} ${diff.newValue ? 'enabled' : 'disabled'}`;
      
      case 'maxBookingDuration':
        return `Maximum booking duration changed from ${diff.oldValue} to ${diff.newValue} days`;
      
      case 'minBookingAdvance':
        return `Minimum booking advance changed from ${diff.oldValue} to ${diff.newValue} hours`;
      
      case 'bookingTimeoutHours':
        return `Booking timeout changed from ${diff.oldValue} to ${diff.newValue} hours`;
      
      default:
        return `${fieldName} changed from ${diff.oldValue} to ${diff.newValue}`;
    }
  }

  /**
   * Calculate potential impact of change
   */
  private static calculateChangeImpact(diff: ConfigurationDiff): string[] {
    const impacts: string[] = [];
    
    switch (diff.field) {
      case 'commissionRate':
        impacts.push('Affects revenue calculations for all future bookings');
        impacts.push('May impact company profitability');
        break;
      
      case 'taxRate':
        impacts.push('Changes tax calculations for all transactions');
        impacts.push('May require accounting adjustments');
        break;
      
      case 'maintenanceMode':
        if (diff.newValue) {
          impacts.push('Platform becomes unavailable to all users');
          impacts.push('Active bookings may be affected');
          impacts.push('New registrations and bookings blocked');
        } else {
          impacts.push('Platform restored to normal operation');
          impacts.push('Users can resume normal activities');
        }
        break;
      
      case 'withoutDriverListings':
        impacts.push(diff.newValue 
          ? 'Companies can create vehicle listings without drivers'
          : 'All vehicle listings must include drivers');
        break;
      
      case 'hourlyBookings':
        impacts.push(diff.newValue 
          ? 'Hourly booking options become available'
          : 'Only daily bookings allowed');
        break;
      
      case 'recurringBookings':
        impacts.push(diff.newValue 
          ? 'Users can create recurring booking patterns'
          : 'Only single bookings allowed');
        break;
      
      case 'instantBooking':
        impacts.push(diff.newValue 
          ? 'Bookings can be automatically approved'
          : 'All bookings require manual approval');
        break;
      
      case 'autoApprovalEnabled':
        impacts.push(diff.newValue 
          ? 'Qualifying bookings will be automatically approved'
          : 'All bookings require manual review');
        break;
      
      case 'maxBookingDuration':
        impacts.push(`Bookings longer than ${diff.newValue} days will be rejected`);
        break;
      
      case 'minBookingAdvance':
        impacts.push(`Bookings must be made at least ${diff.newValue} hours in advance`);
        break;
      
      default:
        impacts.push('System behavior may change');
    }
    
    return impacts;
  }

  /**
   * Generate rollback safety assessment
   */
  static assessRollbackSafety(diffs: ConfigurationDiff[]): {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    recommendations: string[];
  } {
    const visualizations = this.createDiffVisualization(diffs);
    const severities = visualizations.map(v => v.severity);
    
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    
    // Determine overall risk
    if (severities.includes('critical')) {
      overallRisk = 'critical';
      riskFactors.push('Critical system changes detected');
      recommendations.push('Consider performing rollback during maintenance window');
    } else if (severities.includes('high')) {
      overallRisk = 'high';
      riskFactors.push('High-impact changes detected');
      recommendations.push('Notify stakeholders before rollback');
    } else if (severities.includes('medium')) {
      overallRisk = 'medium';
      riskFactors.push('Medium-impact changes detected');
    }
    
    // Check for specific risk factors
    const maintenanceModeChanges = visualizations.filter(v => v.field === 'maintenanceMode');
    if (maintenanceModeChanges.length > 0) {
      riskFactors.push('Maintenance mode changes affect platform availability');
      recommendations.push('Coordinate with operations team');
    }
    
    const financialChanges = visualizations.filter(v => v.category === 'Financial');
    if (financialChanges.length > 0) {
      riskFactors.push('Financial settings changes affect revenue calculations');
      recommendations.push('Verify financial impact before rollback');
    }
    
    const featureChanges = visualizations.filter(v => v.category === 'Features');
    if (featureChanges.length > 0) {
      riskFactors.push('Feature toggle changes affect user functionality');
      recommendations.push('Test affected features after rollback');
    }
    
    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Rollback appears safe to perform');
    }
    recommendations.push('Monitor system health after rollback');
    recommendations.push('Have rollback plan ready in case of issues');
    
    return {
      overallRisk,
      riskFactors,
      recommendations
    };
  }

  /**
   * Format value for display
   */
  static formatValueForDisplay(field: string, value: any): string {
    if (value === null || value === undefined) {
      return 'Not set';
    }
    
    switch (field) {
      case 'commissionRate':
      case 'taxRate':
        return `${(value * 100).toFixed(1)}%`;
      
      case 'maxBookingDuration':
        return `${value} days`;
      
      case 'minBookingAdvance':
      case 'bookingTimeoutHours':
        return `${value} hours`;
      
      case 'withoutDriverListings':
      case 'hourlyBookings':
      case 'recurringBookings':
      case 'instantBooking':
      case 'autoApprovalEnabled':
      case 'maintenanceMode':
        return value ? 'Enabled' : 'Disabled';
      
      default:
        return String(value);
    }
  }
}