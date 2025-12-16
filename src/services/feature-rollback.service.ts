/**
 * Feature Rollback Service
 * Provides emergency disable functionality and rollback capabilities for features
 */

import { platformConfigService } from './platform-config.service';
import { ConfigurationHistoryService } from './configuration-history.service';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';
import { featureToggleService } from './feature-toggle.service';
import { logError } from '../utils/logging.utils';

export interface EmergencyDisableRequest {
  feature: FeatureToggle;
  reason: string;
  adminUserId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RollbackRequest {
  targetVersion?: number;
  targetConfigId?: string;
  reason: string;
  adminUserId: string;
  features?: FeatureToggle[];
}

export interface RollbackResult {
  success: boolean;
  previousVersion: number;
  newVersion: number;
  rolledBackFeatures: string[];
  timestamp: Date;
}

export class FeatureRollbackService {
  /**
   * Emergency disable a feature immediately
   */
  async emergencyDisableFeature(request: EmergencyDisableRequest): Promise<void> {
    try {
      console.log(`EMERGENCY DISABLE: ${request.feature} - ${request.reason}`);
      
      // Get current configuration
      const currentConfig = await platformConfigService.getConfiguration();
      if (!currentConfig) {
        throw new Error('No active configuration found');
      }

      // Prepare update to disable the feature
      const updateData = {
        [request.feature]: false,
        reason: `EMERGENCY DISABLE: ${request.reason}`,
      };

      // Update configuration
      await platformConfigService.updateConfiguration(updateData, request.adminUserId);

      // Invalidate feature toggle cache immediately
      featureToggleService.invalidateFeature(request.feature);

      // Log the emergency action
      console.log(`Emergency disable completed for feature: ${request.feature}`);
      
      // TODO: Send alerts to monitoring systems
      await this.sendEmergencyAlert(request);
      
    } catch (error) {
      console.error('Emergency disable failed:', error);
      throw new Error(`Failed to emergency disable feature ${request.feature}: ${(error as Error).message}`);
    }
  }

  /**
   * Disable multiple features in emergency
   */
  async emergencyDisableMultipleFeatures(
    features: FeatureToggle[], 
    reason: string, 
    adminUserId: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): Promise<void> {
    try {
      console.log(`EMERGENCY DISABLE MULTIPLE: ${features.join(', ')} - ${reason}`);
      
      // Get current configuration
      const currentConfig = await platformConfigService.getConfiguration();
      if (!currentConfig) {
        throw new Error('No active configuration found');
      }

      // Prepare bulk update to disable all features
      const updateData: any = {
        reason: `EMERGENCY DISABLE MULTIPLE: ${reason}`,
      };

      features.forEach(feature => {
        updateData[feature] = false;
      });

      // Update configuration
      await platformConfigService.updateConfiguration(updateData, adminUserId);

      // Invalidate cache for all affected features
      features.forEach(feature => {
        featureToggleService.invalidateFeature(feature);
      });

      console.log(`Emergency disable completed for features: ${features.join(', ')}`);
      
      // Send emergency alert
      await this.sendEmergencyAlert({
        feature: features[0], // Use first feature for alert
        reason: `Multiple features disabled: ${features.join(', ')} - ${reason}`,
        adminUserId,
        severity,
      });
      
    } catch (error) {
      console.error('Emergency disable multiple features failed:', error);
      throw new Error(`Failed to emergency disable features: ${(error as Error).message}`);
    }
  }

