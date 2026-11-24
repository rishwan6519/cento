# Store Sparc Ops - Complete API Contract & Field Specification Guide

> **Base URL:** `https://iot-test.metizstoresparc.com/api/v1`  
> **Global Auth Header:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
> **Offline Write Header:** `Idempotency-Key: <UUID>`

---

## 🛠️ PART 0: ARCHITECTURAL PRINCIPLES & RULES FOR EVERY API

### 1. The Server Makes Every Business Decision
The Store Sparc Ops mobile application operates strictly as a presentation and action-queueing client. The mobile app **never computes business logic**. All operational verdicts and state derivations originate from the API:
* **Geofence Verdicts:** The server calculates the exact distance between the store's physical coordinates and the single check-in GPS reading against the store's configured radius, issuing verdicts (`accepted`, `outside_geofence`, `awaiting_manager_confirmation`, `rejected`).
* **Lateness & Compliance Flags:** The server evaluates client check-in times against published roster shift bounds, applying a configurable grace window (default 5 min) and emitting compliance flags (`NOT_ROSTERED`, `EARLY_CHECKIN`, `LATE_CHECKIN`, `AFTER_ROSTER_END`).
* **Shift Swap Eligibility & Cover:** The server determines whether a shift is eligible for swapping (`swap_eligible`), prevents duplicate open swap requests (`409 Conflict`), and identifies eligible team cover.
* **Hours Totals & State:** The server calculates total rostered minutes, recorded minutes, deducts unpaid meal breaks according to jurisdictional rules, and flags day states (`recorded`, `missing_check_out`, `not_recorded`, `on_shift`, `not_worked_yet`).
* **Editable Boundaries:** The server determines which days can be edited and whether a week can be confirmed (`can_confirm`, locked reasons). Confirmed weeks are immutable for staff.
* **Task Role Visibility:** The server filters tasks by caller role; `manager_only` tasks never reach staff members.
* **State-Derived Alerts:** Alerts such as `"hours_to_confirm"` exist dynamically and are automatically purged by the server once the staff member confirms the week.

---

### 2. Sign-In, Identity & SSO (OIDC + PKCE)
* **Authentication Standard:** OpenID Connect (OIDC) Authorization Code Flow with Proof Key for Code Exchange (PKCE) for public mobile clients (zero client secrets).
* **Issuer / Discovery URLs:**
  * **Production:** `https://auth.storesparc.com/.well-known/openid-configuration`
  * **Staging / Test:** `https://iot-test.metizstoresparc.com/api/v1/auth` (or Centelon SSO Test Tenant)
* **Client Registrations (per app & environment):**
  * **Android:** Client ID `storesparc-ops-android`, Redirect URI `com.storesparc.ops://oauth/callback`
  * **iOS:** Client ID `storesparc-ops-ios`, Redirect URI `com.storesparc.ops://oauth/callback`
* **Scopes & Audience:**
  * **Scopes:** `openid profile email offline_access store_ops.read store_ops.write`
  * **Audience (`aud`):** `https://api.storesparc.com/api/v1`
* **Token Lifetimes & Refresh Behaviour:**
  * **Access Token:** Short-lived JWT (15 to 60 minutes) containing claims: `sub` (User ID), `role` (`Staff` | `Store Manager` | `Central admin`), `store_id`, `aud`, and `iss`.
  * **Refresh Token:** Long-lived (30 days with rolling refresh), securely stored in mobile hardware keystore (iOS Keychain / Android EncryptedSharedPreferences).
  * **Revocation & Sign-out:** Calling `POST /api/v1/auth/sign-out` terminates the session server-side, revokes the refresh token, and purges the device's push notification tokens.
* **MFA Triggering & Verification:**
  * If `mfa_required: true` is returned during identity resolution, the client initiates `POST /auth/mfa/start` to obtain a `challenge_id` and masked destination hint, followed by `POST /auth/mfa/verify` with the 6-digit OTP code to issue the access token.
* **Caller Identity:** The authenticated user is extracted exclusively from the JWT Bearer token. **Writes never carry a user ID in the request body.**

---

### 3. Offline Writes & Queueing Strategy
Staff operate in retail basements and shop floors with intermittent signal. Every client mutation is queued locally and dispatched upon reconnecting:
* **Headers & Payload Requirements:**
  * **`Idempotency-Key` (Header):** Unique UUID v4 per user action.
  * **`client_timestamp` (Body):** ISO 8601 timestamp with offset (e.g. `2026-11-24T13:45:00.000+05:30`) recording exactly when the staff member tapped the action.
* **Server Guarantees:**
  1. **Execute Exactly Once:** A replay of an existing key returns the original cached response with HTTP header `X-Idempotent-Replay: true` without re-executing side effects.
  2. **Timestamp Dual-Resolution:** The server uses `client_timestamp` as the true event time for attendance and audit logs, but returns its own authoritative `server_timestamp` in the response.
  3. **Error Partitioning:**
     * **4xx Client Errors (Permanent Rejection):** Cached in the idempotency store. The mobile app presents the error to the user and discards the queued action.
     * **5xx / 429 / Timeouts (Transient Errors):** Never cached in the idempotency store. The mobile client retains the item in its offline queue, applying exponential backoff with jitter before retrying.

---

### 4. Global Error Envelope & HTTP Status Codes
Every API returns a consistent machine-readable JSON error format:
```json
{
  "code": "STRING",         // e.g. "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "VALIDATION_ERROR"
  "message": "STRING",      // Human-readable message
  "field_errors": [
    {
      "field": "STRING",    // Optional field name causing the failure
      "message": "STRING"   // Specific field validation failure
    }
  ]
}
```
* **`400 Bad Request / Validation Error`:** Malformed JSON or invalid parameters.
* **`401 Unauthorized`:** Access token is missing, expired, or cryptographically invalid.
* **`403 Forbidden`:** Authenticated caller's role is not authorized for the requested resource (e.g. Staff invoking manager approvals).
* **`404 Not Found`:** Target entity does not exist or does not belong to the caller's store.
* **`409 Conflict`:** Conflicting business state (e.g. duplicate swap request for the same shift, submitting corrections to an already confirmed week, double check-in).
* **`429 Too Many Requests`:** Rate limit exceeded. Mobile clients must read the `Retry-After` header.
* **`500 Internal Server Error`:** Unhandled server fault. Client queues must retry.

---

### 5. Time & Week Conventions
* **Store-Local Time:** Shifts, availability intervals, and attendance timestamps are store-local. Responses return ISO 8601 strings with explicit timezone offsets alongside the store's IANA timezone (e.g. `2026-11-24T09:00:00+05:30` with `time_zone: "Asia/Kolkata"` or `+11:00` with `time_zone: "Australia/Sydney"`).
* **Week Definition:** Weeks are strictly defined as **Monday (Day 1) to Sunday (Day 7)** following ISO-8601 week definitions. Week parameters are always Monday dates formatted as `YYYY-MM-DD`.

---

### 6. Conventions (Pagination, Versioning, Rate Limits & Base URLs)
* **API Versioning:** URI prefix path versioning `/v1` (e.g. `/api/v1/...`).
* **Pagination Standard:** Offset (`page`, `limit`) and cursor-based (`before`, `limit`) pagination. Responses include `total`, `limit`, `has_more`, and `next_cursor`.
* **Rate Limits:** Standard mobile limit of 100 requests per minute per user; unauthenticated endpoints rate-limited to 20 requests per minute per IP.
* **Environment Base URLs:**
  * **Staging / Test:** `https://iot-test.metizstoresparc.com/api/v1`
  * **Production:** `https://metizstoresparc.com/api/v1`

---

