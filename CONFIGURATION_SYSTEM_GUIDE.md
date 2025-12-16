# Platform Configuration System Guide

## Overview

The platform configuration system allows you to easily manage commission rates, tax rates, and other financial/system configurations through the platform admin interface. All configurations are stored in the database and can be modified without code changes.

## Accessing the Configuration System

### Via Platform Admin Dashboard

1. **Login as Platform Admin**
   - Go to `/platform-admin`
   - Login with your platform admin credentials

2. **Navigate to Configuration**
   - Click on "System" in the sidebar
   - Select the "Configuration" tab
   - You'll see all configurable settings organized by category

### Direct URL Access

- Configuration Panel: `/platform-admin/system` (Configuration tab)

## Configuration Types

The platform configuration system includes two types of settings:

- **✅ Database Stored**: These configurations are actually stored in the database and changes affect the platform behavior immediately
- **⚠️ UI Only (Default Values)**: These are display-only values in the configuration interface. They provide a consistent UI experience but don't modify actual system behavior

### Currently Database-Stored Configurations:
- Commission Rate (Financial)
- Tax Rate (Financial) 
- Default Currency (Financial)
- Booking Timeout Hours (System)
- Maintenance Mode (System)
- Instant Booking (Features)
- Recurring Bookings (Features)

### UI-Only Default Values:
- Min/Max Booking Amounts (Financial)
- Session Timeout (System)
- Driver Ratings (Features)
- Security Settings (Max Login Attempts, Password Length)
- Performance Settings (Cache TTL, API Rate Limits)

## Configuration Categories

### 1. Financial Configuration

**Commission Rate** ✅ *Database Stored*
- **Current Value**: 5% (editable)
- **Description**: Platform commission rate charged on bookings
- **Range**: 0% - 50%
- **Impact**: Affects all new bookings immediately

**Tax Rate (VAT)** ✅ *Database Stored*
- **Current Value**: 25% (Norwegian VAT rate)
- **Description**: Tax rate applied to commission
- **Range**: 0% - 50%
- **Impact**: Affects commission calculations

**Default Currency** ✅ *Database Stored*
- **Current Value**: NOK (Norwegian Kroner)
- **Options**: NOK, EUR, USD
- **Impact**: Platform-wide currency display

**Booking Limits** ⚠️ *UI Only (Default Values)*
- **Minimum Booking Amount**: 500 NOK (UI default)
- **Maximum Booking Amount**: 100,000 NOK (UI default)
- **Note**: These are display-only values for the UI interface

### 2. System Configuration

**Booking Timeout** ✅ *Database Stored*
- **Current Value**: 24 hours (editable)
- **Description**: Hours before unpaid bookings are cancelled
- **Range**: 1-168 hours (1 week max)
- **Impact**: Affects booking expiration logic

**Session Timeout** ⚠️ *UI Only (Default Value)*
- **Display Value**: 60 minutes (UI default)
- **Description**: Minutes before user sessions expire
- **Range**: 15-480 minutes (8 hours max)
- **Note**: This is a display-only value for the UI interface

**Maintenance Mode** ✅ *Database Stored*
- **Current Value**: OFF (editable)
- **Description**: Enables/disables platform access for maintenance
- **Options**: On/Off
- **Impact**: Restricts user access when enabled

### 3. Feature Configuration

**Instant Booking** ✅ *Database Stored*
- **Current Value**: DISABLED (editable)
- **Description**: Allow users to book without approval
- **Options**: Enabled/Disabled
- **Impact**: Changes booking workflow behavior

**Recurring Bookings** ✅ *Database Stored*
- **Current Value**: ENABLED (editable)
- **Description**: Enable recurring booking functionality
- **Options**: Enabled/Disabled
- **Impact**: Shows/hides recurring booking features

**Driver Ratings** ⚠️ *UI Only (Default Value)*
- **Display Value**: ENABLED (UI default)
- **Description**: Enable driver rating system
- **Options**: Enabled/Disabled
- **Note**: This is a display-only value for the UI interface

### 4. Security Configuration

**Max Login Attempts** ⚠️ *UI Only (Default Value)*
- **Display Value**: 5 attempts (UI default)
- **Description**: Failed attempts before account lockout
- **Range**: 3-10 attempts
- **Note**: This is a display-only value for the UI interface

**Password Requirements** ⚠️ *UI Only (Default Value)*
- **Display Value**: 8 characters (UI default)
- **Description**: Minimum password length
- **Range**: 6-20 characters
- **Note**: This is a display-only value for the UI interface

### 5. Performance Configuration

**Cache TTL** ⚠️ *UI Only (Default Value)*
- **Display Value**: 300 seconds (UI default)
- **Description**: Cache time-to-live in seconds
- **Range**: 60-3600 seconds
- **Note**: This is a display-only value for the UI interface

**API Rate Limit** ⚠️ *UI Only (Default Value)*
- **Display Value**: 100 requests/minute (UI default)
- **Description**: Max requests per minute per user
- **Range**: 10-1000 requests/minute
- **Note**: This is a display-only value for the UI interface

## How to Update Configurations

### Single Configuration Update

1. **Navigate to Configuration Panel**
   - Platform Admin → System → Configuration

