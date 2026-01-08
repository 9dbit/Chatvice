import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Check 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface MerchantNotification {
  id: string;
  merchantId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons: Record<string, any> = {
  custom_plan_request: FileText,
  invoice: FileText,
  subscription: CheckCircle,
  alert: AlertCircle,
  default: Bell,
};

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500",
  under_review: "bg-yellow-500",
  pricing_proposed: "bg-purple-500",
  invoice_sent: "bg-green-500",
  closed: "bg-gray-500",
  rejected: "bg-red-500",
};

export function MerchantNotificationCenter() {
  const [open, setOpen] = useState(false);
  
  const { data: notifications = [], isLoading } = useQuery<MerchantNotification[]>({
    queryKey: ["/api/merchant/notifications"],
    refetchInterval: 30000,
  });
  
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/merchant/notifications/unread-count"],
    refetchInterval: 30000,
  });
  
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("PATCH", `/api/merchant/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/notifications/unread-count"] });
    },
  });
  
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/merchant/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/notifications/unread-count"] });
    },
  });
  
  const unreadCount = unreadData?.count || 0;
  
  const getNotificationLink = (notification: MerchantNotification) => {
    if (notification.type === "custom_plan_request" || notification.type === "invoice") {
      return "/dashboard/billing";
    }
    return null;
  };
  
  const handleNotificationClick = (notification: MerchantNotification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notification-center"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-xs bg-red-500 text-white"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        data-testid="popover-notifications"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold" data-testid="text-notifications-title">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => markAllReadMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              <Check className="w-3 h-3 mr-1" />
              Tandai Semua Dibaca
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Memuat...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => {
                const Icon = notificationIcons[notification.type] || notificationIcons.default;
                const link = getNotificationLink(notification);
                const status = notification.data?.status;
                
                const content = (
                  <div 
                    className={`flex gap-3 p-3 hover-elevate cursor-pointer transition-colors ${
                      !notification.isRead ? "bg-purple-50/50 dark:bg-purple-950/20" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        !notification.isRead ? "bg-purple-100 dark:bg-purple-900/50" : "bg-muted"
                      }`}>
                        <Icon className={`w-4 h-4 ${!notification.isRead ? "text-purple-600" : "text-muted-foreground"}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.isRead ? "font-medium" : ""}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {status && (
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] h-5 ${statusColors[status] || ""} text-white border-0`}
                          >
                            {status.replace(/_/g, " ")}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { 
                            addSuffix: true,
                            locale: idLocale 
                          })}
                        </span>
                      </div>
                    </div>
                    {link && (
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                );
                
                return link ? (
                  <Link 
                    key={notification.id} 
                    href={link} 
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="border-t px-4 py-2">
          <Link href="/dashboard/billing" onClick={() => setOpen(false)}>
            <Button 
              variant="ghost" 
              className="w-full text-sm justify-center"
              data-testid="button-view-all-notifications"
            >
              Lihat Semua di Billing
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
