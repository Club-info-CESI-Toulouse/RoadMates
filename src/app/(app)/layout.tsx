import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { NotificationBanners } from "@/components/notification-banners";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AppNav />
      <Suspense fallback={null}>
        <NotificationBanners />
      </Suspense>
      <div className="flex flex-1 flex-col pb-28 md:pb-0">{children}</div>
    </div>
  );
}
