# Ceylon Arena Backend V2

Production-ready Express + TypeScript + MongoDB backend for a gaming event platform.

## Stack
- Node.js
- Express.js (TypeScript)
- MongoDB + Mongoose
- JWT (access + refresh)
- bcryptjs
- multer + Cloudinary (bank slip uploads)
- zod validation

## Project Structure
```text
src/
  app.ts
  server.ts
  config/
    env.ts
    db.ts
    cloudinary.ts
    cors.ts
  constants/
    index.ts
  modules/
    auth/
    users/
    teams/
    events/
    registrations/
    payments/
  middleware/
    auth.middleware.ts
    role.middleware.ts
    validate.middleware.ts
    upload.middleware.ts
    error.middleware.ts
    notFound.middleware.ts
  scripts/
    seedAdmin.ts
  utils/
    ApiError.ts
    ApiResponse.ts
    asyncHandler.ts
    token.ts
    logger.ts
  types/
    auth.types.ts
    express.d.ts
```

## Setup
1. Install dependencies:
```bash
npm install
```
2. Copy env template and fill real values:
```bash
cp .env.example .env
```
3. Run dev server:
```bash
npm run dev
```
4. Build and run production:
```bash
npm run build
npm start
```

## Environment Variables
See `.env.example`.

Required keys:
- `NODE_ENV`
- `PORT`
- `APP_NAME`
- `API_PREFIX`
- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES`
- `JWT_REFRESH_EXPIRES`
- `COOKIE_DOMAIN`
- `COOKIE_SECURE`
- `CLIENT_URL`
- `CORS_ORIGINS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `BCRYPT_SALT_ROUNDS`

Optional tuning keys:
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `MAX_FILE_SIZE_MB`

## Auth Flow
- Login returns access token in response and sets HTTP-only cookies:
  - `accessToken` (short-lived)
  - `refreshToken` (long-lived)
- `POST /auth/refresh` rotates refresh token and issues a new access token.
- `POST /auth/logout` clears refresh token hash in DB and clears cookies.
- `POST /auth/logout-all` (authenticated) invalidates all sessions for current user.
- `GET /auth/me` returns current authenticated user profile.
- Access token is read from cookie first, then `Authorization: Bearer <token>` fallback.

## Role System
- `ADMIN`
  - Can manage users, events, registrations, payments, and view all teams.
- `PLAYER`
  - Team leader account.
  - Can manage own team, own registrations, own payments.

## Entity Relationships
- `User (leader)` -> owns exactly one `Team` (`Team.leaderId` unique).
- `Team` -> many `EventRegistration`.
- `Event` -> many `EventRegistration`.
- `EventRegistration` -> exactly one `Team` + one `Event`.
- `Payment` -> belongs to one `EventRegistration` (+ denormalized `teamId`, `leaderId`, `eventId`).

## Business Workflow

### 1. Team Leader Registration
`POST /api/v1/auth/register`
- Creates:
  - `User` (role `PLAYER`)
  - `Team`
- No event registration and no payment created here.

### 2. Event Registration
`POST /api/v1/registrations`
- Requires authenticated leader.
- Rules enforced:
  - leader has active team
  - event status is `ACTIVE` or `PUBLISHED`
  - registration window is open and not expired
  - team not already registered
- Creates `EventRegistration` with `PENDING_PAYMENT`.

### 3. Payment Submission
`POST /api/v1/payments/submit/:registrationId`
- Requires ownership of registration.
- Uploads slip image to Cloudinary.
- Creates `Payment` with `PENDING` and method `BANK_TRANSFER`.
- Updates registration status to `PAYMENT_SUBMITTED`.

### 4. Admin Payment Review
`PATCH /api/v1/payments/:id/review`
- `APPROVED` -> payment approved + registration `CONFIRMED`
- `REJECTED` -> payment rejected + registration `REJECTED`
- Stores `reviewedBy`, `reviewedAt`, `adminNote`.

## Admin Auto Seed
At startup (`src/scripts/seedAdmin.ts`):
- If `ADMIN_EMAIL` + `ADMIN_PASSWORD` are set and user does not exist -> create admin.
- Logs one of:
  - `Admin seeded successfully`
  - `Admin already exists`

## API Access Matrix

