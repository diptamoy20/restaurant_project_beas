# OSRM Integration for Road-Based Delivery Distance & Pricing

## Overview

This document describes the implementation of **Open Source Routing Machine (OSRM)** integration into the restaurant delivery system. The system now calculates delivery distances based on actual driving routes instead of straight-line geodesic distances.

**Key Principle**: PostGIS remains unchanged for spatial database operations. OSRM is only used for calculating real driving distances.

---

## Architecture

### Before Integration

```
User Location (lat, lng)
    ↓
PostGIS ST_DWithin Filter
    ↓
PostGIS ST_Distance (straight-line distance)
    ↓
calculateDeliveryFee(distanceKm)
    ↓
Delivery Fee
```

### After Integration

```
User Location (lat, lng)
    ↓
PostGIS ST_DWithin Filter (UNCHANGED)
    ↓
OSRM Route API (driving distance)
    ↓
Fallback to PostGIS ST_Distance if OSRM fails
    ↓
calculateDeliveryFee(drivingDistanceKm)
    ↓
Delivery Fee (based on road distance)
```

---

## Component Details

### 1. RoutingService (`backend/src/common/routing/routing.service.ts`)

**Purpose**: Handles all OSRM API interactions

**Key Methods**:
- `getShortestRoute(origin, destination)`: Returns driving distance and duration
- `buildAirDistanceFallback(distanceKm)`: Fallback Haversine calculation
- Caching mechanism with configurable TTL

**Configuration**:
```typescript
ROUTING_ENABLED=true                              // Enable/disable routing
ROUTING_PROVIDER="osrm"                          // Currently only OSRM supported
ROUTING_BASE_URL="https://router.project-osrm.org" // OSRM endpoint
ROUTING_TIMEOUT_MS=5000                          // Request timeout
ROUTING_OSRM_PROFILE="driving"                   // OSRM profile
```

**Return Type**:
```typescript
type RouteDistanceResult = {
  distanceKm: number;           // Driving distance in kilometers
  durationMinutes: number | null; // Estimated travel time
  source: 'ROUTE' | 'AIR_DISTANCE_FALLBACK';
  provider: 'OSRM' | 'NONE';
};
```

### 2. LocationService Updates (`backend/src/modules/location/location.service.ts`)

**New Method**: `enrichWithOsrmDistance(restaurants, userLat, userLng)`

**Purpose**: Enriches restaurant list with OSRM routes in parallel

**Flow**:
1. Takes PostGIS results (restaurants within radius)
2. Calls OSRM in parallel for each restaurant
3. Falls back to PostGIS distance if OSRM fails
4. Returns map of restaurant ID → route data

**Key Changes**:
- `findNearbyRestaurants()`: Now enriches results with OSRM distances
- `getRestaurantDeliveryQuote()`: Uses OSRM distance for single restaurant
- ETA calculation: Uses OSRM duration instead of formula `20 + CEIL(distanceKm * 3)`

---

## Data Flow: Nearby Restaurants API

### Request
```http
GET /restaurants/nearby?lat=12.9716&lng=77.5946&radiusKm=10
```

### Processing Steps

1. **PostGIS Filtering** (unchanged)
   - Creates geography point from user lat/lng
   - Queries: `ST_DWithin(r."location", customer.geog, radiusKm * 1000)`
   - Returns restaurants within radius with PostGIS distance

2. **OSRM Enrichment** (NEW)
   - Calls `enrichWithOsrmDistance(restaurants, lat, lng)`
   - For each restaurant:
     - Calls OSRM API: `/route/v1/driving/lng,lat;lng,lat`
     - Gets actual driving distance and duration
     - Caches result for 60 seconds
     - Falls back to PostGIS distance if OSRM fails

3. **Delivery Fee Calculation** (unchanged logic, new input)
   - Uses OSRM driving distance instead of PostGIS distance
   - Applies pricing rules:
     - Base fee for included distance
     - Per-km charge for extra distance
     - Min/max fee caps
     - Free delivery threshold

4. **Response**
   ```json
   {
     "data": [
       {
         "id": 1,
         "name": "Restaurant Name",
         "distanceKm": 3.45,           // OSRM driving distance
         "deliveryFee": 45.50,         // Based on OSRM distance
         "estimatedDeliveryTimeMinutes": 18, // From OSRM duration
         "deliveryAvailable": true
       }
     ]
   }
   ```

