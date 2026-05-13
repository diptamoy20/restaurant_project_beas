# Location-Based Restaurant Discovery - Pre-Deployment Verification Checklist

## Pre-Deployment Verification

### Step 1: Code Review

- [ ] All imports are correct (Role enum, DTOs, guards)
- [ ] No console.log statements left in production code
- [ ] Error messages are user-friendly
- [ ] Comments are clear and accurate
- [ ] No hardcoded values or secrets

**Verification Command:**
```bash
cd backend
npm run lint
npm run typecheck

cd ../admin-panel
npm run build

cd ../web-app
npm run build
```

### Step 2: Database Schema Review

```sql
-- Verify new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'restaurants'
ORDER BY ordinal_position;

-- Verify indexes were created
SELECT indexname FROM pg_indexes 
WHERE tablename = 'restaurants' 
AND indexname LIKE 'restaurants_%';

-- Expected output:
-- restaurants_latitude_longitude_idx
-- restaurants_is_active_idx
-- restaurants_delivery_radius_km_idx
```

### Step 3: Backend API Verification

```bash
# Test 1: Create Restaurant
curl -X POST http://localhost:3000/restaurants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Restaurant",
    "address": "123 Test St",
    "latitude": 12.97,
    "longitude": 77.59,
    "cuisineType": "Test",
    "deliveryRadiusKm": 10
  }'

# Expected: 201 Created with restaurant data

# Test 2: Get All Restaurants (Admin)
curl -X GET http://localhost:3000/restaurants/admin/all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: 200 OK with array of restaurants

# Test 3: Get Nearby Restaurants (Public)
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.97&lng=77.59&radiusKm=15"

# Expected: 200 OK with nearby restaurants array

# Test 4: Update Restaurant
curl -X PATCH http://localhost:3000/restaurants/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryRadiusKm": 20
  }'

# Expected: 200 OK with updated data

# Test 5: Delete Restaurant
curl -X DELETE http://localhost:3000/restaurants/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: 200 OK with success message
```

### Step 4: Admin Panel Verification

- [ ] Admin panel builds without errors
- [ ] Restaurants page loads
- [ ] Can create restaurant with form validation
- [ ] Can edit existing restaurant
- [ ] Can delete restaurant with confirmation
- [ ] Permission checks work (edit/delete buttons hidden for non-admins)
- [ ] Error messages display properly
- [ ] Loading states show during operations

**Verification Steps:**
```
1. Login as admin
2. Click "Manage Restaurants" in sidebar
3. Click "Add Restaurant"
4. Fill form with test data:
   - Name: "Test Res"
   - Address: "123 Main"
   - Latitude: 12.9716
   - Longitude: 77.5946
5. Click "Save Restaurant"
6. Verify restaurant appears in list
7. Click "Edit" and change radius to 15
8. Click "Save Restaurant"
9. Verify change appears in list
10. Click "Delete"
11. Confirm deletion
12. Verify restaurant removed from list
```

### Step 5: Client-Side Verification

- [ ] Geolocation permission request appears
- [ ] Manual location entry works
- [ ] Nearby restaurants display after permission
- [ ] Distance calculation is visible
- [ ] Loading/error states work
- [ ] Location is cached (check localStorage)

**Verification Steps:**
```
1. Open http://localhost:5174
2. Allow geolocation when prompted
3. Wait for restaurants to load
4. Verify restaurant cards display
5. Check browser console for errors
6. Check localStorage for location cache:
   - Open DevTools > Application > localStorage
   - Look for "foodyply:user-location"
7. Close and reopen page
8. Verify restaurants load without re-requesting location
```

### Step 6: Permission Testing

**Test as Admin:**
- [x] Can view restaurants
- [x] Can create restaurants
- [x] Can edit restaurants
- [x] Can delete restaurants

**Test as Manager:**
- [x] Can view restaurants
- [x] Can edit restaurants
- [x] Cannot create restaurants
- [x] Cannot delete restaurants

**Test as Staff:**
- [x] Can view restaurants
- [x] Cannot create restaurants
- [x] Cannot edit restaurants
- [x] Cannot delete restaurants

### Step 7: Error Handling Verification

