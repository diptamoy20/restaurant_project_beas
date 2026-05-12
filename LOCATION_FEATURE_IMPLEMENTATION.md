# Location-Based Restaurant Discovery - Implementation Guide

## Overview

This implementation extends the existing food delivery platform with a complete location-based restaurant discovery system. The feature includes:

- **Admin Management**: Full CRUD operations for restaurants with geolocation
- **Client-side Discovery**: Automatic nearby restaurant discovery based on user location
- **Production-grade**: Uses PostGIS for scalable geolocation queries
- **Integrated Architecture**: Seamlessly integrated into existing codebase

---

## Completed Changes

### 1. Backend - Database Schema Updates

#### File: `backend/prisma/schema.prisma`

**Changes Made:**
- Added `cuisineType` (String, optional) - Cuisine type/category of the restaurant
- Added `description` (String, optional) - Restaurant description
- Added `imageUrl` (String, optional) - Restaurant image URL
- Added `createdAt` (DateTime) - Timestamp when restaurant was created
- Added `updatedAt` (DateTime) - Timestamp when restaurant was last updated

**Schema**:
```prisma
model Restaurant {
  id                Int                                   @id @default(autoincrement())
  name              String
  address           String
  city              String?
  latitude          Float
  longitude         Float
  location          Unsupported("geography(Point,4326)")?
  cuisineType       String?                               @map("cuisine_type")
  description       String?
  imageUrl          String?                               @map("image_url")
  deliveryRadiusKm  Float                                 @default(8) @map("delivery_radius_km")
  isLocationEnabled Boolean                               @default(true) @map("is_location_enabled")
  isActive          Boolean                               @default(true) @map("is_active")
  createdAt         DateTime                              @default(now()) @map("created_at")
  updatedAt         DateTime                              @updatedAt @map("updated_at")
  tables            RestaurantTable[]
  categories        Category[]
  menuItems         MenuItem[]
  orders            Order[]
  deliveryZones     DeliveryZone[]

  @@map("restaurants")
}
```

---

### 2. Backend - Database Migration

#### File: `backend/prisma/migrations/20260511100000_add_restaurant_management_fields/migration.sql`

**Changes Made:**
- Added new columns to restaurants table
- Created indexes for better query performance:
  - `restaurants_latitude_longitude_idx` - For geolocation queries
  - `restaurants_is_active_idx` - For filtering active restaurants
  - `restaurants_delivery_radius_km_idx` - For delivery radius queries

---

### 3. Backend - DTOs

#### File: `backend/src/modules/restaurants/dto/create-update-restaurant.dto.ts` (NEW)

**CreateRestaurantDto** - For creating new restaurants:
```typescript
- name (required, string)
- address (required, string)
- city (optional, string)
- latitude (required, number, -90 to 90)
- longitude (required, number, -180 to 180)
- cuisineType (optional, string)
- description (optional, string)
- imageUrl (optional, URL)
- deliveryRadiusKm (optional, number, min 0.1, default 8)
- isLocationEnabled (optional, boolean, default true)
- isActive (optional, boolean, default true)
```

**UpdateRestaurantDto** - For updating restaurants:
- Same fields as CreateRestaurantDto, all optional

#### File: `backend/src/modules/restaurants/dto/restaurant-response.dto.ts` (UPDATED)

**Added fields to RestaurantResponseDto:**
- `cuisineType` (optional, string)
- `description` (optional, string)
- `imageUrl` (optional, string)

---

### 4. Backend - Service

#### File: `backend/src/modules/restaurants/restaurants.service.ts` (UPDATED)

**New Methods Added:**

1. **createRestaurant(data: CreateRestaurantDto)** - Creates new restaurant
   - Validates coordinates
   - Creates restaurant with all fields
   - Returns RestaurantResponseDto

2. **updateRestaurant(id: number, data: UpdateRestaurantDto)** - Updates restaurant
   - Validates restaurant exists
   - Validates coordinates if provided
   - Updates only provided fields
   - Returns RestaurantResponseDto

3. **deleteRestaurant(id: number)** - Deletes restaurant
   - Soft delete if restaurant has orders (marks as inactive)
   - Hard delete if no orders
   - Returns success message

4. **getAllRestaurantsForAdmin()** - Gets all restaurants for admin
   - Includes inactive restaurants
   - Sorted by creation date (newest first)
   - For admin management purposes

5. **isValidCoordinates(lat, lng)** - Validates coordinates
   - Latitude: -90 to 90
   - Longitude: -180 to 180

---

### 5. Backend - Controller

#### File: `backend/src/modules/restaurants/restaurants.controller.ts` (UPDATED)

**New Endpoints:**

1. **GET /restaurants/admin/all**
   - Protected: Admin and Manager only
   - Returns all restaurants including inactive
   - Use: Admin dashboard management

2. **POST /restaurants**
   - Protected: Admin only
   - Body: CreateRestaurantDto
   - Creates new restaurant
   - Returns: RestaurantResponseDto (201 Created)