### 💡 Open Questions Resolved (Page 1 - Rules for Every API):
1. **Is the idempotency header `Idempotency-Key`, and how long are keys remembered?**
   * **Answer:** **Yes, the canonical header is `Idempotency-Key`** (with case-insensitive fallback to `idempotency-key`). Keys are remembered for **7 days (168 hours)** in MongoDB via an automated TTL index on `IdempotencyRecord`. This matches the standard weekly roster planning and payroll cycle, allowing offline mobile queues to safely replay un-synced weekend or off-grid shifts without duplicate writes.
2. **Do you return the server timestamp on every write?**
   * **Answer:** **Yes.** Every write endpoint returns `server_timestamp` (or its domain equivalent: `submitted_at`, `decided_at`, `confirmed_at`, `published_at` in ISO 8601 UTC format). This provides the mobile client with an authoritative clock reference, allowing the app to calculate clock skew, calibrate foreground timers, and display verified audit logs.
3. **Which existing services own roster, attendance, tasks and signage: one API or several?**
   * **Answer:** **Single Unified API Gateway (`/api/v1`) backed by Modular Domain Services.**
     * From the mobile client's perspective, **there is exactly ONE API (Single Unified Gateway Base URL `https://.../api/v1`)**. The mobile app never communicates with disparate URLs or fragmented microservice gateways.
     * Behind the unified gateway, domain boundaries are cleanly partitioned into modular services:
       1. *Identity & Store Service:* Auth, MFA, Store Config, Groups (`/auth`, `/store/config`, `/chat/groups`).
       2. *Workforce & Roster Service:* Roster, Swaps, Availability, Weekly Hours (`/roster`, `/swaps`, `/availability`, `/hours`).
       3. *Attendance & Compliance Service:* Check-in, Geofencing, Overtime & Lateness flags (`/attendance`).
       4. *Task Management Service:* Task creation, claiming, completion, and team release (`/tasks`).
       5. *Digital Signage & Promotion Service:* Player heartbeat, current media, screen reporting (`/store/screens`).
       6. *Alerts & Notification Service:* Real-time feed, FCM/APNs push dispatching (`/alerts`, `/push`).

---

# 👤 PART 1: STORE STAFF APIS

---

### 0. Staff / Manager Login (Acquire Auth Token)
* **Method:** `POST`
* **Endpoint:** `/auth/login`
* **Purpose:** Authenticates Staff or Store Manager credentials and returns a JWT Bearer token valid for 7 days.
* **Headers:** `Content-Type: application/json`
* **Request Format:**
```json
{
  "username": "string",
  "password": "string"
}
```
* **Response Format (200 OK):**
```json
{
  "message": "Login successful",
  "token": "string",
  "user_id": "string",
  "display_name": "string",
  "role": "Staff" | "Store Manager" | "Central admin",
  "store": {
    "id": "string",
    "name": "string",
    "locality": "string"
  }
}
```

---

### 1. Resolve Caller Identity (GAP-API-001)
* **Method:** `GET`
* **Endpoint:** `/auth/resolve`
* **Purpose:** Resolves logged-in user profile, role, and assigned store locality.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:** None
* **Response Format (200 OK):**
```json
{
  "user_id": "string",
  "display_name": "string",
  "role": "Staff" | "Store Manager" | "Central admin",
  "store": {
    "id": "string",
    "name": "string",
    "locality": "string"
  },
  "mfa_required": boolean
}
```

---

### 1.1 Start MFA Challenge (GAP-API-001)
* **Method:** `POST`
* **Endpoint:** `/auth/mfa/start`
* **Purpose:** Initiates an MFA verification challenge (SMS/Email OTP).
* **Headers:** `Content-Type: application/json`
* **Request Format:**
```json
{
  "user_id": "string",
  "method": "sms" | "email" | "authenticator"
}
```
* **Response Format (200 OK):**
```json
{
  "challenge_id": "string",
  "method": "string",
  "code_length": number,
  "destination_hint": "string", // e.g. "+91 ****** 4321"
  "expires_in_seconds": number
}
```

---

### 1.2 Verify MFA Challenge (GAP-API-001)
* **Method:** `POST`
* **Endpoint:** `/auth/mfa/verify`
* **Purpose:** Validates the 6-digit MFA challenge code and returns an authenticated session token.
* **Headers:** `Content-Type: application/json`
* **Request Format:**
```json
{
  "challenge_id": "string",
  "code": "string"
}
```
* **Response Format (200 OK):**
```json
{
  "verified": boolean,
  "message": "string",
  "token": "string",
  "user_id": "string",
  "role": "Staff" | "Store Manager" | "Central admin"
}
```

---

### 1.3 Sign Out Session (GAP-API-001)
* **Method:** `POST`
* **Endpoint:** `/auth/sign-out`
* **Purpose:** Ends the user session server-side and unregisters device push notifications.
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Format:**
```json
{
  "device_token": "string"
}
```
* **Response Format (200 OK):**
```json
{
  "success": boolean,
  "message": "string"
}
```

---

### 2. Get Store Configuration (GAP-API-014)
* **Method:** `GET`
* **Endpoint:** `/store/config?store_id={optional_store_id}`
* **Purpose:** Provides geofence radius, lat/long coordinates, trading hours per weekday (minutes from midnight to prefill partial availability), signage rotation, maximum announcement length, and store operational policies.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:** None
* **Response Format (200 OK):**
```json
{
  "store_id": "string",
  "store_name": "string",
  "latitude": number,
  "longitude": number,
  "geofence_radius": number, // in metres, e.g. 150
  "trading_hours": [
    {
      "weekday": number,      // 0 = Sunday, 1 = Monday ... 6 = Saturday
      "open_minutes": number, // minutes from midnight (540 = 09:00)
      "close_minutes": number,// minutes from midnight (1260 = 21:00)
      "is_closed": boolean
    }
  ],
  "signage_rotation": number, // in seconds (e.g. 15)
  "max_announcement_length": number, // character limit (e.g. 500)
  "time_zone": "string",      // IANA format e.g. "Asia/Kolkata" or "Australia/Sydney"
  "whatsapp_group_link": "string",
  "central_whatsapp_link": "string",
  "lateness_grace_minutes": number, // grace window before lateness flag (e.g. 5)
  "break_rules": {
    "meal_break_minutes": number,  // unpaid break duration (e.g. 30)
    "threshold_hours": number,     // shift length triggering meal break (e.g. 5)
    "auto_deduct": boolean
  },
  "availability_deadline": {
    "weekday": number, // 3 = Wednesday
    "time": "string"   // "23:59"
  },
  "currency": "string",        // e.g. "AUD", "INR"
  "currency_symbol": "string"  // e.g. "$", "₹"
}
```

#### 💡 Open Questions Resolved (GAP-API-014):
1. **Which service owns store settings?**
   * **Answer:** **The Central Enterprise Store Identity & Master Data Service owns store settings.**
     * **Authoritative Control:** Central IT and corporate administrators manage store master metadata (Store ID, physical address, master geocoordinates, legal entity name).
     * **Delegated Store Manager Administration:** Store Managers manage store operational parameters (geofence radius between 50m–500m, trading hours, Staff WhatsApp group link, signage rotation, announcement lengths) via the **Store Manager Web Portal** (`PUT /store/config`), persisted in `StoreConfig`.
     * **Zero Hard-Coding in Mobile App:** Adheres to the core design principle: *"these values come from the API, never from app code"*. When trading hours or geofence radii change, all mobile staff devices immediately reflect the new configuration on the next API call without requiring mobile app binary updates.
