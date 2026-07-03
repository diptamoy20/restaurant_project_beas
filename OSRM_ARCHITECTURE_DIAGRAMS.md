# Architecture & Sequence Diagrams

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend/Mobile App                       │
│                    User sends lat/lng request                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    /restaurants/nearby
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      NestJS Backend                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              LocationService                              │  │
│  │  • findNearbyRestaurants()                                │  │
│  │  • getRestaurantDeliveryQuote()                           │  │
│  │  • enrichWithOsrmDistance()                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                        │         │                                │
│        ┌───────────────┘         └──────────────┐               │
│        ▼                                         ▼               │
│  ┌───────────────┐              ┌──────────────────────────────┐ │
│  │  PostgreSQL   │              │   RoutingService             │ │
│  │   + PostGIS   │              │  • getShortestRoute()        │ │
│  │               │              │  • Cache routes              │ │
│  │ • Filter      │              │  • Fallback to Haversine    │ │
│  │   nearby      │              │                              │ │
│  │   restaurants │              └──────────────┬───────────────┘ │
│  │ • Zones       │                             │                 │
│  │ • Delivery    │                    ┌────────┴────────┐        │
│  │   config      │                    ▼                ▼        │
│  └───────────────┘              ┌──────────────────────────────┐ │
│                                 │   Redis Cache                │ │
│  ┌──────────────────┐          │  • Route results             │ │
│  │  calculateDeliveryFee        │  • TTL: 60 seconds          │ │
│  │  (unchanged)     │          └──────────────────────────────┘ │
│  │  • Input: distance Km        │                                │
│  │  • Output: fee              │   OSRM API Calls              │ │
│  └──────────────────┘          │   (when cache miss)            │
└──────────────────────────────────────────────────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │  OSRM Server    │
                    │  (External)     │
                    │ /route/v1/      │
                    │  driving/...    │
                    └─────────────────┘
                             │
                    Distance + Duration
                             ▼
                ┌─────────────────────────┐
              Client receives:
              • distanceKm (OSRM)
              • deliveryFee (calculated from OSRM)
              • estimatedDeliveryTimeMinutes (from OSRM)
                └─────────────────────────┘
