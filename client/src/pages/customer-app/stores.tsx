import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Store, Search, ExternalLink, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import CustomerLayout from "./layout";
import { useState } from "react";

interface StoreInfo {
  id: string;
  companyName: string | null;
  profilePhotoUrl: string | null;
  businessCategory: string | null;
  officialWebsiteName: string | null;
}

export default function CustomerStoresPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: stores = [], isLoading } = useQuery<StoreInfo[]>({
    queryKey: ["/api/customer/stores"],
  });
  
  const filteredStores = stores.filter(store => 
    store.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.businessCategory?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const categories = Array.from(new Set(stores.map(s => s.businessCategory).filter(Boolean)));
  
  return (
    <CustomerLayout>
      <div className="sm:ml-64">
        <div className="max-w-4xl mx-auto p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Official Stores</h1>
            <p className="text-muted-foreground">
              Chat directly with businesses for support, orders, and more
            </p>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search stores by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-stores"
            />
          </div>
          
          {!searchQuery && categories.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(category || "")}
                  className="whitespace-nowrap"
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">
                {searchQuery ? "No stores found" : "No stores available"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? "Try a different search term" 
                  : "Stores will appear here once they're online"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredStores.map((store) => (
                <Card 
                  key={store.id} 
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/chat/store/${store.id}`)}
                  data-testid={`store-card-${store.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={store.profilePhotoUrl || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        <Store className="w-6 h-6 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {store.companyName || "Unnamed Store"}
                        </h3>
                        <Badge variant="secondary" className="text-xs">Official</Badge>
                      </div>
                      {store.businessCategory && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {store.businessCategory}
                        </p>
                      )}
                      {store.officialWebsiteName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="w-3 h-3" />
                          {store.officialWebsiteName}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
