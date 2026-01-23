/**
 * Configuration History Service
 * Manages configuration versioning, history tracking, and rollback capabilities
 */

import { PrismaClient } from '@prisma/client';
import { 
  ConfigurationHistoryData, 
  PlatformConfigData,
  ConfigurationDiff,
  ChangeType 
} from '../types/platform-config.types.js';

export interface ConfigurationComparison {
  version1: number;
  version2: number;
  differences: ConfigurationDiff[];
  summary: {
    totalChanges: number;
    changesByType: Record<ChangeType, number>;
    criticalChanges: ConfigurationDiff[];
  };
}

export interface ConfigurationSnapshot {
  version: number;
  timestamp: Date;
  changedBy: string;
  reason?: string;
  changeType: ChangeType;
  configurationState: Partial<PlatformConfigData>;
  isRollback: boolean;
  rollbackTarget?: number;
}

export class ConfigurationHistoryService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get configuration history for a specific config
   */
  async getConfigurationHistory(
    configId: string, 
    limit: number = 50,
    offset: number = 0
  ): Promise<ConfigurationHistoryData[]> {
    const history = await this.prisma.configurationHistory.findMany({
      where: { configId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return history as ConfigurationHistoryData[];
  }

  /**
   * Get configuration snapshots with full state information
   */
  async getConfigurationSnapshots(
    configId: string,
    limit: number = 20
  ): Promise<ConfigurationSnapshot[]> {
    const history = await this.getConfigurationHistory(configId, limit);
    const snapshots: ConfigurationSnapshot[] = [];

    for (const record of history) {
      const snapshot: ConfigurationSnapshot = {
        version: record.version,
        timestamp: record.createdAt,
        changedBy: record.changedBy,
        reason: record.reason || undefined,
        changeType: record.changeType,
        configurationState: await this.reconstructConfigurationState(configId, record.version),
        isRollback: record.changeType === ChangeType.ROLLBACK,
        rollbackTarget: record.rollbackTo ? await this.getVersionFromHistoryId(record.rollbackTo) : undefined
      };
      snapshots.push(snapshot);
    }

    return snapshots;
  }

  /**
   * Compare two configuration versions
   */
  async compareConfigurationVersions(
    configId: string,
    version1: number,
    version2: number
  ): Promise<ConfigurationComparison> {
    const [config1, config2] = await Promise.all([
      this.reconstructConfigurationState(configId, version1),
      this.reconstructConfigurationState(configId, version2)
    ]);

    const differences = this.calculateDifferences(config1, config2);
    const changesByType = this.groupChangesByType(differences);
    const criticalChanges = this.identifyCriticalChanges(differences);

    return {
      version1,
      version2,
      differences,
      summary: {
        totalChanges: differences.length,
        changesByType,
        criticalChanges
      }
    };
  }

  /**
   * Validate rollback safety
   */
  async validateRollbackSafety(
    configId: string,
    targetVersion: number
  ): Promise<{
    isSafe: boolean;
    warnings: string[];
    blockers: string[];
    affectedFeatures: string[];
  }> {
    const currentConfig = await this.prisma.platformConfig.findUnique({
      where: { id: configId },
      include: { geographicRestrictions: true, paymentMethodConfigs: true }
    });

    if (!currentConfig) {
      throw new Error('Configuration not found');
    }

    const targetState = await this.reconstructConfigurationState(configId, targetVersion);
    const comparison = this.calculateDifferences(currentConfig as any, targetState as any);

    const warnings: string[] = [];
    const blockers: string[] = [];
    const affectedFeatures: string[] = [];

    // Check for critical changes
    comparison.forEach(diff => {
      if (this.isCriticalChange(diff)) {
        if (this.isBlockingChange(diff)) {
          blockers.push(`${diff.field}: ${diff.oldValue} → ${diff.newValue}`);
        } else {
          warnings.push(`${diff.field}: ${diff.oldValue} → ${diff.newValue}`);
        }
      }

      if (this.isFeatureToggle(diff.field)) {
        affectedFeatures.push(diff.field);
      }
    });

    // Check for maintenance mode
    if (targetState.maintenanceMode && !currentConfig.maintenanceMode) {
      warnings.push('Rollback will enable maintenance mode');
    }

    return {
      isSafe: blockers.length === 0,
      warnings,
      blockers,
      affectedFeatures
    };
  }

  /**
   * Create configuration backup before major changes
   */
  async createConfigurationBackup(
    configId: string,
    adminUserId: string,
    reason: string
  ): Promise<ConfigurationHistoryData> {
    const currentConfig = await this.prisma.platformConfig.findUnique({
      where: { id: configId },
      include: {
        geographicRestrictions: true,
        paymentMethodConfigs: true
      }
    });

    if (!currentConfig) {
      throw new Error('Configuration not found');
    }

    const backup = await this.prisma.configurationHistory.create({
      data: {
        configId,
        version: currentConfig.version,
        changes: {
          action: 'BACKUP',
          fullState: currentConfig,
          timestamp: new Date()
        },
        changeType: ChangeType.SYSTEM_SETTING,
        reason: `Backup: ${reason}`,
        changedBy: adminUserId
      }
    });

    return backup as ConfigurationHistoryData;
  }

  /**
   * Get configuration diff visualization data
   */
  async getConfigurationDiffVisualization(
    configId: string,
    version1: number,
    version2: number
  ): Promise<{
    added: Record<string, any>;
    removed: Record<string, any>;
    modified: Record<string, { old: any; new: any }>;
    unchanged: Record<string, any>;
  }> {
    const comparison = await this.compareConfigurationVersions(configId, version1, version2);
    
    const added: Record<string, any> = {};
    const removed: Record<string, any> = {};
    const modified: Record<string, { old: any; new: any }> = {};
    const unchanged: Record<string, any> = {};

    const [config1, config2] = await Promise.all([
      this.reconstructConfigurationState(configId, version1),
      this.reconstructConfigurationState(configId, version2)
    ]);

    // Categorize changes
    comparison.differences.forEach(diff => {
      if (diff.oldValue === undefined) {
        added[diff.field] = diff.newValue;
      } else if (diff.newValue === undefined) {
        removed[diff.field] = diff.oldValue;
      } else {
        modified[diff.field] = { old: diff.oldValue, new: diff.newValue };
      }
    });

    // Find unchanged fields
    Object.keys(config1).forEach(key => {
      if (!added[key] && !removed[key] && !modified[key]) {
        unchanged[key] = (config1 as any)[key];
      }
    });

    return { added, removed, modified, unchanged };
  }

  /**
   * Reconstruct configuration state at a specific version
   */
  private async reconstructConfigurationState(
    configId: string,
    version: number
  ): Promise<Partial<PlatformConfigData>> {
    // Get all history records up to the target version
    const historyRecords = await this.prisma.configurationHistory.findMany({
      where: {
        configId,
        version: { lte: version }
      },
      orderBy: { version: 'asc' }
    });

    if (historyRecords.length === 0) {
      throw new Error(`No history found for version ${version}`);
    }

    // Start with the initial state and apply changes chronologically
    let configState: Partial<PlatformConfigData> = {};

    for (const record of historyRecords) {
      if (record.changes) {
        const changes = record.changes as any;
        
        if (changes.action === 'INITIAL_CREATION' && changes.data) {
          configState = { ...changes.data };
        } else if (changes.updates) {
          configState = { ...configState, ...changes.updates };
        } else if (changes.rollbackData) {
          configState = { ...changes.rollbackData };
        }
      }
    }

    return configState;
  }

  /**
   * Calculate differences between two configuration states
   */
  private calculateDifferences(
    config1: Partial<PlatformConfigData>,
    config2: Partial<PlatformConfigData>
  ): ConfigurationDiff[] {
    const differences: ConfigurationDiff[] = [];
    const allKeys = new Set([...Object.keys(config1), ...Object.keys(config2)]);

    allKeys.forEach(key => {
      const value1 = (config1 as any)[key];
      const value2 = (config2 as any)[key];

      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({
          field: key,
          oldValue: value1,
          newValue: value2,
          changeType: this.getChangeTypeForField(key)
        });
      }
    });

    return differences;
  }

  /**
   * Group changes by type
   */
  private groupChangesByType(differences: ConfigurationDiff[]): Record<ChangeType, number> {
    const groups: Record<ChangeType, number> = {
      [ChangeType.FEATURE_TOGGLE]: 0,
      [ChangeType.FINANCIAL_UPDATE]: 0,
      [ChangeType.GEOGRAPHIC_RESTRICTION]: 0,
      [ChangeType.PAYMENT_CONFIG]: 0,
      [ChangeType.SYSTEM_SETTING]: 0,
      [ChangeType.ROLLBACK]: 0
    };

    differences.forEach(diff => {
      groups[diff.changeType]++;
    });

    return groups;
  }

  /**
   * Identify critical changes that require special attention
   */
  private identifyCriticalChanges(differences: ConfigurationDiff[]): ConfigurationDiff[] {
    return differences.filter(diff => this.isCriticalChange(diff));
  }

  /**
   * Check if a change is critical
   */
  private isCriticalChange(diff: ConfigurationDiff): boolean {
    const criticalFields = [
      'maintenanceMode',
      'commissionRate',
      'taxRate',
      'autoApprovalEnabled'
    ];

    return criticalFields.includes(diff.field) || 
           (diff.field === 'maintenanceMode' && diff.newValue === true);
  }

  /**
   * Check if a change is blocking (prevents rollback)
   */
  private isBlockingChange(diff: ConfigurationDiff): boolean {
    // Currently no blocking changes defined, but could include:
    // - Database schema changes
    // - Breaking API changes
    return false;
  }

  /**
   * Check if field is a feature toggle
   */
  private isFeatureToggle(field: string): boolean {
    const featureFields = [
      'withoutDriverListings',
      'hourlyBookings',
      'recurringBookings',
      'instantBooking',
      'autoApprovalEnabled'
    ];
    return featureFields.includes(field);
  }

  /**
   * Get change type for field
   */
  private getChangeTypeForField(field: string): ChangeType {
    const featureFields = ['withoutDriverListings', 'hourlyBookings', 'recurringBookings', 'instantBooking'];
    const financialFields = ['commissionRate', 'taxRate', 'defaultCurrency'];
    
    if (featureFields.includes(field)) {
      return ChangeType.FEATURE_TOGGLE;
    }
    if (financialFields.includes(field)) {
      return ChangeType.FINANCIAL_UPDATE;
    }
    
    return ChangeType.SYSTEM_SETTING;
  }

  /**
   * Get version number from history ID
   */
  private async getVersionFromHistoryId(historyId: string): Promise<number | undefined> {
    const record = await this.prisma.configurationHistory.findUnique({
      where: { id: historyId },
      select: { version: true }
    });
    
    return record?.version;
  }
}