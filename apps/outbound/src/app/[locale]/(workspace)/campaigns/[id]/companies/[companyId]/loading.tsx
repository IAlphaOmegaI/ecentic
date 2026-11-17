import { ContactShell } from "./_components/shell";
import { ContactSkeleton } from "./_components/skeletons";

export default function Loading() {
  return (
    <ContactShell>
      <ContactSkeleton />
    </ContactShell>
  );
}
