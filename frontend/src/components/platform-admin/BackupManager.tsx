import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';

interface BackupJob {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  size?: number;
  location: string;
  checksum?: string;
  metadata: {
    tables?: string[];
    compression?: boolean;
    encryption?: boolean;
    retentionDays?: number;
  };
  error?: string;
  createdBy: string;
  createdAt: Date;
}

interface BackupSchedule {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  cronExpression: string;
  enabled: boolean;
  retentionDays: number;
  compression: boolean;
  encryption: boolean;
  notifyOnFailure: boolean;
  notifyEmails: string[];
  lastRun?: Date;
  nextRun?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RestoreJob {
  id: string;
  backupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  restorePoint: Date;
  targetDatabase?: string;
  options: {
    dropExisting?: boolean;
    restoreData?: boolean;
    restoreSchema?: boolean;
    restoreTables?: string[];
  };
  error?: string;
  createdBy: string;
  createdAt: Date;
}

interface BackupManagerProps {
  onBackupCreated?: (backup: BackupJob) => void;
  onRestoreStarted?: (restore: RestoreJob) => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({
  onBackupCreated,
  onRestoreStarted
}) => {
  const { token } = useAuth();
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [restoreJobs, setRestoreJobs] = useState<RestoreJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create backup form state
  const [createBackupForm, setCreateBackupForm] = useState({
    type: 'full' as BackupJob['type'],
    compression: true,
    encryption: false,
    retentionDays: 30,
    tables: [] as string[]
  });

  // Create schedule form state
  const [createScheduleForm, setCreateScheduleForm] = useState({
    name: '',
    type: 'full' as BackupSchedule['type'],
    cronExpression: '0 2 * * *', // Daily at 2 AM
    retentionDays: 30,
    compression: true,
    encryption: false,
    notifyOnFailure: true,
    notifyEmails: [] as string[]
  });

  // Restore form state
  const [restoreForm, setRestoreForm] = useState({
    backupId: '',
    targetDatabase: '',
    dropExisting: false,
    restoreData: true,
    restoreSchema: true,
    restoreTables: [] as string[]
  });

  const fetchBackupJobs = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/backup/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch backup jobs');
      }

      const data = await response.json();
      setBackupJobs(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/backup/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch backup schedules');
      }

      const data = await response.json();
      setSchedules(data.data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const fetchRestoreJobs = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/backup/restore/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch restore jobs');
      }

