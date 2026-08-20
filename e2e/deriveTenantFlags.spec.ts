import { test, expect } from "@playwright/test";
import { deriveTenantFlags } from "../src/lib/deriveTenantFlags";

test.describe("deriveTenantFlags", () => {
  test("tenant_admin (also covers the platform-admin dual-hat case, same tenant_users role)", () => {
    expect(deriveTenantFlags({ tenantRole: "tenant_admin" })).toEqual({
      isTenantStaff: true,
      isTenantAdmin: true,
      isAnalyst: false,
    });
  });

  test("analyst_db", () => {
    expect(deriveTenantFlags({ tenantRole: "analyst_db" })).toEqual({
      isTenantStaff: true,
      isTenantAdmin: false,
      isAnalyst: true,
    });
  });

  test("analyst_app", () => {
    expect(deriveTenantFlags({ tenantRole: "analyst_app" })).toEqual({
      isTenantStaff: true,
      isTenantAdmin: false,
      isAnalyst: true,
    });
  });

  test("client contact / no tenant_users row (tenantRole: null)", () => {
    expect(deriveTenantFlags({ tenantRole: null })).toEqual({
      isTenantStaff: false,
      isTenantAdmin: false,
      isAnalyst: false,
    });
  });
});
