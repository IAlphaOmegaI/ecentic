/**
 * Set `NEXT_PUBLIC_APP_SCOPE=onboarding` on Vercel (or `.env.local`) to ship a
 * demo that hides the dashboard: `/dashboard` redirects to onboarding; post-login
 * goes to `/onboarding/connect`. Omit or use `full` for the normal product.
 */
export const isOnboardingOnlyScope =
  process.env.NEXT_PUBLIC_APP_SCOPE?.trim() === "onboarding";

export const postAuthLandingPath = isOnboardingOnlyScope
  ? "/onboarding/connect"
  : "/dashboard";