      const data = await response.json();
      setRestoreJobs(data.data);
    } catch (err) {
      console.error('Error fetching restore jobs:', err);
    }
  };

  const createBackup = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: createBackupForm.type,
          options: {
            compression: createBackupForm.compression,
            encryption: createBackupForm.encryption,
            retentionDays: createBackupForm.retentionDays,
            tables: createBackupForm.tables.length > 0 ? createBackupForm.tables : undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const data = await response.json();
      const newBackup = data.data;
      
      setBackupJobs(prev => [newBackup, ...prev]);
      onBackupCreated?.(newBackup);

      // Reset form
      setCreateBackupForm({
        type: 'full',
        compression: true,
        encryption: false,
        retentionDays: 30,
        tables: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const createSchedule = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/backup/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...createScheduleForm,
          enabled: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create backup schedule');
      }

      const data = await response.json();
      const newSchedule = data.data;
      
      setSchedules(prev => [newSchedule, ...prev]);

      // Reset form
      setCreateScheduleForm({
        name: '',
        type: 'full',
        cronExpression: '0 2 * * *',
        retentionDays: 30,
        compression: true,
        encryption: false,
        notifyOnFailure: true,
        notifyEmails: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const startRestore = async () => {
    try {
      const response = await fetch('/api/platform-admin/system/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          backupId: restoreForm.backupId,
          options: {
            targetDatabase: restoreForm.targetDatabase || undefined,
            dropExisting: restoreForm.dropExisting,
            restoreData: restoreForm.restoreData,
            restoreSchema: restoreForm.restoreSchema,
            restoreTables: restoreForm.restoreTables.length > 0 ? restoreForm.restoreTables : undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start restore');
      }

      const data = await response.json();
      const newRestore = data.data;
      
      setRestoreJobs(prev => [newRestore, ...prev]);
      onRestoreStarted?.(newRestore);

      // Reset form
      setRestoreForm({
        backupId: '',
        targetDatabase: '',
        dropExisting: false,
        restoreData: true,
        restoreSchema: true,
        restoreTables: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const cancelBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/system/backup/jobs/${backupId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchBackupJobs();
      }
    } catch (err) {
      console.error('Error cancelling backup:', err);
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/platform-admin/system/backup/jobs/${backupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setBackupJobs(prev => prev.filter(job => job.id !== backupId));
      }
    } catch (err) {
      console.error('Error deleting backup:', err);
    }
  };

  const verifyBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/platform-admin/system/backup/verify/${backupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify backup');
      }

      const data = await response.json();
      const verification = data.data;

      alert(`Backup verification ${verification.valid ? 'passed' : 'failed'}.\n\n` +
            `Size: ${formatBytes(verification.size)}\n` +
            `Checksum: ${verification.checksum.substring(0, 16)}...\n` +
            (verification.issues.length > 0 ? `Issues: ${verification.issues.join(', ')}` : 'No issues found'));
    } catch (err) {
      alert('Error verifying backup: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBackupJobs(),
        fetchSchedules(),
        fetchRestoreJobs()
      ]);
      setLoading(false);
    };

    loadData();

    // Auto-refresh backup jobs every 30 seconds
    const interval = setInterval(fetchBackupJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Backup Manager</h2>
        <Button onClick={() => {
          fetchBackupJobs();
          fetchSchedules();
          fetchRestoreJobs();
        }}>
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </Card>
      )}

      <Tabs defaultValue="backups" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="backups">Backup Jobs</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="restore">Restore</TabsTrigger>
          <TabsTrigger value="create">Create Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Backup Jobs</h3>
            <div className="space-y-4">
              {backupJobs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No backup jobs found</p>
              ) : (
                backupJobs.map(job => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{job.type.toUpperCase()} Backup</h4>
                        <p className="text-sm text-gray-600">
                          Created by {job.createdBy} on {new Date(job.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>

                    {job.status === 'running' && (
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{Math.round(job.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {job.size && (
                        <div>
                          <span className="text-gray-600">Size:</span>
                          <span className="ml-1 font-mono">{formatBytes(job.size)}</span>
                        </div>
                      )}
                      {job.duration && (
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <span className="ml-1 font-mono">{formatDuration(job.duration)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Compression:</span>
                        <span className="ml-1">{job.metadata.compression ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Encryption:</span>
                        <span className="ml-1">{job.metadata.encryption ? 'Yes' : 'No'}</span>
                      </div>
                    </div>

                    {job.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        Error: {job.error}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      {job.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelBackup(job.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      {job.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyBackup(job.id)}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setRestoreForm(prev => ({ ...prev, backupId: job.id }))}
                          >
                            Restore
                          </Button>
                        </>
                      )}
                      {(job.status === 'completed' || job.status === 'failed') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBackup(job.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Backup Schedules</h3>
              <Button onClick={() => {
                // Switch to create schedule tab or open modal
              }}>
                Create Schedule
              </Button>
            </div>
            
            <div className="space-y-4">
              {schedules.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No backup schedules configured</p>
              ) : (
                schedules.map(schedule => (
                  <div key={schedule.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{schedule.name}</h4>
                        <p className="text-sm text-gray-600">
                          {schedule.type.toUpperCase()} backup • {schedule.cronExpression}
                        </p>
                      </div>
                      <Badge variant={schedule.enabled ? "default" : "secondary"}>
                        {schedule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Retention:</span>
                        <span className="ml-1">{schedule.retentionDays} days</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Compression:</span>
                        <span className="ml-1">{schedule.compression ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Run:</span>
                        <span className="ml-1">
                          {schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Next Run:</span>
                        <span className="ml-1">
                          {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        {schedule.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="destructive">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="restore" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Start Restore</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="backup-select">Select Backup</Label>
                  <Select 
                    value={restoreForm.backupId} 
                    onValueChange={(value) => setRestoreForm(prev => ({ ...prev, backupId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a backup to restore" />
                    </SelectTrigger>
                    <SelectContent>
                      {backupJobs
                        .filter(job => job.status === 'completed')
                        .map(job => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.type.toUpperCase()} - {new Date(job.createdAt).toLocaleDateString()} 
                            ({formatBytes(job.size || 0)})
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target-db">Target Database (optional)</Label>
                  <Input
                    id="target-db"
                    value={restoreForm.targetDatabase}
                    onChange={(e) => setRestoreForm(prev => ({ ...prev, targetDatabase: e.target.value }))}
                    placeholder="Leave empty to restore to original database"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="drop-existing"
                      checked={restoreForm.dropExisting}
                      onCheckedChange={(checked) => 
                        setRestoreForm(prev => ({ ...prev, dropExisting: checked as boolean }))
                      }
                    />
                    <Label htmlFor="drop-existing">Drop existing database</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="restore-data"
                      checked={restoreForm.restoreData}
                      onCheckedChange={(checked) => 
                        setRestoreForm(prev => ({ ...prev, restoreData: checked as boolean }))
                      }
                    />
                    <Label htmlFor="restore-data">Restore data</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="restore-schema"
                      checked={restoreForm.restoreSchema}
                      onCheckedChange={(checked) => 
                        setRestoreForm(prev => ({ ...prev, restoreSchema: checked as boolean }))
                      }
                    />
                    <Label htmlFor="restore-schema">Restore schema</Label>
                  </div>
                </div>

                <Button 
                  onClick={startRestore}
                  disabled={!restoreForm.backupId}
                  className="w-full"
                >
                  Start Restore
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Restore Jobs</h3>
              <div className="space-y-4">
                {restoreJobs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No restore jobs found</p>
                ) : (
                  restoreJobs.slice(0, 5).map(job => (
                    <div key={job.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-sm">Restore Job</h4>
                          <p className="text-xs text-gray-600">
                            {new Date(job.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>

                      {job.status === 'running' && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{Math.round(job.progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {job.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                          {job.error}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create Backup</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="backup-type">Backup Type</Label>
                  <Select 
                    value={createBackupForm.type} 
                    onValueChange={(value) => setCreateBackupForm(prev => ({ ...prev, type: value as BackupJob['type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="incremental">Incremental Backup</SelectItem>
                      <SelectItem value="differential">Differential Backup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="retention-days">Retention Days</Label>
                  <Input
                    id="retention-days"
                    type="number"
                    min="1"
                    max="365"
                    value={createBackupForm.retentionDays}
                    onChange={(e) => setCreateBackupForm(prev => ({ 
                      ...prev, 
                      retentionDays: parseInt(e.target.value) || 30 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="compression"
                      checked={createBackupForm.compression}
                      onCheckedChange={(checked) => 
                        setCreateBackupForm(prev => ({ ...prev, compression: checked as boolean }))
                      }
                    />
                    <Label htmlFor="compression">Enable compression</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="encryption"
                      checked={createBackupForm.encryption}
                      onCheckedChange={(checked) => 
                        setCreateBackupForm(prev => ({ ...prev, encryption: checked as boolean }))
                      }
                    />
                    <Label htmlFor="encryption">Enable encryption</Label>
                  </div>
                </div>

                <Button onClick={createBackup} className="w-full">
                  Create Backup
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create Schedule</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="schedule-name">Schedule Name</Label>
                  <Input
                    id="schedule-name"
                    value={createScheduleForm.name}
                    onChange={(e) => setCreateScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Daily backup, Weekly backup, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="schedule-type">Backup Type</Label>
                  <Select 
                    value={createScheduleForm.type} 
                    onValueChange={(value) => setCreateScheduleForm(prev => ({ ...prev, type: value as BackupSchedule['type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="incremental">Incremental Backup</SelectItem>
                      <SelectItem value="differential">Differential Backup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cron-expression">Schedule (Cron Expression)</Label>
                  <Select 
                    value={createScheduleForm.cronExpression} 
                    onValueChange={(value) => setCreateScheduleForm(prev => ({ ...prev, cronExpression: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 2 * * *">Daily at 2:00 AM</SelectItem>
                      <SelectItem value="0 2 * * 0">Weekly (Sunday at 2:00 AM)</SelectItem>
                      <SelectItem value="0 2 1 * *">Monthly (1st at 2:00 AM)</SelectItem>
                      <SelectItem value="0 */6 * * *">Every 6 hours</SelectItem>
                      <SelectItem value="0 */12 * * *">Every 12 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="schedule-retention">Retention Days</Label>
                  <Input
                    id="schedule-retention"
                    type="number"
                    min="1"
                    max="365"
                    value={createScheduleForm.retentionDays}
                    onChange={(e) => setCreateScheduleForm(prev => ({ 
                      ...prev, 
                      retentionDays: parseInt(e.target.value) || 30 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="schedule-compression"
                      checked={createScheduleForm.compression}
                      onCheckedChange={(checked) => 
                        setCreateScheduleForm(prev => ({ ...prev, compression: checked as boolean }))
                      }
                    />
                    <Label htmlFor="schedule-compression">Enable compression</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="schedule-encryption"
                      checked={createScheduleForm.encryption}
                      onCheckedChange={(checked) => 
                        setCreateScheduleForm(prev => ({ ...prev, encryption: checked as boolean }))
                      }
                    />
                    <Label htmlFor="schedule-encryption">Enable encryption</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify-failure"
                      checked={createScheduleForm.notifyOnFailure}
                      onCheckedChange={(checked) => 
                        setCreateScheduleForm(prev => ({ ...prev, notifyOnFailure: checked as boolean }))
                      }
                    />
                    <Label htmlFor="notify-failure">Notify on failure</Label>
                  </div>
                </div>

                <Button 
                  onClick={createSchedule}
                  disabled={!createScheduleForm.name}
                  className="w-full"
                >
                  Create Schedule
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupManager;