import { useLanguage } from "@/hooks/use-language";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  Users, Download, Search, Phone, Mail, User, Calendar, X, CalendarDays
} from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";

interface UserDataItem {
  name: string;
  phone: string;
  email: string | null;
  lastSeen: string;
}

export default function UserDataPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const merchantId = localStorage.getItem("merchantId") || "";

  const { data: userData, isLoading } = useQuery<UserDataItem[]>({
    queryKey: ["/api/user-data"],
    enabled: !!merchantId,
  });

  const filteredData = userData?.filter(user => {
    // Text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        user.name?.toLowerCase().includes(query) ||
        user.phone?.includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }
    
    // Date range filter
    if (startDate || endDate) {
      if (!user.lastSeen) return false;
      const userDate = parseISO(user.lastSeen);
      
      if (startDate && endDate) {
        if (!isWithinInterval(userDate, { 
          start: startOfDay(startDate), 
          end: endOfDay(endDate) 
        })) {
          return false;
        }
      } else if (startDate) {
        if (userDate < startOfDay(startDate)) return false;
      } else if (endDate) {
        if (userDate > endOfDay(endDate)) return false;
      }
    }
    
    return true;
  }) || [];

  const handleDownloadCSV = () => {
    if (!filteredData.length) return;
    
    const headers = ["Name", "Phone Number", "Email", "Last Active"];
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
    
    // Include date range in filename if filters are applied
    let filename = "user-data";
    if (startDate) filename += `-from-${format(startDate, "yyyy-MM-dd")}`;
    if (endDate) filename += `-to-${format(endDate, "yyyy-MM-dd")}`;
    filename += `.csv`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasDateFilters = startDate || endDate;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            User Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer contact data collected from the chat widget
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">{t("dashboard.userData.customerList")}</CardTitle>
                <CardDescription>
                  {filteredData.length} customers found
                  {hasDateFilters && (
                    <span className="ml-1 text-primary">
                      (filtered by date)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Input
                    placeholder="Search name, phone, email..."
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
            
            {/* Date Filter Section */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by date:</span>
              
              {/* Start Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-[140px] justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}
                    data-testid="button-start-date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd MMM yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    disabled={(date) => endDate ? date > endDate : false}
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">to</span>
              
              {/* End Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-[140px] justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}
                    data-testid="button-end-date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd MMM yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Clear Date Filters Button */}
              {hasDateFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilters}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-clear-date-filters"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
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
                        Name
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        Phone Number
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
                        Last Active
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
              <p className="text-muted-foreground font-medium">{t("dashboard.userData.noData")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || hasDateFilters
                  ? "No results found with current filters"
                  : "Customer data will appear after they use the chat widget"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