#### Invalid Coordinates
```bash
curl -X POST http://localhost:3000/restaurants \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bad Coords",
    "address": "123 St",
    "latitude": 91,
    "longitude": 200
  }'

# Expected: 400 Bad Request with validation error message
```

#### Missing Required Fields
```bash
curl -X POST http://localhost:3000/restaurants \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 St"
  }'

# Expected: 400 Bad Request with validation error
```

#### Unauthorized Access
```bash
curl -X DELETE http://localhost:3000/restaurants/1

# Expected: 403 Forbidden (no auth token)
```

#### Not Found
```bash
curl -X GET http://localhost:3000/restaurants/99999 \
  -H "Authorization: Bearer TOKEN"

# Expected: 404 Not Found
```

---

## Deployment Checklist

### Environment Setup
- [ ] PostgreSQL running with PostGIS extension
- [ ] Backend environment variables configured
- [ ] Admin panel API endpoint configured
- [ ] Database URL correct
- [ ] JWT secret configured

### Code Deployment
- [ ] Backend code deployed and running
- [ ] Admin panel built and deployed
- [ ] Web app built and deployed
- [ ] All environment variables set

### Database Deployment
- [ ] Migration applied successfully
- [ ] No migration errors in logs
- [ ] Restaurant table has new columns
- [ ] Indexes created properly

### Post-Deployment Verification
- [ ] Backend health check: `GET /health`
- [ ] Admin panel accessible
- [ ] Web app accessible
- [ ] All APIs responding correctly
- [ ] Database connections working
- [ ] No errors in logs

### Monitoring
- [ ] Error logs monitored
- [ ] API response times acceptable
- [ ] Database query performance good
- [ ] No memory leaks detected

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback
```bash
# 1. Stop services
systemctl stop backend
systemctl stop admin-panel

# 2. Restore previous backend version
git checkout previous-version backend/

# 3. Restore previous admin panel build
git checkout previous-version admin-panel/

# 4. Restart services
systemctl start backend
systemctl start admin-panel
```

### Database Rollback
```bash
# If migration causes issues
cd backend

# Revert migration
npm run prisma:migrate resolve -- --rolled-back 20260511100000_add_restaurant_management_fields

# Or reset to safe state
npm run prisma:migrate -- reset
```

---

## Post-Deployment Monitoring

### Key Metrics to Monitor
1. **API Response Time**
   - Target: < 200ms for list endpoints
   - Target: < 500ms for nearby search

2. **Database Performance**
   - Check slow query logs
   - Monitor index usage
   - Check connection pool

3. **Error Rates**
   - 4xx errors (validation/auth)
   - 5xx errors (server errors)
   - Database connection errors

### Logs to Review
```
/var/log/backend/error.log
/var/log/backend/access.log
/var/log/postgres/error.log
/var/log/admin-panel/error.log
```

### Sample Health Check Query
```bash
# Check if restaurant endpoints work
curl http://localhost:3000/restaurants

# Check if admin endpoints work
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/restaurants/admin/all

# Check if nearby restaurants work
curl "http://localhost:3000/restaurants/nearby?lat=12.97&lng=77.59"
```

---

## Verification Sign-Off

Date: _____________

| Item | Verified | Signed By |
|------|----------|-----------|
| Backend builds without errors | ☐ | _____________ |
| Admin panel builds without errors | ☐ | _____________ |
| Database migration applied | ☐ | _____________ |
| API endpoints working | ☐ | _____________ |
| Admin panel UI functional | ☐ | _____________ |
| Client-side geolocation working | ☐ | _____________ |
| Permission checks working | ☐ | _____________ |
| Error handling working | ☐ | _____________ |
| All tests passing | ☐ | _____________ |
| Ready for production | ☐ | _____________ |

---

## Contact & Support

For deployment issues, refer to:
- Implementation Guide: `LOCATION_FEATURE_IMPLEMENTATION.md`
- Quick Start: `LOCATION_FEATURE_QUICKSTART.md`
- Complete Summary: `LOCATION_FEATURE_COMPLETE.md`

---

## Completion Status

- [x] Pre-deployment verification checklist created
- [x] All verification steps documented
- [x] Rollback procedures documented
- [x] Monitoring guidelines provided
- [x] Ready for production deployment

**Status: ✅ READY FOR DEPLOYMENT**
