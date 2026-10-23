/* eslint-disable @next/next/no-img-element -- static SVGs, no optimisation needed */

// RoadMates wordmark; the dark variant follows the app theme (data-theme).
export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <>
      <img src="/logo/roadmates-horizontal.svg" alt="RoadMates" className={`w-auto dark:hidden ${className}`} />
      <img src="/logo/roadmates-horizontal-dark.svg" alt="RoadMates" className={`hidden w-auto dark:block ${className}`} />
    </>
  );
}

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return <img src="/logo/roadmates-mark.svg" alt="" aria-hidden="true" className={className} />;
}