2. **Are there other per-store values we should read rather than hard-code?**
   * **Answer:** **Yes, the following 8 critical operational attributes are served dynamically by the API:**
     1. `time_zone`: Critical for calculating roster cutoffs, shift starts, and availability deadlines across multi-timezone store networks.
     2. `lateness_grace_minutes` (default: 5m): Configurable grace window for check-in compliance across different store formats.
     3. `break_rules`: Meal break durations and deduction thresholds adhering to regional labor union laws.
     4. `availability_deadline`: Cutoff day and time (Wednesday 23:59) for roster submission.
     5. `whatsapp_group_link` & `central_whatsapp_link`: Dynamic deep links for staff group messaging (GAP-API-010).
     6. `signage_rotation` (default: 15s): Playlist dwell-time interval for in-store digital signage displays.
     7. `max_announcement_length` (default: 500 chars): Validation limit for emergency store audio and digital board broadcasts.
     8. `currency` & `currency_symbol`: Currency formatting for store manager revenue and sales tracking.

---

### 2.1 Update Store Configuration & Geofence
* **Method:** `PUT`
* **Endpoint:** `/store/config`
* **Role Permission:** `Store Manager` | `Central admin`
* **Purpose:** Updates store physical coordinates (latitude, longitude), geofence radius, WhatsApp group link, trading hours, and operational policies.
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Format:**
```json
{
  "latitude": number,
  "longitude": number,
  "geofence_radius": number,
  "trading_hours": [
    {
      "weekday": number,
      "open_minutes": number,
      "close_minutes": number,
      "is_closed": boolean
    }
  ],
  "signage_rotation": number,
  "max_announcement_length": number,
  "whatsapp_group_link": "string",
  "central_whatsapp_link": "string",
  "time_zone": "string",
  "lateness_grace_minutes": number
}
```
* **Response Format (200 OK):**
```json
{
  "message": "string",
  "store_id": "string",
  "store_name": "string",
  "latitude": number,
  "longitude": number,
  "geofence_radius": number,
  "trading_hours": [ ... ],
  "signage_rotation": number,
  "max_announcement_length": number,
  "time_zone": "string",
  "whatsapp_group_link": "string",
  "central_whatsapp_link": "string",
  "lateness_grace_minutes": number,
  "break_rules": { ... },
  "availability_deadline": { ... },
  "currency": "string",
  "currency_symbol": "string"
}
```

---

### 3. Today's Attendance State (GAP-API-004)
* **Method:** `GET`
* **Endpoint:** `/attendance/today`
* **Purpose:** Checks current day's check-in/out status, flags, and worked minutes.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:** None
* **Response Format (200 OK):**
```json
{
  "date": "string (YYYY-MM-DD)",
  "phase": "not_rostered" | "not_checked_in" | "awaiting_manager_confirmation" | "checked_in" | "checked_out",
  "today_shift": {
    "id": "string",
    "start_minutes": number,
    "end_minutes": number
  } | null,
  "checked_in_at": "string (ISO 8601)" | null,
  "checked_out_at": "string (ISO 8601)" | null,
  "location_check": "in_range" | "out_of_range" | "manager_confirmed" | "manager_declined",
  "location_note": "string" | null,
  "flags": [
    {
      "code": "string",
      "label": "string"
    }
  ],
  "worked_minutes": number,
  "manager_note": "string" | null
}
```

---

### 4. Check-in with GPS Location (GAP-API-004)
* **Method:** `POST`
* **Endpoint:** `/attendance/check-in`
* **Purpose:** Submits check-in action with single foreground GPS reading. If outside store radius, queues manual confirmation to manager.
* **Headers:**
  * `Authorization: Bearer <token>`
  * `Idempotency-Key: string (UUID)`
  * `Content-Type: application/json`
* **Request Body:**
```json
{
  "store_id": "string",
  "client_timestamp": "string (ISO 8601)",
  "location_reading": {
    "latitude": number,
    "longitude": number,
    "accuracy": number, // in metres
    "time": "string (ISO 8601)"
  },
  "manual_confirmation_requested": boolean
}
```
* **Response Format (200 OK):**
```json
{
  "verdict": "accepted" | "outside_geofence" | "awaiting_manager_confirmation" | "rejected",
  "server_timestamp": "string (ISO 8601)",
  "message": "string",
  "phase": "checked_in" | "not_checked_in" | "awaiting_manager_confirmation",
  "flags": [
    {
      "code": "string",
      "label": "string"
    }
  ]
}
```

---

### 5. Check-out (GAP-API-004)
* **Method:** `POST`
* **Endpoint:** `/attendance/check-out`
* **Purpose:** Completes shift, calculates total worked minutes.
* **Headers:**
  * `Authorization: Bearer <token>`
  * `Idempotency-Key: string (UUID)`
* **Request Body:**
```json
{
  "client_timestamp": "string (ISO 8601)"
}
```
* **Response Format (200 OK):**
```json
{
  "verdict": "accepted",
  "server_timestamp": "string (ISO 8601)",
  "message": "string",
  "worked_minutes": number,
  "phase": "checked_out"
}
```

---

### 6. Get My Published Shifts (GAP-API-002)
* **Method:** `GET`
* **Endpoint:** `/roster/published?week_start=YYYY-MM-DD`
* **Purpose:** Staff views their own published shifts. Unpublished/draft weeks return an empty shifts array.
* **Query Parameters:** `week_start=YYYY-MM-DD` (Monday)
* **Response Format (200 OK):**
```json
{
  "store_id": "string",
  "week_start": "string (YYYY-MM-DD)",
  "shifts": [
    {
      "id": "string",
      "date": "string (YYYY-MM-DD)",
      "start_minutes": number,
      "end_minutes": number,
      "swap_eligible": boolean
    }
  ]
}
```

---

### 7. Staff Availability (GAP-API-006)
* **Get Week Availability:** `GET /availability?week_start=YYYY-MM-DD`
* **Get Month Availability:** `GET /availability?month=YYYY-MM`
* **Submit Week Availability:** `POST /availability`
* **Submit Month Days Off:** `POST /availability`
* **Headers:** `Idempotency-Key: string (UUID)`, `Authorization: Bearer <token>`
* **Response Format (GET Week 200 OK):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "editable": boolean,
  "locked_reason": "string" | null,
  "submitted_at": "string (ISO 8601)" | null,
  "days": [
    {
      "date": "string (YYYY-MM-DD)",
      "status": "available" | "partial" | "unavailable",
      "from": number | null,
      "to": number | null,
      "note": "string" | null
    }
  ]
}
```
* **Response Format (GET Month 200 OK):**
```json
{
  "month": "string (YYYY-MM)",
  "submitted_at": "string (ISO 8601)" | null,
  "days": [
    {
      "date": "string (YYYY-MM-DD)",
      "day_off": boolean,
      "editable": boolean,
      "locked_reason": "string" | null
    }
  ]
}
```
* **Request Body (Submit Week):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "days": [
    {
      "date": "string (YYYY-MM-DD)",
      "status": "available" | "partial" | "unavailable",
      "from": number,
      "to": number,
      "note": "string"
    }
  ]
}
```
* **Request Body (Submit Month Days Off):**
```json
{
  "month": "string (YYYY-MM)",
  "days_off": [
    "string (YYYY-MM-DD)"
  ]
}
```

---

### 8. Shift Swaps (GAP-API-003)
* **List My Swaps:** `GET /swaps`
* **Request a Swap:** `POST /swaps`
* **Withdraw a Swap:** `POST /swaps/{id}/withdraw`
* **Request Body (POST /swaps):**
```json
{
  "shift_id": "string",
  "client_timestamp": "string (ISO 8601)",
  "reason": "string (optional)"
}
```
* **Response Format (POST /swaps 200 OK):**
```json
{
  "id": "string",
  "shift_id": "string",
  "status": "pending" | "approved" | "declined" | "withdrawn",
  "submitted_at": "string (ISO 8601)",
  "message": "string"
}
```
* **Response Format (POST /swaps/{id}/withdraw 200 OK):**
```json
{
  "id": "string",
  "status": "withdrawn",
  "message": "string"
}
```