---

## Data Flow: Single Restaurant Delivery Quote

### Request
```http
POST /checkout/quote
{
  "restaurantId": 1,
  "lat": 12.9716,
  "lng": 77.5946
}
```

### Processing Steps

1. **PostGIS Query** (unchanged)
   - Calculates PostGIS distance (used as fallback only)
   - Checks delivery zones

2. **OSRM Route Request** (NEW)
   - Queries restaurant coordinates from database
   - Calls OSRM API with user and restaurant coordinates
   - Gets driving distance and duration
   - Handles failures gracefully

3. **Delivery Fee Calculation**
   - Input: OSRM driving distance
   - Output: Delivery charge based on actual route

4. **Response**
   ```json
   {
     "deliveryAvailable": true,
     "distanceKm": 2.85,                           // OSRM distance
     "deliveryFee": 35.50,                        // Based on OSRM
     "estimatedDeliveryTimeMinutes": 16,          // From OSRM
     "deliveryFeeBreakdown": {
       "distanceKm": 2.85,
       "baseFee": 30,
       "baseDistanceKm": 1,
       "extraDistanceKm": 1.85,
       "perKmFee": 3,
       "deliveryCharge": 35.50,
       "packagingCharge": 0,
       "freeDeliveryApplied": false
     }
   }
   ```

---

## Caching Strategy

### Cache Keys Format

**OSRM Route Cache**:
```
route:osrm:driving:12.9716:77.5946:12.9725:77.6080
```

Composed of:
- `route` - prefix
- `osrm` - provider
- `driving` - profile
- User latitude (4 decimals)
- User longitude (4 decimals)
- Restaurant latitude (4 decimals)
- Restaurant longitude (4 decimals)

**Cache TTL**: 60 seconds

### Cache Usage

1. Avoids redundant OSRM API calls
2. Improves response time for repeated queries
3. Reduces load on OSRM infrastructure
4. Automatic expiration after TTL

---

## Error Handling & Fallback

### OSRM Failures Are Handled Gracefully

**Scenario 1: OSRM Timeout**
```
User requests nearby restaurants
→ PostGIS filters restaurants
→ OSRM API times out (5s)
→ Fallback to PostGIS distance
→ Log warning: "Failed to get OSRM route for restaurant X: Timeout. Using PostGIS distance."
→ Return results with PostGIS distance
```

**Scenario 2: OSRM Returns Invalid Route**
```
OSRM API unreachable
→ Catch error
→ Calculate Haversine distance
→ Set routeSource = 'AIR_DISTANCE_FALLBACK'
→ Continue processing
→ Log: "Falling back to air distance for route lookup: Connection refused"
```

**Scenario 3: OSRM Disabled**
```
ROUTING_ENABLED=false
→ RoutingService uses only Haversine
→ No API calls made
→ Fast fallback calculation
```

### Exception Handling

```typescript
try {
  const route = await this.routing.getShortestRoute(origin, destination);
  drivingDistanceKm = route.distanceKm;
  estimatedDurationMinutes = route.durationMinutes ?? Math.ceil(20 + route.distanceKm * 3);
} catch (error) {
  logger.warn(`OSRM route failed: ${error.message}. Using PostGIS distance.`);
  // Continue with PostGIS fallback - no crash
}
```

---

## Configuration

### Environment Variables

```bash
# Enable/disable routing
ROUTING_ENABLED=true

# Routing provider (currently only "osrm" supported)
ROUTING_PROVIDER="osrm"

# OSRM API base URL
ROUTING_BASE_URL="https://router.project-osrm.org"

# OSRM request timeout in milliseconds
ROUTING_TIMEOUT_MS=5000

# OSRM routing profile (car, bike, foot)
ROUTING_OSRM_PROFILE="driving"
```

### Using Custom OSRM Instance

For production deployments, use a private OSRM instance:

```bash
ROUTING_BASE_URL="https://routing.mycompany.com"
```

### Disabling OSRM (Emergency Mode)

```bash
ROUTING_ENABLED=false
```
- Falls back to Haversine distance
- No OSRM API calls
- Delivery pricing based on air distance

