// src/app/(app)/privacy/page.tsx
import { requireRole } from "@/lib/auth";
import { getPrivacyContextAction } from "@/app/actions/privacy";
import PrivacyClient from "./PrivacyClient";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const { org, member } = await requireRole([
    "owner",
    "manager",
    "accountant",
    "employee",
  ]);

  const context = await getPrivacyContextAction(member.employee_id || undefined);

  return (
    <PrivacyClient
      userRole={member.role}
      currentOrg={org}
      initialEmployee={context.employee}
      initialConsents={context.consents || {
        biometric_selfie: { granted: false },
        location: { granted: false },
        whatsapp: { granted: false },
      }}
      initialMyRequests={context.myErasureRequests || []}
      initialOrgQueue={context.orgPendingQueue || []}
      retentionPolicies={context.retentionPolicies || []}
    />
  );
}