---

### 9. Task Management for Staff (GAP-API-007)
* **List Tasks:** `GET /tasks` (Manager-only tasks are automatically filtered out for staff)
* **Claim Task:** `POST /tasks/{id}/claim`
* **Complete Task:** `POST /tasks/{id}/complete`
* **Release Task:** `POST /tasks/{id}/release`
* **Response Format (GET /tasks):**
```json
{
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "category": "group" | "priority" | "role_specific" | "manager_only",
      "note": "string" | null,
      "role_label": "string" | null,
      "due": {
        "date": "string (YYYY-MM-DD)",
        "time": "string (HH:mm)" | null
      } | null,
      "assignee_name": "string" | null,
      "assigned_to_me": boolean,
      "completed_by": "string" | null,
      "completed_at": "string (ISO 8601)" | null,
      "can_claim": boolean,
      "can_complete": boolean,
      "can_release": boolean,
      "created_by": "string",
      "status": "open" | "claimed" | "completed"
    }
  ]
}
```

---

### 10. Weekly Hours & Corrections (GAP-API-005)
* **Get Week Hours:** `GET /hours?week_start=YYYY-MM-DD`
* **Response Format (GET /hours 200 OK):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "status": "in_progress" | "needs_confirmation" | "confirmed",
  "rostered_minutes": number,
  "recorded_minutes": number,
  "can_confirm": boolean,
  "confirmed_at": "string (ISO 8601)" | null,
  "corrections_pending": boolean,
  "days": [
    {
      "date": "string (YYYY-MM-DD)",
      "rostered_shift": {
        "id": "string",
        "start_minutes": number,
        "end_minutes": number
      } | null,
      "state": "recorded" | "missing_check_out" | "not_recorded" | "on_shift" | "not_worked_yet",
      "recorded_start": number | null,
      "recorded_end": number | null,
      "editable": boolean,
      "correction": {
        "start": number,
        "end": number,
        "status": "pending" | "approved" | "declined"
      } | null
    }
  ]
}
```
* **Submit Corrections or Confirm:** `POST /hours`
* **Request Body (POST /hours):**
```json
{
  "action": "submit_corrections" | "confirm_week",
  "week_start": "string (YYYY-MM-DD)",
  "corrections": [
    {
      "date": "string (YYYY-MM-DD)",
      "start": number,
      "end": number
    }
  ]
}
```
* **Response Format (POST /hours 200 OK):**
```json
{
  "status": "corrections_submitted" | "confirmed",
  "confirmed_at": "string (ISO 8601)" | null,
  "message": "string",
  "week_start": "string"
}
```

---

### 11. Alerts Feed & Lifecycle (GAP-API-008)
* **List Alerts Feed:** `GET /alerts?page=1&limit=20&unread_only=false&category={category}&before={ISO_TIMESTAMP}`
* **Mark Alert Read:** `POST /alerts/{id}/read`
* **Mark All Alerts Read:** `POST /alerts/read-all`
* **Broadcast Alert / Store Announcement:** `POST /alerts` *(Store Manager & Central Admin only)*

#### Query Parameters (`GET /alerts`):
* `page`: integer (default: 1)
* `limit`: integer (default: 20, max: 100)
* `unread_only`: boolean (`true` | `false`, default: `false`)
* `category`: string (optional filter by category)
* `before`: string (cursor ISO 8601 timestamp for cursor-based infinite scroll)

#### Staff Categories in Use:
1. `swap_decided`: Raised when Store Manager approves or declines a shift swap request.
2. `task_assigned`: Raised when a task is directly assigned to the caller.
3. `priority_task`: Raised when a high-priority unassigned task is created for the store team.
4. `availability_due`: State-derived alert reminding staff to submit next week's availability before the Wednesday 23:59 deadline.
5. `hours_to_confirm`: State-derived alert when a completed week requires staff confirmation. Automatically cleared when the week is confirmed (`status: "confirmed"`).
6. `check_in_outcome`: Raised when Store Manager approves or declines a manual check-in request or location dispute.
7. `store_announcement`: Broadcasted by Store Manager to all store staff members.
8. `roster_published`: Broadcasted when Store Manager publishes the shift roster for an upcoming week.

#### Response Format (`GET /alerts` 200 OK):
```json
{
  "unread_count": number,
  "total": number,
  "page": number,
  "limit": number,
  "has_more": boolean,
  "next_cursor": "string (ISO 8601)" | null,
  "alerts": [
    {
      "id": "string",
      "category": "swap_decided" | "task_assigned" | "priority_task" | "availability_due" | "hours_to_confirm" | "check_in_outcome" | "store_announcement" | "roster_published",
      "title": "string",
      "body": "string",
      "read": boolean,
      "target_screen": "swaps" | "tasks" | "hours" | "availability" | "attendance" | "roster" | "announcements" | null,
      "target_argument": "string" | null,
      "created_at": "string (ISO 8601)"
    }
  ]
}
```

#### Response Format (`POST /alerts/{id}/read` 200 OK):
```json
{
  "id": "string",
  "read": true,
  "unread_count": number,
  "message": "string"
}
```

#### Response Format (`POST /alerts/read-all` 200 OK):
```json
{
  "read": true,
  "unread_count": 0,
  "marked_count": number,
  "message": "string"
}
```

#### Request Format (`POST /alerts`):
```json
{
  "category": "store_announcement" | "priority_task",
  "title": "string",
  "body": "string",
  "target_screen": "announcements" | "tasks" | "roster",
  "target_argument": "string" | null,
  "user_ids": [
    "string"
  ]
}
```

#### Response Format (`POST /alerts` 200 OK):
```json
{
  "category": "string",
  "recipients_count": number,
  "message": "string"
}
```

#### 💡 Open Questions Resolved (GAP-API-008):
1. **Pull feed, push payloads, or both?**
   * **Answer:** **Both (Hybrid Architecture)**.
     * **Push Payloads (APNS / FCM via `/push/register`):** Used for real-time alerting when the app is in the background or killed. Carries lightweight metadata (`badge`, `alert_id`, `category`, `target_screen`, `target_argument`, `title`, `body`) enabling instant deep-linking upon notification tap.
     * **Pull Feed (`GET /alerts`):** The authoritative source of truth. Polled on app resume/foregrounding and notification screen open. Guarantees 100% synchronization, accurate unread badge count, and dynamically purges state-cleared alerts (e.g. "hours to confirm" disappears once confirmed).
2. **How are target screens and arguments encoded, and is the feed paged?**
   * **Answer:**
     * **Target Screen & Argument Encoding:** `target_screen` is a structured string enum matching the mobile route hierarchy (`"swaps"`, `"tasks"`, `"hours"`, `"availability"`, `"attendance"`, `"roster"`, `"announcements"`). `target_argument` is the entity identifier (e.g. `taskId`, `shiftId`, or `weekStart` like `"2026-11-23"`). Mobile routers unpack this directly via `Navigator.pushNamed(context, alert.target_screen, arguments: alert.target_argument)`.
     * **Pagination:** The feed is fully cursor and offset paged via query parameters `page=1&limit=20` or cursor `before=ISO_TIMESTAMP`. The response includes `has_more` and `next_cursor` alongside the global `unread_count`.

---

### 12. Push Token Registration & Messaging Architecture (GAP-API-009)
* **Register Device Push Token:** `POST /push/register`
* **Unregister Device Push Token:** `POST /push/unregister` *(also sent automatically during sign-out via `/auth/sign-out`)*

#### Request Format (`POST /push/register`):
* **Headers:** `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`, `Content-Type: application/json`
```json
{
  "token": "string",
  "platform": "Android" | "iOS",
  "app_id": "com.storesparc.ops",
  "environment": "production" | "staging" | "sandbox"
}
```

#### Response Format (`POST /push/register` 200 OK):
```json
{
  "registered": true,
  "token": "string",
  "platform": "Android" | "iOS",
  "app_id": "string",
  "environment": "production" | "staging" | "sandbox",
  "message": "string"
}
```

#### Request Format (`POST /push/unregister`):
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
```json
{
  "token": "string"
}
```

#### Response Format (`POST /push/unregister` 200 OK):
```json
{
  "unregistered": true,
  "token": "string",
  "message": "string"
}
```

#### 📲 Unified Push Notification Payload Schema (FCM & APNs)
The server constructs a single unified push envelope. The `data` block maintains **100% attribute parity** with the `GET /alerts` feed:
```json
{
  "notification": {
    "title": "Shift Swap Approved",
    "body": "Your shift swap request for 2026-11-25 was approved by John Smith."
  },
  "data": {
    "alert_id": "string (MongoDB ObjectId)",
    "category": "swap_decided" | "task_assigned" | "priority_task" | "availability_due" | "hours_to_confirm" | "check_in_outcome" | "store_announcement" | "roster_published",
    "target_screen": "swaps" | "tasks" | "hours" | "availability" | "attendance" | "roster" | "announcements",
    "target_argument": "string" | null,
    "created_at": "string (ISO 8601)",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "channelId": "storesparc_alerts"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "badge": 1,
        "sound": "default",
        "category": "swap_decided",
        "contentAvailable": true
      }
    }
  }
}
```

#### 💡 Open Questions Resolved (GAP-API-009):
1. **FCM for both platforms, or APNs directly for iOS? Who owns the Firebase project?**
   * **Answer:**
     * **FCM for both platforms (Cross-Platform Unified Messaging):** We use Firebase Cloud Messaging (FCM) as the unified transport for both Android and iOS. The mobile client utilizes the cross-platform Firebase Messaging Flutter / React Native library. For iOS, Firebase forwards payloads to Apple Push Notification service (APNs) using the Apple APNs Authentication Key (`.p8`) registered in the Firebase Console. This eliminates duplicate backend notification pipelines while preserving native iOS background wakes and badge counts.
     * **Direct APNs Readiness:** For zero-third-party requirements or VoIP background pushes, the `PushDevice` collection records the `platform` (`'iOS'`) and `environment` (`'sandbox'` vs `'production'`), enabling direct HTTP/2 APNs dispatching if desired.
     * **Firebase Project Ownership:** The Firebase project and Google Cloud Console account are owned and maintained centrally by the **Central Store Sparc Engineering / Corporate IT team**. Stores and store managers never manage cloud credentials. Central IT provisions the `google-services.json` (Android), `GoogleService-Info.plist` (iOS), and provides the server Google Service Account credential (`FIREBASE_SERVICE_ACCOUNT_KEY`).
2. **What does a push payload carry, and does it match the alerts feed?**
   * **Answer:**
     * **Push Payload Content:** The push payload carries lightweight presentation metadata (`notification.title`, `notification.body`), deep-link routing data (`data.target_screen`, `data.target_argument`), entity identification (`data.alert_id`, `data.category`), and badge counting (`apns.payload.aps.badge`).
     * **100% Parity with Alerts Feed:** The keys in the `data` block (`alert_id`, `category`, `target_screen`, `target_argument`, `created_at`) correspond 1:1 with the items returned by `GET /alerts`. When a user taps a background push notification, the mobile router navigates to the exact same screen that would open if they tapped that alert inside the in-app notification center.

---

### 13. Chat & Groups (GAP-API-010)
* **Method:** `GET`
* **Endpoint:** `/chat/groups` *(alias: `/groups`)*
* **Purpose:** Returns the store-specific and central WhatsApp group deep links for staff communication.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:** None
* **Response Format (200 OK):**
```json
{
  "groups": [
    {
      "id": "string",
      "name": "string",
      "kind": "store" | "Central",
      "whatsapp_deep_link": "string (URL e.g. https://chat.whatsapp.com/...)",
      "description": "string"
    }
  ]
}
```

#### 💬 Architecture & Deep Linking Mechanics:
* **No In-App Chat:** The app does not implement an internal chat engine. Tapping a group card triggers `launchUrl(Uri.parse(group.whatsapp_deep_link), mode: LaunchMode.externalApplication)`.
* **Universal Deep Links:** Links beginning with `https://chat.whatsapp.com/...` are automatically captured by mobile OS Universal Links / Android App Links to open the native WhatsApp application.
* **No Separate Request Inbox:** Swap requests and attendance correction statuses already display on the Roster (`/swaps`) and Hours (`/hours`) screens, eliminating the need for a separate messaging request inbox.

