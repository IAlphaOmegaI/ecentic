import { Button } from "@zenncore/web/components/button";
import { headers } from "next/headers";
import Link from "next/link";
import { type PropsWithChildren, Suspense } from "react";
import { auth } from "@/lib/auth";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default async ({ children }: PropsWithChildren) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 py-16">
        <h1 className="font-medium text-2xl text-foreground">Unauthenticated</h1>
        <p className="max-w-md text-center font-light text-foreground-dimmed text-sm">
          Sign in to open the dashboard. If you already signed in, try again or
          clear site data for this origin.
        </p>
        <Button color="primary" render={<Link href="/sign-in" />}>
          Sign in
        </Button>
        <Button variant="outline" color="accent" render={<Link href="/" />}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Suspense
        fallback={
          <div className="h-full w-60 animate-pulse bg-background-rich" />
        }
      >
        <Sidebar />
      </Suspense>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
