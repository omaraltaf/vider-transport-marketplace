# Test Data Guide

## Overview

The database has been seeded with comprehensive test data including companies, users, vehicle listings, driver listings, bookings, ratings, messages, and transactions.

## Test Accounts

All accounts use the password: **`password123`**

### 1. Platform Administrator
- **Email:** `admin@vider.no`
- **Password:** `password123`
- **Role:** Platform Admin
- **Company:** Oslo Transport AS
- **Access:** Full platform access, can manage all companies and users

### 2. Oslo Transport AS (Company Admin)
- **Email:** `admin@oslotransport.no`
- **Password:** `password123`
- **Role:** Company Admin
- **Company:** Oslo Transport AS
- **Features:**
  - 2 vehicle listings (18-pallet truck, electric van)
  - 1 driver listing (Erik Andersen)
  - 2 completed bookings as provider
  - 1 pending booking as provider
  - 5-star rating received

### 3. Bergen Logistics (Company Admin)
- **Email:** `admin@bergenlogistics.no`
- **Password:** `password123`
- **Role:** Company Admin
- **Company:** Bergen Logistics
- **Features:**
  - 1 vehicle listing (refrigerated 21-pallet truck)
  - 1 driver listing (Ingrid Sørensen)
  - 1 active booking as provider
  - 1 pending booking as renter
  - Active message thread

### 4. Trondheim Fleet Services (Company User)
- **Email:** `user@trondheimfleet.no`
- **Password:** `password123`
- **Role:** Company User
- **Company:** Trondheim Fleet Services
- **Features:**
  - 1 vehicle listing (heavy-duty trailer)
  - 1 driver listing (Thomas Berg)
  - 1 completed booking as renter
  - 1 active booking as renter
  - Left a 5-star rating

## Test Data Details

### Companies

1. **Oslo Transport AS**
   - Organization Number: 123456789
   - Location: Oslo
   - Rating: 4.5/5 (12 ratings)
   - Status: Verified
   - Description: Leading transport company in Oslo region

2. **Bergen Logistics**
   - Organization Number: 987654321
   - Location: Bergen
   - Rating: 4.8/5 (8 ratings)
   - Status: Verified
   - Description: Specialized in refrigerated transport

3. **Trondheim Fleet Services**
   - Organization Number: 555666777
   - Location: Trondheim
   - Rating: 4.2/5 (5 ratings)
   - Status: Not verified
   - Description: Full-service transport solutions

### Vehicle Listings

1. **Mercedes-Benz Actros 18-pallet truck** (Oslo Transport)
   - Type: 18-pallet truck
   - Hourly: 850 NOK
   - Daily: 5,500 NOK
   - With driver: Yes (+450 NOK/hour)
   - Without driver: Yes
   - Features: Tail-lift, GPS tracking

2. **Refrigerated 21-pallet truck** (Bergen Logistics)
   - Type: 21-pallet truck
   - Hourly: 950 NOK
   - Daily: 6,500 NOK
   - With driver: Yes (+500 NOK/hour)
   - Without driver: No
   - Features: Temperature-controlled, ADR-certified

3. **Electric 8-pallet van** (Oslo Transport)
   - Type: 8-pallet van
   - Hourly: 650 NOK
   - Daily: 4,000 NOK
   - Fuel: Electric
   - Features: Zero-emission, eco-friendly

4. **Heavy-duty trailer** (Trondheim Fleet)
   - Type: Trailer
   - Daily: 8,000 NOK
   - Capacity: 33 pallets
   - Features: Long-haul, heavy-duty

### Driver Listings

1. **Erik Andersen** (Oslo Transport)
   - License: CE
   - Languages: Norwegian, English
   - Hourly: 450 NOK
   - Daily: 3,200 NOK
   - Rating: 4.7/5 (15 ratings)
   - Status: Verified
   - Experience: 15 years, ADR certified