| Route | Method | Public | PLAYER | ADMIN |
|---|---|---:|---:|---:|
| `/api/v1/auth/register` | POST | Yes | No | No |
| `/api/v1/auth/login` | POST | Yes | No | No |
| `/api/v1/auth/refresh` | POST | Yes | No | No |
| `/api/v1/auth/logout` | POST | Yes | No | No |
| `/api/v1/events/public` | GET | Yes | No | No |
| `/api/v1/events/public/:slug` | GET | Yes | No | No |
| `/api/v1/auth/me` | GET | No | Yes | Yes |
| `/api/v1/auth/change-password` | PATCH | No | Yes | Yes |
| `/api/v1/teams/my-team` | GET | No | Yes | Yes |
| `/api/v1/teams/my-team` | PATCH | No | Yes | Yes |
| `/api/v1/events` | GET | No | Yes | Yes |
| `/api/v1/events/:id` | GET | No | Yes | Yes |
| `/api/v1/registrations` | POST | No | Yes | Yes |
| `/api/v1/registrations/my` | GET | No | Yes | Yes |
| `/api/v1/registrations/:id` | GET | No | Yes (own) | Yes |
| `/api/v1/payments/submit/:registrationId` | POST | No | Yes (own) | Yes |
| `/api/v1/payments/my` | GET | No | Yes | Yes |
| `/api/v1/payments/:id` | GET | No | Yes (own) | Yes |
| `/api/v1/users` | GET | No | No | Yes |
| `/api/v1/users/:id` | GET | No | No | Yes |
| `/api/v1/users/:id/role` | PATCH | No | No | Yes |
| `/api/v1/users/:id/status` | PATCH | No | No | Yes |
| `/api/v1/teams` | GET | No | No | Yes |
| `/api/v1/teams/:id` | GET | No | No | Yes |
| `/api/v1/events` | POST | No | No | Yes |
| `/api/v1/events/:id` | PATCH | No | No | Yes |
| `/api/v1/events/:id` | DELETE | No | No | Yes |
| `/api/v1/registrations` | GET | No | No | Yes |
| `/api/v1/registrations/:id/status` | PATCH | No | No | Yes |
| `/api/v1/payments` | GET | No | No | Yes |
| `/api/v1/payments/:id/review` | PATCH | No | No | Yes |
| `/api/v1/payments/:id` | DELETE | No | No | Yes |

## API Reference (Markdown)

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/change-password`

### Users (Admin)
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id/role`
- `PATCH /api/v1/users/:id/status`

### Teams
- `GET /api/v1/teams/my-team`
- `PATCH /api/v1/teams/my-team`
- `GET /api/v1/teams` (Admin)
- `GET /api/v1/teams/:id` (Admin)

### Events
- `GET /api/v1/events/public`
- `GET /api/v1/events/public/:slug`
- `GET /api/v1/events`
- `GET /api/v1/events/:id`
- `POST /api/v1/events` (Admin)
- `PATCH /api/v1/events/:id` (Admin)
- `DELETE /api/v1/events/:id` (Admin, soft delete)

### Registrations
- `POST /api/v1/registrations`
- `GET /api/v1/registrations/my`
- `GET /api/v1/registrations/:id`
- `GET /api/v1/registrations` (Admin)
- `PATCH /api/v1/registrations/:id/status` (Admin)

### Payments
- `POST /api/v1/payments/submit/:registrationId` (`multipart/form-data`, `slip` file)
- `GET /api/v1/payments/my`
- `GET /api/v1/payments/:id`
- `GET /api/v1/payments` (Admin)
- `PATCH /api/v1/payments/:id/review` (Admin)
- `DELETE /api/v1/payments/:id` (Admin, soft delete)

## Sample Request Payloads

### Register leader + team
```json
{
  "fullName": "Nipun Perera",
  "email": "nipun@example.com",
  "password": "StrongPassword123",
  "phone": "+94770000000",
  "address": "Colombo",
  "promoCode": "ARENA10",
  "teamName": "Arena Wolves",
  "primaryGame": "Valorant",
  "leaderInGameId": "wolves_lead_01",
  "members": [
    { "name": "Player Two", "inGameId": "wolves_p2" },
    { "name": "Player Three", "inGameId": "wolves_p3" },
    { "name": "Player Four", "inGameId": "wolves_p4" }
  ]
}
```

### Login
```json
{
  "email": "nipun@example.com",
  "password": "StrongPassword123"
}
```

### Create event (admin)
```json
{
  "title": "Ceylon Arena Valorant Spring Cup",
  "gameName": "Valorant",
  "description": "5v5 knockout tournament.",
  "entryFee": 1000,
  "currency": "LKR",
  "maxTeams": 128,
  "registrationOpenAt": "2026-03-01T00:00:00.000Z",
  "registrationCloseAt": "2026-03-15T23:59:59.000Z",
  "eventStartAt": "2026-03-20T08:00:00.000Z",
  "eventEndAt": "2026-03-25T18:00:00.000Z",
  "status": "PUBLISHED"
}
```

### Register team to event
```json
{
  "eventId": "67cbe6658a2b6ad0f3a12345"
}
```

### Review payment (admin)
```json
{
  "status": "APPROVED",
  "adminNote": "Slip verified with bank statement"
}
```

## Standard Response Format

Success:
```json
{
  "success": true,
  "message": "Team leader registered successfully",
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

## Suggested MongoDB Indexes
Implemented in models:
- `users.email` unique
- `users.role + users.isActive`
- `teams.leaderId` unique
- `teams.teamNameNormalized` unique
- `events.slug` unique
- `events.status + events.registrationCloseAt`
- `registrations.teamId + registrations.eventId` unique
- `registrations.leaderId + createdAt`
- `payments.registrationId + createdAt`
- `payments.leaderId + createdAt`
- `payments.eventId + status`

## Security Controls
- Helmet headers
- CORS allow-list from env
- HTTP-only auth cookies
- bcrypt password hashing
- Refresh token hash stored in DB
- zod request validation
- central error handler
- file type + size restrictions for slip uploads
- ownership checks for player resources
- rate limiting for auth endpoints

## Notes
- Card data is not stored.
- Payment method currently supports only `BANK_TRANSFER`.
- Event deletion is soft delete (`isDeleted = true`).