```

---

## 2. Nearby Restaurants Request Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ GET /restaurants/nearby?lat=12.9716&lng=77.5946&radiusKm=10
     ▼
┌────────────────────────────────────────────────────────────────┐
│ LocationService.findNearbyRestaurants()                        │
├────────────────────────────────────────────────────────────────┤
│ 1. Check cache                                                 │
│    Key: "restaurants:12.9716:77.5946:10:20:0"                 │
└────┬───────────────────────────────────────────────────────────┘
     │ Cache MISS
     ▼
┌────────────────────────────────────────────────────────────────┐
│ PostgreSQL + PostGIS Query                                    │
├────────────────────────────────────────────────────────────────┤
│ WITH customer AS (                                             │
│   SELECT ST_MakePoint(lng, lat)::geography AS geog            │
│ )                                                              │
│ SELECT * FROM restaurants r                                  │
│ WHERE ST_DWithin(r.location, customer.geog, 10km)            │
│ AND r.is_active = true                                       │
│ AND r.delivery_enabled = true                                │
│ ORDER BY ST_Distance(r.location, geog) ASC                  │
│                                                                │
│ Returns: [Restaurant, Restaurant, ...]                       │
│ with PostGIS distanceKm (straight-line distance)            │
└────┬───────────────────────────────────────────────────────────┘
     │ rows = [5 restaurants with PostGIS distance]
     ▼
┌────────────────────────────────────────────────────────────────┐
│ LocationService.enrichWithOsrmDistance()                      │
├────────────────────────────────────────────────────────────────┤
│ For each restaurant in parallel:                              │
│   1. RoutingService.getShortestRoute(                         │
│        userLat, userLng,                                      │
│        restaurantLat, restaurantLng                           │
│      )                                                         │
└────┬───────────────────────────────────────────────────────────┘
     │
     ├─ Restaurant 1 ───┐
     ├─ Restaurant 2 ───┤─ Parallel OSRM calls
     ├─ Restaurant 3 ───┤
     ├─ Restaurant 4 ───┤
     └─ Restaurant 5 ───┘
        │
        ▼ Each call:
┌────────────────────────────────────────────────────────────────┐
│ RoutingService.getShortestRoute()                             │
├────────────────────────────────────────────────────────────────┤
│ 1. Build cache key                                             │
│    Key: "route:osrm:driving:12.9716:77.5946:12.97:77.60"     │
│ 2. Check cache (get() with 60s TTL)                           │
│    IF HIT: Return cached RouteDistanceResult                  │
│    IF MISS: Continue to OSRM API                              │
│ 3. Call OSRM API:                                              │
│    POST https://router.project-osrm.org/route/v1/driving/    │
│      77.5946,12.9716;77.60,12.97                             │
│    ?alternatives=false&steps=false&overview=false            │
│ 4. Parse response:                                             │
│    {                                                           │
│      routes: [{                                                │
│        distance: 3200 (meters),                               │
│        duration: 900 (seconds)                                │
│      }]                                                        │
│    }                                                           │
│ 5. Convert and cache:                                          │
│    distanceKm = 3200 / 1000 = 3.2 km                         │
│    durationMinutes = 900 / 60 = 15 min                       │
│    Cache result for 60 seconds                                │
└────┬───────────────────────────────────────────────────────────┘
     │ Returns: RouteDistanceResult
     │   distanceKm: 3.2
     │   durationMinutes: 15
     │   source: 'ROUTE'
     │   provider: 'OSRM'
     ▼
┌────────────────────────────────────────────────────────────────┐
│ Back to enrichWithOsrmDistance()                              │
├────────────────────────────────────────────────────────────────┤
│ Collect results for all 5 restaurants:                        │
│ Map<restaurantId, RouteDistanceResult>                        │
│   1 → {distanceKm: 3.2, durationMinutes: 15, ...}           │
│   2 → {distanceKm: 2.1, durationMinutes: 11, ...}           │
│   3 → {distanceKm: 4.5, durationMinutes: 22, ...}           │
│   4 → {distanceKm: 1.8, durationMinutes: 9, ...}            │
│   5 → {distanceKm: 5.2, durationMinutes: 28, ...}           │
└────┬───────────────────────────────────────────────────────────┘
     │ routes = Map with OSRM data
     ▼
┌────────────────────────────────────────────────────────────────┐
│ Calculate Delivery Fee for Each Restaurant                    │
├────────────────────────────────────────────────────────────────┤
│ For restaurant in restaurants:                                │
│   route = osrmRoutes.get(restaurant.id)                       │
│   delivery = calculateDeliveryFee(                            │
│     {                                                          │
│       ...config,                                              │
│       distanceKm: route.drivingDistanceKm (3.2, not 2.8)    │
│     },                                                         │
│     subtotal: 0                                               │
│   )                                                            │
│                                                                │
│   Input to calculation: OSRM distance (3.2 km)              │
│   Output: deliveryFee (calculated based on 3.2 km)          │
│                                                                │
│   Example:                                                     │
│   Base fee: 30                                                │
│   Base distance: 1 km                                         │
│   Extra distance: 3.2 - 1 = 2.2 km                          │
│   Per km fee: 3                                               │
│   Delivery charge: 30 + (2.2 * 3) = 36.60                   │
└────┬───────────────────────────────────────────────────────────┘
     │ enhanced restaurants with OSRM data + fees
     ▼
┌────────────────────────────────────────────────────────────────┐
│ Build Response                                                │
├────────────────────────────────────────────────────────────────┤
│ [{                                                             │
│   "id": 1,                                                    │
│   "name": "Restaurant A",                                    │
│   "distanceKm": 3.2,        ← OSRM driving distance          │
│   "deliveryFee": 36.60,     ← Based on OSRM distance        │
│   "estimatedDeliveryTimeMinutes": 15,  ← From OSRM          │
│   "deliveryAvailable": true,                                 │
│   "categories": [...],                                       │
│   "menuItems": [...]                                         │
│ }]                                                            │
└────┬───────────────────────────────────────────────────────────┘
     │
     ▼ Cache result for 5 minutes
     
     ▼ Return to client
┌─────────────────────┐
│ Client receives     │
│ enhanced data with  │
│ road distances      │
└─────────────────────┘
```

---

## 3. Single Restaurant Delivery Quote Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /checkout/quote
     │ { restaurantId: 5, lat: 12.9716, lng: 77.5946 }
     ▼
┌────────────────────────────────────────────────────────────────┐
│ LocationService.getRestaurantDeliveryQuote()                  │
├────────────────────────────────────────────────────────────────┤
│ 1. Build cache key                                             │
│    Key: "delivery:12.9716:77.5946:5:0:browse"               │
│ 2. Check cache (5 min TTL)                                    │
│    IF HIT: Return cached quote                                │
│    IF MISS: Continue                                          │
└────┬───────────────────────────────────────────────────────────┘
     │ Cache MISS
     ▼
