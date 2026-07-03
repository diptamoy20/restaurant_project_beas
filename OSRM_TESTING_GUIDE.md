# Testing Guide & API Examples

## Prerequisites

### Environment Setup

```bash
# 1. Ensure backend is running on localhost:3000
cd backend
npm install
npm run start

# 2. Verify Redis is running (for caching)
redis-server --port 6379

# 3. Verify PostgreSQL + PostGIS is running
# Check your connection string in .env

# 4. Verify environment variables
cat .env | grep ROUTING
# Expected output:
# ROUTING_ENABLED=true
# ROUTING_PROVIDER="osrm"
# ROUTING_BASE_URL="https://router.project-osrm.org"
# ROUTING_TIMEOUT_MS=5000
# ROUTING_OSRM_PROFILE="driving"
```

---

## Unit Tests

### 1. Test OSRM API Endpoint

Direct OSRM API test to ensure connectivity:

```bash
# Test OSRM connectivity
curl -X GET "https://router.project-osrm.org/route/v1/driving/77.5946,12.9716;77.6080,12.9725?alternatives=false&steps=false&overview=false"

# Expected Response (200 OK):
{
  "code": "Ok",
  "waypoints": [
    {"hint": "...", "distance": 0, "name": "", "location": [77.5946, 12.9716]},
    {"hint": "...", "distance": 0, "name": "", "location": [77.6080, 12.9725]}
  ],
  "routes": [
    {
      "legs": [
        {
          "steps": [],
          "distance": 2500,        # meters
          "duration": 300          # seconds
        }
      ],
      "distance": 2500,
      "duration": 300,
      "weight_name": "routability",
      "weight": 300
    }
  ]
}
```

### 2. Test Haversine Fallback

When OSRM is disabled:

```bash
# Disable OSRM
export ROUTING_ENABLED=false
npm run start

# Test Haversine calculation
# Request nearby restaurants
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946"

# Verify response uses Haversine distance (should work without OSRM)
# Check logs for: "Haversine fallback" or similar
```

### 3. Test Cache Hit/Miss

```bash
# First request (cache miss)
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946&limit=1" \
  -H "Authorization: Bearer <token>"
# Time: ~500-2000ms (first OSRM call)

# Second request (cache hit)
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946&limit=1" \
  -H "Authorization: Bearer <token>"
# Time: ~50-100ms (cached result)

# Different coordinates (cache miss)
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.9700&lng=77.5900&limit=1" \
  -H "Authorization: Bearer <token>"
# Time: ~500-2000ms (different cache key)
```

---

## Integration Tests

### Test 1: Nearby Restaurants with OSRM

```bash
#!/bin/bash

# Get authentication token first
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.accessToken')

# Test nearby restaurants
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946&radiusKm=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Restaurant A",
      "address": "123 Main St",
      "city": "Bangalore",
      "latitude": 12.97,
      "longitude": 77.60,
      "distanceKm": 3.25,              // OSRM distance
      "estimatedDeliveryTimeMinutes": 18,  // From OSRM
      "deliveryFee": 37.50,            // Based on OSRM distance
      "deliveryAvailable": true,
      "deliveryFeeBreakdown": {
        "distanceKm": 3.25,
        "baseFee": 30,
        "baseDistanceKm": 1,
        "extraDistanceKm": 2.25,
        "perKmFee": 3,
        "deliveryCharge": 37.50,
        "packagingCharge": 0,
        "freeDeliveryApplied": false
      },
      "categories": [...]
    },
    ...
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45
  }
}
```

### Test 2: Restaurant Delivery Quote