2. **Select Category Tab**
   - Choose the appropriate category (Financial, System, etc.)

3. **Modify Values**
   - Click on the input field for the setting you want to change
   - Enter the new value
   - The system will validate the input

4. **Save Changes**
   - Click "Save Changes" button
   - Confirm the update in the dialog

### Bulk Configuration Update

1. **Make Multiple Changes**
   - Modify several settings across different categories
   - Each change is tracked as "pending"

2. **Review Pending Changes**
   - See the number of pending changes in the save button
   - Review all changes before saving

3. **Save All Changes**
   - Click "Save Changes (X)" where X is the number of changes
   - All changes are applied atomically

### Configuration History

- **View Change History**
  - All configuration changes are logged
  - Access via the "History" section
  - See who made changes and when

- **Audit Trail**
  - Every change includes:
    - Old value → New value
    - Admin who made the change
    - Timestamp
    - Reason (if provided)

## API Endpoints

### Get All Configurations
```
GET /api/platform-admin/system/config
```

### Update Single Configuration
```
PUT /api/platform-admin/system/config/{key}
Body: { "value": newValue, "reason": "Optional reason" }
```

### Bulk Update
```
POST /api/platform-admin/system/config/bulk-update
Body: { 
  "updates": [
    { "key": "commission_rate", "value": 5.0 },
    { "key": "tax_rate", "value": 25.0 }
  ],
  "reason": "Quarterly rate adjustment"
}
```

### Get Configuration History
```
GET /api/platform-admin/system/config/history?key={optional_key}
```

## Commission Rate Management

### Current Commission System

The platform uses a **percentage-based commission system**:

- **Base Rate**: Configurable percentage (default: 5%)
- **Applied To**: Total booking amount
- **Tax Calculation**: VAT applied to commission amount
- **Real-time Updates**: Changes affect **ONLY NEW BOOKINGS** immediately

### 🔒 **HISTORICAL DATA PROTECTION**

**IMPORTANT**: Changing commission rates will **NEVER** affect existing bookings!

- ✅ **Historical bookings are safe**: Each booking stores its own commission rate and tax rate from when it was created
- ✅ **Financial integrity**: All commission and tax amounts are permanently calculated and stored at booking time
- ✅ **No retroactive changes**: Past bookings maintain their original financial calculations
- ✅ **Future bookings only**: Rate changes only apply to new bookings created after the change
- ✅ **Audit trail**: All rate changes are logged with timestamps for compliance

### Example Calculation

For a 1000 NOK booking with 5% commission and 25% VAT:
- **Booking Amount**: 1000 NOK
- **Commission (5%)**: 50 NOK
- **VAT on Commission (25%)**: 12.50 NOK
- **Total Platform Fee**: 62.50 NOK
- **Company Receives**: 937.50 NOK

### Advanced Commission Features

The system also supports:
- **Tiered Rates**: Different rates based on volume
- **Regional Overrides**: Special rates for specific regions
- **Company-Specific Rates**: Custom rates for individual companies
- **Volume Discounts**: Automatic rate reductions for high-volume companies

## Testing the Configuration System

Run the test script to verify everything is working:

```bash
npm run ts-node scripts/test-configuration-system.ts
```

This will:
- ✅ Check platform configuration exists
- ✅ Verify all configuration categories
- ✅ Test commission calculations
- ✅ Validate API endpoints
- ✅ Check audit logging

## Troubleshooting

### Configuration Not Saving

1. **Check Admin Permissions**
   - Ensure you have platform admin role
   - Verify authentication token is valid

2. **Validate Input Values**
   - Check value ranges (e.g., 0-50% for rates)
   - Ensure required fields are filled

3. **Check Network Connection**
   - Verify API endpoints are accessible
   - Check browser console for errors

### Commission Calculations Incorrect

1. **Verify Configuration Values**
   - Check commission rate in Financial tab
   - Verify tax rate setting
   - Confirm currency settings

2. **Check Calculation Logic**
   - Commission = Booking Amount × Commission Rate
   - Tax = Commission × Tax Rate
   - Total Fee = Commission + Tax

### Changes Not Taking Effect

1. **Cache Issues**
   - Some changes require cache clearing
   - Performance settings may need restart

2. **Database Sync**
   - Check if changes are saved in database
   - Verify audit logs show the updates

## Security Considerations

- **Admin Access Only**: Configuration changes require platform admin role
- **Audit Logging**: All changes are logged with admin ID and timestamp
- **Input Validation**: All values are validated before saving
- **Rate Limiting**: API endpoints have rate limiting protection
- **Backup Recommended**: Create backups before major configuration changes

## Best Practices

1. **Test Changes**: Use small increments when adjusting rates
2. **Document Reasons**: Always provide reasons for configuration changes
3. **Monitor Impact**: Watch metrics after configuration changes
4. **Regular Backups**: Backup configuration before major changes
5. **Staged Rollout**: Consider gradual rollout for major rate changes

## Support

If you encounter issues with the configuration system:

1. **Check the logs**: Look at audit logs for recent changes
2. **Run the test script**: Use the test script to diagnose issues
3. **Review this guide**: Ensure you're following the correct procedures
4. **Contact support**: Provide specific error messages and steps to reproduce

---

**Last Updated**: December 2024
**Version**: 2.1.0