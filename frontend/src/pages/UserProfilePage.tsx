/**
 * User Profile Page
 * Allows users to view and edit their personal profile information
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Layout from '../components/Layout';
import { Card, Stack, Button, Badge } from '../design-system/components';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  Shield,
  Edit3,
  Save,
  X,
  Key,
  Trash2
} from 'lucide-react';
import { userService, type UpdateUserProfileData } from '../services/userService';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfilePage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userService.getUserProfile(token!),
    enabled: !!token,
  });

  // Profile update form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty }
  } = useForm<UpdateUserProfileData>();

  // Password change form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors }
  } = useForm<ChangePasswordFormData>();

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateUserProfileData) => userService.updateUserProfile(data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to update profile', 'error');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => 
      userService.changePassword(data, token!),
    onSuccess: () => {
      resetPassword();
      setShowChangePassword(false);
      showToast('Password changed successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to change password', 'error');
    },
  });

  // Set form values when profile loads
  React.useEffect(() => {
    if (profile && !isEditing) {
      resetProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
    }
  }, [profile, resetProfile, isEditing]);

  const onSubmitProfile = (data: UpdateUserProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitPassword = (data: ChangePasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      resetProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'info';
      case 'COMPANY_ADMIN': return 'success';
      case 'COMPANY_USER': return 'neutral';
      default: return 'neutral';
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'Platform Admin';
      case 'COMPANY_ADMIN': return 'Company Admin';
      case 'COMPANY_USER': return 'Company User';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Card padding="lg">
            <Stack spacing={4} align="center">
              <h2 className="text-2xl font-bold ds-text-gray-900">Error Loading Profile</h2>
              <p className="ds-text-gray-600">
                {error instanceof Error ? error.message : 'Failed to load user profile'}
              </p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </Stack>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <Stack spacing={6}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold ds-text-gray-900">My Profile</h1>
              <p className="ds-text-gray-600 mt-2">Manage your personal information and account settings</p>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Profile Information */}
          <Card padding="lg">
            <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
              <Stack spacing={6}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold ds-text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 ds-text-primary" />
                    Personal Information
                  </h2>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={!isProfileDirty || updateProfileMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <Save className="h-4 w-4" />
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        {...registerProfile('firstName', { required: 'First name is required' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ) : (
                      <p className="text-sm ds-text-gray-900 py-2">{profile.firstName}</p>
                    )}
                    {profileErrors.firstName && (
                      <p className="text-sm text-red-600 mt-1">{profileErrors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        {...registerProfile('lastName', { required: 'Last name is required' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ) : (
                      <p className="text-sm ds-text-gray-900 py-2">{profile.lastName}</p>
                    )}
                    {profileErrors.lastName && (
                      <p className="text-sm text-red-600 mt-1">{profileErrors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email Address
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm ds-text-gray-900 py-2">{profile.email}</p>
                      {profile.emailVerified ? (
                        <Badge variant="success" size="sm">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        {...registerProfile('phone', { required: 'Phone number is required' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    ) : (
                      <p className="text-sm ds-text-gray-900 py-2">{profile.phone}</p>
                    )}
                    {profileErrors.phone && (
                      <p className="text-sm text-red-600 mt-1">{profileErrors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Role
                    </label>
                    <Badge variant={getRoleBadgeVariant(profile.role)} size="md">
                      {formatRole(profile.role)}
                    </Badge>
                  </div>

                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Member Since
                    </label>
                    <p className="text-sm ds-text-gray-900 py-2">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Stack>
            </form>
          </Card>

          {/* Company Information */}
          <Card padding="lg">
            <Stack spacing={4}>
              <h2 className="text-xl font-semibold ds-text-gray-900 flex items-center gap-2">
                <Building className="h-5 w-5 ds-text-primary" />
                Company Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                    Company Name
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm ds-text-gray-900 py-2">{profile.company.name}</p>
                    {profile.company.verified && (
                      <Badge variant="success" size="sm">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                    Organization Number
                  </label>
                  <p className="text-sm ds-text-gray-900 py-2">{profile.company.organizationNumber}</p>
                </div>
              </div>
            </Stack>
          </Card>

          {/* Security Settings */}
          <Card padding="lg">
            <Stack spacing={4}>
              <h2 className="text-xl font-semibold ds-text-gray-900 flex items-center gap-2">
                <Key className="h-5 w-5 ds-text-primary" />
                Security Settings
              </h2>

              {!showChangePassword ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium ds-text-gray-900">Password</h3>
                    <p className="text-sm ds-text-gray-600">Last updated: {new Date(profile.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangePassword(true)}
                  >
                    Change Password
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
                  <Stack spacing={4}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium ds-text-gray-900">Change Password</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowChangePassword(false);
                          resetPassword();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-w-md">
                      <div>
                        <input
                          type="password"
                          placeholder="Current Password"
                          {...registerPassword('currentPassword', { required: 'Current password is required' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        {passwordErrors.currentPassword && (
                          <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword.message}</p>
                        )}
                      </div>

                      <div>
                        <input
                          type="password"
                          placeholder="New Password"
                          {...registerPassword('newPassword', { 
                            required: 'New password is required',
                            minLength: { value: 8, message: 'Password must be at least 8 characters' }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        {passwordErrors.newPassword && (
                          <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword.message}</p>
                        )}
                      </div>

                      <div>
                        <input
                          type="password"
                          placeholder="Confirm New Password"
                          {...registerPassword('confirmPassword', { 
                            required: 'Please confirm your new password',
                            validate: (value) => 
                              value === watchPassword('newPassword') || 'Passwords do not match'
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword.message}</p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={changePasswordMutation.isPending}
                        className="w-full"
                      >
                        {changePasswordMutation.isPending ? 'Changing Password...' : 'Change Password'}
                      </Button>
                    </div>
                  </Stack>
                </form>
              )}
            </Stack>
          </Card>

          {/* Danger Zone */}
          <Card padding="lg">
            <Stack spacing={4}>
              <h2 className="text-xl font-semibold ds-text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </h2>

              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <Stack spacing={3}>
                  <div>
                    <h3 className="text-sm font-medium ds-text-red-800">Delete Account</h3>
                    <p className="text-sm ds-text-red-600 mt-1">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                        // Navigate to delete account page
                        window.location.href = '/settings/delete-account';
                      }
                    }}
                    className="border-red-300 text-red-700 hover:bg-red-50 w-fit"
                  >
                    Delete Account
                  </Button>
                </Stack>
              </div>
            </Stack>
          </Card>
        </Stack>
      </div>
    </Layout>
  );
}