```bash
# Get quote for specific restaurant
curl -X POST http://localhost:3000/checkout/quote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 5,
    "lat": 12.9716,
    "lng": 77.5946,
    "subtotalAmount": 500
  }' | jq '.'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "deliveryAvailable": true,
    "distanceKm": 2.85,                 // OSRM distance
    "deliveryFee": 38.55,               // Based on 2.85 km
    "estimatedDeliveryTimeMinutes": 16, // From OSRM
    "packagingCharge": 0,
    "freeDeliveryMinAmount": 1000,
    "reason": "Delivery fee calculated by distance",
    "deliveryFeeBreakdown": {
      "distanceKm": 2.85,
      "baseFee": 30,
      "baseDistanceKm": 1,
      "extraDistanceKm": 1.85,
      "extraUnits": 1.85,
      "perKmFee": 3,
      "deliveryCharge": 38.55,
      "packagingCharge": 0,
      "freeDeliveryApplied": false,
      "freeDeliveryMinAmount": 1000
    }
  }
}
```

### Test 3: Address Validation

```bash
# Validate if address is deliverable
curl -X POST http://localhost:3000/location/validate-address \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 12.9716,
    "lng": 77.5946,
    "restaurantId": 5
  }' | jq '.'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "deliverable": true,
    "deliveryAvailable": true,
    "distanceKm": 2.85,              // OSRM distance
    "deliveryFee": 38.55,            // From OSRM calculation
    "estimatedDeliveryTimeMinutes": 16,
    "restaurantId": 5,
    "reason": "Delivery fee calculated by distance"
  }
}
```

---

## Performance Tests

### Load Test: Multiple Concurrent Requests

```bash
#!/bin/bash

# Install Apache Bench if not available
# apt-get install apache2-utils

# Run 100 requests with 10 concurrent connections
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946"

# Expected results (with caching after first request):
# Requests per second: > 50
# Mean time per request: < 100ms
# Time range: 50-200ms (first request), 50-100ms (cached)
```

### Cache Performance Test

```bash
#!/bin/bash

TOKEN="your_auth_token"

# Warm up cache with first request
echo "Warming cache..."
curl -s -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Test cache hit performance
echo "Testing cache hit..."
time curl -s -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Expected: < 100ms (vs 500-2000ms for first request)
```

---

## Fallback Tests

### Test 1: Disable OSRM Temporarily

```bash
# Set in .env
ROUTING_ENABLED=false

# Restart server
npm run start

# Test request
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946" \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0] | {distanceKm, deliveryFee}'

# Expected: 
# Uses Haversine distance
# No API latency (direct calculation)
# System continues to work
```

### Test 2: OSRM Timeout Handling

```bash
#!/bin/bash

# Update .env to simulate slow OSRM
ROUTING_TIMEOUT_MS=100  # Very short timeout

npm run start

# Make request
curl -X GET "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Check logs for fallback warnings
# Should see: "Failed to get OSRM route: Timeout. Using PostGIS distance."
# API should still return results (no crash)
```

### Test 3: Invalid Coordinates

```bash
# Test with invalid coordinates
curl -X GET "http://localhost:3000/restaurants/nearby?lat=91&lng=181" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Should handle gracefully with error response
# Or validation error before reaching OSRM
```

---

## Monitoring & Logs

### Log Pattern Examples

#### Successful OSRM Call
```
[LocationService] INFO: OSRM route calculated for restaurant 5. Distance: 3.2km, Duration: 18min, Provider: OSRM
```

#### Cache Hit
```
[GeoCacheService] DEBUG: Cache hit for key: route:osrm:driving:12.9716:77.5946:12.9725:77.6080
```

#### OSRM Fallback
```
[LocationService] WARN: Failed to get OSRM route for restaurant 8. Using PostGIS distance. Error: Request timeout
```

#### Routing Disabled
```
[RoutingService] INFO: Routing disabled (ROUTING_ENABLED=false). Using Haversine fallback.
```

### Extract Logs

```bash
# Show all routing-related logs
tail -f logs/app.log | grep -i "routing\|osrm\|fallback"

# Show only OSRM errors
tail -f logs/app.log | grep "WARN\|ERROR" | grep -i "osrm\|routing"

# Count OSRM API calls
tail -f logs/app.log | grep "OSRM route calculated" | wc -l

# Monitor cache hit rate
tail -f logs/app.log | grep "Cache hit" | wc -l
```