#### 💡 Open Questions Resolved (GAP-API-010):
1. **Do the WhatsApp links come from an API, or are they set up per store somewhere else?**
   * **Answer:** **The WhatsApp links strictly come from the API (Dynamic Store Configuration).**
     * **API Delivery:** Delivered dynamically via `GET /chat/groups` (and `GET /store/config`).
     * **Per-Store Configuration:** Configured per store by Store Managers through the **Store Manager Web Portal Settings** (`src/app/store_user/SettingsView.tsx`), which saves via `PUT /store/config` (`whatsAppGroupLink`).
     * **Central Group Link:** Maintained centrally by Central Admins in `StoreConfig.centralWhatsAppLink`.
     * **Zero Hard-Coding:** Adheres strictly to the PRD architectural decision: *"Area 13; nothing per-store is hard-coded in the app: Store settings come from the API"*.

---

### 14. Store Screens & Playback Status (GAP-API-011, GAP-API-012, GAP-SM-011)
* **List Store Screens:** `GET /store/screens`
* **Get Single Screen Playback Detail:** `GET /store/screens/{id}` *(alias: `/store/screens/{id}/current`)*
* **Report Screen Offline:** `POST /store/screens/{id}/report-offline`
* **Headers:** `Authorization: Bearer <token>`

#### Response Format (`GET /store/screens` 200 OK):
```json
{
  "screens": [
    {
      "id": "string",
      "store_id": "string",
      "name": "string",
      "zone": "entrance" | "window" | "registers" | "aisles",
      "online": boolean,
      "what_it_is_showing": "string" | null,
      "is_playing": "string",
      "kind_of_content": "video" | "live_offer" | "announcement" | "nothing",
      "content_type": "video" | "live_offer" | "announcement" | "nothing",
      "offline_since": "string (ISO 8601)" | null,
      "reported_at": "string (ISO 8601)" | null,
      "reported_by": "string" | null
    }
  ]
}
```

#### Response Format (`GET /store/screens/{id}` 200 OK - GAP-API-012):
```json
{
  "id": "string",
  "store_id": "string",
  "name": "string",
  "zone": "entrance" | "window" | "registers" | "aisles",
  "online": boolean,
  "what_it_is_showing": "string" | null,
  "is_playing": "string",
  "kind_of_content": "video" | "live_offer" | "announcement" | "nothing",
  "content_type": "video" | "live_offer" | "announcement" | "nothing",
  "offline_since": "string (ISO 8601)" | null,
  "reported_at": "string (ISO 8601)" | null,
  "reported_by": "string" | null,
  "current_item": {
    "kind": "video" | "live_offer" | "announcement" | "nothing",
    "title": "string",
    "detail": "string",
    "duration_seconds": number,
    "started_at": "string (ISO 8601)",
    "media_url": "string (Signed URL)" | null,
    "thumbnail_url": "string" | null
  }
}
```