  /**
   * Rollback to a previous configuration version
   */
  async rollbackToVersion(request: RollbackRequest): Promise<RollbackResult> {
    try {
      const currentConfig = await platformConfigService.getConfiguration();
      if (!currentConfig) {
        throw new Error('No active configuration found');
      }

      let targetConfig;
      
      if (request.targetVersion) {
        // Find configuration by version
        // Note: This would require implementing version-based lookup in platformConfigService
        throw new Error('Version-based rollback not yet implemented');
      } else if (request.targetConfigId) {
        // Get specific configuration by ID
        targetConfig = await platformConfigService.getConfigurationById(request.targetConfigId);
        if (!targetConfig) {
          throw new Error(`Configuration with ID ${request.targetConfigId} not found`);
        }
      } else {
        throw new Error('Either targetVersion or targetConfigId must be provided');
      }

      // Prepare rollback data
      const rollbackData: any = {
        reason: `ROLLBACK: ${request.reason}`,
      };

      // If specific features are specified, only rollback those
      if (request.features && request.features.length > 0) {
        request.features.forEach(feature => {
          rollbackData[feature] = (targetConfig as any)[feature];
        });
      } else {
        // Rollback all feature toggles
        rollbackData.withoutDriverListings = targetConfig.withoutDriverListings;
        rollbackData.hourlyBookings = targetConfig.hourlyBookings;
        rollbackData.recurringBookings = targetConfig.recurringBookings;
        rollbackData.instantBooking = targetConfig.instantBooking;
        rollbackData.autoApprovalEnabled = targetConfig.autoApprovalEnabled;
        rollbackData.maintenanceMode = targetConfig.maintenanceMode;
      }

      // Perform rollback
      const newConfig = await platformConfigService.updateConfiguration(rollbackData, request.adminUserId);

      // Invalidate cache
      featureToggleService.invalidateCache();

      const result: RollbackResult = {
        success: true,
        previousVersion: currentConfig.version,
        newVersion: newConfig.version,
        rolledBackFeatures: request.features || Object.values(FeatureToggle),
        timestamp: new Date(),
      };

      console.log('Rollback completed successfully:', result);
      return result;
      
    } catch (error) {
      console.error('Rollback failed:', error);
      throw new Error(`Rollback failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get rollback options (available previous configurations)
   */
  async getRollbackOptions(): Promise<Array<{
    id: string;
    version: number;
    createdAt: Date;
    changes: Record<string, any>;
    reason?: string;
  }>> {
    try {
      // This would use the configuration history service
      // For now, return empty array as history service needs to be implemented
      return [];
    } catch (error) {
      console.error('Error getting rollback options:', error);
      return [];
    }
  }

  /**
   * Check if a rollback is safe (no breaking changes)
   */
  async isRollbackSafe(targetConfigId: string, features?: FeatureToggle[]): Promise<{
    safe: boolean;
    warnings: string[];
    blockingIssues: string[];
  }> {
    try {
      const targetConfig = await platformConfigService.getConfigurationById(targetConfigId);
      if (!targetConfig) {
        return {
          safe: false,
          warnings: [],
          blockingIssues: ['Target configuration not found'],
        };
      }

      const warnings: string[] = [];
      const blockingIssues: string[] = [];

      // Check for potentially dangerous rollbacks
      if (targetConfig.maintenanceMode) {
        warnings.push('Target configuration has maintenance mode enabled');
      }

      // Add more safety checks as needed
      const featuresToCheck = features || Object.values(FeatureToggle);
      
      featuresToCheck.forEach(feature => {
        const targetValue = (targetConfig as any)[feature];
        if (feature === FeatureToggle.MAINTENANCE_MODE && targetValue) {
          blockingIssues.push('Cannot rollback to maintenance mode without explicit confirmation');
        }
      });

      return {
        safe: blockingIssues.length === 0,
        warnings,
        blockingIssues,
      };
    } catch (error) {
      console.error('Error checking rollback safety:', error);
      return {
        safe: false,
        warnings: [],
        blockingIssues: ['Unable to verify rollback safety'],
      };
    }
  }

  /**
   * Send emergency alert (placeholder for integration with monitoring systems)
   */
  private async sendEmergencyAlert(request: EmergencyDisableRequest): Promise<void> {
    try {
      // TODO: Integrate with actual alerting system (Slack, email, monitoring tools)
      console.log('EMERGENCY ALERT:', {
        feature: request.feature,
        reason: request.reason,
        severity: request.severity,
        adminUserId: request.adminUserId,
        timestamp: new Date().toISOString(),
      });

      // For now, just log the alert
      // In production, this would send to:
      // - Slack channels
      // - Email notifications
      // - Monitoring systems (DataDog, New Relic, etc.)
      // - PagerDuty for critical issues
      
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
      // Don't throw here - alert failure shouldn't block the emergency disable
    }
  }
}

// Create and export service instance
export const featureRollbackService = new FeatureRollbackService();