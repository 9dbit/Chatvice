import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Store, Users, Pin, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import CustomerLayout from "./layout";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { chatRoutes } from "@/lib/chat-routes";

interface StoreChat {
  id: string;
  merchantId: string;
  sessionId: string;
  isPinned: boolean;
  unreadCount: number;
  lastMessageAt: string;
  merchant: {
    id: string;
    companyName: string;
    profilePhotoUrl: string | null;
    online: boolean;
  } | null;
  lastMessage: {
    content: string;
    from: string;
    createdAt: string;
  } | null;
}

interface PersonalChat {
  id: string;
  lastMessageAt: string;
  otherParticipant: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    phoneNumber: string;
  } | null;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface Contact {
  id: string;
  displayName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  contactCustomerId: string | null;
}

export default function CustomerInboxPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  
  const { data: storeChats = [], isLoading: storeChatsLoading } = useQuery<StoreChat[]>({
    queryKey: ["/api/customer/store-chats"],
  });
  
  const { data: personalChats = [], isLoading: personalChatsLoading } = useQuery<PersonalChat[]>({
    queryKey: ["/api/customer/personal-chats"],
  });
  
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/customer/contacts"],
  });
  
  const filteredStoreChats = storeChats.filter(chat => 
    chat.merchant?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredPersonalChats = personalChats.filter(chat => 
    chat.otherParticipant?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.otherParticipant?.phoneNumber?.includes(searchQuery)
  );
  
  const totalUnread = [...storeChats, ...personalChats].reduce(
    (sum, chat) => sum + (chat.unreadCount || 0), 
    0
  );
  
  const handleStartChat = (contact: Contact) => {
    setNewChatDialogOpen(false);
    if (contact.contactCustomerId) {
      navigate(chatRoutes.personalNew(contact.contactCustomerId));
    } else {
      navigate(chatRoutes.contacts());
    }
  };
  
  return (
    <CustomerLayout>
      <div className="sm:ml-64">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Messages</h1>
              {totalUnread > 0 && (
                <p className="text-sm text-muted-foreground">
                  {totalUnread} unread message{totalUnread > 1 ? "s" : ""}
                </p>
              )}
            </div>
            
            <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="outline" data-testid="button-new-chat">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {contacts.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No contacts yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add contacts to start personal conversations
                      </p>
                      <Button onClick={() => { setNewChatDialogOpen(false); navigate(chatRoutes.contacts()); }} data-testid="button-add-contacts">
                        Add Contacts
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y max-h-[300px] overflow-y-auto">
                      {contacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleStartChat(contact)}
                          className="flex flex-wrap items-center gap-3 p-3 w-full hover:bg-muted/50 transition-colors text-left"
                          data-testid={`contact-${contact.id}`}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={contact.avatarUrl || undefined} />
                            <AvatarFallback>
                              <Users className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{contact.displayName}</p>
                            {contact.phoneNumber && (
                              <p className="text-sm text-muted-foreground truncate">
                                {contact.phoneNumber}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setNewChatDialogOpen(false); navigate(chatRoutes.stores()); }}
                      data-testid="button-browse-stores-dialog"
                    >
                      <Store className="w-4 h-4 mr-2" />
                      Chat with Official Stores
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          
          <Tabs defaultValue="stores" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="stores" className="flex-1 gap-2">
                <Store className="w-4 h-4" />
                Stores
                {storeChats.filter(c => c.unreadCount > 0).length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5">
                    {storeChats.filter(c => c.unreadCount > 0).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex-1 gap-2">
                <Users className="w-4 h-4" />
                Personal
                {personalChats.filter(c => c.unreadCount > 0).length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5">
                    {personalChats.filter(c => c.unreadCount > 0).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="stores" className="mt-4">
              {storeChatsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex flex-wrap items-center gap-3 p-3">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStoreChats.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No store conversations yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start chatting with official stores
                  </p>
                  <Button onClick={() => navigate(chatRoutes.stores())} data-testid="button-browse-stores">
                    Browse Stores
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStoreChats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={chatRoutes.store(chat.merchantId)}
                      className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                      data-testid={`chat-store-${chat.merchantId}`}
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={chat.merchant?.profilePhotoUrl || undefined} />
                          <AvatarFallback>
                            <Store className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        {chat.merchant?.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {chat.merchant?.companyName || "Unknown Store"}
                            </span>
                            {chat.isPinned && <Pin className="w-3 h-3 text-muted-foreground" />}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {chat.lastMessage?.createdAt && 
                              formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true })
                            }
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.lastMessage?.content || "No messages yet"}
                          </p>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="personal" className="mt-4">
              {personalChatsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex flex-wrap items-center gap-3 p-3">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPersonalChats.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No personal chats yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a conversation with your contacts
                  </p>
                  <Button onClick={() => navigate(chatRoutes.contacts())} data-testid="button-view-contacts">
                    View Contacts
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredPersonalChats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={chatRoutes.personal(chat.id)}
                      className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                      data-testid={`chat-personal-${chat.id}`}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={chat.otherParticipant?.avatarUrl || undefined} />
                        <AvatarFallback>
                          <Users className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {chat.otherParticipant?.displayName || chat.otherParticipant?.phoneNumber || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {chat.lastMessage?.createdAt && 
                              formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true })
                            }
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.lastMessage?.content || "No messages yet"}
                          </p>
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </CustomerLayout>
  );
}
