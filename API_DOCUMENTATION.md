# API Documentation - Officer Validation Dashboard

## Overview

This API provides 5 endpoints for managing the officer validation workflow. All endpoints use JSON for request/response bodies.

Base URL: `http://localhost:3000` (development)

---

## Endpoints

### 1. Claim Next Officer

Claims the next available officer for validation using an atomic transaction.

**Endpoint:** `POST /api/officers/claim`

**Request Body:**
```json
{
  "validatorId": "user_123"
}
```

**Response (Success - Officer Available):**
```json
{
  "success": true,
  "officer": {
    "id": "uuid-here",
    "mention_uid": "mention_123",
    "provisional_case_name": "Case Name",
    "data": { ... },
    "being_reviewed_by": "user_123",
    "being_reviewed_at": "2026-01-17T14:30:00Z",
    "created_at": "2026-01-17T10:00:00Z",
    "updated_at": "2026-01-17T14:30:00Z"
  },
  "message": "Officer claimed successfully"
}
```

**Response (No Officers Available):**
```json
{
  "success": true,
  "officer": null,
  "message": "No officers available for review"
}
```

**Status Codes:**
- `200 OK` - Success (officer claimed or none available)
- `400 Bad Request` - Invalid validator ID
- `500 Internal Server Error` - Database error

---

### 2. Validate Officer

Updates an officer's validation status and releases the lock.

**Endpoint:** `POST /api/officers/validate`

**Request Body:**
```json
{
  "mentionUid": "mention_123",
  "validatorId": "user_123",
  "status": "correct",
  "notes": "Employment dates match citations perfectly"
}
```

**Status Values:**
- `correct` - Match is validated as correct
- `incorrect` - Match is validated as incorrect
- `needs_review` - Needs expert review

**Response (Success):**
```json
{
  "success": true,
  "officer": {
    "id": "uuid-here",
    "mention_uid": "mention_123",
    "data": {
      ...
      "validation": {
        "status": "correct",
        "validated_by": "user_123",
        "validated_at": "2026-01-17T14:45:00Z",
        "notes": "Employment dates match citations perfectly"
      }
    },
    "being_reviewed_by": null,
    "being_reviewed_at": null,
    ...
  },
  "message": "Validation saved successfully"
}
```

**Status Codes:**
- `200 OK` - Validation saved successfully
- `400 Bad Request` - Missing required fields or invalid status
- `404 Not Found` - Officer not found or not locked by validator
- `409 Conflict` - Officer was released by another process
- `500 Internal Server Error` - Database error

---

### 3. Release Officer

Releases an officer without validation, returning it to pending status.

**Endpoint:** `POST /api/officers/release`

**Request Body:**
```json
{
  "mentionUid": "mention_123",
  "validatorId": "user_123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Officer released successfully"
}
```

**Status Codes:**
- `200 OK` - Officer released successfully
- `400 Bad Request` - Missing required fields
- `404 Not Found` - Officer not found or not locked by validator
- `500 Internal Server Error` - Database error

---

### 4. Get Validation Stats

Returns aggregate validation statistics across all officers.

**Endpoint:** `GET /api/officers/stats`

**Response:**
```json
{
  "total": 1000,
  "pending": 750,
  "inReview": 50,
  "validated": 200,
  "correct": 180,
  "incorrect": 15,
  "needsReview": 5,
  "successRate": 0.923
}
```

**Fields:**
- `total` - Total number of officers in system
- `pending` - Officers not yet reviewed or validated
- `inReview` - Officers currently locked by validators
- `validated` - Officers that have been validated (correct + incorrect + needsReview)
- `correct` - Officers validated as correct matches
- `incorrect` - Officers validated as incorrect matches
- `needsReview` - Officers marked as needing expert review
- `successRate` - Ratio of correct / (correct + incorrect)

**Status Codes:**
- `200 OK` - Stats returned successfully
- `500 Internal Server Error` - Database error

---

### 5. Get Queue Status

