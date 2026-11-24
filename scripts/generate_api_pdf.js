const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function createApiPdf() {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28; // A4 width
  const pageHeight = 841.89; // A4 height
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNumber = 1;

  function checkPageBreak(neededHeight = 30) {
    if (y - neededHeight < margin + 40) {
      drawFooter();
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      pageNumber++;
      y = pageHeight - margin - 20;
      drawHeader();
    }
  }

  function drawHeader() {
    currentPage.drawText('STORE SPARC OPS - COMPLETE API SPECIFICATION & Q&A GUIDE', {
      x: margin,
      y: pageHeight - 35,
      size: 8,
      font: helveticaBold,
      color: rgb(0.3, 0.4, 0.6),
    });
    currentPage.drawLine({
      start: { x: margin, y: pageHeight - 42 },
      end: { x: pageWidth - margin, y: pageHeight - 42 },
      thickness: 0.5,
      color: rgb(0.8, 0.85, 0.9),
    });
  }

  function drawFooter() {
    currentPage.drawLine({
      start: { x: margin, y: margin + 25 },
      end: { x: pageWidth - margin, y: margin + 25 },
      thickness: 0.5,
      color: rgb(0.8, 0.85, 0.9),
    });
    currentPage.drawText('Centelon IT Solutions | Store Sparc Enterprise Architecture', {
      x: margin,
      y: margin + 12,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
    currentPage.drawText(`Page ${pageNumber}`, {
      x: pageWidth - margin - 40,
      y: margin + 12,
      size: 8,
      font: helveticaBold,
      color: rgb(0.3, 0.4, 0.6),
    });
  }

  function addCoverPage() {
    // Top banner
    currentPage.drawRectangle({
      x: 0,
      y: pageHeight - 180,
      width: pageWidth,
      height: 180,
      color: rgb(0.08, 0.22, 0.45),
    });

    currentPage.drawText('STORE SPARC OPS PLATFORM', {
      x: margin,
      y: pageHeight - 80,
      size: 26,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    currentPage.drawText('Comprehensive API Specification, Operational Guide & Q&A Compendium', {
      x: margin,
      y: pageHeight - 115,
      size: 13,
      font: helvetica,
      color: rgb(0.85, 0.92, 1),
    });

    currentPage.drawText('Centelon IT Solutions LLP | Enterprise Mobile & Cloud Services', {
      x: margin,
      y: pageHeight - 140,
      size: 10,
      font: helvetica,
      color: rgb(0.7, 0.8, 0.95),
    });

    y = pageHeight - 240;

    addHeading('EXECUTIVE SUMMARY & DOCUMENT OVERVIEW', 15);
    addParagraph(
      'This document provides an exhaustive, production-grade technical specification and Question-Answer resolution guide for the Store Sparc Ops mobile application and Store Manager web portal. It covers all 14 API functional areas, global architectural rules, offline write synchronization, authentication via OIDC + PKCE, compliance flags, geofencing mechanics, weekly hours confirmation, digital signage playback, and answers to all PRD open questions.'
    );

    addHeading('DOCUMENT METADATA & ENVIRONMENT TARGETS', 12);
    addBullet('Platform Base URL (Staging / Test): https://iot-test.metizstoresparc.com/api/v1');
    addBullet('Platform Base URL (Production): https://metizstoresparc.com/api/v1');
    addBullet('Global Authorization Header: Authorization: Bearer <JWT_ACCESS_TOKEN>');
    addBullet('Offline Write Header: Idempotency-Key: <UUID_v4>');
    addBullet('Protocol Standards: OIDC Authorization Code + PKCE, RESTful JSON, ISO-8601 UTC & Local Offsets');
    addBullet('Document Release Version: 1.0.0 (Release Target 2026)');

    y -= 30;
    addHeading('TABLE OF CONTENTS', 13);
    addParagraph('PART 0: Core Architectural Principles & Global API Rules');
    addParagraph('PART 1: Staff Screen APIs (GAP-API-001 through GAP-API-014)');
    addParagraph('PART 2: Store Manager Screen APIs (Dashboard, Approvals, Roster Planning)');
    addParagraph('PART 3: Master Question & Answer Compendium (All Open Questions Resolved)');

    drawFooter();
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    pageNumber++;
    y = pageHeight - margin - 20;
    drawHeader();
  }

  function addHeading(text, size = 13, color = rgb(0.08, 0.22, 0.45)) {
    checkPageBreak(size + 25);
    y -= 10;
    currentPage.drawText(text, {
      x: margin,
      y,
      size,
      font: helveticaBold,
      color,
    });
    y -= size + 6;
  }

  function addSubheading(text, size = 10, color = rgb(0.18, 0.35, 0.6)) {
    checkPageBreak(size + 18);
    y -= 6;
    currentPage.drawText(text, {
      x: margin,
      y,
      size,
      font: helveticaBold,
      color,
    });
    y -= size + 4;
  }

  function addParagraph(text, size = 9, color = rgb(0.2, 0.2, 0.2), indent = 0) {
    const maxWidth = contentWidth - indent;
    const words = text.split(' ');
    let line = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = line + (line ? ' ' : '') + words[i];
      const testWidth = helvetica.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        checkPageBreak(size + 6);
        currentPage.drawText(line, {
          x: margin + indent,
          y,
          size,
          font: helvetica,
          color,
        });
        y -= size + 4;
        line = words[i];
      } else {
        line = testLine;
      }
    }

    if (line) {
      checkPageBreak(size + 6);
      currentPage.drawText(line, {
        x: margin + indent,
        y,
        size,
        font: helvetica,
        color,
      });
      y -= size + 5;
    }
  }

  function addBullet(text, size = 9) {
    const indent = 15;
    checkPageBreak(size + 6);
    currentPage.drawText('•', {
      x: margin + 3,
      y,
      size: size + 2,
      font: helveticaBold,
      color: rgb(0.18, 0.35, 0.6),
    });
    addParagraph(text, size, rgb(0.25, 0.25, 0.25), indent);
  }

  function addCodeBlock(text) {
    const lines = text.split('\n');
    const blockHeight = lines.length * 11 + 12;
    checkPageBreak(blockHeight + 10);

    currentPage.drawRectangle({
      x: margin,
      y: y - blockHeight + 10,
      width: contentWidth,
      height: blockHeight,
      color: rgb(0.96, 0.97, 0.98),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 0.8,
    });

    let codeY = y - 3;
    for (const l of lines) {
      currentPage.drawText(l, {
        x: margin + 10,
        y: codeY,
        size: 7.5,
        font: courier,
        color: rgb(0.15, 0.2, 0.3),
      });
      codeY -= 11;
    }
    y -= blockHeight + 8;
  }

  function addQABox(question, answer) {
    checkPageBreak(70);
    y -= 5;
    currentPage.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 20,
      color: rgb(0.92, 0.95, 0.99),
    });
    currentPage.drawText(`Q: ${question}`, {
      x: margin + 8,
      y: y - 13,
      size: 8.5,
      font: helveticaBold,
      color: rgb(0.08, 0.25, 0.55),
    });
    y -= 26;
    addParagraph(`A: ${answer}`, 8.5, rgb(0.2, 0.2, 0.2), 8);
    y -= 4;
  }

  // BUILD PDF CONTENT
  addCoverPage();

  // PART 0
  addHeading('PART 0: ARCHITECTURAL PRINCIPLES & RULES FOR EVERY API', 13);
  addParagraph(
    'The Store Sparc Ops mobile application operates strictly as a presentation and action-queueing client. The mobile app never computes business logic. All operational verdicts, flags, and calculations originate from the server.'
  );

  addSubheading('1. Server-Authoritative Decision Matrix');
  addBullet('Geofence Verdicts: The server evaluates the single foreground GPS reading against the store radius and issues verdicts (accepted, outside_geofence, awaiting_manager_confirmation, rejected).');
  addBullet('Lateness & Compliance Flags: Evaluated against published roster shift bounds with a configurable 5-minute grace window (flags: NOT_ROSTERED, EARLY_CHECKIN, LATE_CHECKIN, AFTER_ROSTER_END).');
  addBullet('Swap Eligibility: Determined dynamically by the server; duplicate open swap requests are refused with 409 Conflict.');
  addBullet('Hours & Break Deductions: The server computes rostered vs recorded minutes and auto-deducts unpaid meal breaks according to jurisdictional labor rules.');
  addBullet('State-Derived Alerts: Alerts like "hours_to_confirm" are generated dynamically and automatically purged when the week is confirmed.');

  addSubheading('2. Centelon SSO Authentication (OIDC + PKCE)');
  addParagraph(
    'Staff authenticate using OpenID Connect (OIDC) Authorization Code Flow with Proof Key for Code Exchange (PKCE) for public mobile clients without client secrets.'
  );
  addBullet('Discovery Endpoint: https://iot-test.metizstoresparc.com/api/v1/auth / Centelon SSO Issuer');
  addBullet('Client Registrations: storesparc-ops-android & storesparc-ops-ios (Redirect: com.storesparc.ops://oauth/callback)');
  addBullet('Scopes & Audience: openid profile email offline_access store_ops.read store_ops.write (Audience: https://api.storesparc.com/api/v1)');
  addBullet('Token Lifetimes: Access Token = 15-60 min JWT; Refresh Token = 30 days rolling refresh, stored in hardware keystore.');
  addBullet('Caller Identity: Extracted exclusively from the access token. Writes never carry a user ID in the request body.');

  addSubheading('3. Offline Writes & Idempotency Engine');
  addParagraph(
    'Staff work in low-connectivity shop floor environments. Every client mutation is queued locally and dispatched upon reconnecting with two mandatory components:'
  );
  addBullet('Idempotency-Key Header: Unique UUID v4 per user action. Replays return the cached response with X-Idempotent-Replay: true.');
  addBullet('client_timestamp: ISO 8601 with offset recording exactly when the user acted, while the server returns server_timestamp.');
  addBullet('Error Partitioning: 4xx client errors are cached so the app displays the error and stops; 5xx/429 errors are never cached, prompting exponential backoff retries.');

  addSubheading('4. Standard Error Envelope & Conventions');
  addParagraph('All responses adhere to standard HTTP status codes (401 Unauthorized, 403 Forbidden, 409 Conflict, 429 Too Many Requests):');
  addCodeBlock(
    '{\n  "code": "VALIDATION_ERROR",\n  "message": "Human readable error description",\n  "field_errors": [\n    { "field": "start_minutes", "message": "Must be before end_minutes" }\n  ]\n}'
  );

  // PART 1
  addHeading('PART 1: COMPREHENSIVE STAFF SCREEN APIS & HOW THEY WORK', 13);

  addSubheading('1. Sign-In & Identity (GAP-API-001)');
  addParagraph('Resolves caller profile, assigned store, and handles multi-factor authentication (MFA):');
  addCodeBlock(
    'GET /api/v1/auth/resolve\nPOST /api/v1/auth/mfa/start  -> { challenge_id, method, code_length, destination_hint, expires_in }\nPOST /api/v1/auth/mfa/verify -> { verified: true, token, user_id, role }\nPOST /api/v1/auth/sign-out   -> { success: true } (Unregisters device push tokens)'
  );

  addSubheading('2. Published Shift Roster (GAP-API-002)');
  addParagraph(
    'Staff view their own published shifts. Draft or unpublished weeks return an empty shifts array (draft shielding). Each shift carries a dynamic swap_eligible boolean.'
  );
  addCodeBlock(
    'GET /api/v1/roster/published?week_start=YYYY-MM-DD\nResponse:\n{\n  "store_id": "string",\n  "week_start": "YYYY-MM-DD",\n  "shifts": [\n    { "id": "string", "date": "YYYY-MM-DD", "start_minutes": 540, "end_minutes": 1020, "swap_eligible": true }\n  ]\n}'
  );

  addSubheading('3. Shift Swaps (GAP-API-003)');
  addParagraph(
    'Staff can list their swaps, request a new swap (offered to the whole team), or withdraw pending swaps. Duplicate open requests for the same shift are refused with 409 Conflict.'
  );
  addCodeBlock(
    'GET  /api/v1/swaps               -> List swap requests\nPOST /api/v1/swaps               -> Request swap { shift_id, client_timestamp, reason? }\nPOST /api/v1/swaps/{id}/withdraw -> Withdraw swap request { status: "withdrawn", server_timestamp }'
  );

  addSubheading('4. Attendance & Geofencing (GAP-API-004)');
  addParagraph(
    'Check-in carries a single foreground GPS reading (latitude, longitude, accuracy in metres, reading time). If outside the store radius, it queues a manual confirmation request for the Store Manager.'
  );
  addCodeBlock(
    'GET  /api/v1/attendance/today     -> Status, shift, phase, location_check, flags\nPOST /api/v1/attendance/check-in  -> { store_id, location_reading, manual_confirmation_requested }\nPOST /api/v1/attendance/check-out -> { client_timestamp } -> { verdict: "accepted", worked_minutes }'
  );

  addSubheading('5. Weekly Hours & Corrections (GAP-API-005)');
  addParagraph(
    'Returns a complete 7-day breakdown of rostered shifts, recorded check-ins/outs, and day states (recorded, missing_check_out, not_recorded, on_shift, not_worked_yet). All weekly corrections are bundled into a single submission before confirmation.'
  );
  addCodeBlock(
    'GET  /api/v1/hours?week_start=YYYY-MM-DD\nPOST /api/v1/hours -> action: "submit_corrections" | "confirm_week"'
  );

  addSubheading('6. Staff Availability (GAP-API-006)');
  addParagraph(
    'Supports both Week View (?week_start=YYYY-MM-DD) and Month View (?month=YYYY-MM). Both views share a single underlying persistence model so a day off in month view automatically marks that date unavailable in week view. Past weeks and published roster weeks are locked.'
  );
  addCodeBlock(
    'GET  /api/v1/availability?week_start=YYYY-MM-DD  or  ?month=YYYY-MM\nPOST /api/v1/availability -> Submit weekly availability or monthly days off'
  );

  addSubheading('7. Task Management (GAP-API-007)');
  addParagraph(
    'Staff view visible tasks (manager_only tasks are filtered out server-side). Tasks can be claimed, completed, or released back to the team pool.'
  );
  addCodeBlock(
    'GET  /api/v1/tasks              -> List visible tasks (can_claim, can_complete, can_release)\nPOST /api/v1/tasks/{id}/claim   -> Claim open task\nPOST /api/v1/tasks/{id}/complete-> Complete task\nPOST /api/v1/tasks/{id}/release -> Release claimed task back to team'
  );

  addSubheading('8. Alerts Feed & State-Derived Lifecycle (GAP-API-008)');
  addParagraph(
    'Authoritative notifications inbox. Supports pagination (limit, page, before cursor), unread_count, and automatically clears state-derived alerts like "hours_to_confirm" when the week is confirmed.'
  );
  addCodeBlock(
    'GET  /api/v1/alerts?limit=20&unread_only=false\nPOST /api/v1/alerts/{id}/read  -> Mark single alert read { unread_count }\nPOST /api/v1/alerts/read-all   -> Mark all alerts read { unread_count: 0 }\nPOST /api/v1/alerts            -> Broadcast store announcement (Store Manager only)'
  );

  addSubheading('9. Push Registration (GAP-API-009)');
  addParagraph(
    'Registers mobile FCM/APNs push tokens and tracks platform (Android/iOS), appId, and environment. Push payloads carry lightweight notification and deep-link routing data with 100% attribute parity with the alerts feed.'
  );
  addCodeBlock(
    'POST /api/v1/push/register   -> { token, platform, app_id, environment }\nPOST /api/v1/push/unregister -> { token } (Sent automatically during sign-out)'
  );

  addSubheading('10. Chat & WhatsApp Groups (GAP-API-010)');
  addParagraph(
    'No in-app chat engine is implemented. The app retrieves the store operations and central support WhatsApp deep links from the API and opens the native WhatsApp app via universal deep links.'
  );
  addCodeBlock(
    'GET /api/v1/chat/groups (alias: /groups)\nResponse: { "groups": [ { "id": "store-101", "name": "Store Team", "kind": "store", "whatsapp_deep_link": "https://chat.whatsapp.com/..." } ] }'
  );

  addSubheading('11. Store Screens & In-Store Playback (GAP-API-011, GAP-API-012)');
  addParagraph(
    'Lists physical digital signage screens across 4 fixed zones (entrance, window, registers, aisles). Individual screen inspection returns the current playing item, duration, elapsed time, and secure streaming URLs.'
  );
  addCodeBlock(
    'GET  /api/v1/store/screens     -> List screens (zone, online, what_it_is_showing, kind_of_content, offline_since)\nGET  /api/v1/store/screens/{id}-> Screen detail + current_item { kind, title, detail, duration_seconds, started_at, media_url }\nPOST /api/v1/store/screens/{id}/report-offline -> Report offline screen incident'
  );

  addSubheading('12. Store Configuration (GAP-API-014)');
  addParagraph(
    'Provides geofence radius, trading hours per weekday (minutes from midnight to prefill partial availability), signage rotation interval, timezone, and operational policies. Zero values are hardcoded in the mobile app.'
  );
  addCodeBlock(
    'GET /api/v1/store/config -> { geofence_radius, trading_hours, signage_rotation, max_announcement_length, time_zone, lateness_grace_minutes, break_rules }\nPUT /api/v1/store/config -> Update store configuration (Store Manager / Central admin)'
  );

  // PART 2
  addHeading('PART 2: STORE MANAGER SCREEN APIS & APPROVAL WORKFLOWS', 13);
  addParagraph(
    'Store Manager screens operate on the approver side of the same shared database records. Shift swaps and attendance corrections submitted by staff flow directly into the manager approval queue.'
  );

  addSubheading('1. Store Manager Dashboard (GAP-SM-002, GAP-SM-004)');
  addParagraph(
    'Aggregates real-time metrics across attendance (checked in vs rostered, awaiting check-ins), pending approvals, next week roster publishing status, open tasks, screen uptime, and daily sales.'
  );
  addCodeBlock('GET /api/v1/store/dashboard -> Aggregated store operations summary');

  addSubheading('2. Approvals Queue (GAP-SM-003, GAP-SM-004, GAP-SM-005)');
  addParagraph(
    'Lists pending shift swaps, attendance corrections, and manual check-in requests. Approving or declining updates the underlying record, emits alerts to staff, and resolves attendance records.'
  );
  addCodeBlock(
    'GET  /api/v1/store/approvals\nPOST /api/v1/store/approvals/{id}/decide -> { approve: boolean, reason?: string, client_timestamp }'
  );

  addSubheading('3. Team Availability Matrix & Roster Planning (GAP-SM-006, GAP-SM-007, GAP-SM-008)');
  addParagraph(
    'Store managers inspect team availability, assign shifts to draft roster weeks, check coverage gap warnings, and publish the final week roster to staff.'
  );
  addCodeBlock(
    'GET  /api/v1/store/availability/team?week_start=YYYY-MM-DD\nGET  /api/v1/store/roster?week_start=YYYY-MM-DD\nPOST /api/v1/store/roster/shifts   -> Assign shifts to staff member\nPOST /api/v1/store/roster/publish  -> Publish roster week to all staff'
  );

  addSubheading('4. Store Broadcast Announcements (GAP-SM-010)');
  addParagraph(
    'Allows store managers to broadcast immediate or scheduled operational messages to all store staff members.'
  );
  addCodeBlock(
    'GET    /api/v1/store/announcements\nPOST   /api/v1/store/announcements -> { message, scheduled_for }\nDELETE /api/v1/store/announcements/{id}'
  );

  // PART 3
  addHeading('PART 3: MASTER QUESTION & ANSWER COMPENDIUM (ALL PRD QUESTIONS)', 13);

  addQABox(
    'Can one Staff member belong to more than one store? (GAP-API-001)',
    'In Phase 1, staff members belong strictly to one store (assignedStoreId). The mobile UI assumes a single home store. Multi-store roving staff will be introduced in Phase 2 via secondary store assignments.'
  );

  addQABox(
    'Are Assistant Manager and Regional Manager roles in Phase 1? (GAP-API-001)',
    'No. Phase 1 supports three explicit roles: "Staff", "Store Manager", and "Central admin". Assistant Managers map to "Store Manager", and Regional Managers map to "Central admin".'
  );

  addQABox(
    'Is swap eligibility a field on the shift, or a separate check? (GAP-API-002)',
    'Hybrid approach: swap_eligible is delivered as a boolean field on the shift object for O(1) mobile rendering, and is dynamically computed server-side and re-validated upon POST /swaps submission.'
  );

  addQABox(
    'Should staff be able to give a reason or withdraw a swap request? (GAP-API-003)',
    'Yes. Staff can provide an optional text reason during submission and can withdraw pending requests via POST /api/v1/swaps/{id}/withdraw.'
  );

  addQABox(
    'Will each decision raise a "swap decided" alert? (GAP-API-003)',
    'Yes. When a Store Manager approves or declines a swap, the server automatically emits a "swap_decided" alert to the requesting staff member with deep-linking to the swaps screen.'
  );

  addQABox(
    'Which flag codes exist, and what is the lateness grace window? (GAP-API-004)',
    'Codes: NOT_ROSTERED, EARLY_CHECKIN (>15m before shift), LATE_CHECKIN (>5m after shift start), AFTER_ROSTER_END. The default lateness grace window is 5 minutes, configurable per store.'
  );

  addQABox(
    'Is a check-in with no location reading accepted, refused, or turned into manual? (GAP-API-004)',
    'If manual_confirmation_requested is false and no reading is provided, check-in is rejected (LOCATION_REQUIRED). If manual_confirmation_requested is true, it is queued for manager approval.'
  );

  addQABox(
    'How long does the server keep the location reading? (GAP-API-004)',
    'Precise GPS coordinates are retained for 90 days for payroll and union dispute resolution, after which latitude and longitude are purged, preserving only the geofence verdict.'
  );

  addQABox(
    'Can a confirmed week be reopened? Are breaks deducted? (GAP-API-005)',
    'A confirmed week cannot be reopened by staff (payroll lock), but can be adjusted by Store Managers. Unpaid meal breaks (30 min for >5 hr shifts) are deducted server-side; paid rest breaks are not.'
  );

  addQABox(
    'What is the availability deadline, and do week and month views share records? (GAP-API-006)',
    'The deadline is Wednesday 23:59 before the week starts. Week and month views share the exact same underlying persistence model so a day off in month view automatically appears unavailable in week view.'
  );

  addQABox(
    'Can a claimed task be released back to the team? (GAP-API-007)',
    'Yes. Staff or managers can call POST /api/v1/tasks/{id}/release to return a claimed task back to the open team pool.'
  );

  addQABox(
    'Pull feed, push payloads, or both? How are target screens encoded? (GAP-API-008)',
    'Both. Push notifications provide real-time background wakeups with deep-link metadata, while GET /alerts is the authoritative inbox. Target screens are string enums (swaps, tasks, hours, roster).'
  );

  addQABox(
    'FCM for both platforms or APNs directly? Who owns the Firebase project? (GAP-API-009)',
    'FCM for both platforms provides unified cross-platform messaging (with iOS APNs delegation). The Central Store Sparc Corporate IT team owns the Firebase project and cloud credentials.'
  );

  addQABox(
    'Do WhatsApp links come from an API or are they set up per store? (GAP-API-010)',
    'They come strictly from the API (GET /chat/groups and GET /store/config). Store Managers configure them in the web portal Settings view (PUT /store/config). Nothing is hardcoded in app code.'
  );

  addQABox(
    'Is the Promotion Platform the source, and should the app poll? (GAP-API-011)',
    'Yes, the Promotion Platform is the source. The app performs lightweight polling (30-60s) only when the Screens tab is active, while critical offline events trigger selective push notifications.'
  );

  addQABox(
    'How are in-store screen media URLs authorized for mirroring? (GAP-API-012)',
    'Phase 1 uses sample visuals mirroring (title, progress bar, duration). Phase 2 live video mirroring uses HMAC pre-signed expiring CDN URLs and Authorization Bearer streaming headers.'
  );

  addQABox(
    'Which service owns store settings, and what other values should be read? (GAP-API-014)',
    'The Central Store Master Data Service owns settings. Per-store dynamic values include: time_zone, lateness_grace_minutes, break_rules, availability_deadline, and signage_rotation.'
  );

  addQABox(
    'Is the idempotency header Idempotency-Key, and how long are keys remembered? (Page 1)',
    'Yes, the canonical header is Idempotency-Key. Keys are remembered for 7 days (168 hours) via a MongoDB TTL index on IdempotencyRecord.'
  );

  addQABox(
    'Do you return the server timestamp on every write? (Page 1)',
    'Yes. Every write endpoint returns server_timestamp (or submitted_at, decided_at, published_at) in ISO 8601 UTC format to calibrate mobile client timers and resolve clock skew.'
  );

  addQABox(
    'Which existing services own roster, attendance, tasks and signage? (Page 1)',
    'A Single Unified API Gateway (https://.../api/v1) backed by modular domain services (Identity, Workforce, Attendance, Tasks, Signage, Alerts). The mobile app talks to only one API.'
  );

  drawFooter();

  const pdfBytes = await pdfDoc.save();

  // Save to workspace root
  const outputPath = path.join(__dirname, '..', 'STORE_SPARC_OPS_API_SPECIFICATION_AND_QA.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`[Success] PDF generated at workspace root: ${outputPath}`);

  // Also save to artifact directory
  const artifactDir = 'C:\\Users\\krishwan\\.gemini\\antigravity\\brain\\80084802-adb1-4c8d-b215-1a923062ef64';
  if (fs.existsSync(artifactDir)) {
    const artifactPdfPath = path.join(artifactDir, 'Store_Sparc_Ops_API_Specification_and_QA.pdf');
    fs.writeFileSync(artifactPdfPath, pdfBytes);
    console.log(`[Success] PDF copied to artifact directory: ${artifactPdfPath}`);
  }
}

createApiPdf().catch((err) => {
  console.error('[Error] Failed to generate PDF:', err);
  process.exit(1);
});
