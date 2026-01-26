import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search, Plus, Star, Trash2, MessageSquare, User } from "lucide-react";
import CustomerLayout from "./layout";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { chatRoutes } from "@/lib/chat-routes";

interface Contact {
  id: string;
  customerId: string;
  contactCustomerId: string | null;
  displayName: string;
  phoneNumber: string | null;
  isFavorite: boolean;
  createdAt: string;
}

export default function CustomerContactsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/customer/contacts"],
  });
  
  const addContactMutation = useMutation({
    mutationFn: async (data: { displayName: string; phoneNumber?: string }) => {
      const res = await apiRequest("POST", "/api/customer/contacts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/contacts"] });
      toast({ title: "Contact added" });
      setDialogOpen(false);
      setNewContactName("");
      setNewContactPhone("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("DELETE", `/api/customer/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/contacts"] });
      toast({ title: "Contact removed" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  const startChatMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const res = await apiRequest("POST", "/api/customer/personal-chats", { recipientId });
      return res.json();
    },
    onSuccess: (data) => {
      navigate(chatRoutes.personal(data.id));
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  const filteredContacts = contacts.filter(contact => 
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber?.includes(searchQuery)
  );
  
  const favoriteContacts = filteredContacts.filter(c => c.isFavorite);
  const regularContacts = filteredContacts.filter(c => !c.isFavorite);
  
  return (
    <CustomerLayout>
      <div className="sm:ml-64">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Contacts</h1>
              <p className="text-sm text-muted-foreground">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="outline" data-testid="button-add-contact">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newContactName.trim()) return;
                    addContactMutation.mutate({
                      displayName: newContactName.trim(),
                      phoneNumber: newContactPhone.trim() || undefined,
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Contact name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      data-testid="input-contact-phone"
                    />
                    <p className="text-xs text-muted-foreground">
                      If they're on Chatvice, you can chat with them directly
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={addContactMutation.isPending}
                    data-testid="button-save-contact"
                  >
                    {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-contacts"
            />
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add contacts to start personal conversations
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                Add Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {favoriteContacts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Star className="w-3 h-3" /> Favorites
                  </h3>
                  <div className="divide-y rounded-lg border">
                    {favoriteContacts.map((contact) => (
                      <ContactItem
                        key={contact.id}
                        contact={contact}
                        onDelete={() => deleteContactMutation.mutate(contact.id)}
                        onChat={() => contact.contactCustomerId && startChatMutation.mutate(contact.contactCustomerId)}
                        isDeleting={deleteContactMutation.isPending}
                        canChat={!!contact.contactCustomerId}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {regularContacts.length > 0 && (
                <div>
                  {favoriteContacts.length > 0 && (
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      All Contacts
                    </h3>
                  )}
                  <div className="divide-y rounded-lg border">
                    {regularContacts.map((contact) => (
                      <ContactItem
                        key={contact.id}
                        contact={contact}
                        onDelete={() => deleteContactMutation.mutate(contact.id)}
                        onChat={() => contact.contactCustomerId && startChatMutation.mutate(contact.contactCustomerId)}
                        isDeleting={deleteContactMutation.isPending}
                        canChat={!!contact.contactCustomerId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

function ContactItem({ 
  contact, 
  onDelete, 
  onChat, 
  isDeleting,
  canChat 
}: { 
  contact: Contact; 
  onDelete: () => void; 
  onChat: () => void;
  isDeleting: boolean;
  canChat: boolean;
}) {
  return (
    <div 
      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
      data-testid={`contact-${contact.id}`}
    >
      <Avatar className="w-10 h-10">
        <AvatarFallback>
          <User className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{contact.displayName}</span>
          {contact.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
        </div>
        {contact.phoneNumber && (
          <p className="text-sm text-muted-foreground truncate">
            {contact.phoneNumber}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {canChat && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onChat}
            data-testid={`button-chat-${contact.id}`}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          data-testid={`button-delete-${contact.id}`}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