2. **Ingrid Sørensen** (Bergen Logistics)
   - License: CE
   - Languages: Norwegian, English, German
   - Hourly: 500 NOK
   - Daily: 3,500 NOK
   - Rating: 4.9/5 (10 ratings)
   - Status: Verified
   - Specialty: Refrigerated transport

3. **Thomas Berg** (Trondheim Fleet)
   - License: C
   - Languages: Norwegian
   - Hourly: 400 NOK
   - Daily: 2,800 NOK
   - Rating: 4.3/5 (6 ratings)
   - Status: Not verified
   - Experience: 5 years local delivery

### Bookings

1. **VDR-2024-001** (Completed)
   - Renter: Trondheim Fleet
   - Provider: Oslo Transport
   - Vehicle: 18-pallet truck
   - Driver: Erik Andersen
   - Duration: 10 hours
   - Total: 11,156.25 NOK
   - Status: Completed with 5-star rating

2. **VDR-2024-002** (Active)
   - Renter: Trondheim Fleet
   - Provider: Bergen Logistics
   - Vehicle: Refrigerated truck
   - Driver: Ingrid Sørensen
   - Duration: 2 days
   - Total: 17,062.50 NOK
   - Status: Active (ongoing)
   - Has message thread

3. **VDR-2024-003** (Pending)
   - Renter: Bergen Logistics
   - Provider: Oslo Transport
   - Vehicle: Electric van
   - Duration: 1 day
   - Total: 5,250 NOK
   - Status: Pending approval
   - Starts in 7 days

## Testing Scenarios

### Scenario 1: Browse and Book (as Bergen Logistics)
1. Login as `admin@bergenlogistics.no`
2. Browse available listings
3. View the pending booking (VDR-2024-003) you made
4. Check the active booking (VDR-2024-002) with messages

### Scenario 2: Manage Bookings (as Oslo Transport)
1. Login as `admin@oslotransport.no`
2. View bookings as provider
3. See pending booking (VDR-2024-003) requiring action
4. View completed booking (VDR-2024-001) with rating
5. Manage your vehicle and driver listings

### Scenario 3: Renter Experience (as Trondheim Fleet)
1. Login as `user@trondheimfleet.no`
2. View your active booking (VDR-2024-002)
3. Send messages about the booking
4. View your completed booking with rating
5. Browse new listings to book

### Scenario 4: Platform Administration
1. Login as `admin@vider.no`
2. View all companies and users
3. Access admin analytics
4. View all bookings across platform
5. Manage disputes and audit logs

## Features to Test

### ✅ Working Features
- User registration and login
- Company profiles
- Vehicle listings (create, edit, view)
- Driver listings (create, edit, view)
- Search and browse listings
- Booking creation
- Booking management (view, accept, cancel)
- Ratings and reviews
- Messaging between companies
- Transaction history
- Notifications
- GDPR data export
- Admin panel

### 🔧 Known Issues
- Email verification (manual verification required in dev)
- Some messaging features may need testing
- Payment integration (simulated in dev)

## Quick Commands

### Reset and Reseed Database
```bash
npm run db:seed
```

### View Database in Prisma Studio
```bash
npm run db:studio
```

### Check Specific User
```bash
psql -U postgres -d vider_dev -c "SELECT email, role, \"emailVerified\" FROM \"User\";"
```

### View All Bookings
```bash
psql -U postgres -d vider_dev -c "SELECT \"bookingNumber\", status, \"startDate\", total FROM \"Booking\";"
```

## Tips

1. **Multiple Browser Sessions:** Use different browsers or incognito windows to test multiple users simultaneously
2. **Time-based Features:** Some bookings are set to specific dates - adjust if needed
3. **Ratings:** Only completed bookings can be rated
4. **Messages:** Active bookings have message threads
5. **Admin Access:** Platform admin can see everything across all companies

## Support

If you encounter issues:
1. Check backend logs in the terminal
2. Check browser console for frontend errors
3. Verify database connection
4. Reseed database if data becomes inconsistent

Enjoy testing! 🚀
