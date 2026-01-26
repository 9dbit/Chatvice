import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Store, Users, Pin, Plus, Search, Sparkles, Settings2 } from "lucide-react";
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

function FavoriteAvatar({ 
  name, 
  avatarUrl, 
  onClick 
}: { 
  name: string; 
  avatarUrl?: string | null; 
  onClick?: () => void;
}) {
  return (
    <button 
      className="flex flex-col items-center gap-1.5 min-w-[64px]" 
      onClick={onClick}
      data-testid={`favorite-${name}`}
    >
      <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-purple-500 to-indigo-500">
        <div className="w-full h-full rounded-full bg-white p-0.5">
          <Avatar className="w-full h-full">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 text-lg font-medium">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-xs text-gray-700 dark:text-gray-300 truncate w-16 text-center font-medium">
        {name.split(' ')[0]}
      </span>
    </button>
  );
}

function ChatListItem({ 
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
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700"
      data-testid={testId}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatarUrl || undefined} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700">
            {Icon ? <Icon className="w-5 h-5" /> : name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-gray-900 dark:text-white truncate">{name}</span>
            {isPinned && <Pin className="w-3 h-3 text-gray-400 flex-shrink-0" />}
          </div>
          {time && (
            <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
              {time}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {lastMessage}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#4B2CFF] text-white text-xs font-medium flex items-center justify-center">
              {unreadCount}
            </span>
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
  
  const hasFavorites = favoriteContacts.length > 0 || stories.length > 0;
  
  return (
    <CustomerLayout hideHeader>
      <div className="min-h-screen bg-[#F4F5F7] dark:bg-gray-900">
        <div className="bg-gradient-to-r from-[#4B2CFF] to-[#5B5CFF] px-4 pt-12 pb-6 rounded-b-3xl">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">Inbox</h1>
                {totalUnread > 0 && (
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {totalUnread}
                  </span>
                )}
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-white hover:bg-white/10"
                onClick={() => navigate(chatRoutes.settings())}
                data-testid="button-settings"
              >
                <Settings2 className="w-5 h-5" />
              </Button>
            </div>
            
            {hasFavorites && (
              <div className="mb-2">
                <h2 className="text-white/80 text-sm font-medium mb-3">Favorite Contact</h2>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                  {stories.map((story) => (
                    <FavoriteAvatar
                      key={story.id}
                      name={story.merchant?.companyName || story.customer?.displayName || "Story"}
                      avatarUrl={story.merchant?.profilePhotoUrl || story.customer?.avatarUrl}
                    />
                  ))}
                  {favoriteContacts.map((contact) => (
                    <FavoriteAvatar 
                      key={contact.id} 
                      name={contact.displayName}
                      avatarUrl={contact.avatarUrl}
                      onClick={() => handleStartChat(contact)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto px-4 -mt-2">
          <div className="relative mb-4 mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-white dark:bg-gray-800 border-0 shadow-sm"
              data-testid="input-search"
            />
          </div>
          
          <Tabs defaultValue="stores" className="w-full">
            <TabsList className="w-full bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm mb-4 h-auto">
              <TabsTrigger 
                value="stores" 
                className="flex-1 gap-2 py-2.5 rounded-xl data-[state=active]:bg-[#4B2CFF] data-[state=active]:text-white"
              >
                <Store className="w-4 h-4" />
                Stores
                {storeChats.filter(c => c.unreadCount > 0).length > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {storeChats.filter(c => c.unreadCount > 0).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="personal" 
                className="flex-1 gap-2 py-2.5 rounded-xl data-[state=active]:bg-[#4B2CFF] data-[state=active]:text-white"
              >
                <Users className="w-4 h-4" />
                Personal
                {personalChats.filter(c => c.unreadCount > 0).length > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {personalChats.filter(c => c.unreadCount > 0).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="stores" className="mt-0 space-y-3 pb-24">
              {storeChatsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 animate-pulse rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStoreChats.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl text-center py-12 shadow-sm">
                  <Store className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No store conversations yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Start chatting with official stores
                  </p>
                  <Button 
                    onClick={() => navigate(chatRoutes.stores())} 
                    className="bg-[#4B2CFF] hover:bg-[#3B1CFF] text-white rounded-xl"
                    data-testid="button-browse-stores"
                  >
                    Browse Stores
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStoreChats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      href={chatRoutes.store(chat.merchantId)}
                      avatarUrl={chat.merchant?.profilePhotoUrl}
                      name={chat.merchant?.companyName || "Unknown Store"}
                      lastMessage={chat.lastMessage?.content || "No messages yet"}
                      time={chat.lastMessage?.createdAt 
                        ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: false })
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
            
            <TabsContent value="personal" className="mt-0 space-y-3 pb-24">
              {personalChatsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-gray-800 animate-pulse rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPersonalChats.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl text-center py-12 shadow-sm">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No personal chats yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Start a conversation with your contacts
                  </p>
                  <Button 
                    onClick={() => navigate(chatRoutes.contacts())} 
                    className="bg-[#4B2CFF] hover:bg-[#3B1CFF] text-white rounded-xl"
                    data-testid="button-view-contacts"
                  >
                    View Contacts
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPersonalChats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      href={chatRoutes.personal(chat.id)}
                      avatarUrl={chat.otherParticipant?.avatarUrl}
                      name={chat.otherParticipant?.displayName || chat.otherParticipant?.phoneNumber || "Unknown"}
                      lastMessage={chat.lastMessage?.content || "No messages yet"}
                      time={chat.lastMessage?.createdAt 
                        ? formatDistanceToNow(new Date(chat.lastMessage.createdAt), { addSuffix: false })
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
        
        <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="icon" 
              className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#4B2CFF] hover:bg-[#3B1CFF] text-white shadow-lg z-50" 
              data-testid="button-new-chat"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="font-semibold mb-2">No contacts yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add contacts to start personal conversations
                  </p>
                  <Button 
                    onClick={() => { setNewChatDialogOpen(false); navigate(chatRoutes.contacts()); }} 
                    className="bg-[#4B2CFF] text-white rounded-xl"
                    data-testid="button-add-contacts"
                  >
                    Add Contacts
                  </Button>
                </div>
              ) : (
                <div className="divide-y max-h-[300px] overflow-y-auto">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleStartChat(contact)}
                      className="flex flex-wrap items-center gap-3 p-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left rounded-xl"
                      data-testid={`contact-${contact.id}`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={contact.avatarUrl || undefined} />
                        <AvatarFallback className="bg-purple-100 text-purple-700">
                          {contact.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contact.displayName}</p>
                        {contact.phoneNumber && (
                          <p className="text-sm text-gray-500 truncate">
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
                  className="w-full rounded-xl"
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
    </CustomerLayout>
  );
}
