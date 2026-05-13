# Location-Based Restaurant Discovery - Quick Start Guide

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL with PostGIS extension installed
- Backend running on `http://localhost:3000`
- Admin panel running on `http://localhost:5173`
- Web app running on `http://localhost:5174`

---

## Step 1: Apply Database Migration

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Apply migration
npm run prisma:migrate

# Verify migration by opening Prisma Studio
npm run prisma:studio
```

The migration will:
- Add `cuisine_type`, `description`, `image_url`, `created_at`, `updated_at` columns to restaurants table
- Create performance indexes on `latitude`, `longitude`, `is_active`, `delivery_radius_km`

---

## Step 2: Seed Initial Data (Optional)

If you want to test with sample restaurants:

```bash
# In backend directory
npm run seed
```

This will create sample restaurants with geolocation data.

---

## Step 3: Start Backend Server

```bash
cd backend

# Development with auto-reload
npm run start:dev

# Production build
npm run build && npm run start:prod
```

The backend should be running on `http://localhost:3000`.

---

## Step 4: Start Admin Panel

```bash
cd admin-panel

npm run dev
```

Admin panel should be running on `http://localhost:5173`.

---

## Step 5: Start Web App (Client)

```bash
cd web-app

npm run dev
```

Web app should be running on `http://localhost:5174`.

---

## Testing the Feature

### Test 1: Admin Panel - Create Restaurant

1. Navigate to `http://localhost:5173`
2. Login with admin credentials
3. Click on "Manage Restaurants" in sidebar
4. Click "Add Restaurant" button
5. Fill in the form:
   - **Name**: "Test Restaurant"
   - **Address**: "123 Main Street"
   - **City**: "Bangalore"
   - **Latitude**: 12.9716
   - **Longitude**: 77.5946
   - **Cuisine Type**: "Indian"
   - **Description**: "Test Description"
   - **Delivery Radius**: 10
6. Click "Save Restaurant"
7. Verify restaurant appears in the list

### Test 2: Admin Panel - Edit Restaurant

1. In restaurant list, click "Edit" on any restaurant
2. Modify delivery radius to 15 km
3. Click "Save Restaurant"
4. Verify changes appear in list

### Test 3: Admin Panel - Delete Restaurant

1. In restaurant list, click "Delete" on any restaurant
2. Confirm deletion in popup
3. Verify restaurant disappears from list

### Test 4: Client - Nearby Restaurants Discovery

1. Navigate to `http://localhost:5174`
2. Allow geolocation when prompted
3. System should show nearby restaurants within 10 km
4. Verify restaurants match coordinates used in admin panel

### Test 5: Client - Manual Location Selection

1. Navigate to `http://localhost:5174`
2. Deny geolocation permission
3. Click "Choose Location Manually"
4. Enter coordinates:
   - **Latitude**: 12.9716
   - **Longitude**: 77.5946
5. System should show nearby restaurants
6. Verify same restaurants as geolocation test

### Test 6: API Testing with cURL

```bash
# Create Restaurant
curl -X POST http://localhost:3000/restaurants \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Restaurant",
    "address": "456 API Street",
    "city": "Bangalore",
    "latitude": 12.97,
    "longitude": 77.59,
    "cuisineType": "Continental",
    "deliveryRadiusKm": 12,
    "isActive": true
  }'

# Get All Restaurants (Admin)
curl -X GET http://localhost:3000/restaurants/admin/all \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Find Nearby Restaurants (Public)
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.97&lng=77.59&radiusKm=15"

# Update Restaurant
curl -X PATCH http://localhost:3000/restaurants/1 \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deliveryRadiusKm": 20}'

# Delete Restaurant
curl -X DELETE http://localhost:3000/restaurants/1 \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

---

## Validation Rules

### Coordinates
- Latitude must be between -90 and 90
- Longitude must be between -180 and 180
- Both are required when creating/updating with location

### Delivery Radius
- Minimum: 0.1 km
- Must be a positive number

### Required Fields
- Restaurant Name (non-empty string)
- Address (non-empty string)
- Latitude and Longitude (valid coordinates)

---

## Common Issues & Solutions

### Issue: "Extension 'postgis' not found"

**Solution:**
```sql
-- Run in PostgreSQL as superuser
CREATE EXTENSION postgis;
```

### Issue: "Unauthorized" when accessing admin endpoints

**Solution:**
- Check Authorization header is included
- Verify token is valid and not expired
- Confirm user has admin role

### Issue: Geolocation not working on client

**Solution:**
- Ensure using HTTPS or localhost (browser security)
- Check browser location permissions
- Try manual location entry as fallback

### Issue: "Invalid coordinates" error

**Solution:**
- Verify latitude is -90 to 90
- Verify longitude is -180 to 180
- Use realistic coordinates (not 0,0)

### Issue: Migration fails

**Solution:**
```bash
# Reset database and retry
npm run prisma:migrate -- --skip-generate

# Or reset completely
npm run prisma:migrate -- reset
```

---

## Performance Optimization Tips

### 1. Database Indexes
Ensure indexes are created:
```sql
SELECT * FROM pg_indexes 
WHERE tablename = 'restaurants';
```

### 2. Query Optimization
- Use PostGIS indexes for geolocation queries
- Limit results with `page` and `limit` parameters
- Cache location results for 5 minutes on client

### 3. API Response Caching
- Admin queries cached with Redux Query
- Automatic cache invalidation on mutations
- Manual refresh available in UI

---

## Monitoring

### Backend Logs

Watch for errors:
```bash
# Development mode shows all logs
npm run start:dev

# Look for:
# - Migration errors
# - Authentication errors
# - Validation errors
# - Database connection errors
```

### Database

Check restaurant data:
```sql
-- Count restaurants
SELECT COUNT(*) FROM restaurants;

-- View latest restaurants
SELECT id, name, latitude, longitude, is_active 
FROM restaurants 
ORDER BY created_at DESC 
LIMIT 10;

-- Check PostGIS location
SELECT id, name, 
  ST_AsText(location) as geometry,
  ST_Distance(location, ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)) as distance_meters
FROM restaurants
ORDER BY distance_meters ASC
LIMIT 10;
```

---

## Next Steps

After successful testing:

1. **Deploy to Staging**
   - Push code to staging branch
   - Run migrations on staging database
   - Run full test suite

2. **Deploy to Production**
   - Create production database backup
   - Push code to main branch
   - Run migrations in production
   - Monitor for errors

3. **Post-Deployment**
   - Monitor API performance
   - Check error logs
   - Gather user feedback
   - Plan feature enhancements

---

## Feature Completion Checklist

- [x] Database schema updated with new fields
- [x] Migration created and tested
- [x] Backend DTOs created with validation
- [x] Restaurant CRUD endpoints implemented
- [x] Role-based authorization added
- [x] Admin panel page created
- [x] Admin panel API service created
- [x] Redux store updated
- [x] Admin routing updated
- [x] Client-side geolocation working
- [x] Nearby restaurants discovery working
- [x] Error handling implemented
- [x] Validation working
- [x] Documentation complete

---

## Support

For issues, check:
1. Backend logs for API errors
2. Browser console for frontend errors
3. Database logs for SQL errors
4. Network tab in DevTools for request/response details