┌────────────────────────────────────────────────────────────────┐
│ getRestaurantDeliveryRow()                                     │
├────────────────────────────────────────────────────────────────┤
│ Query database for restaurant config:                         │
│   • delivery_radius_km                                        │
│   • delivery_base_fee                                         │
│   • delivery_per_km_fee                                       │
│   • delivery_fee_min/cap                                      │
│   • delivery_zones                                            │
│                                                                │
│ PostGIS distance (fallback only):                            │
│   ST_Distance(restaurant.location, customer.geog) / 1000    │
│                                                                │
│ Returns: RestaurantDeliveryRow {                             │
│   distanceKm: 2.8 (PostGIS, straight-line),                 │
│   deliveryBaseFee: 30,                                       │
│   deliveryPerKmFee: 3,                                       │
│   ...config                                                  │
│ }                                                             │
└────┬───────────────────────────────────────────────────────────┘
     │ row = db result with PostGIS distance (2.8)
     ▼
┌────────────────────────────────────────────────────────────────┐
│ Query Restaurant Coordinates                                 │
├────────────────────────────────────────────────────────────────┤
│ SELECT latitude, longitude FROM restaurants WHERE id = 5     │
│ Returns: { latitude: 12.97, longitude: 77.60 }              │
└────┬───────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│ RoutingService.getShortestRoute()                             │
├────────────────────────────────────────────────────────────────┤
│ origin: { latitude: 12.9716, longitude: 77.5946 }            │
│ destination: { latitude: 12.97, longitude: 77.60 }           │
│                                                                │
│ 1. Build cache key and check cache                           │
│    Cache HIT? Return immediately                             │
│ 2. Call OSRM API                                              │
│ 3. Parse response:                                            │
│    {                                                          │
│      routes: [{                                               │
│        distance: 3150,  ← 3.15 km (road)                    │
│        duration: 945    ← ~16 minutes                        │
│      }]                                                       │
│    }                                                          │
│ 4. Cache and return:                                          │
│    {                                                          │
│      distanceKm: 3.15,                                        │
│      durationMinutes: 15.75,                                 │
│      source: 'ROUTE',                                        │
│      provider: 'OSRM'                                        │
│    }                                                          │
└────┬───────────────────────────────────────────────────────────┘
     │ osrmRoute.distanceKm = 3.15 (not 2.8!)
     ▼
┌────────────────────────────────────────────────────────────────┐
│ Calculate Delivery Fee                                        │
├────────────────────────────────────────────────────────────────┤
│ calculateDeliveryFee(                                         │
│   {                                                           │
│     deliveryEnabled: true,                                   │
│     deliveryRadiusKm: 10,                                    │
│     deliveryBaseFee: 30,      ← ₹30                         │
│     deliveryBaseDistanceKm: 1, ← First 1 km                 │
│     deliveryPerKmFee: 3,       ← ₹3 per extra km            │
│     deliveryFeeMin: 25,                                      │
│     deliveryFeeCap: 100,                                     │
│     freeDeliveryMinAmount: null,                             │
│     packagingCharge: 0,                                      │
│     distanceKm: 3.15  ← OSRM distance (not PostGIS!)       │
│   },                                                          │
│   subtotalAmount: 500                                        │
│ )                                                             │
│                                                                │
│ Calculation:                                                  │
│   baseFee = 30                                               │
│   extraDistance = 3.15 - 1 = 2.15 km                        │
│   extraCharge = 2.15 * 3 = 6.45                             │
│   total = 30 + 6.45 = 36.45                                 │
│   applyCap = min(36.45, 100) = 36.45                        │
│   applyMin = max(36.45, 25) = 36.45                         │
│                                                                │
│ Returns: {                                                    │
│   isDeliveryAvailable: true,                                 │
│   deliveryCharge: 36.45,                                     │
│   packagingCharge: 0,                                        │
│   deliveryFeeBreakdown: {                                    │
│     distanceKm: 3.15,  ← OSRM distance                      │
│     baseFee: 30,                                             │
│     baseDistanceKm: 1,                                       │
│     extraDistanceKm: 2.15,                                   │
│     extraUnits: 2.15,                                        │
│     perKmFee: 3,                                             │
│     deliveryCharge: 36.45,                                   │
│     packagingCharge: 0                                       │
│   }                                                           │
│ }                                                             │
└────┬───────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│ Build Response                                                │
├────────────────────────────────────────────────────────────────┤
│ {                                                              │
│   "deliveryAvailable": true,                                 │
│   "distanceKm": 3.15,          ← OSRM driving distance      │
│   "deliveryFee": 36.45,        ← Based on 3.15 km           │
│   "estimatedDeliveryTimeMinutes": 16,  ← From OSRM         │
│   "reason": "Delivery fee calculated by distance",           │
│   "deliveryFeeBreakdown": {                                  │
│     "distanceKm": 3.15,                                      │
│     "baseFee": 30,                                           │
│     "extraDistanceKm": 2.15,                                 │
│     "deliveryCharge": 36.45                                  │
│   }                                                           │
│ }                                                             │
└────┬───────────────────────────────────────────────────────────┘
     │
     ▼ Cache for 5 minutes
     
     ▼ Return to client
