import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { 
  Send, 
  Calendar as CalendarIcon, 
  Users, 
  AlertTriangle, 
  Save, 
  Eye,
  Clock,
  Target
} from 'lucide-react';

interface AnnouncementFormData {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'emergency' | 'maintenance';
  targetAudience: string[];
  scheduledAt?: Date;
  isEmergency: boolean;
  requireConfirmation: boolean;
  expiresAt?: Date;
}

interface AnnouncementCreatorProps {
  onSave: (announcement: AnnouncementFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<AnnouncementFormData>;
}

export const AnnouncementCreator: React.FC<AnnouncementCreatorProps> = ({
  onSave,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: initialData?.title || '',
    content: initialData?.content || '',
    type: initialData?.type || 'info',
    targetAudience: initialData?.targetAudience || [],
    scheduledAt: initialData?.scheduledAt,
    isEmergency: initialData?.isEmergency || false,
    requireConfirmation: initialData?.requireConfirmation || false,
    expiresAt: initialData?.expiresAt
  });

  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  const audienceOptions = [
    { id: 'all_users', label: 'All Users' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'companies', label: 'Companies' },
    { id: 'admins', label: 'Administrators' },
    { id: 'active_users', label: 'Active Users (Last 30 days)' },
    { id: 'new_users', label: 'New Users (Last 7 days)' },
    { id: 'premium_users', label: 'Premium Users' },
    { id: 'geographic_us', label: 'US Users' },
    { id: 'geographic_eu', label: 'EU Users' },
    { id: 'geographic_asia', label: 'Asia Users' }
  ];

  const handleSubmit = async (action: 'save' | 'send' | 'schedule') => {
    try {
      setLoading(true);
      
      const announcementData = {
        ...formData,
        action
      };

      await onSave(announcementData);
    } catch (error) {
      console.error('Error saving announcement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAudienceChange = (audienceId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: checked
        ? [...prev.targetAudience, audienceId]
        : prev.targetAudience.filter(id => id !== audienceId)
    }));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-orange-500 bg-orange-50';
      case 'maintenance':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const isFormValid = () => {
    return formData.title.trim() && 
           formData.content.trim() && 
           formData.targetAudience.length > 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Edit Announcement' : 'Create New Announcement'}
          </h3>
          <p className="text-gray-600">
            Create and schedule announcements for your platform users
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className={`p-6 ${getTypeColor(formData.type)}`}>
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Announcement Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter announcement title..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="content">Message Content</Label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your announcement message..."
                  rows={6}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Announcement Type</Label>
                  <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Options</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="emergency"
                        checked={formData.isEmergency}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEmergency: !!checked }))}
                      />
                      <Label htmlFor="emergency" className="text-sm">Emergency broadcast</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="confirmation"
                        checked={formData.requireConfirmation}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireConfirmation: !!checked }))}
                      />
                      <Label htmlFor="confirmation" className="text-sm">Require confirmation</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Scheduling */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Scheduling</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduler(!showScheduler)}
              >
                <Clock className="h-4 w-4 mr-2" />
                {showScheduler ? 'Send Now' : 'Schedule'}
              </Button>
            </div>

            {showScheduler && (
              <div className="space-y-4">
                <div>
                  <Label>Scheduled Send Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start mt-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {formData.scheduledAt ? formData.scheduledAt.toLocaleDateString() : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.scheduledAt}
                        onSelect={(date) => setFormData(prev => ({ ...prev, scheduledAt: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Expiration Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start mt-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {formData.expiresAt ? formData.expiresAt.toLocaleDateString() : 'No expiration'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expiresAt}
                        onSelect={(date) => setFormData(prev => ({ ...prev, expiresAt: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Audience */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Target className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Target Audience</h4>
            </div>
            
            <div className="space-y-3">
              {audienceOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={formData.targetAudience.includes(option.id)}
                    onCheckedChange={(checked) => handleAudienceChange(option.id, !!checked)}
                  />
                  <Label htmlFor={option.id} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>

            {formData.targetAudience.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <Users className="h-4 w-4 inline mr-1" />
                  {formData.targetAudience.length} audience group(s) selected
                </p>
              </div>
            )}
          </Card>

          {/* Preview */}
          {showPreview && (
            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
              <div className={`p-4 rounded-lg border-l-4 ${
                formData.type === 'emergency' ? 'border-red-500 bg-red-50' :
                formData.type === 'warning' ? 'border-orange-500 bg-orange-50' :
                formData.type === 'maintenance' ? 'border-blue-500 bg-blue-50' :
                'border-gray-500 bg-gray-50'
              }`}>
                <h5 className="font-semibold text-gray-900 mb-2">{formData.title || 'Announcement Title'}</h5>
                <p className="text-gray-700 text-sm">{formData.content || 'Announcement content will appear here...'}</p>
                {formData.isEmergency && (
                  <div className="mt-2 flex items-center text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Emergency Announcement
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card className="p-6">
            <div className="space-y-3">
              <Button
                onClick={() => handleSubmit('save')}
                variant="outline"
                className="w-full"
                disabled={!isFormValid() || loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>

              {showScheduler ? (
                <Button
                  onClick={() => handleSubmit('schedule')}
                  className="w-full"
                  disabled={!isFormValid() || !formData.scheduledAt || loading}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Announcement
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit('send')}
                  className="w-full"
                  disabled={!isFormValid() || loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
              )}

              {formData.isEmergency && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center text-red-800 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Emergency Broadcast</span>
                  </div>
                  <p className="text-red-700 text-xs mt-1">
                    This will immediately notify all selected users with high priority.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};