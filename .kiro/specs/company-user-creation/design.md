# Company User Creation Design

## Overview

This design document outlines the implementation of company user creation functionality in the platform admin interface. The feature allows platform administrators to create users of different roles (Customer, Driver, Company Admin) and assign them to specific companies during the creation process.

## Architecture

### Frontend Components
- **UserCreationModal**: New modal component for creating users with company selection
- **CompanySelector**: Reusable dropdown component for selecting companies
- **UserManagementPanel**: Updated to include "Add User" functionality
- **RoleSelector**: Component for selecting user roles with dynamic form fields

### Backend Services
- **User Creation API**: New endpoint for creating users with company assignment
- **Company Lookup API**: Endpoint for fetching companies for selection
- **User Validation Service**: Service for validating user data and preventing duplicates

## Components and Interfaces

### Frontend Interfaces

```typescript
interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'COMPANY_ADMIN';
  companyId: string;
  permissions?: string[]; // For Company Admin role
  driverLicense?: string; // For Driver role
  vehicleTypes?: string[]; // For Driver role
}

interface CompanyOption {
  id: string;
  name: string;
  organizationNumber: string;
  city: string;
  fylke: string;
}

interface UserCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserData) => Promise<void>;
  loading: boolean;
}
```

### Backend API Endpoints

```typescript
// Create user with company assignment
POST /api/platform-admin/users
{
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'COMPANY_ADMIN';
  companyId: string;
  permissions?: string[];
  driverLicense?: string;
  vehicleTypes?: string[];
}

// Get companies for selection
GET /api/platform-admin/companies/options
Query: ?search=string&limit=number

Response: {
  companies: CompanyOption[];
  total: number;
}
```

## Data Models

### User Creation Request
```typescript
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  companyId: string;
  permissions?: string[];
  additionalData?: {
    driverLicense?: string;
    vehicleTypes?: string[];
  };
}
```

### Company Selection Data
```typescript
interface CompanySelectionData {
  id: string;
  name: string;
  organizationNumber: string;
  city: string;
  fylke: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  verified: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: User Creation with Company Assignment
*For any* valid user creation request with a valid company ID, the system should create a user record with the correct company assignment and the user should appear in the company's user list.
**Validates: Requirements 1.5**

### Property 2: Email Uniqueness Validation
*For any* user creation request, if the email already exists in the system, the creation should be rejected with an appropriate error message.
**Validates: Requirements 4.1**

### Property 3: Required Field Validation
*For any* user creation request missing required fields (email, firstName, lastName, role, companyId), the system should reject the request and return specific validation errors.
**Validates: Requirements 4.2, 4.3**

### Property 4: Role-Based Form Validation
*For any* user creation request with role "COMPANY_ADMIN", if no permissions are provided, the system should reject the request; for role "DRIVER", if driver-specific fields are missing, the system should handle gracefully.
**Validates: Requirements 2.2, 2.3**

### Property 5: Company Selection Consistency
*For any* company selection operation, the returned company data should be consistent with the actual company records in the database.
**Validates: Requirements 3.1, 3.2**

## Error Handling

### Validation Errors
- **Email Already Exists**: Return 409 Conflict with specific error message
- **Invalid Company ID**: Return 400 Bad Request with "Company not found" message
- **Missing Required Fields**: Return 400 Bad Request with field-specific error messages
- **Invalid Role**: Return 400 Bad Request with valid role options

### System Errors
- **Database Connection Issues**: Return 500 Internal Server Error with generic message
- **Company Service Unavailable**: Return 503 Service Unavailable with retry message
- **Authentication Failures**: Return 401 Unauthorized with authentication required message

### Frontend Error Handling
- Display validation errors inline with form fields
- Show system errors in modal error banner
- Provide retry mechanisms for network failures
- Clear errors when user corrects input

## Testing Strategy

### Unit Testing
- Test user creation form validation
- Test company selection dropdown functionality
- Test role-based form field rendering
- Test API endpoint parameter validation
- Test error message display and handling

### Property-Based Testing
- Use **fast-check** library for JavaScript/TypeScript property-based testing
- Configure each property test to run minimum 100 iterations
- Test user creation with randomly generated valid data
- Test validation with randomly generated invalid data
- Test company selection with various search queries

### Integration Testing
- Test complete user creation workflow from frontend to database
- Test company selection with real company data
- Test role assignment and permission handling
- Test error scenarios with actual API responses

## Implementation Notes

### Frontend Implementation
1. **UserCreationModal Component**
   - Modal overlay with form for user creation
   - Dynamic form fields based on selected role
   - Company selection dropdown with search
   - Validation and error display
   - Loading states during submission

2. **CompanySelector Component**
   - Searchable dropdown for company selection
   - Display company name, org number, and city
   - Loading and empty states
   - Keyboard navigation support

3. **Integration with UserManagementPanel**
   - Add "Add User" button next to "Create Admin"
   - Handle modal open/close state
   - Refresh user list after successful creation
   - Display success/error notifications

### Backend Implementation
1. **User Creation Endpoint**
   - Validate request data
   - Check email uniqueness
   - Verify company exists and is active
   - Create user with company assignment
   - Generate temporary password
   - Send welcome email (optional)

2. **Company Options Endpoint**
   - Return paginated company list
   - Support search by name, org number, city
   - Include only active/verified companies
   - Optimize for dropdown usage

3. **Validation Service**
   - Email format and uniqueness validation
   - Role-specific field validation
   - Company ID validation
   - Permission validation for company admins

### Security Considerations
- Validate all input data on backend
- Ensure only platform admins can create users
- Log all user creation activities
- Implement rate limiting for user creation
- Validate company access permissions