3. **PATCH /restaurants/:id**
   - Protected: Admin and Manager
   - Body: UpdateRestaurantDto
   - Updates restaurant by ID
   - Returns: RestaurantResponseDto

4. **DELETE /restaurants/:id**
   - Protected: Admin only
   - Deletes restaurant by ID
   - Returns: { message: string }

5. **GET /restaurants/nearby** (EXISTING)
   - Public endpoint
   - Query params: lat, lng, radiusKm (optional, default 10), page, limit
   - Returns: Array of nearby restaurants

6. **GET /restaurants/:id** (EXISTING)
   - Public endpoint
   - Returns single restaurant by ID

7. **GET /restaurants/:id/menu** (EXISTING)
   - Public endpoint
   - Returns restaurant menu with delivery info

---

### 6. Frontend Admin Panel - API Service

#### File: `admin-panel/src/services/restaurantApi.js` (NEW)

**Redux Query API with endpoints:**

- `getAllRestaurants()` - GET /restaurants/admin/all
- `createRestaurant(data)` - POST /restaurants
- `updateRestaurant({id, ...data})` - PATCH /restaurants/:id
- `deleteRestaurant(id)` - DELETE /restaurants/:id
- `getRestaurant(id)` - GET /restaurants/:id

**Hooks Exported:**
```javascript
useGetAllRestaurantsQuery
useCreateRestaurantMutation
useUpdateRestaurantMutation
useDeleteRestaurantMutation
useGetRestaurantQuery
```

---

### 7. Frontend Admin Panel - Store Configuration

#### File: `admin-panel/src/app/store.js` (UPDATED)

**Changes:**
- Added `restaurantApi` to store reducers
- Added `restaurantApi.middleware` to middleware chain

---

### 8. Frontend Admin Panel - Page Component

#### File: `admin-panel/src/pages/RestaurantsPage.jsx` (NEW)

**Features:**
- List all restaurants in a table with:
  - Restaurant name and cuisine type
  - Location (address with coordinates)
  - Delivery radius
  - Active/Inactive status
  - Action buttons (Edit, Delete)
  
- Add Restaurant Modal with form fields:
  - Name (required)
  - Address (required)
  - City
  - Latitude (required, -90 to 90)
  - Longitude (required, -180 to 180)
  - Cuisine Type
  - Description
  - Image URL
  - Delivery Radius
  - Location enabled checkbox
  - Active checkbox

- Form Validation:
  - Required field validation
  - Coordinate validation
  - Delivery radius minimum validation

- Mutation Handling:
  - Create, Update, Delete operations
  - Error states and messages
  - Loading states
  - Confirmation dialog for deletion

- UI States:
  - Loading state while fetching
  - Empty state when no restaurants
  - Error state with error messages
  - Permission-based action buttons

---

### 9. Frontend Admin Panel - Routing

#### File: `admin-panel/src/routes/accessControl.js` (UPDATED)

**Changes:**
- Replaced: `{ path: '/menu', label: 'Menu', module: 'menu' }`
- Added: `{ path: '/restaurants', label: 'Manage Restaurants', module: 'restaurants' }`

---

### 10. Frontend Admin Panel - Authentication

#### File: `admin-panel/src/utils/auth.js` (UPDATED)

**Permission Updates:**

For **Admin** role:
```javascript
restaurants: ['view', 'create', 'edit', 'delete']
```

For **Manager** role:
```javascript
restaurants: ['view', 'edit']
```

For **Staff** role:
```javascript
restaurants: ['view']
```

---

### 11. Frontend Admin Panel - App Routes

#### File: `admin-panel/src/App.jsx` (UPDATED)

**Changes:**
- Replaced MenuPage import with RestaurantsPage
- Updated route from `/menu` to `/restaurants`
- Updated ProtectedRoute module from 'menu' to 'restaurants'

---

## Deployment Instructions

### Step 1: Apply Database Migration

```bash
cd backend

# Run the migration
npm run prisma:migrate

# Or use db push for development
npm run prisma:dbpush

# Generate updated Prisma client
npm run prisma:generate
```

### Step 2: Build Backend

```bash
cd backend

npm run build
```

### Step 3: Build Admin Panel

```bash
cd admin-panel

npm run build
```

### Step 4: Restart Services

```bash
# Start backend (development)
npm run start:dev

# Or production
npm run start:prod
```

---

## API Usage Examples

### Create Restaurant

```bash
curl -X POST http://localhost:3000/restaurants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Spice Hub",
    "address": "45 Residency Road",
    "city": "Bangalore",
    "latitude": 12.9663,
    "longitude": 77.6012,
    "cuisineType": "North Indian, Chinese",
    "description": "Authentic North Indian cuisine",
    "imageUrl": "https://example.com/image.jpg",
    "deliveryRadiusKm": 10,
    "isLocationEnabled": true,
    "isActive": true
  }'
```

### Get All Restaurants (Admin)

