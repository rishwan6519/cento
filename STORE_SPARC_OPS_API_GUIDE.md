# Store Sparc Ops - Complete API Contract & Field Specification Guide

> **Base URL:** `https://iot-test.metizstoresparc.com/api/v1`  
> **Global Auth Header:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
> **Offline Write Header:** `Idempotency-Key: <UUID>`

---

## 🛠️ Global Standards & Error Format

All error responses return HTTP status `4xx` or `5xx` with the standard machine-readable JSON format:

```json
{
  "code": "STRING",         // e.g. "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "VALIDATION_ERROR"
  "message": "STRING",      // Human-readable message
  "field_errors": [
    {
      "field": "STRING",    // Optional field name that caused the error
      "message": "STRING"   // Specific validation error
    }
  ]
}
```

* **`401 Unauthorized`**: Token missing, expired, or invalid.
* **`403 Forbidden`**: Caller role is not authorized (e.g. Staff calling Manager endpoint).
* **`409 Conflict`**: Conflicting operation (e.g. Duplicate swap request for same shift, editing locked week, already checked in).

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
* **Endpoint:** `/store/config`
* **Purpose:** Provides geofence radius, lat/long coordinates, trading hours, and store timezone.
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
  "signage_rotation": number, // in seconds
  "max_announcement_length": number,
  "time_zone": "string",      // IANA format e.g. "Asia/Kolkata"
  "whatsapp_group_link": "string"
}
```

---

### 2.1 Update Store Configuration & Geofence
* **Method:** `PUT`
* **Endpoint:** `/store/config`
* **Role Permission:** `Store Manager` | `Central admin`
* **Purpose:** Updates store physical coordinates (latitude, longitude), geofence radius, WhatsApp group link, and trading hours.
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Format:**
```json
{
  "latitude": number,
  "longitude": number,
  "geofence_radius": number, // in metres, e.g. 150
  "whatsapp_group_link": "string"
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
  "time_zone": "string",
  "whatsapp_group_link": "string"
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

### 12. Push Token Registration (GAP-API-009)
* **Register Device:** `POST /push/register`
* **Unregister Device:** `POST /push/unregister`
* **Request Body (POST /push/register):**
```json
{
  "token": "string",
  "platform": "Android" | "iOS",
  "app_id": "string",
  "environment": "string"
}
```

---

### 13. Store Screens & Current Media (GAP-API-011, GAP-API-012)
* **Method:** `GET`
* **Endpoint:** `/store/screens`
* **Response Format (200 OK):**
```json
{
  "screens": [
    {
      "id": "string",
      "store_id": "string",
      "name": "string",
      "zone": "string",
      "online": boolean,
      "is_playing": "string", // Media path/title
      "content_type": "string",
      "offline_since": "string (ISO 8601)" | null,
      "reported_at": "string (ISO 8601)" | null,
      "reported_by": "string" | null
    }
  ]
}
```

---

# 👔 PART 2: STORE MANAGER APIS

---

### 1. Store Dashboard (GAP-SM-002, GAP-SM-004)
* **Method:** `GET`
* **Endpoint:** `/store/dashboard`
* **Purpose:** Aggregates real-time store metrics (sales sample, attendance, approvals, next week roster status, tasks, screens).
* **Headers:** `Authorization: Bearer <token>` (Role: Store Manager or Central admin)
* **Response Format (200 OK):**
```json
{
  "as_of": "string (ISO 8601)",
  "sales": {
    "amount": number,
    "currency": "string",
    "comparison": "up" | "down" | "flat",
    "percent": number,
    "is_sample": boolean // true in Phase 1
  },
  "attendance": {
    "checked_in": number,
    "rostered_today": number,
    "manual_check_ins_waiting": number,
    "awaited": [
      {
        "user_id": "string",
        "name": "string",
        "rostered_start": number,
        "flag": "string" | null
      }
    ]
  },
  "approvals": {
    "waiting": number,
    "flagged": number,
    "oldest_submitted_at": "string (ISO 8601)" | null
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
    "next_scheduled_for": "string (ISO 8601)" | null
  }
}
```

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

* **Decide Approval (Approve / Decline):** `POST /store/approvals/{id}/decide`
* **Request Body:**
```json
{
  "approve": boolean,
  "reason": "string", // Required when approve is false
  "client_timestamp": "string (ISO 8601)"
}
```
* **Response Format (200 OK):**
```json
{
  "id": "string",
  "kind": "shift_swap" | "attendance_correction" | "manual_checkin",
  "status": "approved" | "declined",
  "decided_at": "string (ISO 8601)",
  "decided_by": "string",
  "decision_reason": "string" | null,
  "message": "string"
}
```

---

### 3. Team Availability (GAP-SM-006)
* **Method:** `GET`
* **Endpoint:** `/store/availability/team?week_start=YYYY-MM-DD`
* **Response Format (200 OK):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "is_roster_published": boolean,
  "team": [
    {
      "user_id": "string",
      "name": "string",
      "role": "string",
      "status": "Submitted" | "Not submitted",
      "submitted_at": "string (ISO 8601)" | null,
      "days": [
        {
          "date": "string (YYYY-MM-DD)",
          "status": "available" | "partial" | "unavailable"
        }
      ]
    }
  ]
}
```

---

### 4. Roster Planning & Publishing (GAP-SM-007, GAP-SM-008)
* **Get Week Plan:** `GET /store/roster?week_start=YYYY-MM-DD`
* **Assign Shifts:** `POST /store/roster/shifts`
* **Request Body (Assign Shifts):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "staff_member": "string (User ID)",
  "staff_name": "string",
  "shifts": [
    {
      "date": "string (YYYY-MM-DD)",
      "start": number, // minutes from midnight (e.g. 540)
      "end": number   // minutes from midnight (e.g. 1020)
    }
  ]
}
```

* **Publish Week Roster:** `POST /store/roster/publish`
* **Request Body (Publish):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "client_timestamp": "string (ISO 8601)"
}
```
* **Response Format (Publish 200 OK):**
```json
{
  "week_start": "string (YYYY-MM-DD)",
  "status": "published",
  "published_at": "string (ISO 8601)",
  "coverage_warnings": [
    {
      "date": "string",
      "from_minutes": number,
      "to_minutes": number,
      "message": "string"
    }
  ],
  "message": "Roster published to Staff successfully"
}
```

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

