# Production Test Data Summary

## Database Status
✅ **Test data is already seeded in the production database!**

## Available Test Data

### Companies (3)
1. **Oslo Transport AS**
   - Location: Oslo, Oslo
   - Organization Number: 123456789
   - Verified: Yes
   - Rating: 4.5/5 (12 ratings)

2. **Bergen Logistics**
   - Location: Bergen, Vestland
   - Organization Number: 987654321
   - Verified: Yes
   - Rating: 4.8/5 (8 ratings)

3. **Trondheim Fleet Services**
   - Location: Trondheim, Trøndelag
   - Organization Number: 555666777
   - Verified: No
   - Rating: 4.2/5 (5 ratings)

### Test User Accounts (4)

All passwords: `password123`

1. **Platform Admin**
   - Email: `admin@vider.no`
   - Role: PLATFORM_ADMIN
   - Company: Oslo Transport AS

2. **Oslo Transport Admin**
   - Email: `admin@oslotransport.no`
   - Role: COMPANY_ADMIN
   - Company: Oslo Transport AS

3. **Bergen Logistics Admin**
   - Email: `admin@bergenlogistics.no`
   - Role: COMPANY_ADMIN
   - Company: Bergen Logistics

4. **Trondheim Fleet User**
   - Email: `user@trondheimfleet.no`
   - Role: COMPANY_USER
   - Company: Trondheim Fleet Services

### Vehicle Listings (4)

1. **Mercedes-Benz Actros 18-pallet truck**
   - Type: 18-pallet truck
   - Location: Oslo
   - Rate: 850 NOK/hour, 5500 NOK/day
   - Features: Tail-lift, GPS tracking
   - With/without driver available

2. **Refrigerated 21-pallet truck**
   - Type: 21-pallet truck
   - Location: Bergen
   - Rate: 950 NOK/hour, 6500 NOK/day
   - Features: Temperature-controlled (-25°C to +25°C), ADR-certified
   - Driver required

3. **Electric 8-pallet van**
   - Type: 8-pallet van
   - Location: Oslo
   - Rate: 650 NOK/hour, 4000 NOK/day
   - Features: Zero-emission, electric
   - With/without driver available

4. **Heavy-duty trailer**
   - Type: Semi-trailer
   - Location: Trondheim
   - Rate: 8000 NOK/day
   - Features: Long-haul, heavy-duty
   - With/without driver available

### Driver Listings (3)

1. **Erik Andersen** (Oslo Transport AS)
   - License: CE
   - Languages: Norwegian, English
   - Rate: 450 NOK/hour, 3200 NOK/day
   - Rating: 4.7/5 (15 ratings)
   - Verified: Yes

2. **Ingrid Sørensen** (Bergen Logistics)
   - License: CE
   - Languages: Norwegian, English, German
   - Rate: 500 NOK/hour, 3500 NOK/day
   - Rating: 4.9/5 (10 ratings)
   - Verified: Yes

3. **Thomas Berg** (Trondheim Fleet Services)
   - License: C
   - Languages: Norwegian
   - Rate: 400 NOK/hour, 2800 NOK/day
   - Rating: 4.3/5 (6 ratings)
   - Verified: No

### Bookings (4)

1. **VDR-2024-001** - COMPLETED
   - Renter: Trondheim Fleet Services
   - Provider: Oslo Transport AS
   - Vehicle: Mercedes-Benz Actros
   - Driver: Erik Andersen
   - Total: 11,156.25 NOK

2. **VDR-2024-002** - ACTIVE
   - Renter: Trondheim Fleet Services
   - Provider: Bergen Logistics
   - Vehicle: Refrigerated truck
   - Driver: Ingrid Sørensen
   - Total: 17,062.50 NOK

3. **VDR-2024-003** - PENDING
   - Renter: Bergen Logistics
   - Provider: Oslo Transport AS
   - Vehicle: Electric van
   - Total: 5,250 NOK

### Additional Data
- **Ratings**: 1 rating with reviews
- **Messages**: 2 messages in active booking thread
- **Transactions**: 3 transactions (completed and pending)

## Testing the Application

### 1. Login to Frontend
Visit: https://vider-transport-marketplace.vercel.app

Use any of the test accounts above with password: `password123`

### 2. API Testing
Base URL: https://vider-transport-marketplace-production.up.railway.app

Example endpoints:
- Health check: `GET /health`
- Search listings: `GET /api/listings/search?fylke=Oslo`
- Login: `POST /api/auth/login`

### 3. Admin Panel
Login with `admin@vider.no` to access:
- User management
- Company verification
- Booking oversight
- Analytics dashboard
- Dispute resolution

## Re-seeding Data

If you need to reset the test data:

```bash
# Clear all data (careful!)
npx prisma migrate reset

# Or just run the seed again (will fail if data exists)
npm run db:seed
```

## Checking Current Data

```bash
# Run the data check script
npx tsx scripts/check-data.ts

# Or open Prisma Studio
npx prisma studio
```

## Notes

- All test data uses Norwegian locations (Oslo, Bergen, Trondheim)
- Prices are in NOK (Norwegian Kroner)
- Commission rate: 5%
- Tax rate: 25% (Norwegian VAT)
- All users have verified emails
- Some companies are verified, some are not (for testing verification flow)