```bash
curl -X GET http://localhost:3000/restaurants/admin/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Restaurant

```bash
curl -X PATCH http://localhost:3000/restaurants/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryRadiusKm": 15,
    "isActive": false
  }'
```

### Delete Restaurant

```bash
curl -X DELETE http://localhost:3000/restaurants/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Nearby Restaurants (Public)

```bash
curl -X GET 'http://localhost:3000/restaurants/nearby?lat=12.9663&lng=77.6012&radiusKm=10'
```

---

## Client-Side Geolocation Flow

### 1. Initial Load

When user opens the application:
1. Browser requests geolocation permission
2. If granted: Gets user coordinates and caches them (30 min TTL)
3. If denied: Shows modal to allow manual location entry

### 2. Nearby Restaurant Discovery

With valid coordinates:
1. Frontend calls `GET /restaurants/nearby?lat=X&lng=Y&radiusKm=10`
2. Backend uses PostGIS to find restaurants within radius
3. Results cached and auto-refresh every 5 minutes
4. User sees restaurant cards with distance and delivery info

### 3. Manual Location Selection

If geolocation fails:
1. User can manually enter latitude/longitude
2. Or select from predefined locations
3. Coordinates validated on client side
4. Uses same discovery flow

### 4. Location Caching

- User location cached in localStorage
- 30-minute TTL
- Prevents repeated permission requests
- Cleared when user changes location

---

## Architecture Highlights

### 1. Separation of Concerns

- **DTOs**: Validation and type safety
- **Service**: Business logic and database operations
- **Controller**: Request routing and authentication
- **API Service (Frontend)**: State management and caching

### 2. Security

- Role-based access control (RBAC)
- Admin-only endpoints for mutations
- Manager access for reading/editing
- Public endpoints for customer queries

### 3. Performance

- Database indexes on frequently queried columns
- PostGIS for scalable geolocation queries
- Client-side caching of location data
- API response caching with Redux Query

### 4. Error Handling

- Comprehensive validation
- User-friendly error messages
- Proper HTTP status codes
- Form-level error display

### 5. UX/UI

- Modal-based form for consistency
- Table view for restaurant listing
- Real-time validation feedback
- Loading and empty states
- Permission-based UI rendering

---

## Field Validations

### Coordinates
- **Latitude**: Must be between -90 and 90
- **Longitude**: Must be between -180 and 180

### Delivery Radius
- **Minimum**: 0.1 km
- **Default**: 8 km
- **Type**: Positive decimal number

### Strings
- **Name**: Required, non-empty
- **Address**: Required, non-empty
- **Cuisine Type**: Optional
- **Description**: Optional
- **Image URL**: Must be valid URL if provided

---

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Backend compiles without errors
- [ ] Admin panel compiles without errors
- [ ] Can create restaurant with valid coordinates
- [ ] Can update restaurant details
- [ ] Can delete restaurant (soft/hard delete logic works)
- [ ] Can view all restaurants in admin panel
- [ ] Nearby restaurants API returns correct results
- [ ] Geolocation permission request works on client
- [ ] Manual location entry works on client
- [ ] Restaurant cards display correctly on homepage
- [ ] Delivery radius calculation is accurate
- [ ] Role-based permissions enforced
- [ ] Error messages display correctly

---

## Environment Variables (if needed)

No additional environment variables required. System uses existing configuration.

---

## Troubleshooting

### Migration Fails
- Ensure PostgreSQL is running
- Check `DATABASE_URL` is correct
- Verify PostGIS extension is installed: `CREATE EXTENSION postgis;`

### Backend Compilation Error
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Run Prisma generate: `npm run prisma:generate`

### Frontend Compilation Error
- Clear build cache: `rm -rf dist && npm run build`
- Verify all imports are correct

### Geolocation Not Working
- Check HTTPS or localhost (browser security requirement)
- Verify browser permissions for location
- Check browser console for JavaScript errors

---

## Future Enhancements

1. **Search & Filtering**: Add search by cuisine, name, rating
2. **Ratings & Reviews**: Allow customers to rate restaurants
3. **Multiple Cuisines**: Support multiple cuisine types per restaurant
4. **Business Hours**: Add opening/closing times
5. **Photos Gallery**: Multiple images per restaurant
6. **Analytics**: Track restaurant performance metrics
7. **Bulk Import**: CSV import for multiple restaurants
8. **Advanced Delivery Zones**: Custom polygon-based delivery areas

---

## Code Quality

- **Pattern**: Module-Service-Controller-DTO pattern
- **Validation**: Class-validator decorators
- **Error Handling**: NestJS exception handling
- **Documentation**: JSDoc comments on methods
- **Type Safety**: TypeScript strict mode
- **API Documentation**: Swagger decorators

---

## Support

For issues or questions, refer to:
1. API documentation: Swagger UI at `/api/docs`
2. Database schema: [Prisma Schema](../prisma/schema.prisma)
3. Test endpoints: [API Examples](./apis.rest)