Returns queue status information and current validator's officer.

**Endpoint:** `GET /api/officers/queue?validatorId=user_123`

**Query Parameters:**
- `validatorId` (optional) - Validator ID to check for current officer

**Response (With Officer):**
```json
{
  "available": 750,
  "inReview": 50,
  "yourOfficer": {
    "mention_uid": "mention_123",
    "officer_name": "MICHAEL JAMES WEBB",
    "started_at": "2026-01-17T14:30:00Z",
    "time_elapsed_minutes": 15
  }
}
```

**Response (No Officer):**
```json
{
  "available": 750,
  "inReview": 50,
  "yourOfficer": null
}
```

**Fields:**
- `available` - Number of pending officers not locked
- `inReview` - Number of officers currently locked by any validator
- `yourOfficer` - Current officer assigned to this validator (or null)

**Status Codes:**
- `200 OK` - Queue status returned successfully
- `500 Internal Server Error` - Database error

---

## Testing

### Prerequisites

1. **Apply SQL Migration**

   The `claim_next_officer` function must be created in Supabase. See `APPLY_MIGRATION.md` for instructions.

2. **Start Development Server**
   ```bash
   npm run dev
   ```

### Manual Testing with cURL

**Test Stats:**
```bash
curl http://localhost:3000/api/officers/stats
```

**Test Queue:**
```bash
curl "http://localhost:3000/api/officers/queue?validatorId=test_user"
```

**Test Claim:**
```bash
curl -X POST http://localhost:3000/api/officers/claim \
  -H "Content-Type: application/json" \
  -d '{"validatorId": "test_user"}'
```

**Test Release:**
```bash
curl -X POST http://localhost:3000/api/officers/release \
  -H "Content-Type: application/json" \
  -d '{"mentionUid": "MENTION_UID_HERE", "validatorId": "test_user"}'
```

**Test Validate:**
```bash
curl -X POST http://localhost:3000/api/officers/validate \
  -H "Content-Type: application/json" \
  -d '{
    "mentionUid": "MENTION_UID_HERE",
    "validatorId": "test_user",
    "status": "correct",
    "notes": "Test validation"
  }'
```

### Automated Testing

Run the comprehensive test suite:

```bash
node scripts/test-api-endpoints.js
```

This script tests all 5 endpoints in sequence and validates responses.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description here"
}
```

Or for GET endpoints:

```json
{
  "error": "Error description here"
}
```

---

## Database Requirements

### Table: `officer_validations`

The endpoints expect the following schema:

```sql
CREATE TABLE officer_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_uid TEXT UNIQUE NOT NULL,
  provisional_case_name TEXT NOT NULL,
  data JSONB NOT NULL,
  being_reviewed_by TEXT,
  being_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Function: `claim_next_officer`

Required for the claim endpoint. See `supabase/migrations/002_create_claim_function.sql`.

---

## Implementation Notes

### Atomic Operations

The claim endpoint uses PostgreSQL's `FOR UPDATE SKIP LOCKED` to ensure atomic officer assignment, preventing race conditions when multiple validators try to claim officers simultaneously.

### Lock Management

- Officers are locked by setting `being_reviewed_by` and `being_reviewed_at`
- Locks are released when:
  - Officer is validated (correct/incorrect/needs_review)
  - Officer is manually released
  - Stale lock cleanup runs (30+ minutes old)

### JSONB Data Structure

The `data` column contains nested JSON with officer info, employment history, citations, and validation metadata. See `lib/types.ts` for the complete structure.

---

## Next Steps

After Phase 2 completion, the next phase will create React Query hooks to consume these endpoints:
- `useClaimOfficer()` - Mutation hook for claiming officers
- `useValidateOfficer()` - Mutation hook for validating officers
- `useReleaseOfficer()` - Mutation hook for releasing officers
- `useValidationStats()` - Query hook for stats (with 30s polling)
- `useQueueStatus()` - Query hook for queue status (with 10s polling)
