# Test Accounts Reference - PRODUCTION READY ✅

All accounts use the following passwords:
- **Platform Admin:** admin123!
- **Company Accounts:** password123

## 🌐 Live Production URLs
- **Frontend:** https://vider-transport-marketplace.vercel.app
- **Backend API:** https://vider-transport-marketplace-production-bd63.up.railway.app
- **Health Check:** https://vider-transport-marketplace-production-bd63.up.railway.app/health

## ✅ VERIFIED WORKING ACCOUNTS

### 🔑 Platform Administrator
- **Email:** admin@vider.no
- **Password:** admin123!
- **Role:** PLATFORM_ADMIN
- **Status:** ✅ VERIFIED WORKING

### 🏢 Company Administrators (TESTED & WORKING)

#### Oslo Transport AS
- **Email:** admin@oslotransport.no
- **Password:** password123
- **Role:** COMPANY_ADMIN
- **Status:** ✅ VERIFIED WORKING
- **Company:** Oslo Transport AS (4.6★ rating)

#### Bergen Logistics AS  
- **Email:** admin@bergenlogistics.no
- **Password:** password123
- **Role:** COMPANY_ADMIN
- **Status:** ✅ VERIFIED WORKING
- **Company:** Bergen Logistics AS (3.6★ rating)

## 📊 Platform Statistics (Live Data)
- **Companies:** 6 active companies
- **Vehicle Listings:** 13+ active vehicles
- **Driver Listings:** 5+ verified drivers
- **Completed Bookings:** 5+ transactions
- **Average Rating:** 3.9★

## 🚗 Sample Listings Available
- **Oslo:** 8-pallet trucks, trailers, electric vehicles
- **Bergen:** Refrigerated trucks, trailers
- **Trondheim:** 18-pallet trucks, specialty vehicles
- **Stavanger:** 21-pallet trucks, electric vehicles
- **Tromsø:** Arctic transport vehicles

## 🔧 Usage Notes

- All accounts are email verified and production-ready
- Company admins can manage their company's listings and users
- Full booking system with ratings and messaging
- Real-time availability calendar
- Comprehensive search and filtering

## 🚀 Quick Login Test

**Production Frontend:** https://vider-transport-marketplace.vercel.app

Test with any verified account above using email and password123.

## 🔍 API Testing

**Search Vehicles:**
```bash
curl "https://vider-transport-marketplace-production-bd63.up.railway.app/api/listings/search?type=vehicle&limit=5"
```

**Login Test:**
```bash
curl -X POST "https://vider-transport-marketplace-production-bd63.up.railway.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@oslotransport.no", "password": "password123"}'
```