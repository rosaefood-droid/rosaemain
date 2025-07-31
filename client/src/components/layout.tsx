import { Sidebar } from "@/components/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-rosae-black">
      <Sidebar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

export default Layout;