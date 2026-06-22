# Phase 1 — Backend Test Checklist
# Digital Invitations API

Base URL : http://localhost:8000/api
Admin    : kumarsudhanshurakesh@gmail.com  /  Sud@5365#
Server   : uvicorn server:app --reload --port 8000  (run from /backend)

================================================================
STEP 0 — GET TOKENS  (run these first, copy the tokens)
================================================================

## 0-A  Login as ADMIN  →  copy ADMIN_TOKEN
```
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"kumarsudhanshurakesh@gmail.com\",\"password\":\"Sud@5365#\"}" \
  | python -m json.tool
```
Expected: { "token": "eyJ...", "user": { "role": "admin", ... } }

---

## 0-B  Register a test USER  →  copy USER_TOKEN
```
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"testuser_inv@example.com\",\"password\":\"Test@1234\"}" \
  | python -m json.tool
```
Expected: { "token": "eyJ...", "user": { "role": "user", ... } }

================================================================
VARIABLES  (replace these placeholders in every curl below)
================================================================
  USER_TOKEN   = token from step 0-B
  ADMIN_TOKEN  = token from step 0-A
  INV_ID       = invitation id returned after step 1


================================================================
TEST 1 — CREATE INVITATION  (POST /api/invitations)
================================================================
Auth required: YES (user token)
Expected status: 200
Creates a new document in the `invitations` collection.

```
curl -s -X POST http://localhost:8000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d "{
    \"title\": \"Priya's Birthday Bash\",
    \"host_name\": \"Rahul Kumar\",
    \"occasion_type\": \"birthday_party\",
    \"event_date\": \"2025-12-15\",
    \"event_time\": \"7:00 PM\",
    \"venue_name\": \"The Grand Hall\",
    \"venue_address\": \"123 MG Road, Bengaluru\",
    \"description\": \"Join us for an unforgettable evening!\",
    \"rsvp_enabled\": true,
    \"rsvp_deadline\": \"2025-12-10\",
    \"rsvp_options\": [{\"label\":\"Attending\",\"emoji\":\"🎉\"},{\"label\":\"Not Attending\",\"emoji\":\"😔\"},{\"label\":\"Maybe\",\"emoji\":\"🤔\"}],
    \"max_guests_per_rsvp\": 2,
    \"theme\": \"elegant_ivory\",
    \"dress_code\": \"Smart Casual\",
    \"lock_pin\": \"1234\",
    \"lock_hint\": \"Ask Rahul\"
  }" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Response contains "id" field  →  copy this as INV_ID
[ ] "user_id" matches your user's id
[ ] "view_count" is 0
[ ] "rsvp_entries" is []
[ ] "created_at" and "updated_at" are present
[ ] "lock_pin" is "1234"
[ ] "rsvp_options" has 3 items


================================================================
TEST 2 — LIST INVITATIONS  (GET /api/invitations)
================================================================
Auth required: YES
Expected status: 200
User sees only their own. Admin sees all.

## 2-A  As user — should see the one just created
```
curl -s http://localhost:8000/api/invitations \
  -H "Authorization: Bearer USER_TOKEN" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Returns array with at least 1 item
[ ] Item "id" matches INV_ID
[ ] No other users' invitations visible

---

## 2-B  As admin — should see all invitations
```
curl -s http://localhost:8000/api/invitations \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Returns array (may include user's invitation)
[ ] No 403 or 401 error

---

## 2-C  No token — should be rejected
```
curl -s http://localhost:8000/api/invitations \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 401 or 403
[ ] NOT a list of invitations


================================================================
TEST 3 — GET SINGLE INVITATION  (GET /api/invitations/{id})
================================================================
Auth required: NO (public route)
Expected status: 200
Also increments view_count by 1 each call.

```
curl -s http://localhost:8000/api/invitations/INV_ID \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Returns full invitation object
[ ] "view_count" is 1 (first public access)
[ ] Call it again → "view_count" becomes 2

## 3-B  Invalid UUID — should 400
```
curl -s http://localhost:8000/api/invitations/not-a-uuid \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 400 with "Invalid invitation ID"

## 3-C  Unknown UUID — should 404
```
curl -s http://localhost:8000/api/invitations/00000000-0000-0000-0000-000000000000 \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 404 with "Invitation not found"


================================================================
TEST 4 — EDIT INVITATION  (PUT /api/invitations/{id})
================================================================
Auth required: YES
Expected status: 200
Only owner or admin can update.

## 4-A  Update title and dress_code as owner
```
curl -s -X PUT http://localhost:8000/api/invitations/INV_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d "{\"title\":\"Priya's Epic Birthday\",\"dress_code\":\"Black Tie\"}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] "title" is now "Priya's Epic Birthday"
[ ] "dress_code" is "Black Tie"
[ ] "updated_at" is newer than "created_at"
[ ] All other fields remain unchanged (venue, rsvp_options, etc.)

