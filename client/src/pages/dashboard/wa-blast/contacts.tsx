import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Search, Upload, Trash2, Loader2, FolderPlus, Pencil } from "lucide-react";

interface Contact {
  id: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  listId: string | null;
  customFields: Record<string, any> | null;
  createdAt: string;
}

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
}

export default function WABlastContactsPage() {
  const { toast } = useToast();
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [newContact, setNewContact] = useState({ phoneNumber: "", name: "", email: "" });
  const [newList, setNewList] = useState({ name: "", description: "" });

  const { data: lists = [], isLoading: listsLoading } = useQuery<ContactList[]>({
    queryKey: ["/api/wa-blast/contact-lists"],
  });

  const { data: contactsData, isLoading: contactsLoading } = useQuery<{ contacts: Contact[]; total: number }>({
    queryKey: ["/api/wa-blast/contacts", selectedList, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedList) params.append("listId", selectedList);
      if (searchQuery) params.append("search", searchQuery);
      params.append("limit", "100");
      const res = await fetch(`/api/wa-blast/contacts?${params}`);
      return res.json();
    },
  });

  const contacts = contactsData?.contacts || [];
  const totalContacts = contactsData?.total || 0;

  const createContactMutation = useMutation({
    mutationFn: async (data: typeof newContact & { listId?: string }) => {
      const res = await apiRequest("POST", "/api/wa-blast/contacts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/contact-lists"] });
      setIsAddContactOpen(false);
      setNewContact({ phoneNumber: "", name: "", email: "" });
      toast({ title: "Kontak berhasil ditambahkan" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal menambahkan kontak", description: error.message, variant: "destructive" });
    },
  });

  const createListMutation = useMutation({
    mutationFn: async (data: typeof newList) => {
      const res = await apiRequest("POST", "/api/wa-blast/contact-lists", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/contact-lists"] });
      setIsAddListOpen(false);
      setNewList({ name: "", description: "" });
      toast({ title: "List berhasil dibuat" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal membuat list", description: error.message, variant: "destructive" });
    },
  });

  const deleteContactsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/wa-blast/contacts/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast/contact-lists"] });
      setSelectedContacts([]);
      toast({ title: "Kontak berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal menghapus kontak", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((c) => c.id));
    }
  };

  const handleSelectContact = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter((c) => c !== id));
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Kontak</h1>
          <p className="text-muted-foreground">Kelola daftar kontak untuk WhatsApp Blast</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddListOpen} onOpenChange={setIsAddListOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-list">
                <FolderPlus className="w-4 h-4 mr-2" />
                Buat List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat List Baru</DialogTitle>
                <DialogDescription>Kelompokkan kontak Anda dalam list</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama List</Label>
                  <Input
                    placeholder="Contoh: Pelanggan VIP"
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                    data-testid="input-list-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi (opsional)</Label>
                  <Input
                    placeholder="Deskripsi singkat"
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                    data-testid="input-list-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddListOpen(false)}>Batal</Button>
                <Button onClick={() => createListMutation.mutate(newList)} disabled={createListMutation.isPending}>
                  {createListMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-contact">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Kontak
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Kontak</DialogTitle>
                <DialogDescription>Tambahkan kontak baru ke daftar</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nomor WhatsApp *</Label>
                  <Input
                    placeholder="62812345678"
                    value={newContact.phoneNumber}
                    onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                    data-testid="input-contact-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input
                    placeholder="Nama kontak"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>Batal</Button>
                <Button
                  onClick={() => createContactMutation.mutate({ ...newContact, listId: selectedList || undefined })}
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-64 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Daftar List</h3>
            <Badge variant="secondary">{lists.length}</Badge>
          </div>
          <button
            onClick={() => setSelectedList(null)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              selectedList === null ? "bg-primary text-primary-foreground" : "hover-elevate"
            }`}
            data-testid="button-all-contacts"
          >
            <div className="flex items-center justify-between">
              <span>Semua Kontak</span>
              <Badge variant="secondary" className="text-xs">{totalContacts}</Badge>
            </div>
          </button>
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setSelectedList(list.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedList === list.id ? "bg-primary text-primary-foreground" : "hover-elevate"
              }`}
              data-testid={`button-list-${list.id}`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{list.name}</span>
                <Badge variant="secondary" className="text-xs">{list.contactCount || 0}</Badge>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari kontak..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-contacts"
              />
            </div>
            {selectedContacts.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(`Hapus ${selectedContacts.length} kontak?`)) {
                    deleteContactsMutation.mutate(selectedContacts);
                  }
                }}
                disabled={deleteContactsMutation.isPending}
                data-testid="button-delete-selected"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus ({selectedContacts.length})
              </Button>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={contacts.length > 0 && selectedContacts.length === contacts.length}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Nomor WhatsApp</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-20">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Belum ada kontak</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => handleSelectContact(contact.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{contact.phoneNumber}</TableCell>
                      <TableCell>{contact.name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.email || "-"}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
