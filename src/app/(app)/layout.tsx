import BottomNav from "@/components/shell/BottomNav";
import SideNav from "@/components/shell/SideNav";
import TopBar from "@/components/shell/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop Navigation Sidebar (hidden on mobile) */}
      <SideNav />

      {/* Main Content Area */}
      <div className="md:pl-[240px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 pb-24 md:pb-8">
          {children}
        </main>
        {/* Mobile Navigation Bar (hidden on desktop) */}
        <BottomNav />
      </div>
    </div>
  );
}
