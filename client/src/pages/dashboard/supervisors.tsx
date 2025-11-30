import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Mail, User, Camera, Loader2, Edit } from "lucide-react";
import type { Supervisor } from "@shared/schema";

const addSupervisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editSupervisorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type AddSupervisorData = z.infer<typeof addSupervisorSchema>;
type EditSupervisorData = z.infer<typeof editSupervisorSchema>;

export default function SupervisorsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { data: supervisors, isLoading } = useQuery<Supervisor[]>({
    queryKey: ["/api/supervisors", merchantId],
    enabled: !!merchantId,
  });

  const form = useForm<AddSupervisorData>({
    resolver: zodResolver(addSupervisorSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const editForm = useForm<EditSupervisorData>({
    resolver: zodResolver(editSupervisorSchema),
    defaultValues: {
      name: "",
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
      setUploadingPhoto(false);
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read the image file",
        variant: "destructive",
      });
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const addSupervisorMutation = useMutation({
    mutationFn: async (data: AddSupervisorData) => {
      const response = await apiRequest("POST", "/api/supervisors/add", {
        merchantId,
        ...data,
        photoUrl,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      setDialogOpen(false);
      form.reset();
      setPhotoUrl("");
      toast({
        title: "Supervisor added",
        description: "They can now log in to handle escalated chats.",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Something went wrong";
      const isDuplicate = errorMessage.toLowerCase().includes("already registered") || 
                          errorMessage.toLowerCase().includes("email already");
      
      toast({
        title: isDuplicate ? "Email already exists" : "Failed to add supervisor",
        description: isDuplicate 
          ? "This email address has already been registered. Please use a different email."
          : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSupervisorMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; photoUrl: string }) => {
      return apiRequest("PUT", `/api/supervisors/${data.id}`, { name: data.name, photoUrl: data.photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      setEditDialogOpen(false);
      setEditingSupervisor(null);
      setPhotoUrl("");
      editForm.reset();
      toast({
        title: "Supervisor updated",
        description: "Supervisor information has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update supervisor",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteSupervisorMutation = useMutation({
    mutationFn: async (supervisorId: string) => {
      return apiRequest("DELETE", `/api/supervisors/${supervisorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisors", merchantId] });
      toast({
        title: "Supervisor removed",
        description: "They will no longer have access.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove supervisor",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddSupervisorData) => {
    addSupervisorMutation.mutate(data);
  };

  const onEditSubmit = (data: EditSupervisorData) => {
    if (editingSupervisor) {
      updateSupervisorMutation.mutate({
        id: editingSupervisor.id,
        name: data.name,
        photoUrl: photoUrl,
      });
    }
  };

  const handleEditSupervisor = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor);
    editForm.setValue("name", supervisor.name);
    setPhotoUrl(supervisor.photoUrl || "");
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supervisors</h1>
          <p className="text-muted-foreground">
            Manage team members who can take over escalated conversations.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-supervisor">
              <Plus className="w-4 h-4 mr-2" />
              Add Supervisor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supervisor</DialogTitle>
              <DialogDescription>
                Create login credentials for a new team member.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex justify-center mb-2">
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={photoUrl} />
                      <AvatarFallback className="bg-muted">
                        {uploadingPhoto ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <User className="w-8 h-8 text-muted-foreground" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      data-testid="button-upload-photo"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" data-testid="input-supervisor-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@company.com"
                          data-testid="input-supervisor-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="At least 6 characters"
                          data-testid="input-supervisor-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addSupervisorMutation.isPending}
                    data-testid="button-submit-supervisor"
                  >
                    {addSupervisorMutation.isPending ? "Adding..." : "Add Supervisor"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle>Team Members</CardTitle>
          </div>
          <CardDescription>
            Supervisors receive notifications when chats are escalated and can take over conversations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : supervisors && supervisors.length > 0 ? (
            <div className="space-y-3">
              {supervisors.map((supervisor) => (
                <div
                  key={supervisor.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  data-testid={`supervisor-item-${supervisor.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={supervisor.photoUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(supervisor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{supervisor.name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {supervisor.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditSupervisor(supervisor)}
                      data-testid={`button-edit-supervisor-${supervisor.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSupervisorMutation.mutate(supervisor.id)}
                      disabled={deleteSupervisorMutation.isPending}
                      data-testid={`button-delete-supervisor-${supervisor.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No supervisors yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add team members who can handle escalated conversations
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-supervisor">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Supervisor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supervisor</DialogTitle>
            <DialogDescription>
              Update supervisor name and profile photo.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={photoUrl} />
                    <AvatarFallback className="bg-muted">
                      {uploadingPhoto ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    data-testid="button-upload-edit-photo"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" data-testid="input-edit-supervisor-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingSupervisor(null);
                    setPhotoUrl("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSupervisorMutation.isPending}
                  data-testid="button-submit-edit-supervisor"
                >
                  {updateSupervisorMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