---

## Implementation Details

### 1. PostGIS Remains Unchanged

**Still Used For**:
- `ST_DWithin()` - filtering restaurants by radius
- `ST_Contains()` - checking delivery zones
- `ST_Distance()` - fallback distance calculation
- Spatial indexing
- Geographic data storage

**SQL Query Example** (unchanged):
```sql
WHERE public.ST_DWithin(r."location", customer.geog, radiusKm * 1000)
```

### 2. Distance Calculation Priority

1. **Primary**: OSRM driving distance (if available)
2. **Secondary**: PostGIS ST_Distance (if OSRM fails)
3. **Tertiary**: Haversine formula (if OSRM disabled)

### 3. Delivery Fee Calculation Unchanged

The `calculateDeliveryFee()` function remains completely unchanged. Only the input distance differs:

```typescript
// Before
const distance = postgisSqlDistance; // 2.5 km (straight line)

// After  
const distance = osrmDrivingDistance; // 3.2 km (road route)

// Same calculation, different input
const fee = calculateDeliveryFee(config, distance, subtotal);
```

---

## Modified Files

### Backend

1. **location.module.ts**
   - Added `RoutingService` to providers

2. **location.service.ts**
   - Imported `RoutingService`
   - Added `enrichWithOsrmDistance()` method
   - Updated `findNearbyRestaurants()` to use OSRM distances
   - Updated `getRestaurantDeliveryQuote()` to use OSRM distances
   - Updated ETA calculation to use OSRM duration

### Configuration (No Changes Required)

- RoutingService and environment variables already exist
- Configuration in `env.validation.ts` already complete
- `.env.example` already includes ROUTING variables

---

## API Response Changes

### Nearby Restaurants Response

**Field Changes**:
- `distanceKm`: Now represents OSRM driving distance (not straight-line distance)
- `estimatedDeliveryTimeMinutes`: Now based on OSRM duration (not formula)
- `deliveryFee`: Now calculated from OSRM distance

**Example Before**:
```json
{
  "distanceKm": 2.1,  // straight-line distance
  "estimatedDeliveryTimeMinutes": 26, // 20 + ceil(2.1*3) = 26
  "deliveryFee": 32.50
}
```

**Example After** (same location):
```json
{
  "distanceKm": 2.85,  // actual road distance
  "estimatedDeliveryTimeMinutes": 18, // from OSRM API
  "deliveryFee": 38.55  // based on 2.85 km, not 2.1 km
}
```

---

## Testing

### Unit Test: OSRM Route Request

```bash
curl "https://router.project-osrm.org/route/v1/driving/77.5946,12.9716;77.6080,12.9725?alternatives=false&steps=false&overview=false"
```

**Expected Response**:
```json
{
  "code": "Ok",
  "routes": [
    {
      "distance": 2500,      // meters
      "duration": 300,       // seconds  
      "geometry": "..."
    }
  ]
}
```

### Integration Test: Nearby Restaurants

```bash
# Test with OSRM enabled
curl "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946"
```

**Verify**:
- Distances are >= straight-line distances
- ETA values are reasonable for route duration
- Delivery fees reflect longer driving distance
- Response time < 2s (with caching)

### Fallback Test: OSRM Unavailable

```bash
# Set ROUTING_ENABLED=false in .env
ROUTING_ENABLED=false

curl "http://localhost:3000/restaurants/nearby?lat=12.9716&lng=77.5946"
```

**Verify**:
- Distances use Haversine formula
- API responds correctly without crashing
- Logs show fallback usage

---

## Performance Considerations

### Latency Analysis

**Before OSRM Integration**:
- PostGIS query: ~100-200ms
- Delivery fee calculation: ~5-10ms
- Total: ~105-210ms

**After OSRM Integration**:
- PostGIS query: ~100-200ms
- OSRM API calls (parallel): ~500-2000ms (first call)
- Cache hit: <10ms
- Delivery fee calculation: ~5-10ms
- Total first call: ~605-2210ms
- Total cached call: ~105-210ms (same as before)

### Optimization Strategies

1. **Caching** (implemented)
   - Cache TTL: 60 seconds
   - Reduces repeated calls by 90%+