---

## Debugging

### Debug 1: Verify OSRM Configuration

```bash
# Check environment variables
echo "ROUTING_ENABLED: $ROUTING_ENABLED"
echo "ROUTING_BASE_URL: $ROUTING_BASE_URL"
echo "ROUTING_TIMEOUT_MS: $ROUTING_TIMEOUT_MS"

# Verify endpoint is reachable
curl -I "https://router.project-osrm.org"
# Should return 200 OK or 400+ (but not connection error)
```

### Debug 2: Test Cache Functionality

```bash
# Connect to Redis
redis-cli

# Check cache key existence
KEYS route:osrm:*

# Get specific cache entry
GET route:osrm:driving:12.9716:77.5946:12.9725:77.6080

# Check TTL
TTL route:osrm:driving:12.9716:77.5946:12.9725:77.6080

# Clear cache if needed
FLUSHDB

# Monitor cache operations
MONITOR
```

### Debug 3: Trace Request Flow

```bash
# Enable debug logging in code
# Add to LocationService:
this.logger.debug(`[findNearbyRestaurants] Starting with params: ${JSON.stringify(params)}`);

# Then search logs:
tail -f logs/app.log | grep "\[findNearbyRestaurants\]"

# Output will show each step:
# Starting with params
# PostGIS query completed
# OSRM enrichment starting
# OSRM call 1 complete
# OSRM call 2 complete
# etc.
```

---

## Comparative Analysis

### Before vs After (Real-World Example)

**Scenario**: User at (12.9716, 77.5946), Restaurant at (12.9725, 77.6080)

#### Before (PostGIS ST_Distance Only)
```
Straight-line distance: 2.1 km
Estimated time: 20 + CEIL(2.1 * 3) = 27 minutes
Base fee: ₹30
Extra distance: 2.1 - 1 = 1.1 km
Extra charge: 1.1 * ₹3 = ₹3.30
Total delivery fee: ₹33.30
```

#### After (OSRM)
```
Driving distance: 2.85 km (+36%)
Estimated time: 18 minutes (from OSRM)
Base fee: ₹30
Extra distance: 2.85 - 1 = 1.85 km
Extra charge: 1.85 * ₹3 = ₹5.55
Total delivery fee: ₹35.55

Fee difference: +₹2.25 (+6.8%)
User sees correct pricing based on actual route
```

---

## Regression Tests

### Checklist for Verifying No Breakage

- [ ] PostGIS ST_DWithin still filters restaurants correctly
- [ ] Delivery zones still work (ST_Contains)
- [ ] calculateDeliveryFee() produces correct results
- [ ] Cache mechanism works and improves performance
- [ ] Fallback to PostGIS distance when OSRM fails
- [ ] Fallback to Haversine when OSRM disabled
- [ ] ETA calculation uses OSRM duration when available
- [ ] ETA calculation falls back to formula when needed
- [ ] API response structure unchanged
- [ ] Database queries unchanged
- [ ] Error handling doesn't crash application
- [ ] Multiple concurrent requests work correctly
- [ ] Menu API still works with location data
- [ ] Checkout quote API works correctly
- [ ] Address validation API works correctly

---

## Rollback Procedure

If issues arise:

```bash
# Option 1: Disable OSRM immediately (production emergency)
# Update .env
ROUTING_ENABLED=false
# Restart server
npm run start

# Option 2: Revert code changes (if needed)
git revert <commit-hash>
git push origin main

# Option 3: Use PostGIS distance only (code level)
# Comment out enrichWithOsrmDistance() calls
# Return to pure PostGIS distance calculation
```

---

## Success Criteria

✅ **All tests should verify**:

1. Nearby restaurants API returns OSRM distances
2. Delivery quote API returns OSRM distances
3. ETA values match OSRM duration
4. Delivery fees are reasonable (higher than before)
5. Cache significantly improves performance
6. Fallback works when OSRM unavailable
7. No errors in logs
8. Response times acceptable
9. All existing tests pass
10. System is stable under load

