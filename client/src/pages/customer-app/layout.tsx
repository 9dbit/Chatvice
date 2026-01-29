import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Store, Users, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatRoutes, isChatSubdomain } from "@/lib/chat-routes";
import { ThemeToggle } from "@/components/theme-toggle";
import chatviceLogoLight from "@assets/Chatvice-02_1769691434945.png";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";

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
  const navRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { data: customer } = useQuery<CustomerData>({
    queryKey: ["/api/customer/me"],
  });
  
  const navItems = [
    { href: chatRoutes.settings(), icon: User, label: "Profile" },
    { href: chatRoutes.stores(), icon: Store, label: "Stores" },
    { href: chatRoutes.contacts(), icon: Users, label: "Contacts" },
    { href: chatRoutes.inbox(), icon: MessageSquare, label: "Chats" },
  ];
  
  const sidebarNavItems = [
    { href: chatRoutes.inbox(), icon: MessageSquare, label: "Chats" },
    { href: chatRoutes.stores(), icon: Store, label: "Stores" },
    { href: chatRoutes.contacts(), icon: Users, label: "Contacts" },
    { href: chatRoutes.settings(), icon: User, label: "Profile" },
  ];
  
  // Find active nav item index
  const activeIndex = navItems.findIndex(item => location.startsWith(item.href));
  
  useEffect(() => {
    const updateSlider = () => {
      if (navRef.current && activeIndex >= 0) {
        const activeButton = navRef.current.querySelector(`[data-nav-index="${activeIndex}"]`) as HTMLElement;
        if (activeButton) {
          const containerRect = navRef.current.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          setSliderStyle({
            left: buttonRect.left - containerRect.left,
            width: buttonRect.width,
          });
          if (!isInitialized) {
            requestAnimationFrame(() => setIsInitialized(true));
          }
        }
      }
    };
    
    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [activeIndex, location, isInitialized]);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 px-4 flex flex-wrap items-center justify-between gap-2 glass-header sticky top-0 z-[9999]">
        <Link href={chatRoutes.inbox()} className="flex flex-wrap items-center gap-2" data-testid="link-chatvice-home">
          <img 
            src={chatviceLogoLight} 
            alt="Chatvice" 
            className="h-7 dark:hidden"
          />
          <img 
            src={chatviceLogoDark} 
            alt="Chatvice" 
            className="h-7 hidden dark:block"
          />
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
      
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 h-12 sm:hidden z-[9999] rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
        <div 
          ref={navRef}
          className="flex items-center justify-center gap-1 h-full px-2 relative"
        >
          <div 
            className={cn(
              "absolute top-1 bottom-1 rounded-full bg-primary",
              isInitialized ? "transition-all duration-200 ease-out" : "transition-none"
            )}
            style={{ 
              left: `${sliderStyle.left}px`, 
              width: `${sliderStyle.width}px`,
              opacity: activeIndex >= 0 ? 1 : 0
            }}
            data-testid="nav-slider"
          />
          {navItems.map((item, index) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-nav-index={index}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200 z-10 relative",
                  isActive 
                    ? "text-primary-foreground" 
                    : "text-muted-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
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
