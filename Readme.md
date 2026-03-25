# Fuudie — Backend API

> **Production-grade microservices backend for the Fuudie food & commerce delivery platform**
> Built with Node.js · TypeScript · Express · MongoDB · Docker

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Services Map](#services-map)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Getting Started — Local Development](#getting-started--local-development)
6. [Environment Variables](#environment-variables)
7. [Service Reference](#service-reference)
8. [Shared Middleware](#shared-middleware)
9. [Authentication Flow](#authentication-flow)
10. [Order Engine](#order-engine)
11. [Data Models](#data-models)
12. [API Quick Reference](#api-quick-reference)
13. [Docker](#docker)
14. [Deployment — Render](#deployment--render)
15. [Inter-Service Communication](#inter-service-communication)
16. [Database Design](#database-design)
17. [Error Handling](#error-handling)
18. [Testing Endpoints](#testing-endpoints)
19. [Troubleshooting](#troubleshooting)
20. [Roadmap](#roadmap)

---

## Architecture Overview

Fuudie's backend is a **microservices architecture** where each service owns a distinct business domain, has its own MongoDB database, and communicates with other services over HTTP. All external traffic enters through a single API gateway.

```
                        +---------------------+
                        |     Mobile App      |
                        |  (React Native)     |
                        +----------+----------+
                                   | HTTPS
                        +----------v----------+
                        |    API Gateway      |
                        |    Port 3000        |
                        |  Auth injection     |
                        |  Route proxying     |
                        +--+---+---+---+---+--+
                           |   |   |   |   |
         +-----------------+   |   |   |   +-----------------+
         |           +---------+   +---------+               |
         v           v                       v               v
  +-----------+ +-----------+         +----------+  +--------------+
  |   User    | |Restaurant |         |  Store   |  |   Catalog    |
  | Service   | | Service   |         | Service  |  |   Service    |
  | Port 3001 | | Port 3002 |         |Port 3004 |  |  Port 3005   |
  +-----+-----+ +-----+-----+         +----+-----+  +------+-------+
        |               |                  |                |
        v               v                  v                v
     MongoDB         MongoDB            MongoDB          MongoDB
     (users)      (restaurants)    (stores/cities)    (products)

                        +------------------+
                        |    Order         |
                        |   Service        |
                        |  Port 3003       |
                        +------+-----------+
                               |  calls store-service, restaurant-service,
                               |  and catalog-service to validate orders
                               v
                            MongoDB
                           (orders)
```

### Design principles

- **Each service owns its data** — no shared databases between services
- **Gateway is the only public entry point** — services are not directly accessible in production
- **Auth is injected by the gateway** — services trust `x-user-*` headers, never re-verify tokens
- **Order service is store-agnostic** — routes item validation to the correct downstream service based on store type
- **Internal endpoints are gateway-blocked** — `POST /internal/order-update` on catalog-service returns 403 at the gateway level

---

## Services Map

| Service | Port | Database | Responsibility |
|---|---|---|---|
| `api-gateway` | 3000 | None | Auth injection, route proxying, internal endpoint protection |
| `user-service` | 3001 | `fuudie-users` | Registration, login, JWT issuance, profile management |
| `restaurant-service` | 3002 | `fuudie-restaurants` | Food menus, dishes, variants, add-ons, cuisine management |
| `order-service` | 3003 | `fuudie-orders` | Universal order engine for all store types |
| `store-service` | 3004 | `fuudie-stores` | Cities, top-level categories, store profiles |
| `catalog-service` | 3005 | `fuudie-catalog` | Products for grocery, pharmacy and shops (SKU, stock, prescriptions) |

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript 5+ |
| Framework | Express 4 |
| Database | MongoDB 7+ via Mongoose 8 |
| Auth | JSON Web Tokens (jsonwebtoken) |
| HTTP Client | Axios |
| Validation | express-validator |
| Security | Helmet, CORS |
| Logging | Morgan |
| Containerisation | Docker + Docker Compose |
| Deployment | Render (all 6 services) |

---

## Prerequisites

```
Node.js         >= 18.x
npm             >= 9.x
Docker          >= 24.x      (for containerised local development)
Docker Compose  >= 2.x
MongoDB Atlas account        (or local MongoDB 7+)
```

---

## Getting Started — Local Development

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/your-username/fuudie-backend.git
cd fuudie-backend

cp .env.example .env
# Fill in your MongoDB URIs and JWT secrets

docker compose -f docker-compose.dev.yml up --build
```

All services will be available at their respective ports. The gateway at `http://localhost:3000` routes to all of them.

### Option B — Run services individually

```bash
cd services/store-service
cp .env.example .env
npm install
npm run dev
```

Start services in this order to avoid inter-dependency errors on first boot:

```
1. user-service        (port 3001)
2. store-service       (port 3004)
3. restaurant-service  (port 3002)
4. catalog-service     (port 3005)
5. order-service       (port 3003)
6. api-gateway         (port 3000)  <- last, after all upstream services are ready
```

### Seed initial data

```bash
cd services/store-service
npm run seed:categories   # seeds Food, Groceries, Pharmacy & Beauty, Shops, Package Delivery
npm run seed:cities       # seeds test city data
```

---

## Environment Variables

Each service has its own `.env` file. All services must share the same JWT secret values.

### API Gateway

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

USER_SERVICE_URL=http://localhost:3001
RESTAURANT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
STORE_SERVICE_URL=http://localhost:3004
CATALOG_SERVICE_URL=http://localhost:3005
```

### User Service

```env
PORT=3001
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/fuudie-users
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=*
```

### Restaurant Service

```env
PORT=3002
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/fuudie-restaurants
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
USER_SERVICE_URL=http://localhost:3001
CORS_ORIGIN=*
```

### Order Service

```env
PORT=3003
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/fuudie-orders
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
USER_SERVICE_URL=http://localhost:3001
STORE_SERVICE_URL=http://localhost:3004
RESTAURANT_SERVICE_URL=http://localhost:3002
CATALOG_SERVICE_URL=http://localhost:3005
TAX_RATE=0.075
SERVICE_FEE_RATE=0.02
CORS_ORIGIN=*
```

### Store Service

```env
PORT=3004
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/fuudie-stores
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
CORS_ORIGIN=*
```

### Catalog Service

```env
PORT=3005
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/fuudie-catalog
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
STORE_SERVICE_URL=http://localhost:3004
CORS_ORIGIN=*
```

> All services must share identical `JWT_SECRET` and `JWT_REFRESH_SECRET` values. Tokens issued by user-service are decoded by the gateway and downstream services.

---

## Service Reference

### 1. API Gateway — Port 3000

The single entry point for all client requests.

**Responsibilities:**
- Verifies `Authorization: Bearer <token>`, decodes the JWT, and injects `x-user-id`, `x-user-email`, `x-user-role` headers into the forwarded request
- Proxies requests to the correct upstream service
- Blocks `POST /api/catalog/products/internal/*` with 403

**Route to service mapping:**

| Path | Upstream | Auth |
|---|---|---|
| `/api/auth/*` | user-service | No |
| `/api/users/*` | user-service | Yes |
| `/api/restaurants/*` | restaurant-service | GET: No, mutations: Yes |
| `/api/orders/*` | order-service | Yes |
| `/api/cities/*` | store-service | GET: No, mutations: Admin |
| `/api/store-categories/*` | store-service | GET: No, mutations: Admin |
| `/api/stores/*` | store-service | GET: No, mutations: Owner/Admin |
| `/api/catalog/*` | catalog-service | GET: No, mutations: Owner/Admin |
| `/api/catalog/products/internal/*` | **BLOCKED 403** | Never |

---

### 2. User Service — Port 3001

Handles all identity and authentication for every user role.

**Roles:** `customer` · `owner` · `driver` · `admin`

**Endpoints:**

```
POST   /api/auth/register          Register a new user
POST   /api/auth/login             Login — returns access + refresh tokens
POST   /api/auth/refresh           Refresh access token
POST   /api/auth/logout            Invalidate refresh token

GET    /api/users/me               Get own profile
PUT    /api/users/me               Update own profile
PATCH  /api/users/me/password      Change password

GET    /api/users                  List all users (admin)
GET    /api/users/:id              Get user by ID (admin)
PATCH  /api/users/:id/role         Change user role (admin)
DELETE /api/users/:id              Delete user (admin)
```

**Token payload:**
```json
{ "id": "69bca45b301a25cf62b6fa10", "email": "user@example.com", "role": "customer" }
```

---

### 3. Restaurant Service — Port 3002

Manages food-specific menu data for stores of type `food`.

**Endpoints:**

```
GET    /api/restaurants                         List restaurants (public)
GET    /api/restaurants/:id                     Single restaurant
GET    /api/restaurants/country/:country        Filter by country
GET    /api/restaurants/cities                  Cities with restaurant counts

POST   /api/restaurants                         Create restaurant (owner/admin)
PUT    /api/restaurants/:id                     Update restaurant (owner/admin)
PATCH  /api/restaurants/:id/status             Change status (admin)
DELETE /api/restaurants/:id                     Delete (owner/admin)

GET    /api/restaurants/:id/menu                Full menu grouped by category
POST   /api/restaurants/:id/menu/categories     Create menu category (owner/admin)
POST   /api/restaurants/:id/menu/items          Create menu item (owner/admin)
PUT    /api/restaurants/:id/menu/items/:itemId  Update menu item (owner/admin)
DELETE /api/restaurants/:id/menu/items/:itemId  Delete menu item (owner/admin)
```

---

### 4. Order Service — Port 3003

The universal order engine. Handles orders for any store type by routing item validation to the appropriate downstream service.

**Endpoints:**

```
POST   /api/orders                                Place order (customer)
GET    /api/orders/my-orders                      Customer's own orders
GET    /api/orders/store/:storeId                 All orders for a store (owner/admin)
GET    /api/orders/store/:storeId/stats           Per-store stats (owner/admin)
GET    /api/orders/:id                            Single order
PATCH  /api/orders/:id/status                    Update status (owner/admin — forward only)
PATCH  /api/orders/:id/assign-driver             Assign driver (admin)
PATCH  /api/orders/:id/cancel                    Cancel order (customer/admin)

GET    /api/orders/admin/orders                   All orders with rich filtering (admin)
GET    /api/orders/admin/stats                    Platform-wide stats + charts (admin)
GET    /api/orders/admin/stats/stores             Per-store revenue breakdown (admin)
PATCH  /api/orders/admin/orders/:id/payment-status  Update payment status (admin)
PATCH  /api/orders/admin/orders/:id/force-cancel    Force cancel any order (admin)
PATCH  /api/orders/admin/orders/:id/status          Override status freely (admin)
```

**Order status lifecycle:**

```
pending -> confirmed -> preparing -> ready -> out_for_delivery -> delivered
       \                                                        /
        ---------------------- cancelled ----------------------
```

**Status rules:**
- Customer: cancel only while `pending` or `confirmed`
- Store owner: move forward only (no backwards)
- Admin: any direction including backwards, force-cancel at any stage except `delivered`

**Pricing formula:**
```
subtotal    = sum(serverPrice x qty)     -- client prices always ignored
deliveryFee = store.deliveryFee          -- 0 for pickup orders
tax         = subtotal x TAX_RATE        -- default 7.5%
total       = subtotal + deliveryFee + tax
```

---

### 5. Store Service — Port 3004

The commercial backbone. Manages cities, top-level store categories, and all store profiles.

**Endpoints:**

```
# Store Categories
GET    /api/store-categories                   All active categories (public)
GET    /api/store-categories/admin/all         All including inactive (admin)
GET    /api/store-categories/:id               Single category
GET    /api/store-categories/slug/:slug        By slug
POST   /api/store-categories                   Create (admin)
PUT    /api/store-categories/:id               Update (admin)
DELETE /api/store-categories/:id               Delete (admin)

# Cities
GET    /api/cities                             All active cities (public)
GET    /api/cities/admin/all                   All including inactive (admin)
GET    /api/cities/:id                         Single city
GET    /api/cities/slug/:slug                  By slug
GET    /api/cities/:id/categories              Categories with per-city store counts  <-- key endpoint
POST   /api/cities                             Create (admin)
PUT    /api/cities/:id                         Update (admin)
DELETE /api/cities/:id                         Delete (admin)

# Stores
GET    /api/stores                             All active stores — filterable (public)
GET    /api/stores/admin/all                   All stores all statuses (admin)
GET    /api/stores/:id                         Single store
GET    /api/stores/slug/:slug                  By slug
GET    /api/stores/city/:cityId                Stores in a city
GET    /api/stores/city/:cityId/category/:categoryId   Stores in city + category  <-- key endpoint
GET    /api/stores/me/stores                   Owner's own stores (authenticated)
POST   /api/stores                             Create (owner/admin)
PUT    /api/stores/:id                         Update (owner/admin)
PATCH  /api/stores/:id/status                  Change status (admin)
DELETE /api/stores/:id                         Delete (owner/admin)
```

**Store status lifecycle:**
```
pending (owner-created) -> active (admin approves) -> suspended -> closed
```

**`GET /api/cities/:id/categories` response:**
```json
{
  "success": true,
  "cityId":   "69bd21c5859bad0292c94352",
  "cityName": "Lagos",
  "data": [
    { "_id": "...", "name": "Food",      "slug": "food",      "icon": "burger", "storeCount": 3 },
    { "_id": "...", "name": "Groceries", "slug": "groceries", "icon": "cart",   "storeCount": 1 }
  ]
}
```

---

### 6. Catalog Service — Port 3005

Manages products for non-food stores. Products are organised into store-specific sub-categories.

**Endpoints:**

```
# Product Sub-Categories (per store)
GET    /api/catalog/categories?storeId=        All sub-categories for a store (public)
GET    /api/catalog/categories/:id             Single sub-category
POST   /api/catalog/categories                 Create (owner/admin)
PUT    /api/catalog/categories/:id             Update (owner/admin)
DELETE /api/catalog/categories/:id             Delete (owner/admin)

# Products
GET    /api/catalog/products                   List with rich filtering (public)
GET    /api/catalog/products/admin/all         All including inactive (admin)
GET    /api/catalog/products/:id               Single product
GET    /api/catalog/products/store/:storeId    Products grouped by sub-category  <-- key endpoint
GET    /api/catalog/products/me/products       Owner's own products
POST   /api/catalog/products                   Create (owner/admin)
PUT    /api/catalog/products/:id               Update (owner/admin)
PATCH  /api/catalog/products/:id/stock         Lightweight stock update (owner/admin)
DELETE /api/catalog/products/:id               Delete (owner/admin)

# Internal (blocked at gateway)
PATCH  /api/catalog/products/internal/order-update   Decrement stock post-order (order-service only)
```

**storeCategory values:**

| Store type | Field value |
|---|---|
| Groceries | `"groceries"` |
| Pharmacy and Beauty | `"pharmacy"` |
| Shops | `"shops"` |

**Correct creation sequence:**
```
1. POST /api/catalog/categories
   { storeId, storeCategory: "pharmacy", name: "Blood Tonic" }
   -> returns categoryId

2. POST /api/catalog/products
   { storeId, storeCategory: "pharmacy", categoryId: "<from step 1>", name: "Astyfer", price: 1200 }
```

**Product query filters:**

| Param | Notes |
|---|---|
| `storeId` | Required for most queries |
| `storeCategory` | `groceries` / `pharmacy` / `shops` |
| `categoryId` | Filter to one sub-category |
| `search` | Full-text on name, description, tags |
| `inStock` | In-stock only |
| `featured` | Featured products only |
| `minPrice` / `maxPrice` | Price range |
| `prescription` | Rx products only |
| `ageRestricted` | Age-restricted products |
| `page` / `limit` | Pagination (max 50) |

---

## Shared Middleware

All six services use the same three middleware classes. Copy each into `src/middleware/` of every service.

### auth.middleware.ts

```ts
export class AuthMiddleware {
  static extractUser(req, res, next): void    // populate req.user — never throws
  static requireAuth(req, res, next): void    // 401 if no user
  static requireAdmin(req, res, next): void   // 403 if not admin
}

export interface AuthRequest extends Request {
  user?: {
    id:    string;   // always "id" — never "userId"
    email: string;
    role:  string;
  };
}

// Named convenience exports
export const authenticate       // extractUser + requireAuth combined
export const requireAdmin
export const requireOwnerOrAdmin
export const optionalAuth
```

### error.middleware.ts

```ts
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  constructor(message: string, statusCode: number)
}

export class ErrorMiddleware {
  static handle(err, req, res, next): void      // global error handler
  static notFound(req, res): void               // 404 for unknown routes
  static asyncHandler(fn: Function): Function   // eliminates try/catch in route handlers
}
```

### validation.middleware.ts

```ts
// Use after express-validator rule chains
export const validate: (req, res, next) => void

export class ValidationMiddleware {
  static handleValidationErrors: (req, res, next) => void
}
```

Usage example:
```ts
router.post(
  '/',
  [
    body('storeId').notEmpty(),
    body('items').isArray({ min: 1 }),
    body('paymentMethod').isIn(['cash', 'card', 'bank_transfer']),
  ],
  validate,
  ErrorMiddleware.asyncHandler(OrderController.createOrder)
);
```

---

## Authentication Flow

```
1. Client -> POST /api/auth/login { email, password }

2. Gateway proxies to user-service (no auth check on /auth/* routes)

3. user-service verifies password hash, issues:
   - accessToken   (JWT, expires in 7d)
   - refreshToken  (JWT, expires in 30d)

4. Client stores both tokens

5. Client -> GET /api/orders/my-orders
   Authorization: Bearer <accessToken>

6. Gateway:
   a. Verifies accessToken signature with JWT_SECRET
   b. Decodes payload: { id, email, role }
   c. Injects into forwarded request:
      x-user-id:    "69bca45b301a25cf62b6fa10"
      x-user-email: "user@example.com"
      x-user-role:  "customer"

7. Downstream service reads req.headers['x-user-id']
   Never re-verifies the token — trusts gateway headers entirely

8. Token expiry -> POST /api/auth/refresh { refreshToken }
   -> user-service issues new accessToken
```

---

## Order Engine

Full execution path for a pharmacy order:

```
POST /api/orders
{
  storeId:  "69bd4ea71160828828a7083d",
  items:    [{ itemId: "69be830581fc1be92a9bda60", quantity: 2 }],
  deliveryType:    "delivery",
  deliveryAddress: { street: "14 Awolowo Rd", city: "Lagos", state: "Lagos State", country: "Nigeria" },
  paymentMethod:   "cash"
}

Step 1 — Fetch store (with retry, up to 3 attempts)
  GET store-service /api/stores/69bd4ea7...
  -> store.category.slug  = "pharmacy-beauty"
  -> store.status         = "active"   <- rejected if not active
  -> store.deliveryFee    = 500
  -> store.minimumOrder   = 1200
  -> store.preparationTime = 20

Step 2 — Resolve item source
  "pharmacy-beauty" !== "food"  ->  ItemSource.CATALOG_SERVICE

Step 3 — Validate items (with retry)
  GET catalog-service /api/catalog/products/store/69bd4ea7...
  Flatten grouped response into productMap keyed by _id
  For each item:
    - product exists in this store  <- 422 if not found
    - inStock = true                <- 422 if out of stock
    - stockCount >= quantity        <- 422 if insufficient stock
    - price = product.price         <- client-provided price completely ignored

Step 4 — Pricing
  subtotal     = 1200 x 2 = 2400
  minimumOrder = 1200     <- 2400 >= 1200, passes
  deliveryFee  = 500
  tax          = 2400 x 0.075 = 180
  total        = 2400 + 500 + 180 = 3080

Step 5 — Persist order
  Order.create({ customerId, storeId, storeType: "pharmacy-beauty", storeName: "...", items, ... })
  -> orderNumber: "FUD-1711022400000-042"

Step 6 — Notify catalog-service (fire-and-forget)
  PATCH catalog-service /api/catalog/products/internal/order-update
  { items: [{ productId, quantity }] }
  -> decrements stockCount, increments totalOrders
  Failures do NOT roll back the order
```

### Retry logic

```ts
axiosGetWithRetry(url, {
  timeoutMs:   8000,   // 8 second timeout per attempt
  maxAttempts: 3,      // up to 3 attempts
})
// Delays:  1s -> 2s -> 3s (linear backoff)
// Retries: 502, 503, 504, ECONNREFUSED, ETIMEDOUT
// Throws:  404, 400, 422, or after max attempts exhausted
```

---

## Data Models

### User (user-service)

```ts
{ _id, name, email, password (hashed), role, phone?, avatar?, isActive, refreshToken?, createdAt, updatedAt }
```

### Store Category (store-service)

```ts
{ _id, name, slug (auto), description, icon (emoji), displayOrder, isActive }
```

### City (store-service)

```ts
{ _id, name, slug, country, state?, coordinates: { latitude, longitude }, coverImage?, isActive, storeCount (auto-updated) }
```

### Store (store-service)

```ts
{
  _id, name, slug, description,
  category: ObjectId -> Category,
  city:     ObjectId -> City,
  ownerId:  string,
  address: { street, district, postalCode },
  coordinates: { latitude, longitude },
  phone?, email?, website?,
  logo?, coverImage?,
  openingHours: [{ day, isOpen, openTime, closeTime }],
  preparationTime, deliveryRadius, minimumOrder, deliveryFee,
  rating, totalRatings, totalOrders,
  status: "pending" | "active" | "suspended" | "closed",
  isVerified, isFeatured
}
```

### Product Sub-Category (catalog-service)

```ts
{ _id, name, description?, storeId, storeCategory, image?, displayOrder, isActive, productCount (auto) }
```

### Product (catalog-service)

```ts
{
  _id, name, description?,
  storeId, ownerId, storeCategory,
  categoryId: ObjectId -> ProductSubCategory,
  price, compareAtPrice,
  sku?, barcode?, unit, quantity,
  images[], thumbnail (auto from images[0]),
  inStock, stockCount (-1 = unlimited),
  requiresPrescription, ageRestricted,
  tags[], isFeatured, isActive, totalOrders
}
```

### Order (order-service)

```ts
{
  _id,
  orderNumber: "FUD-{timestamp}-{random}",
  customerId: string,
  storeId:    string,
  storeType:  "food" | "groceries" | "pharmacy-beauty" | "shops",
  storeName:  string,   // denormalised
  items: [{
    itemId, itemSource: "restaurant-service" | "catalog-service",
    name, price, quantity,
    variant?: { name, price },   // food only
    addOns: [{ name, price }],   // food only
    specialInstructions?, subtotal
  }],
  subtotal, deliveryFee, tax, discount, total,
  deliveryType: "delivery" | "pickup",
  deliveryAddress?: { street, apartment?, landmark?, city, state, country, postalCode?, coordinates?, instructions? },
  driverId?,
  status: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled",
  paymentStatus: "pending" | "paid" | "failed" | "refunded",
  paymentMethod: "credit_card" | "debit_card" | "bank_transfer" | "cash" | "wallet",
  customerNotes?, restaurantNotes?,
  estimatedDeliveryTime?, confirmedAt?, preparingAt?, readyAt?,
  outForDeliveryAt?, deliveredAt?, cancelledAt?, cancellationReason?
}
```

---

## API Quick Reference

### Standard response envelopes

```json
{ "success": true, "data": {} }
{ "success": true, "count": 5, "data": [] }
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 20, "total": 47, "pages": 3 } }
{ "success": false, "message": "Store not found" }
{ "success": false, "message": "Validation failed", "errors": [{ "field": "storeId", "message": "Required" }] }
```

### HTTP status codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation error / bad request |
| 401 | Not authenticated |
| 403 | Authenticated but not authorised |
| 404 | Resource not found |
| 409 | Conflict (duplicate name, resource in use) |
| 422 | Unprocessable (inactive store, out of stock, below minimum order) |
| 503 | Upstream service unreachable |

---

## Docker

### Start all services (development)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Each service mounts its `src/` directory and runs with `nodemon` for hot reload.

### Individual service

```bash
docker build -t fuudie-store-service ./services/store-service
docker run -p 3004:3004 --env-file ./services/store-service/.env fuudie-store-service
```

### Dockerfile pattern (same for all services)

```dockerfile
# Stage 1 - Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 - Runtime (smaller image, non-root user)
FROM node:18-alpine AS runtime
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --only=production
USER nodejs
EXPOSE 3004
HEALTHCHECK CMD wget -qO- http://localhost:3004/health || exit 1
CMD ["node", "dist/index.js"]
```

---

## Deployment — Render

All six services are deployed as Docker-based web services on Render.

### Live URLs

| Service | URL |
|---|---|
| API Gateway | `https://wolt-api-gateway.onrender.com` |
| User Service | `https://wolt-user-service.onrender.com` |
| Restaurant Service | `https://wolt-restaurant-service.onrender.com` |
| Order Service | `https://wolt-order-service.onrender.com` |
| Store Service | `https://wolt-store-service.onrender.com` |
| Catalog Service | `https://wolt-catalog-service.onrender.com` |

### Deploy a service on Render

1. Render dashboard -> **New Web Service**
2. Connect your GitHub repository
3. Set **Root Directory** to `services/<service-name>`
4. Set **Environment** to `Docker`
5. Add all environment variables from the [Environment Variables](#environment-variables) section
6. Click **Create Web Service**

### Deploy order

```
1. user-service
2. store-service
3. restaurant-service
4. catalog-service
5. order-service
6. api-gateway  <- last
```

### Cold starts (free tier)

Free-tier services spin down after 15 minutes of inactivity. The first request returns a `502` for ~30-50 seconds.

**Solutions:**
- The order service has built-in retry logic (3 attempts, 8s timeout, exponential backoff)
- Set up [UptimeRobot](https://uptimerobot.com) free tier to ping each `/health` endpoint every 5 minutes
- Upgrade to Render paid plan ($7/service/month) for always-on services

**Wake services manually:**
```bash
curl https://wolt-store-service.onrender.com/health
curl https://wolt-catalog-service.onrender.com/health
curl https://wolt-order-service.onrender.com/health
```

---

## Inter-Service Communication

All service-to-service calls are synchronous HTTP using Axios. No message queue in Phase 1.

### Communication map

```
order-service  ->  store-service       Validate storeId, get delivery config
order-service  ->  restaurant-service  Validate menu items (food orders)
order-service  ->  catalog-service     Validate products (non-food orders)
order-service  ->  catalog-service     Notify stock decrement (fire-and-forget)
```

### Gateway header injection

```
Client request  ->  Gateway (verifies JWT)  ->  Service
                                injects:
                                  x-user-id:    <userId>
                                  x-user-email: <email>
                                  x-user-role:  <role>
```

### Internal service identification

Services calling each other can include:
```
x-internal-service: order-service
```

Catalog-service uses this header to allow the `/internal/order-update` endpoint that is blocked for all external clients at the gateway.

---

## Database Design

### Why separate databases

Each service has its own MongoDB database to enforce true isolation:
- Schema changes in one service cannot break another
- Services can be scaled and migrated independently
- Each database can be moved to a different technology without affecting others

### Cross-service references

Because services cannot JOIN across databases, cross-service IDs are stored as plain strings:

```ts
// order-service document
{
  storeId:   "69bd4ea71160828828a7083d",  // string, not ObjectId ref
  customerId: "69bca45b301a25cf62b6fa10",  // string, not ObjectId ref
  storeName: "Yaba Bites",                 // denormalised to avoid lookup on every read
  storeType: "pharmacy-beauty",            // denormalised for the same reason
}
```

### MongoDB Atlas databases

```
fuudie-users         <- user-service
fuudie-restaurants   <- restaurant-service
fuudie-orders        <- order-service
fuudie-stores        <- store-service
fuudie-catalog       <- catalog-service
```

You can use a single Atlas cluster with all five databases — only the database name in `MONGO_URI` changes per service.

---

## Error Handling

All errors flow through `ErrorMiddleware.handle` registered as the last middleware:

```ts
// Operational (expected, user-facing)
throw new AppError('Store not found', 404);
throw new AppError('Minimum order is N1,200', 400);
throw new AppError('"Astyfer" is out of stock', 422);

// Programming errors caught by asyncHandler and forwarded to handle()
// -> logged to console, generic 500 sent to client
```

**Validation error response shape:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "storeId",  "message": "storeId is required" },
    { "field": "quantity", "message": "Each item must have a quantity >= 1" }
  ]
}
```

---

## Testing Endpoints

### Health check all services

```bash
curl https://wolt-store-service.onrender.com/health
curl https://wolt-catalog-service.onrender.com/health
curl https://wolt-order-service.onrender.com/health
```

### Place a pharmacy order (real IDs)

```bash
curl -X POST https://wolt-order-service.onrender.com/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "storeId": "69bd4ea71160828828a7083d",
    "items": [
      { "itemId": "69be830581fc1be92a9bda60", "quantity": 2 },
      { "itemId": "69be83e381fc1be92a9bda7e", "quantity": 1 }
    ],
    "deliveryType": "delivery",
    "deliveryAddress": {
      "street": "14 Awolowo Road", "city": "Lagos",
      "state": "Lagos State", "country": "Nigeria"
    },
    "paymentMethod": "cash"
  }'
```

### Confirm order (store owner)

```bash
curl -X PATCH https://wolt-order-service.onrender.com/api/orders/<orderId>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <owner_token>" \
  -d '{ "status": "confirmed" }'
```

See `docs/order-service-api-reference.md` for all endpoints with full request/response examples and real test IDs.

---

## Troubleshooting

### "Store not found or unavailable" on order creation

1. Verify `STORE_SERVICE_URL` is the full Render URL not `localhost:3004`
2. Check store `status` is `"active"` — owner-created stores start as `"pending"`, activate via admin: `PATCH /api/stores/:id/status { "status": "active" }`
3. Wake up store-service: `curl https://wolt-store-service.onrender.com/health`

### "Could not reach catalog service"

1. Verify `CATALOG_SERVICE_URL` env var is set on Render
2. The correct endpoint is `/api/catalog/products/store/:storeId` — not `/api/catalog/products?storeId=`
3. Wake up catalog-service: `curl https://wolt-catalog-service.onrender.com/health`

### "502 Bad Gateway"

Render free tier cold start. Order service retries automatically. If hitting directly, wait 30-50 seconds and retry. See [Cold starts](#cold-starts-free-tier).

### "invalid signature" JWT errors

All services must share identical `JWT_SECRET` and `JWT_REFRESH_SECRET`. A mismatch means tokens from user-service fail verification elsewhere.

### `req.user.userId is undefined`

The field is `id` not `userId`:
```ts
req.user!.id       // correct
req.user!.userId   // undefined — does not exist
```

### TypeScript compilation errors after pulling

```bash
cd services/<service-name>
rm -rf dist/
npm run build
```

---

## Roadmap

- [ ] WebSocket server — real-time order status updates and live driver location
- [ ] Driver service — location tracking, route optimisation, delivery assignment
- [ ] Paystack / Flutterwave payment gateway integration
- [ ] Push notification service via FCM / APNs
- [ ] AI service — Anthropic API for product intelligence and nutrition planning
- [ ] Redis caching for city and category data (high read, low write)
- [ ] Rate limiting on all public endpoints
- [ ] Event-driven architecture with BullMQ for order lifecycle events
- [ ] Full test suite — Jest + Supertest per service
- [ ] Distributed tracing with OpenTelemetry

---

## License

MIT (c) Fuudie 2026