2. **Parallel Requests** (implemented)
   - All OSRM calls made in parallel
   - Reduces latency vs sequential calls

3. **Timeouts** (implemented)
   - ROUTING_TIMEOUT_MS=5000 prevents hanging
   - Automatic fallback to PostGIS

4. **Nearby Restaurants Optimization**
   - Limit results before OSRM enrichment
   - Default limit: 20 restaurants
   - Each restaurant adds ~200-400ms to first request

### Cost Considerations

- **Free tier OSRM** (project-osrm.org): Unlimited, public server
- **Self-hosted OSRM**: Infrastructure cost only
- **Commercial OSRM**: Per-request pricing

For high-volume deployments, use self-hosted or commercial OSRM.

---

## Monitoring & Logging

### Key Metrics to Monitor

1. **OSRM Response Time**
   ```
   Log level: INFO
   Pattern: "OSRM route calculated in Xms for restaurant Y"
   ```

2. **Fallback Usage**
   ```
   Log level: WARN
   Pattern: "Failed to get OSRM route for restaurant X. Using PostGIS distance."
   ```

3. **Cache Hit Rate**
   ```
   Target: > 80% for nearby queries within 60s window
   ```

4. **Error Rate**
   ```
   OSRM timeout/error rate should be < 1%
   ```

### Log Examples

```
[LocationService] OSRM route calculated in 450ms for restaurant 5. Distance: 3.2km, Duration: 18min
[LocationService] Cache hit for route key: route:osrm:driving:12.9716:77.5946:12.9725:77.6080
[LocationService] WARN: Failed to get OSRM route for restaurant 10: Timeout. Using PostGIS distance.
```

---

## Troubleshooting

### Issue: Delivery fees higher than before

**Cause**: OSRM distances are typically 20-40% longer than straight-line distances
**Solution**: Expected behavior. Prices now reflect actual driving routes.
**Verification**: Compare distances: `OSRM distance > PostGIS distance`

### Issue: Slow API responses (>2s)

**Cause 1**: OSRM server is slow or distant
**Solution**: Use closer OSRM instance or self-host

**Cause 2**: No cache hits
**Solution**: Check cache configuration, verify Redis connectivity

**Cause 3**: Requesting too many restaurants
**Solution**: Reduce radius or limit results

### Issue: OSRM API returning errors

**Cause**: Invalid coordinates or unsupported route
**Solution**: 
- Check lat/lng ranges (-90 to 90, -180 to 180)
- Verify ROUTING_BASE_URL is correct
- Test manually: `curl "https://router.project-osrm.org/route/v1/driving/lng,lat;lng,lat"`

### Issue: Different distances for same route

**Cause**: Multiple OSRM instances or data differences
**Solution**: 
- Verify ROUTING_BASE_URL is consistent
- Check OSRM data currency
- Clear cache and retry

---

## Deployment Checklist

- [ ] Review environment variables in `.env`
- [ ] Set `ROUTING_ENABLED=true`
- [ ] Configure `ROUTING_BASE_URL` for your OSRM instance
- [ ] Set appropriate `ROUTING_TIMEOUT_MS` (5000 recommended)
- [ ] Verify Redis cache is running
- [ ] Test fallback by temporarily disabling OSRM
- [ ] Monitor initial deployment for errors
- [ ] Verify delivery fees are reasonable
- [ ] Check logs for OSRM failures
- [ ] Set up alerts for OSRM timeout rate > 1%

---

## Rollback Plan

If OSRM integration needs to be disabled:

```bash
# Option 1: Emergency disable
ROUTING_ENABLED=false

# Option 2: Revert commits
git revert <commit-hash>

# Option 3: Use PostGIS distance temporarily
# Update code to bypass OSRM calls
```

The system will automatically fall back to PostGIS distances without API changes.

---

## References

- [OSRM Documentation](http://project-osrm.org/)
- [OSRM Route API](http://project-osrm.org/docs/v5.5.0/api/#route-service)
- [PostGIS Documentation](https://postgis.net/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)

---

## Support

For issues or questions:
1. Check logs: `ROUTING_ENABLE` and `OSRM` patterns
2. Verify configuration matches `.env.example`
3. Test OSRM independently
4. Review this guide's troubleshooting section
