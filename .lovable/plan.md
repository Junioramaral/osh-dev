

# Fix: Ticket Count and Last Activity in Tenant User Report

## Root Cause

In `TenantUserReport.tsx`, the queries for ticket count and last activity filter by `analyst_id` or `lock_owner_id`. Client users create tickets and are identified by `contact_email`, not by analyst fields. So their tickets are never counted.

## Solution

Modify `src/components/tenants/TenantUserReport.tsx` to query tickets using the user's email (`contact_email`) in addition to `analyst_id`/`lock_owner_id`.

### Changes in the `queryFn` (single file)

**Ticket count query (line 81-85):** Replace the `.or(analyst_id, lock_owner_id)` filter with a broader filter that also matches `contact_email.eq.{userEmail}`:

```typescript
.or(`analyst_id.eq.${profile.id},lock_owner_id.eq.${profile.id},contact_email.eq.${email}`)
```

Where `email` comes from the already-fetched `authUser`.

**Last ticket activity query (lines 102-108):** Same fix -- include `contact_email.eq.${email}` in the `.or()` filter so tickets created by the user are also considered for last activity.

**Last activity should also consider `created_at`:** Currently only checks `updated_at` on tickets. For a user who just created a ticket, `created_at` is the relevant timestamp. We should use `created_at` as well (or keep `updated_at` since it defaults to `now()` on creation, which should work).

### Summary

- **File**: `src/components/tenants/TenantUserReport.tsx`
- **What changes**: Two `.or()` filters gain a `contact_email.eq.{email}` condition
- **No database changes needed**