#### Report Offline Screen Format (`POST /store/screens/{id}/report-offline`):
* **Headers:** `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
* **Response Format (200 OK):**
```json
{
  "id": "string",
  "store_id": "string",
  "name": "string",
  "online": false,
  "reported_at": "string (ISO 8601)",
  "reported_by": "string",
  "message": "string"
}
```

#### 💡 Media Authorization & In-App Mirroring Architecture (GAP-API-012):
1. **Sample Visuals Mirror (Phase 1 Baseline):**
   * The mobile app renders a simulated mirroring card based on `current_item.kind` and `current_item.title`, displaying a running progress bar synchronized to `current_item.duration_seconds` and `current_item.started_at`. This provides staff with zero-lag awareness of in-store visual playback without heavy video streaming overhead.
2. **Full Live Video / Image Mirroring (Phase 2):**
   * **Media URL Provisioning & Authorization:**
     * The `media_url` is provisioned as an HMAC-signed CDN URL (e.g. `https://cdn.metizstoresparc.com/media/promo.mp4?token=...&expires=...`) with short-term expiry (15–60 minutes).
     * For internal media streaming routes, the mobile player transmits the standard `Authorization: Bearer <token>` in the HTTP streaming request header (`httpHeaders` in Flutter `video_player` / React Native Video).
     * Local device caching (`ETag` and `Cache-Control: public, max-age=86400`) ensures repetitive 15-second promo loops do not re-consume cellular data.

#### 💡 Open Questions Resolved (GAP-API-011):
1. **Is the Store Promotion Platform the source, and in which environments?**
   * **Answer:**
     * **Primary Source of Truth:** Yes, the Store Promotion Platform (CMS & Signage Runtime) is the authoritative source. Hardware players (Raspberry Pis, Android TV signage boxes, Tizen displays) send 30-second heartbeats and current playback telemetry (`DeviceCurrentPlaying`, `PiStatus`, `Device`) to the Promotion Platform backend.
     * **Environments:**
       * **Staging / Test:** Connected to the Test Promotion Platform (`https://iot-test.metizstoresparc.com`), aggregating virtual emulator screens and staging Pi players running test playlists.
       * **Production:** Connected to the Live Production Promotion Platform (`https://metizstoresparc.com`), aggregating physical in-store commercial signage displays.
2. **Should the app poll, or will status changes be pushed? Is the zone list fixed?**
   * **Answer:**
     * **Status Synchronization (Hybrid Polling + Selective Push):**
       * **Periodic Polling:** Playlists rotate media every 10–30 seconds. Pushing every minor playback transition over FCM/APNs would exhaust battery, push quotas, and spam mobile clients. Therefore, the mobile app performs lightweight polling (30–60s interval) only when the Screens tab is actively open in the foreground, combined with pull-to-refresh.
       * **Selective Critical Pushes:** When a screen transitions to offline for >10 minutes or is reported offline by staff, a high-priority push notification (`priority_task` alert) is immediately dispatched to the Store Manager.
     * **Fixed Physical Zone List:**
       * **Yes, the 4 retail zones are fixed for Phase 1 mobile layout:** `"entrance"`, `"window"`, `"registers"`, and `"aisles"`. The mobile UI tabs/groups screens into these 4 physical locations for rapid store walk-through verification.
       * **Extensibility:** The backend enum gracefully defaults any unknown zone tags to `"aisles"`, preserving UI stability as stores add custom spatial tags in future phases.

---

# 👔 PART 2: STORE MANAGER APIS

---

### 1. Store Dashboard (GAP-SM-002, GAP-SM-004)
* **Method:** `GET`
* **Endpoint:** `/store/dashboard`
* **Purpose:** Aggregates real-time store metrics (sales sample, live attendance, approvals queue, next week roster planning, store tasks, screen hardware health, scheduled announcements).
* **Headers:** `Authorization: Bearer <token>` (Role: `Store Manager` or `Central admin`)
* **Query Parameters:**
  * `store_id` (string, optional): Allows `Central admin` callers to view any store's dashboard. For `Store Manager`, defaults to the manager's assigned `storeId`.
* **Response Format (200 OK):**
```json
{
  "as_of": "string (ISO 8601 UTC)",
  "sales": {
    "amount": number,
    "currency": "string (e.g. INR, AUD, USD)",
    "comparison": "up" | "down" | "flat",
    "percent": number,
    "compared_against": "string (e.g. last_week_same_day)",
    "is_sample": boolean // true in Phase 1 (PRD review finding D5)
  },
  "attendance": {
    "checked_in": number,
    "rostered_today": number,
    "manual_check_ins_waiting": number,
    "awaited": [
      {
        "user_id": "string",
        "name": "string",
        "rostered_start": number, // minutes from midnight, e.g. 540 = 09:00
        "flag": "LATE" | "EXPECTED_SOON" | null // computed by server using lateness grace window
      }
    ]
  },
  "approvals": {
    "waiting": number,
    "flagged": number,
    "oldest_submitted_at": "string (ISO 8601 UTC)" | null
  },
  "next_week_roster": {
    "week_start": "string (YYYY-MM-DD)",
    "published": boolean,
    "staff_not_rostered": number,
    "coverage_warnings": number
  },
  "tasks": {
    "open": number,
    "unassigned": number,
    "unclaimed_priority": number
  },
  "screens": {
    "live": number,
    "total": number,
    "offline": number
  },
  "announcements": {
    "scheduled": number,
    "next_scheduled_for": "string (ISO 8601 UTC)" | null
  }
}
```

