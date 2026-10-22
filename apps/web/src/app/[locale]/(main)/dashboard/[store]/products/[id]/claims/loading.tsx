import { ClaimsShell, ClaimsSkeleton } from "./_components/shell";

// Mirrors the claims page shell so navigation lands without layout shift.
export default () => <ClaimsShell content={<ClaimsSkeleton />} />;