---

## 4-B  Another user should NOT be able to edit  (use admin token to register a second user first if needed)
##      Simplest check: try with wrong token or a freshly registered user's token
```
curl -s -X PUT http://localhost:8000/api/invitations/INV_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d "{\"title\":\"Admin Override Title\"}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Admin CAN update (200) — admin bypasses user_id check
[ ] Title changes to "Admin Override Title"

---

## 4-C  No token — should 401/403
```
curl -s -X PUT http://localhost:8000/api/invitations/INV_ID \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Hacked\"}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 401 or 403


================================================================
TEST 5 — DELETE INVITATION  (DELETE /api/invitations/{id})
================================================================
Auth required: YES
Expected status: 200
NOTE: Create a second invitation first so test 5 doesn't break tests 6/7.

## 5-A  Create a throwaway invitation to delete
```
curl -s -X POST http://localhost:8000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d "{\"title\":\"Delete Me\",\"host_name\":\"Nobody\",\"occasion_type\":\"custom\",\"event_date\":\"2025-01-01\"}" \
  | python -m json.tool
```
→  copy its id as THROWAWAY_ID

## 5-B  Delete the throwaway
```
curl -s -X DELETE http://localhost:8000/api/invitations/THROWAWAY_ID \
  -H "Authorization: Bearer USER_TOKEN" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] { "message": "Invitation deleted successfully" }

## 5-C  Try to GET the deleted invitation — should 404
```
curl -s http://localhost:8000/api/invitations/THROWAWAY_ID \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 404

## 5-D  Try to delete someone else's invitation — should 404
##      (backend query includes user_id check, so it 404s not 403)
```
curl -s -X DELETE http://localhost:8000/api/invitations/INV_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  | python -m json.tool
```
Admin can delete any — so this should succeed.
Then recreate INV_ID via Test 1 again if needed for tests 6/7.


================================================================
TEST 6 — SUBMIT RSVP  (POST /api/invitations/{id}/rsvp)
================================================================
Auth required: NO (public route)
Expected status: 200
Appends to rsvp_entries array inside the invitation document.

## 6-A  First guest RSVP
```
curl -s -X POST http://localhost:8000/api/invitations/INV_ID/rsvp \
  -H "Content-Type: application/json" \
  -d "{\"guest_name\":\"Sunita Sharma\",\"response\":\"Attending\",\"guest_count\":2,\"message\":\"Can't wait!\"}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] { "message": "RSVP submitted successfully", "id": "some-uuid" }
[ ] "id" is a valid UUID

---

## 6-B  Second guest RSVP (different response)
```
curl -s -X POST http://localhost:8000/api/invitations/INV_ID/rsvp \
  -H "Content-Type: application/json" \
  -d "{\"guest_name\":\"Arjun Mehta\",\"response\":\"Maybe\",\"guest_count\":1}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Success response with different "id"

---

## 6-C  Guest count exceeds max_guests_per_rsvp (set to 2) — should be clamped
```
curl -s -X POST http://localhost:8000/api/invitations/INV_ID/rsvp \
  -H "Content-Type: application/json" \
  -d "{\"guest_name\":\"Greedy Guest\",\"response\":\"Attending\",\"guest_count\":99}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Success (not rejected)
[ ] When you fetch RSVP list (Test 7), this entry's guest_count is 2 (clamped to max)

---

## 6-D  RSVP on non-existent invitation — should 404
```
curl -s -X POST http://localhost:8000/api/invitations/00000000-0000-0000-0000-000000000000/rsvp \
  -H "Content-Type: application/json" \
  -d "{\"guest_name\":\"Ghost\",\"response\":\"Yes\",\"guest_count\":1}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 404

---

## 6-E  RSVP on invitation with rsvp_enabled=false
##      First disable RSVP on the invitation
```
curl -s -X PUT http://localhost:8000/api/invitations/INV_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d "{\"rsvp_enabled\":false}" \
  | python -m json.tool
```
Then try to RSVP:
```
curl -s -X POST http://localhost:8000/api/invitations/INV_ID/rsvp \
  -H "Content-Type: application/json" \
  -d "{\"guest_name\":\"Late Guest\",\"response\":\"Yes\",\"guest_count\":1}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 400 with "RSVP is not enabled for this invitation"

##      Re-enable RSVP after this test
```
curl -s -X PUT http://localhost:8000/api/invitations/INV_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d "{\"rsvp_enabled\":true}" \
  | python -m json.tool
