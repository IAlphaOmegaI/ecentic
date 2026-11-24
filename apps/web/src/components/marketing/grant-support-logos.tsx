import Image from "next/image";

/** Original artwork is only scaled; white backing keeps it legible on dark surfaces. */
export const GrantSupportLogos = () => (
  <div className="flex items-center gap-4 sm:gap-8">
    <Image
      src="/grant2026/startup-albania.jpg"
      alt="Startup Albania"
      width={720}
      height={720}
      unoptimized
      className="h-28 w-auto shrink-0 sm:h-36"
    />
    <div className="shrink-0 bg-background-rich">
      <Image
        src="/grant2026/ministria-ekonomise-inovacionit.png"
        alt="Ministria e Ekonomisë dhe Inovacionit"
        width={2251}
        height={2251}
        unoptimized
        className="h-28 w-auto sm:h-36"
      />
    </div>
  </div>
);
