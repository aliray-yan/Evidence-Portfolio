"use client";

import MigrationPanel from "./MigrationPanel";
import AuditLogPanel from "./AuditLogPanel";

const CAN_WRITE_ROLES = ["ADMIN", "MIGRATION_ENGINEER"];
const AUDIT_VIEW_ROLES = ["ADMIN"];

// The retail tenant's workspace: it is the migration console, so the
// cutover controls are the whole thing.
//
// The routing grid, breaker list and audit table used to live here inline.
// They moved into MigrationPanel/AuditLogPanel when aviation got a cutover
// of its own — same widgets, same behavior, one copy. What's specific to
// retail is only which roles may act, so that's all that's left here.
export default function RetailWorkspace() {
  return (
    <>
      <MigrationPanel canWriteRoles={CAN_WRITE_ROLES} />
      <AuditLogPanel viewRoles={AUDIT_VIEW_ROLES} />
    </>
  );
}
