import { NextRequest, NextResponse } from "next/server";

export function getTenantIdFromRequest(req: NextRequest): string | undefined {
  const header = req.headers.get("x-tenant-id");
  return header || undefined;
}

export function requireTenant(req: NextRequest): NextResponse | void {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }
}