```


================================================================
TEST 7 — VIEW RSVP LIST  (GET /api/invitations/{id}/rsvp)
================================================================
Auth required: NO (public route)
Expected status: 200
Returns RSVP config + all entries. Does NOT return full invitation.

```
curl -s http://localhost:8000/api/invitations/INV_ID/rsvp \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Response has "rsvp_entries" array with at least 2 items (from Test 6-A and 6-B)
[ ] Each entry has: id, guest_name, response, guest_count, created_at
[ ] "Greedy Guest" entry has guest_count = 2 (clamped)
[ ] Response has "rsvp_enabled", "rsvp_deadline", "rsvp_options", "max_guests_per_rsvp"
[ ] Response has "title" and "host_name"
[ ] Response does NOT have full fields like photos, song_url, lock_pin (projection)


================================================================
TEST 8 — ADMIN INVITATIONS LIST  (GET /api/admin/invitations)
================================================================
Auth required: YES (admin only)
Expected status: 200

## 8-A  Admin can access
```
curl -s http://localhost:8000/api/admin/invitations \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Returns array with at least 1 item
[ ] Each item has: id, title, host_name, occasion_type, event_date, view_count
[ ] Each item has: "owner_name" and "owner_email" (attached from users collection)
[ ] Each item has: "rsvp_count" (integer — count of rsvp_entries)
[ ] "rsvp_entries" array is NOT present (stripped before return)
[ ] "rsvp_count" matches the number of RSVPs submitted in Test 6

---

## 8-B  Regular user cannot access — should 403
```
curl -s http://localhost:8000/api/admin/invitations \
  -H "Authorization: Bearer USER_TOKEN" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 403 with "Admin only"

---

## 8-C  No token — should 401/403
```
curl -s http://localhost:8000/api/admin/invitations \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 401 or 403


================================================================
TEST 9 — ADMIN STATS  (GET /api/admin/stats)
================================================================
Auth required: YES (admin only)
Expected status: 200
Existing fields must still be present. New field added.

```
curl -s http://localhost:8000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] "total_events"       is present (existing field — must not be missing)
[ ] "total_users"        is present (existing field — must not be missing)
[ ] "total_views"        is present (existing field — must not be missing)
[ ] "total_invitations"  is present (NEW field)
[ ] "total_invitations"  value >= 1 (at least the one created in Test 1)
[ ] No extra/unexpected fields
[ ] Status 200

## 9-B  Regular user cannot access
```
curl -s http://localhost:8000/api/admin/stats \
  -H "Authorization: Bearer USER_TOKEN" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 403


================================================================
TEST 10 — MAINTENANCE MODE BLOCKS INVITATION CREATION
================================================================
Auth required: YES
Tests that regular users cannot create invitations during maintenance.
Admin should still be able to create.

## 10-A  Turn ON maintenance (admin only)
```
curl -s -X POST http://localhost:8000/api/admin/maintenance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d "{\"maintenance\":true}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] { "maintenance": true }

---

## 10-B  User tries to create invitation — should be blocked
```
curl -s -X POST http://localhost:8000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d "{\"title\":\"Should Fail\",\"host_name\":\"Nobody\",\"occasion_type\":\"custom\",\"event_date\":\"2025-01-01\"}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 503
[ ] { "detail": "maintenance" }

---

## 10-C  Admin can still create during maintenance
```
curl -s -X POST http://localhost:8000/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d "{\"title\":\"Admin During Maintenance\",\"host_name\":\"Admin\",\"occasion_type\":\"corporate\",\"event_date\":\"2025-06-01\"}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 200 (admin bypasses maintenance)
[ ] Invitation created successfully with an "id"

---

## 10-D  Turn OFF maintenance (cleanup)
```
curl -s -X POST http://localhost:8000/api/admin/maintenance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d "{\"maintenance\":false}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] { "maintenance": false }

---

## 10-E  Verify existing celebration creation still works after turning maintenance off
##       (confirms we didn't break the events endpoint)
```
curl -s -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d "{\"person_name\":\"Regression Test\",\"occasion_type\":\"birthday\",\"event_date\":\"2025-12-01\",\"theme\":\"royal_gold\"}" \
  | python -m json.tool
```

WHAT TO CHECK:
[ ] Status 200
[ ] Event created with an "id"  →  confirms existing code untouched


================================================================
FULL PASS CRITERIA
================================================================

All boxes checked = Phase 1 backend is production ready.

If any check fails, note:
  - Which test number
  - Expected vs actual HTTP status
  - Expected vs actual response body
  - Then report back before proceeding to Phase 2.

================================================================
CLEANUP (optional — after all tests pass)
================================================================

Delete the test user (as admin):
  1. Get user id from GET /api/admin/users
  2. DELETE /api/admin/users/{user_id}  with ADMIN_TOKEN
     (this also deletes their invitations and events)
