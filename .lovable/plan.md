

# Remove Duplicate "Permissões" Page

## Analysis

Both screens manage the same thing — user roles stored in `user_roles` table:

| Feature | Admin Tenants (TenantDetail) | Permissões (UserPermissions) |
|---------|------|------|
| Edit user roles | Yes (RoleCheckboxGroup) | Yes (RoleCheckboxGroup) |
| Multi-role support | Yes | Yes |
| Self-protection | No | Yes (super_admin) |
| Grouped by client | Yes (single tenant) | Yes (accordion all tenants) |
| Additional features | Invite, edit name/email/phone, deactivate, delete, resend invite, report | Only role editing |

**Conclusion**: UserPermissions is a subset of TenantDetail functionality. The role management in TenantDetail is more complete (includes user lifecycle management). The only unique feature in UserPermissions is the cross-tenant view with accordion grouping and self-protection for super_admin.

## Plan

### 1. Remove the Permissões menu item and route

**`src/components/layout/AppLayout.tsx`**: Remove the "Permissões" entry from `adminNav`.

**`src/App.tsx`**: Remove the `/admin/permissions` route and the `UserPermissions` import.

### 2. Delete the page file

Delete `src/pages/UserPermissions.tsx`.

### 3. Keep the hook (still used)

`src/hooks/useUserPermissions.ts` — verify if it's used elsewhere. If only used by UserPermissions, delete it too.

### Technical details

- Remove nav item at line ~61 of `AppLayout.tsx`
- Remove route at line ~62 of `App.tsx`
- Delete `src/pages/UserPermissions.tsx`
- Check and potentially delete `src/hooks/useUserPermissions.ts`
- The `RoleCheckboxGroup` component stays (used by TenantDetail)

