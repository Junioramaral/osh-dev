

# Add "Último Login" Column to Tenant User Report

## Overview

Add a "Último Login" column to the user detail table, sourced from the `last_sign_in_at` field already available in the Supabase Auth users data (fetched via the `manage-user` edge function).

## Changes (single file)

**`src/components/tenants/TenantUserReport.tsx`**

1. Add `lastLogin: string | null` to the `UserStats` interface
2. In the `queryFn`, extract `authUser.last_sign_in_at` and include it in the returned user stats object
3. Add "Último Login" column header and cell to the detail table (between "Última Atividade" and "Cadastrado em")
4. Include "Último Login" in the CSV export headers and row data
5. Include "Último Login" in the PDF export table

No database changes needed — `last_sign_in_at` is already provided by Supabase Auth's `listUsers` response.

