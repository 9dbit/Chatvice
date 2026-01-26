import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Store, Users, Pin, Plus, Search, Sparkles } from "lucide-react";
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
  isFavorite?: boolean;
}

interface CustomerStory {
  id: string;
  customerId: string | null;
  merchantId: string | null;
  type: string;
  thumbnailUrl: string | null;
  content: string | null;
  customer?: {
    displayName: string | null;
    avatarUrl: string | null;
  };
  merchant?: {
    companyName: string | null;
    profilePhotoUrl: string | null;
  };
}

function StoryCapsule({ story }: { story: CustomerStory }) {
  const name = story.merchant?.companyName || story.customer?.displayName || "Story";
  const avatarUrl = story.merchant?.profilePhotoUrl || story.customer?.avatarUrl;
  const isAd = story.type === "advertisement";
  
  return (
    <button className="flex flex-col items-center gap-1 min-w-[72px]" data-testid={`story-${story.id}`}>
      <div className="story-ring">
        <div className="story-ring-inner">
          <Avatar className="w-14 h-14">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
              {isAd ? <Sparkles className="w-5 h-5" /> : name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-xs text-muted-foreground truncate w-16 text-center">
        {isAd ? "Promo" : name.split(' ')[0]}
      </span>
    </button>
  );
}

function FavoriteContactCapsule({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  return (
    <button 
      className="flex flex-col items-center gap-1 min-w-[72px]" 
      onClick={onClick}
      data-testid={`favorite-${contact.id}`}
    >
      <div className="p-0.5 rounded-full border-2 border-primary/30">
        <Avatar className="w-14 h-14">
          <AvatarImage src={contact.avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
            <Users className="w-5 h-5 text-primary" />
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xs text-muted-foreground truncate w-16 text-center">
        {contact.displayName.split(' ')[0]}
      </span>
    </button>
  );
}

function ChatCard({ 
  avatarUrl, 
  name, 
  lastMessage, 
  time, 
  unreadCount, 
  isPinned, 
  isOnline, 
  href,
  testId,
  icon: Icon
}: { 
  avatarUrl?: string | null; 
  name: string; 
  lastMessage: string; 
  time?: string; 
  unreadCount: number; 
  isPinned?: boolean;
  isOnline?: boolean;
  href: string;
  testId: string;
  icon?: typeof Store;
}) {
  return (
    <Link
      href={href}
      className="glass-card rounded-xl p-3 flex items-center gap-3 hover-elevate transition-all"
      data-testid={testId}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
            {Icon ? <Icon className="w-5 h-5 text-primary" /> : name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{name}</span>
            {isPinned && <Pin className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
          </div>
          {time && (
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {time}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage}
          </p>
          {unreadCount > 0 && (
            <Badge className="h-5 min-w-5 flex-shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
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

  const { data: stories = [] } = useQuery<CustomerStory[]>({
    queryKey: ["/api/customer/stories"],
  });
  
  const favoriteContacts = contacts.filter(c => c.isFavorite);
  
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
  
  const hasStories = stories.length > 0;
  const hasFavorites = favoriteContacts.length > 0;
  
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
                <Button size="icon" className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0" data-testid="button-new-chat">
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
                          className="flex flex-wrap items-center gap-3 p-3 w-full hover:bg-muted/50 transition-colors text-left rounded-lg"
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
          
          {(hasStories || hasFavorites) && (
            <div className="mb-6 -mx-4 px-4">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {stories.map((story) => (
                  <StoryCapsule key={story.id} story={story} />
                ))}
                {favoriteContacts.map((contact) => (
                  <FavoriteContactCapsule 
                    key={contact.id} 
                    contact={contact}
                    onClick={() => handleStartChat(contact)}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 glass-input"
              data-testid="input-search"
            />
          </div>
          
          <Tabs defaultValue="stores" className="w-full">
            <TabsList className="w-full glass-card mb-4">
              <TabsTrigger value="stores" className="flex-1 gap-2">
                <Store className="w-4 h-4" />
                Stores
                {storeChats.filter(c => c.unreadCount > 0).length > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">
                    {storeChats.filter(c => c.unreadCount > 0).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex-1 gap-2">
                <Users className="w-4 h-4" />
                Personal
                {personalChats.filter(c => c.unreadCount > 0).length > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0">
                    {personalChats.filter(c => c.unreadCount > 0).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="stores" className="mt-0 space-y-3">
              {storeChatsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="glass-card animate-pulse rounded-xl p-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStoreChats.length === 0 ? (
                <div className="glass-card rounded-xl text-center py-12">
                  <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No store conversations yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start chatting with official stores
                  </p>
                  <Button 
                    onClick={() => navigate(chatRoutes.stores())} 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0"
                    data-testid="button-browse-stores"
                  >
                    Browse Stores
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStoreChats.map((chat) => (
                    <ChatCard
                      key={chat.id}
                      href={chatRoutes.store(chat.merchantId)}
                      avatarUrl={chat.merchant?.profilePhotoUrl}
                      name={chat.merchant?.companyName || "Unknown Store"}
                      lastMessage={chat.lastMessage?.content || "No messages yet"}
                      time={chat.lastMessage?.createdAt 
                        ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true })
                        : undefined
                      }
                      unreadCount={chat.unreadCount}
                      isPinned={chat.isPinned}
                      isOnline={chat.merchant?.online}
                      testId={`chat-store-${chat.merchantId}`}
                      icon={Store}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="personal" className="mt-0 space-y-3">
              {personalChatsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="glass-card animate-pulse rounded-xl p-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPersonalChats.length === 0 ? (
                <div className="glass-card rounded-xl text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No personal chats yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a conversation with your contacts
                  </p>
                  <Button 
                    onClick={() => navigate(chatRoutes.contacts())} 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0"
                    data-testid="button-view-contacts"
                  >
                    View Contacts
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPersonalChats.map((chat) => (
                    <ChatCard
                      key={chat.id}
                      href={chatRoutes.personal(chat.id)}
                      avatarUrl={chat.otherParticipant?.avatarUrl}
                      name={chat.otherParticipant?.displayName || chat.otherParticipant?.phoneNumber || "Unknown"}
                      lastMessage={chat.lastMessage?.content || "No messages yet"}
                      time={chat.lastMessage?.createdAt 
                        ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: true })
                        : undefined
                      }
                      unreadCount={chat.unreadCount}
                      testId={`chat-personal-${chat.id}`}
                      icon={Users}
                    />
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