┌─────────────────────┐
│ Client receives     │
│ quote based on      │
│ 3.15 km road route  │
│ (not 2.8 km line)   │
└─────────────────────┘
```

---

## 4. Fallback Flow (When OSRM Fails)

```
┌──────────────────────────────────┐
│ RoutingService.getShortestRoute()│
└────┬─────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Try OSRM API Call                                           │
├─────────────────────────────────────────────────────────────┤
│ fetch(https://router.project-osrm.org/route/v1/driving/...)│
│                                                              │
│ Possible errors:                                            │
│ • Network timeout (5s)                                     │
│ • Connection refused                                       │
│ • Invalid response (code !== "Ok")                         │
│ • HTTP error (500, 503)                                    │
└────┬────────────────────────────────────────────────────────┘
     │ ERROR CAUGHT
     ▼
┌─────────────────────────────────────────────────────────────┐
│ catch (error)                                               │
├─────────────────────────────────────────────────────────────┤
│ Log: "Falling back to air distance for route lookup:        │
│       {error.message}"                                     │
│                                                              │
│ Example log:                                                │
│ "Failed to get OSRM route for restaurant 5:                │
│  Request timeout. Using PostGIS distance."                │
└────┬────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ buildAirDistanceFallback(distanceKm)                       │
├─────────────────────────────────────────────────────────────┤
│ Calculate Haversine distance:                               │
│                                                              │
│ earthRadiusKm = 6371                                       │
│ dLat = toRadians(lat2 - lat1)                             │
│ dLon = toRadians(lon2 - lon1)                             │
│ a = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2)   │
│ c = 2 * atan2(√a, √(1-a))                                 │
│ distance = earthRadiusKm * c                               │
│                                                              │
│ Returns: RouteDistanceResult {                             │
│   distanceKm: 2.8 (straight-line),                        │
│   durationMinutes: null,  ← No duration available         │
│   source: 'AIR_DISTANCE_FALLBACK',                        │
│   provider: 'NONE'                                         │
│ }                                                           │
└────┬────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────┐
│ Back to LocationService.enrichWithOsrmDistance()     │
├──────────────────────────────────────────────────────┤
│ route = fallback result:                             │
│   distanceKm: 2.8 (Haversine)                       │
│   estimatedDurationMinutes: null (not available)    │
│   routeSource: 'POSTGIS_FALLBACK'                  │
│                                                      │
│ ETA calculation (null duration):                     │
│ if (route.estimatedDurationMinutes === null) {      │
│   estimatedDurationMinutes = Math.ceil(20 + 2.8*3)│
│   // = Math.ceil(20 + 8.4) = 28 minutes            │
│ }                                                    │
│                                                      │
│ Delivery fee calculation:                            │
│   Uses 2.8 km (not perfect, but acceptable)       │
└────┬───────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────┐
│ Result sent to client:                              │
│ {                                                    │
│   distanceKm: 2.8,  ← Fallback (Haversine)         │
│   deliveryFee: 34.40,  ← Based on 2.8 km          │
│   estimatedDeliveryTimeMinutes: 28                 │
│ }                                                    │
│                                                      │
│ System continues without crash                     │
└──────────────────────────────────────────────────────┘
```

---

## 5. Comparison: Before vs After

### Before OSRM
```
User Location (12.9716, 77.5946)
              ↓
         PostGIS Query
              ↓
    ST_Distance calculation
         (straight-line)
              ↓
      Distance: 2.1 km
              ↓
  calculateDeliveryFee(2.1)
              ↓
  Delivery Fee: 33.30
              ↓
   ETA: 20 + CEIL(2.1*3) = 27 min
```

### After OSRM
```
User Location (12.9716, 77.5946)
              ↓
         PostGIS Query
              ↓
       OSRM Route API
      (with caching)
              ↓
    Distance: 2.85 km
    Duration: 18 min
              ↓
  calculateDeliveryFee(2.85)
              ↓
  Delivery Fee: 38.55
              ↓
   ETA: 18 min (from OSRM)
```

### Key Differences
- **Distance**: +36% (2.1 → 2.85 km) - more realistic
- **Fee**: +15.8% ($33.30 → $38.55) - reflects actual route
- **ETA**: -33% (27 → 18 min) - based on real routing data