#### 💡 Open Questions Resolved (GAP-SM-002, GAP-SM-004):
1. **Is there a sales (POS) feed in Phase 1, and which period is the comparison against? The PRD puts sales in Phase 2 (review finding D5).**
   * **Answer:**
     * **Phase 1 Status:** There is **NO live POS sales integration in Phase 1**. Per PRD review finding D5, live POS adapter ingestion is scheduled for Phase 2.
     * **API Behavior:** The server explicitly returns `"is_sample": true` on the `sales` object. The mobile app renders the label *"Sample Data"* (or an info badge) next to the revenue tile so store managers are informed that sales numbers are illustrative until POS integration goes live.
     * **Comparison Baseline:** The comparison baseline is **`"last_week_same_day"`** (comparing today's cumulative sales to the exact same weekday and hour of the preceding week). This eliminates artificial variance caused by weekend vs weekday retail traffic patterns.
2. **Will the manager's dashboard and Central's view of the same store read one source? The prototype showed two different sets of numbers for one store (review finding A2).**
   * **Answer:**
     * **Yes, absolutely ONE authoritative source of truth.** Both the Store Manager mobile app (`GET /api/v1/store/dashboard`) and Central Web Portal (`GET /api/v1/store/dashboard?store_id=...`) invoke the exact same aggregation query against the primary operational MongoDB collections (`AttendanceRecord`, `RosterShift`, `ApprovalRequest`, `StoreTask`, `Device`).
     * **Root Cause of Finding A2:** The prototype discrepancy occurred because Central previously queried an asynchronous overnight batch data warehouse (24-hour lag), while the manager prototype read from mock in-memory state.
     * **Resolution:** In Store Sparc Ops v1, both views query the **same Operational Data Store (ODS)** in real-time, guaranteeing 100% data and numerical parity across Central and Store Manager views.
3. **How is lateness calculated for awaited staff?**
   * **Answer:** The server compares the current store-local time against `rostered_start + lateness_grace_minutes` (configured in `StoreConfig`, default 5 minutes). If current time exceeds start plus grace, the server returns `"flag": "LATE"`. If within 15 minutes before shift start, it returns `"flag": "EXPECTED_SOON"`. The client never computes lateness; it displays the badge only when the API provides a non-null flag.

---

### 2. Approvals Queue (GAP-SM-003, GAP-SM-004, GAP-SM-005)
* **List Approvals:** `GET /store/approvals`
* **Response Format (GET):**
```json
{
  "pending": [
    {
      "id": "string",
      "kind": "shift_swap" | "attendance_correction" | "manual_checkin",
      "requester_id": "string",
      "requester_name": "string",
      "summary": "string",
      "detail": object,
      "submitted_at": "string (ISO 8601)",
      "status": "pending",
      "compliance_flag": {
        "flagged": boolean,
        "reason": "string"
      },
      "decline_reasons": [ "string" ]
    }
  ],
  "decided": [ ... ]
}
```

* **Decide Approval (Approve / Decline / Confirm):** `POST /store/approvals/{id}/decide`
* **Headers:** `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
* **Request Body:**
```json
{
  "approve": boolean,           // Or "confirm": true/false (for manual check-in)
  "reason": "string",          // Required when declining; MUST match one of the item's decline_reasons
  "client_timestamp": "string (ISO 8601 UTC)"
}
```
* **Response Format (200 OK):**
```json
{
  "id": "string",
  "kind": "shift_swap" | "attendance_correction" | "manual_checkin",
  "status": "approved" | "declined",
  "decided_at": "string (ISO 8601 UTC)",
  "decided_by": "string",
  "decision_reason": "string" | null,
  "message": "string"
}
```

#### 💡 Open Questions Resolved (GAP-SM-003, GAP-SM-004, GAP-SM-005):
1. **What makes an item flagged, and what reason text comes with the flag? (Review finding A1)**
   * **Answer:**
     * The server evaluates business and compliance boundaries at submission time and sets `compliance_flag: { flagged: true, reason: "..." }`.
     * **Specific Trigger Conditions & Reason Texts by Kind:**
       * **`shift_swap`**:
         * *Clopening / Rest Break Breach:* Turnaround between shifts $< 11$ hours $\rightarrow$ `"Turnaround under 11h (Clopening risk)"`.
         * *Short Notice:* Requested within 24 hours of shift start $\rightarrow$ `"Short notice: Swap requested less than 24h prior to shift start"`.
         * *Role/Skill Mismatch:* Requester shift requires certified skill (e.g. Keyholder) missing from replacement $\rightarrow$ `"Skill mismatch: Missing required certification"`.
         * *Overtime Threshold:* Covering peer will exceed 38h/40h weekly contract hours $\rightarrow$ `"Overtime risk: Replacement staff exceeds weekly contract limit (38h)"`.
       * **`attendance_correction`**:
         * *Out of Hours:* Claimed hours extend beyond store trading hours $\rightarrow$ `"Claimed hours extend past store trading close"`.
         * *Roster Discrepancy:* Variance between claimed hours and roster $> 60$ minutes $\rightarrow$ `"High variance: Discrepancy against rostered shift exceeds 60m"`.
         * *Late Submission:* Submitted after weekly payroll cutoff $\rightarrow$ `"Late submission: Prior week payroll cutoff exceeded"`.
       * **`manual_checkin`**:
         * *Out of Geofence:* Reading $> 150$m from store $\rightarrow$ `"Location mismatch: [X]m outside store geofence"`.
         * *Unscheduled Attendance:* No published shift for user today $\rightarrow$ `"Not rostered: No scheduled shift for today"`.
         * *GPS Unavailable:* GPS disabled or low accuracy ($> 200$m) $\rightarrow$ `"GPS unavailable / Low accuracy"`.
2. **Where do the decline reasons come from, and are they fixed per kind? (Review finding D7)**
   * **Answer:**
     * **Server-Provided Catalogs:** Decline reasons originate strictly from the server in `item.decline_reasons`. The mobile app **never hardcodes decline strings**.
     * **Fixed & Category-Specific per Kind:** Yes. To resolve review finding D7 (where `"Would exceed hours limit"` was mistakenly shown on manual check-ins), decline reasons are now strictly partitioned:
       * **`shift_swap`**:
         1. `"Insufficient coverage on shift"`
         2. `"Skill / role requirement not met"`
         3. `"Short notice / within 24 hours of shift"`
         4. `"Overtime threshold breach (exceeds contract hours)"`
       * **`attendance_correction`**:
         1. `"Discrepancy with store CCTV / POS records"`
         2. `"Unauthorized work outside trading hours"`
         3. `"Prior payroll period finalized and locked"`
       * **`manual_checkin`**:
         1. `"Employee confirmed absent from premises"`
         2. `"Unscheduled / unauthorized attendance"`
         3. `"Location outside store geofence"`
     * **Validation Enforcement:** When declining, the server verifies that the submitted `reason` matches one of the item's own `decline_reasons` (or starts with `"Other:"`). Invalid reasons are rejected with `422 Unprocessable Entity` (`code: "INVALID_DECLINE_REASON"`).
3. **Manager Role in Swaps & Absence of Leave/Discount Approvals in Phase 1:**
   * **Answer:**
     * For shift swaps, the server or peer-to-peer matching decides who covers. The manager **only approves or declines**; the manager **never selects the replacement**.
     * There are **NO leave approvals (annual/sick leave) or discount approvals in Phase 1**. Only the 3 retail operational kinds (`shift_swap`, `attendance_correction`, `manual_checkin`) are supported.
4. **How Manual Check-Ins Settle Attendance (GAP-SM-004):**
   * **Answer:** A confirmed manual check-in request automatically updates the staff member's `AttendanceRecord` to `phase: "checked_in"`, `location_check: "manager_confirmed"`, and `checked_in_at = decision_time`, immediately granting shop-floor attendance standing and notifying the staff member via `check_in_outcome` alert.

---

### 3. Team Availability (GAP-SM-006)
* **Method:** `GET`
* **Endpoint:** `/store/availability/team`
* **Headers:** `Authorization: Bearer <token>` (Store Manager or Central admin)
* **Query Parameters:**
  * `week_start` (string, e.g. `2026-11-30`, optional if `month` provided): Get team's weekly availability breakdown.
  * `month` (string, e.g. `2026-11`, optional if `week_start` provided): Get team's monthly overview with days off.
  * `store_id` (string, optional): For Central admin callers to inspect any store.

#### 1. Team's Week View Response Format (`?week_start=YYYY-MM-DD` 200 OK):
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "store_id": "string",
  "is_roster_published": boolean,
  "team": [
    {
      "user_id": "string",
      "name": "string",
      "role": "string",
      "status": "Submitted" | "Not submitted",
      "submitted_at": "string (ISO 8601 UTC)" | null,
      "days": [
        {
          "date": "string (YYYY-MM-DD)",
          "status": "available" | "partial" | "unavailable",
          "from": number | null,   // minutes from midnight, partial days only
          "to": number | null,     // minutes from midnight, partial days only
          "note": "string" | null
        }
      ]
    }
  ]
}
```

#### 2. Team's Month View Response Format (`?month=YYYY-MM` 200 OK):
```json
{
  "month": "string (YYYY-MM)",
  "store_id": "string",
  "team": [
    {
      "user_id": "string",
      "name": "string",
      "role": "string",
      "status": "Submitted" | "Not submitted",
      "submitted_at": "string (ISO 8601 UTC)" | null,
      "days_off": [
        "string (YYYY-MM-DD)" // List of dates where status is unavailable
      ]
    }
  ]
}
```

#### 💡 Open Questions Resolved (GAP-SM-006):
1. **Is the month view needed in Phase 1? The PRD names only the week view; the app built both.**
   * **Answer:**
     * **Yes, the backend fully supports both Week and Month team views in Phase 1.**
     * **Reasoning:** Since the mobile frontend engineering team already built both views into the store manager interface, removing the month view would break the UI experience.
     * Furthermore, under the unified data architecture established in **GAP-API-006**, both the week and month views query the **exact same underlying MongoDB collection (`StaffAvailability`)**:
       * A day off recorded in the month view automatically translates into `status: "unavailable"` in the week view.
       * The month view provides store managers with macro-level leave planning and visibility over blackout dates, while the week view provides the micro-level partial-day trading hour availability required to construct daily shift schedules.
2. **How does the manager's "Availability Missing" alert originate?**
   * **Answer:** The alert originates directly from the team availability dataset. On Wednesday at 23:59:59 store time (the weekly availability deadline), the background cron job scans `GET /store/availability/team?week_start=<next_monday>`. For any staff member where `status === "Not submitted"`, the server counts the missing submissions and triggers an `availability_due` alert to the Store Manager (`"3 staff members have missing availability for week of 2026-11-30"`). Anyone with no submission explicitly renders as `"Not submitted"`.

---

### 4. Roster Planning & Publishing (GAP-SM-007, GAP-SM-008)
* **Get Week Plan:** `GET /store/roster?week_start=YYYY-MM-DD`
* **Headers:** `Authorization: Bearer <token>` (Store Manager or Central admin)
* **Response Format (200 OK):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "status": "draft" | "published",
  "editable": boolean,
  "locked_reason": "string" | null,
  "published_at": "string (ISO 8601 UTC)" | null,
  "coverage": {
    "gaps": [
      {
        "date": "string (YYYY-MM-DD)",
        "from_minutes": number,
        "to_minutes": number,
        "message": "string"
      }
    ]
  },
  "staff": [
    {
      "user_id": "string",
      "name": "string",
      "availability_submitted": boolean,
      "rostered_minutes": number,
      "declared_availability": [
        {
          "date": "string",
          "status": "available" | "partial" | "unavailable",
          "from": number | null,
          "to": number | null,
          "note": "string" | null
        }
      ],
      "shifts": [
        {
          "id": "string",
          "date": "string (YYYY-MM-DD)",
          "start_minutes": number,
          "end_minutes": number,
          "swap_eligible": boolean
        }
      ]
    }
  ]
}
```

* **Assign Shifts:** `POST /store/roster/shifts`
* **Headers:** `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
* **Request Body (Assign Shifts):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "staff_member": "string (User ID)",
  "staff_name": "string",
  "shifts": [
    {
      "date": "string (YYYY-MM-DD)",
      "start": number, // minutes from midnight (e.g. 540 = 09:00)
      "end": number   // minutes from midnight (e.g. 1020 = 17:00)
    }
  ],
  "client_timestamp": "string (ISO 8601 UTC)"
}
```
* **Response Format (200 OK):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "status": "draft",
  "has_unpublished_changes": true,
  "assigned_count": number,
  "message": "Shifts staged successfully as draft. Publish week to make visible to staff."
}
```

