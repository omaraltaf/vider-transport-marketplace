/**
 * ProfileStatus Component
 * Displays company profile completeness, verification status, and quick access to settings
 * 
 * Features:
 * - Display profile completeness percentage with progress bar
 * - List missing required fields
 * - Display verification badge status
 * - Display driver verification status
 * - Links to profile edit page and notification settings
 * - Uses design system components
 * - Validates Requirements 4.1, 4.2, 4.3, 7.4
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Stack, Button, Badge } from '../../design-system/components';
import { 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  Bell, 
  AlertCircle,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import type { ProfileStatus as ProfileStatusType } from '../../hooks/useDashboardData';

export interface ProfileStatusProps {
  profile: ProfileStatusType;
}

/**
 * Progress Bar Component
 * Simple progress bar for displaying profile completeness
 */
interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  label, 
  showPercentage = true 
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const isComplete = clampedValue === 100;
  
  // Create accessible label for progress bar
  const ariaLabel = label 
    ? `${label}: ${clampedValue}%` 
    : `Profile completeness: ${clampedValue}%`;
  
  return (
    <div 
      className="progress-bar-container" 
      role="progressbar" 
      aria-valuenow={clampedValue} 
      aria-valuemin={0} 
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      {(label || showPercentage) && (
        <div className="progress-bar-label">
          {label && <span className="text-sm font-medium ds-text-gray-700">{label}</span>}
          {showPercentage && (
            <span className={`text-sm font-semibold ${isComplete ? 'ds-text-success' : 'ds-text-primary'}`}>
              {clampedValue.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="progress-bar-track">
        <div 
          className={`progress-bar-fill ${isComplete ? 'complete' : ''}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

/**
 * ProfileStatus Component
 */
export const ProfileStatus: React.FC<ProfileStatusProps> = ({ profile }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isProfileComplete = profile.completeness === 100;
  const hasVerificationIssues = !profile.verified || !profile.allDriversVerified;
  
  // Get company ID from authenticated user
  const companyId = user?.companyId;

  return (
    <Card padding="md">
      <Stack spacing={4}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold ds-text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 ds-text-primary" aria-hidden="true" />
            Profile & Settings
          </h3>
        </div>

        {/* Profile Completeness Section */}
        <div className="profile-section">
          <Stack spacing={3}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium ds-text-gray-700">
                Profile Completeness
              </h4>
              {isProfileComplete && (
                <Badge variant="success" size="sm">
                  <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                  Complete
                </Badge>
              )}
            </div>

            <ProgressBar 
              value={profile.completeness} 
              showPercentage={true}
              label=""
            />

            {/* Missing Fields */}
            {profile.missingFields.length > 0 && (
              <div className="missing-fields">
                <Stack spacing={2}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 ds-text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-sm font-medium ds-text-gray-700 mb-1">
                        Missing Required Fields:
                      </p>
                      <ul className="missing-fields-list">
                        {profile.missingFields.map((field, index) => (
                          <li key={index} className="text-sm ds-text-gray-600">
                            {field}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/companies/${companyId}/edit`)}
                    className="w-full justify-center"
                    aria-label="Complete your profile"
                  >
                    Complete Profile
                    <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                  </Button>
                </Stack>
              </div>
            )}

            {isProfileComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/companies/${companyId}/edit`)}
                className="w-full justify-center"
                aria-label="Edit your profile"
              >
                <User className="h-4 w-4 mr-2" aria-hidden="true" />
                Edit Profile
              </Button>
            )}
          </Stack>
        </div>

        {/* Verification Status Section */}
        <div className="profile-section">
          <Stack spacing={3}>
            <h4 className="text-sm font-medium ds-text-gray-700">
              Verification Status
            </h4>

            {/* Company Verification */}
            <div className="verification-item">
              <Stack direction="horizontal" spacing={3} align="center" justify="between">
                <Stack direction="horizontal" spacing={2} align="center">
                  {profile.verified ? (
                    <ShieldCheck className="h-5 w-5 ds-text-success" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 ds-text-warning" aria-hidden="true" />
                  )}
                  <span className="text-sm ds-text-gray-700">Company Verified</span>
                </Stack>
                <Badge 
                  variant={profile.verified ? 'success' : 'warning'} 
                  size="sm"
                  aria-label={profile.verified ? 'Verified' : 'Pending verification'}
                >
                  {profile.verified ? 'Verified' : 'Pending'}
                </Badge>
              </Stack>
            </div>

            {/* Driver Verification */}
            <div className="verification-item">
              <Stack direction="horizontal" spacing={3} align="center" justify="between">
                <Stack direction="horizontal" spacing={2} align="center">
                  {profile.allDriversVerified ? (
                    <ShieldCheck className="h-5 w-5 ds-text-success" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 ds-text-warning" aria-hidden="true" />
                  )}
                  <span className="text-sm ds-text-gray-700">All Drivers Verified</span>
                </Stack>
                <Badge 
                  variant={profile.allDriversVerified ? 'success' : 'warning'} 
                  size="sm"
                  aria-label={profile.allDriversVerified ? 'All verified' : 'Some pending'}
                >
                  {profile.allDriversVerified ? 'All Verified' : 'Pending'}
                </Badge>
              </Stack>
            </div>

            {hasVerificationIssues && (
              <div className="verification-notice">
                <Stack direction="horizontal" spacing={2} align="start">
                  <AlertCircle className="h-4 w-4 ds-text-info flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs ds-text-gray-600">
                    Verification is pending. You'll be notified once the review is complete.
                  </p>
                </Stack>
              </div>
            )}
          </Stack>
        </div>

        {/* Quick Actions Section */}
        <div className="profile-section">
          <Stack spacing={2}>
            <h4 className="text-sm font-medium ds-text-gray-700 mb-1">
              Quick Actions
            </h4>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings/notifications')}
              className="w-full justify-start"
              aria-label="Manage notification preferences"
            >
              <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
              Notification Preferences
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/companies/${companyId}/edit`)}
              className="w-full justify-start"
              aria-label="Manage account settings"
            >
              <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
              Account Settings
            </Button>
          </Stack>
        </div>
      </Stack>

      <style>{`
        .profile-section {
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-gray-200);
        }

        .profile-section:last-child {
          padding-bottom: 0;
          border-bottom: none;
        }

        /* Progress Bar Styles */
        .progress-bar-container {
          width: 100%;
        }

        .progress-bar-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .progress-bar-track {
          width: 100%;
          height: 12px;
          background-color: var(--color-gray-200);
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dark));
          border-radius: 9999px;
          transition: width 0.3s ease, background 0.3s ease;
          position: relative;
        }

        .progress-bar-fill.complete {
          background: linear-gradient(90deg, var(--color-success), var(--color-success-dark));
        }

        .progress-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Missing Fields Styles */
        .missing-fields {
          background-color: var(--color-warning-light);
          border: 1px solid var(--color-warning);
          border-radius: 0.5rem;
          padding: 0.75rem;
        }

        .missing-fields-list {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0;
        }

        .missing-fields-list li {
          margin-bottom: 0.25rem;
        }

        .missing-fields-list li:last-child {
          margin-bottom: 0;
        }

        /* Verification Item Styles */
        .verification-item {
          padding: 0.75rem;
          background-color: var(--color-gray-50);
          border-radius: 0.5rem;
          transition: background-color 0.2s ease;
        }

        .verification-item:hover {
          background-color: var(--color-gray-100);
        }

        /* Verification Notice */
        .verification-notice {
          background-color: var(--color-info-light);
          border: 1px solid var(--color-info);
          border-radius: 0.5rem;
          padding: 0.75rem;
        }

        /* Mobile optimizations - ensure touch targets are at least 44x44px */
        @media (max-width: 767px) {
          button {
            min-height: 44px;
            min-width: 44px;
          }

          .profile-section {
            padding-bottom: 0.75rem;
          }

          .progress-bar-track {
            height: 10px;
          }

          .missing-fields {
            padding: 0.625rem;
          }

          .missing-fields-list {
            font-size: 0.75rem;
          }

          .verification-item {
            padding: 0.625rem;
          }

          .verification-notice {
            padding: 0.625rem;
          }
        }

        /* Tablet optimizations */
        @media (min-width: 768px) and (max-width: 1023px) {
          button {
            min-height: 40px;
          }

          .progress-bar-track {
            height: 11px;
          }
        }

        /* Desktop optimizations */
        @media (min-width: 1024px) {
          .progress-bar-track {
            height: 12px;
          }
        }
      `}</style>
    </Card>
  );
};
