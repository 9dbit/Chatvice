import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Plus, Star, Trash2, MessageSquare, User, QrCode, Camera, X, Check, Loader2, Phone, ScanLine } from "lucide-react";
import CustomerLayout from "./layout";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { chatRoutes } from "@/lib/chat-routes";
import { QRCodeSVG } from "qrcode.react";

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

interface CustomerProfile {
  id: string;
  phoneNumber: string;
  displayName: string;
  email: string | null;
  personalId: string;
}

export default function CustomerContactsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("personal-id");
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
  
  const { data: profile } = useQuery<CustomerProfile>({
    queryKey: ["/api/customer/profile"],
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
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  // QR Scanner effect - only start when scan-qr tab is active
  useEffect(() => {
    if (addDialogOpen && activeTab === "scan-qr" && videoRef.current && !scannerRef.current && !confirmMode && !isLookingUp) {
      const timer = setTimeout(() => {
        initScanner();
      }, 300);
      return () => clearTimeout(timer);
    }
    
    return () => {
      stopScanner();
    };
  }, [addDialogOpen, activeTab, confirmMode, isLookingUp]);
  
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
          if (decodedText === lastScannedCode) return;
          setLastScannedCode(decodedText);
          
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
  
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
      setIsScanning(false);
    }
  };
  
  const handleCloseDialog = () => {
    stopScanner();
    setAddDialogOpen(false);
    setPersonalIdInput("");
    setLastScannedCode(null);
    setConfirmMode(false);
    setScannedContact(null);
    setIsLookingUp(false);
    setActiveTab("personal-id");
  };
  
  const handleTabChange = (tab: string) => {
    stopScanner();
    setActiveTab(tab);
    setConfirmMode(false);
    setScannedContact(null);
    setLastScannedCode(null);
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
  
  const handleBackToInput = () => {
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
            
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => setAddDialogOpen(true)}
              data-testid="button-add-contact"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Add Contact Dialog - Single Card with Tabs */}
          <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
            <DialogContent className="mx-4 rounded-2xl max-w-[calc(100%-2rem)] sm:max-w-md glass-card border-white/20 max-h-[calc(100vh-120px)] overflow-y-auto p-0">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Add New Contact
                </DialogTitle>
              </DialogHeader>
              
              {/* Loading State */}
              {isLookingUp && (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Looking up contact...</p>
                </div>
              )}
              
              {/* Confirmation Mode */}
              {confirmMode && scannedContact && !isLookingUp && (
                <div className="space-y-4 p-4">
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
                      onClick={handleBackToInput}
                      data-testid="button-back-to-input"
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
              
              {/* Main Content with Tabs */}
              {!confirmMode && !isLookingUp && (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mx-4 mt-2" style={{ width: "calc(100% - 2rem)" }}>
                    <TabsTrigger value="personal-id" className="text-xs sm:text-sm" data-testid="tab-personal-id">
                      <User className="w-4 h-4 mr-1.5" />
                      Personal ID
                    </TabsTrigger>
                    <TabsTrigger value="scan-qr" className="text-xs sm:text-sm" data-testid="tab-scan-qr">
                      <ScanLine className="w-4 h-4 mr-1.5" />
                      Scan QR
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Personal ID Tab */}
                  <TabsContent value="personal-id" className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Enter Personal ID</Label>
                      <Input
                        placeholder="P-A01-00001"
                        value={personalIdInput}
                        onChange={(e) => setPersonalIdInput(e.target.value.toUpperCase())}
                        className="font-mono text-center text-lg tracking-wider"
                        data-testid="input-personal-id"
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Enter your friend's Personal ID to add them
                      </p>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={handleAddByPersonalId}
                      disabled={lookupContactMutation.isPending || !personalIdInput.trim()}
                      data-testid="button-add-by-id"
                    >
                      {lookupContactMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking up...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" /> Find Contact
                        </>
                      )}
                    </Button>
                    
                    {/* Show My QR Section */}
                    {profile?.personalId && (
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-muted-foreground text-center mb-3">
                          Or share your QR code with friends
                        </p>
                        <div className="flex flex-col items-center p-4 bg-white rounded-xl">
                          <QRCodeSVG 
                            value={profile.personalId}
                            size={150}
                            level="H"
                            includeMargin={false}
                          />
                          <p className="mt-3 font-mono text-sm text-black font-medium">
                            {profile.personalId}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          {profile.displayName}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Scan QR Tab */}
                  <TabsContent value="scan-qr" className="p-4 space-y-4">
                    {/* QR Scanner View */}
                    <div className="relative w-full aspect-square bg-black/90 rounded-xl overflow-hidden">
                      <div id="qr-reader" ref={videoRef} className="w-full h-full" data-testid="container-qr-scanner" />
                      {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                          <Camera className="w-12 h-12 animate-pulse" />
                          <p className="text-sm">Starting camera...</p>
                        </div>
                      )}
                      {/* Scanner overlay */}
                      {isScanning && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-white/50 rounded-lg">
                              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-center text-xs text-muted-foreground">
                      Point your camera at someone's Personal ID QR code
                    </p>
                    
                    {/* Show My QR Below Scanner */}
                    {profile?.personalId && (
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-muted-foreground text-center mb-3">
                          Your QR code for friends to scan
                        </p>
                        <div className="flex flex-col items-center p-4 bg-white rounded-xl">
                          <QRCodeSVG 
                            value={profile.personalId}
                            size={120}
                            level="H"
                            includeMargin={false}
                          />
                          <p className="mt-2 font-mono text-xs text-black font-medium">
                            {profile.personalId}
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
              
              {/* Close Button at bottom */}
              {!confirmMode && !isLookingUp && (
                <div className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleCloseDialog}
                    data-testid="button-close-dialog"
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
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Contact
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
            size="icon" 
            variant="ghost" 
            onClick={onChat}
            data-testid="button-chat"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        )}
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onDelete}
          disabled={isDeleting}
          data-testid="button-delete"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
