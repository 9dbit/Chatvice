import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Store, Users, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatRoutes, isChatSubdomain } from "@/lib/chat-routes";
import { ThemeToggle } from "@/components/theme-toggle";
import chatviceIcon from "@assets/Chatvice_1769402303791.png";

interface CustomerData {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const [location] = useLocation();
  
  const { data: customer } = useQuery<CustomerData>({
    queryKey: ["/api/customer/me"],
  });
  
  const navItems = [
    { href: chatRoutes.settings(), icon: User, label: "Profile" },
    { href: chatRoutes.inbox(), icon: MessageSquare, label: "Chats" },
  ];
  
  const sidebarNavItems = [
    { href: chatRoutes.inbox(), icon: MessageSquare, label: "Chats" },
    { href: chatRoutes.stores(), icon: Store, label: "Stores" },
    { href: chatRoutes.contacts(), icon: Users, label: "Contacts" },
    { href: chatRoutes.settings(), icon: User, label: "Profile" },
  ];
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 px-4 flex flex-wrap items-center justify-between gap-2 glass-header sticky top-0 z-[9999]">
        <Link href={chatRoutes.inbox()} className="flex flex-wrap items-center gap-2" data-testid="link-chatvice-home">
          <img 
            src={chatviceIcon} 
            alt="Chatvice" 
            className="h-8 w-8"
          />
          <span className="font-semibold text-lg hidden sm:inline bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent">Chatvice</span>
        </Link>
        
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <span className="text-sm font-medium hidden sm:inline text-muted-foreground">
            {customer?.displayName || "Guest"}
          </span>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto pb-16 sm:pb-0">
        {children}
      </main>
      
      <nav className="fixed bottom-4 left-4 right-4 h-14 sm:hidden z-[9999] rounded-md bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
        <div className="flex items-center justify-between gap-4 h-full px-8">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-md transition-colors hover-elevate",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <aside className="hidden sm:flex fixed left-0 top-14 bottom-0 w-64 bg-background/95 backdrop-blur-sm flex-col z-[9998]" style={{ borderRight: '1px solid hsl(var(--border))' }}>
        <nav className="flex-1 p-4 space-y-2">
          {sidebarNavItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`sidebar-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={customer?.avatarUrl || undefined} />
              <AvatarFallback>
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{customer?.displayName || "Guest"}</p>
              <p className="text-sm text-muted-foreground truncate">
                {customer?.phoneNumber}
              </p>
            </div>
          </div>
        </div>
      </aside>
      
      <div className="hidden sm:block w-64 flex-shrink-0" />
    </div>
  );
}
