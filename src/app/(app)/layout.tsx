import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AppNav />
      <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>
    </div>
  );
}
