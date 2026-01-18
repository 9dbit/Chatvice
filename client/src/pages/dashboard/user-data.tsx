import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, Download, Search, Phone, Mail, User, Calendar
} from "lucide-react";
import { format } from "date-fns";

interface UserDataItem {
  name: string;
  phone: string;
  email: string | null;
  lastSeen: string;
}

export default function UserDataPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: userData, isLoading } = useQuery<UserDataItem[]>({
    queryKey: ["/api/user-data"],
    enabled: !!merchantId,
  });

  const filteredData = userData?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.phone?.includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  }) || [];

  const handleDownloadCSV = () => {
    if (!filteredData.length) return;
    
    const headers = ["Nama", "Nomor Telepon", "Email", "Terakhir Aktif"];
    const csvContent = [
      headers.join(","),
      ...filteredData.map(user => [
        `"${(user.name || "").replace(/"/g, '""')}"`,
        user.phone || "",
        user.email || "",
        user.lastSeen ? format(new Date(user.lastSeen), "yyyy-MM-dd HH:mm") : "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-data-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            User Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Data kontak pelanggan yang dikumpulkan dari widget chat
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Daftar Pelanggan</CardTitle>
              <CardDescription>
                {filteredData.length} pelanggan ditemukan
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Input
                  placeholder="Cari nama, telepon, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[250px] pl-8"
                  data-testid="input-search-user-data"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              
              <Button
                variant="outline"
                onClick={handleDownloadCSV}
                disabled={!filteredData.length}
                data-testid="button-download-csv"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Nama
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        Nomor Telepon
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Terakhir Aktif
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((user, index) => (
                    <TableRow key={`${user.phone}-${index}`} data-testid={`row-user-${index}`}>
                      <TableCell className="font-medium">{user.name || "Anonymous"}</TableCell>
                      <TableCell>
                        <a 
                          href={`tel:+${user.phone}`}
                          className="hover:underline text-primary"
                          data-testid={`link-phone-${index}`}
                        >
                          +{user.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        {user.email ? (
                          <a 
                            href={`mailto:${user.email}`}
                            className="hover:underline text-primary"
                            data-testid={`link-email-${index}`}
                          >
                            {user.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.lastSeen ? format(new Date(user.lastSeen), "dd MMM yyyy, HH:mm") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">Belum ada data pelanggan</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? "Tidak ditemukan hasil pencarian"
                  : "Data pelanggan akan muncul setelah mereka menggunakan widget chat"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
