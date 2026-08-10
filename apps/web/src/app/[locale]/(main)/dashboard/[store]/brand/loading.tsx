import { BrandShell, BrandSkeleton } from "./_components/shell";

// Mirrors the brand page shell so navigation lands without layout shift.
export default () => <BrandShell content={<BrandSkeleton />} />;
