import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search, Plus, Star, Trash2, MessageSquare, User, QrCode, Camera, X, Check, Loader2, Phone } from "lucide-react";
import CustomerLayout from "./layout";
import { useState, useEffect, useRef } from "react";
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

interface ScannedContact {
  personalId: string;
  displayName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
}

export default function CustomerContactsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [personalIdInput, setPersonalIdInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState(false);
  const [scannedContact, setScannedContact] = useState<ScannedContact | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  
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
  
  // Lookup contact by Personal ID (for confirmation step)
  const lookupContactMutation = useMutation({
    mutationFn: async (personalId: string) => {
      const res = await apiRequest("POST", "/api/customer/lookup-by-personal-id", { personalId });
      return res.json();
    },
    onSuccess: (data: ScannedContact) => {
      setScannedContact(data);
      setConfirmMode(true);
      setIsLookingUp(false);
    },
    onError: (error: Error) => {
      setIsLookingUp(false);
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
      // Reset after 3 seconds to allow retry
      setTimeout(() => setLastScannedCode(null), 3000);
    },
  });
  
  // Add contact by Personal ID (after confirmation)
  const addContactByIdMutation = useMutation({
    mutationFn: async (personalId: string) => {
      const res = await apiRequest("POST", "/api/customer/contacts/by-personal-id", { personalId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/contacts"] });
      toast({ title: "Contact added successfully!" });
      handleCloseScanner();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  // QR Scanner effect
  useEffect(() => {
    if (scannerOpen && videoRef.current && !scannerRef.current && !confirmMode) {
      initScanner();
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerOpen, confirmMode]);
  
  const initScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!videoRef.current) return;
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      setIsScanning(true);
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        (decodedText) => {
          // Debounce: Skip if same code was just scanned
          if (decodedText === lastScannedCode) return;
          setLastScannedCode(decodedText);
          
          // Check if it's a valid personal ID format (P-A01-XXXXX)
          if (decodedText.match(/^P-[A-Z]\d{2}-\d{5}$/)) {
            html5QrCode.stop().then(() => {
              scannerRef.current = null;
              setIsScanning(false);
              setIsLookingUp(true);
              lookupContactMutation.mutate(decodedText);
            });
          } else {
            toast({
              title: "Invalid QR Code",
              description: "This is not a valid Chatvice Personal ID",
              variant: "destructive",
            });
            // Reset after 3 seconds to allow retry
            setTimeout(() => setLastScannedCode(null), 3000);
          }
        },
        () => {}
      );
    } catch (error) {
      console.error("Failed to start scanner:", error);
      setIsScanning(false);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };
  
  const handleCloseScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setIsScanning(false);
      }).catch(() => {
        scannerRef.current = null;
        setIsScanning(false);
      });
    }
    setScannerOpen(false);
    setPersonalIdInput("");
    setLastScannedCode(null);
    setConfirmMode(false);
    setScannedContact(null);
    setIsLookingUp(false);
  };
  
  const handleAddByPersonalId = () => {
    const trimmedId = personalIdInput.trim().toUpperCase();
    if (!trimmedId.match(/^P-[A-Z]\d{2}-\d{5}$/)) {
      toast({
        title: "Invalid Personal ID",
        description: "Personal ID format should be P-A01-00001",
        variant: "destructive",
      });
      return;
    }
    setIsLookingUp(true);
    lookupContactMutation.mutate(trimmedId);
  };
  
  const handleConfirmAddContact = () => {
    if (scannedContact) {
      addContactByIdMutation.mutate(scannedContact.personalId);
    }
  };
  
  const handleBackToScanner = () => {
    setConfirmMode(false);
    setScannedContact(null);
    setLastScannedCode(null);
  };
  
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
            
            <div className="flex items-center gap-2">
              {/* QR Scanner Button */}
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => setScannerOpen(true)}
                data-testid="button-scan-qr"
              >
                <QrCode className="w-4 h-4" />
              </Button>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="outline" data-testid="button-add-contact">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
              <DialogContent className="mx-4 rounded-2xl max-w-[calc(100%-2rem)] sm:max-w-md glass-card border-white/20">
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
                      className="glass-input"
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
                      className="glass-input"
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
          </div>
          
          {/* QR Scanner Dialog */}
          <Dialog open={scannerOpen} onOpenChange={(open) => { if (!open) handleCloseScanner(); }}>
            <DialogContent className="mx-4 rounded-2xl max-w-[calc(100%-2rem)] sm:max-w-md glass-card border-white/20 max-h-[calc(100vh-120px)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  {confirmMode ? "Confirm Contact" : "Scan Personal ID"}
                </DialogTitle>
              </DialogHeader>
              
              {/* Loading State */}
              {isLookingUp && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Looking up contact...</p>
                </div>
              )}
              
              {/* Confirmation Mode */}
              {confirmMode && scannedContact && !isLookingUp && (
                <div className="space-y-4">
                  {/* Contact Preview Card */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-white/10 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={scannedContact.avatarUrl || undefined} />
                        <AvatarFallback className="text-xl">
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-semibold truncate" data-testid="text-scanned-name">
                          {scannedContact.displayName || "Unnamed User"}
                        </p>
                        {scannedContact.phoneNumber && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-scanned-phone">
                            <Phone className="w-3 h-3" />
                            {scannedContact.phoneNumber}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono mt-1" data-testid="text-scanned-id">
                          {scannedContact.personalId}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-center text-sm text-muted-foreground">
                    Add this person to your contacts?
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      onClick={handleBackToScanner}
                      data-testid="button-back-to-scanner"
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={handleConfirmAddContact}
                      disabled={addContactByIdMutation.isPending}
                      data-testid="button-confirm-add"
                    >
                      {addContactByIdMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" /> Save Contact
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Scanner Mode */}
              {!confirmMode && !isLookingUp && (
                <div className="space-y-3">
                  {/* QR Scanner View - smaller on mobile */}
                  <div className="relative w-full aspect-[4/3] bg-black/90 rounded-xl overflow-hidden">
                    <div id="qr-reader" ref={videoRef} className="w-full h-full" data-testid="container-qr-scanner" />
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <Camera className="w-10 h-10 animate-pulse" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-center text-xs text-muted-foreground">
                    Point your camera at a Personal ID QR code to add them as a contact
                  </p>
                  
                  {/* Manual Entry Option */}
                  <div className="space-y-2">
                    <Label className="text-sm">Or enter Personal ID manually</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="P-A01-00001"
                        value={personalIdInput}
                        onChange={(e) => setPersonalIdInput(e.target.value.toUpperCase())}
                        className="font-mono text-sm h-9"
                        data-testid="input-personal-id"
                      />
                      <Button 
                        size="sm"
                        onClick={handleAddByPersonalId}
                        disabled={lookupContactMutation.isPending}
                        data-testid="button-add-by-id"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full" 
                    onClick={handleCloseScanner}
                    data-testid="button-close-scanner"
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
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