* **Publish Week Roster:** `POST /store/roster/publish`
* **Headers:** `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
* **Request Body (Publish):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "client_timestamp": "string (ISO 8601 UTC)"
}
```
* **Response Format (Publish 200 OK):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "status": "published",
  "published_at": "string (ISO 8601 UTC)",
  "coverage_warnings": [
    {
      "date": "string (YYYY-MM-DD)",
      "from_minutes": number,
      "to_minutes": number,
      "message": "string"
    }
  ],
  "message": "Roster published to Staff successfully"
}
```

#### 💡 Open Questions Resolved (GAP-SM-007, GAP-SM-008):
1. **What counts as a coverage gap, and what message comes with it?**
   * **Answer:**
     * **Minimum Staffing Threshold:** The retail operational standard requires a **minimum of 2 staff members on duty** during store trading hours (for cashier redundancy, customer assistance, and shop floor security).
     * **Specific Gap Conditions & Message Texts:**
       * *Zero Staff on Duty:* If trading hours have 0 staff rostered $\rightarrow$ `message: "No staff rostered during store trading hours (09:00 - 12:00)"`.
       * *Understaffed (< 2 Staff):* If only 1 staff member is rostered $\rightarrow$ `message: "Understaffed: Only 1 staff member scheduled. Minimum 2 required for store operations & safety."`.
       * *Uncovered Store Opening / Closing:* If store opens at 09:00 but shifts start at 10:00 $\rightarrow$ `message: "Store opening gap: Store opens at 09:00 but first shift starts at 10:00."`.
     * **Non-Blocking Rule:** Coverage gaps are **warnings only**. The API allows the manager to publish even with coverage warnings (`coverage_warnings: [...]`), empowering managers to accommodate emergency solo shifts or phased openings.
2. **When a manager edits a published week, should staff keep seeing the last published version until it is republished?**
   * **Answer:**
     * **Yes, staff MUST continue seeing their current published shifts.**
     * **Problem with Prototype Fake:** The fake followed PRD 5.1 literally: editing one shift reverted the entire week to draft, causing next week's roster to suddenly disappear from all employees' mobile screens (`GET /roster/published`). This created massive shop floor confusion.
     * **Architectural Resolution (Dual-State Staging):**
       1. When a manager edits shifts in an already published week (`POST /store/roster/shifts`), the modifications are staged as **draft shifts** (`status: "draft"`), and `week.hasUnpublishedChanges = true`.
       2. Staff members calling `GET /roster/published` **continue to see their existing published shifts without disruption**.
       3. When the manager taps **"Publish"** (`POST /store/roster/publish`), the backend atomically promotes all draft shifts to `status: "published"`, purges obsolete assignments, clears `hasUnpublishedChanges`, and dispatches a single `roster_published` alert to all affected staff.
3. **Server Assignment Enforcement:**
   * The server refuses assignments with `409 Conflict`:
     * If assigned on a date where the staff member declared `status: "unavailable"` $\rightarrow$ `code: "STAFF_UNAVAILABLE"`.
     * If assigned outside configured store trading hours (with 30m prep/cleanup buffer) $\rightarrow$ `code: "OUTSIDE_TRADING_HOURS"`.
     * If assigned to a locked past week $\rightarrow$ `code: "WEEK_LOCKED"`.

---

### 5. Task Management for Managers (GAP-SM-009)
* **Create Task:** `POST /tasks`
* **Request Body (Create):**
```json
{
  "title": "string",
  "note": "string",
  "category": "group" | "priority" | "role_specific" | "manager_only",
  "role": "string",            // if role_specific
  "assignee_id": "string",     // optional (open to team if omitted)
  "assignee_name": "string",
  "due_date": "string (ISO 8601)"
}
```
* **Reassign Task:** `POST /tasks/{id}/assign`
* **Request Body (Reassign):**
```json
{
  "assignee_id": "string",
  "assignee_name": "string"
}
```

---

### 6. Store Announcements (GAP-SM-010)
* **Get Announcement Board:** `GET /store/announcements`
* **Send / Schedule Announcement:** `POST /store/announcements`
* **Request Body (POST):**
```json
{
  "message": "string",
  "scheduled_for": "string (ISO 8601)" | null // null for immediate send
}
```
* **Cancel Scheduled Post:** `DELETE /store/announcements/{id}`

---

### 7. Report Offline Screen (GAP-SM-011)
* **Method:** `POST`
* **Endpoint:** `/store/screens/{id}/report-offline`
* **Headers:** `Idempotency-Key: string (UUID)`
* **Response Format (200 OK):**
```json
{
  "id": "string (Screen ID)",
  "store_id": "string",
  "name": "string",
  "online": false,
  "reported_at": "string (ISO 8601)",
  "reported_by": "string",
  "message": "Offline screen successfully reported to Central"
}
```

