import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { createAuthHeaders } from "@/lib/auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import type { Ad } from "../../../shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Fetch user's ads
  const { data: userAds = [], isLoading } = useQuery({
    queryKey: ["/api/my-ads"],
    queryFn: async () => {
      const response = await fetch("/api/my-ads", {
        headers: createAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch ads");
      return response.json();
    },
  });

  const handleCreateAd = () => {
    // TODO: Implement create ad modal/form
    alert("Create ad functionality would be implemented here!");
  };

  const handleEditAd = (ad: Ad) => {
    // TODO: Implement edit ad functionality
    alert(`Edit ad functionality for "${ad.title}" would be implemented here!`);
  };

  const handleDeleteAd = (ad: Ad) => {
    // TODO: Implement delete ad functionality
    if (confirm(`Are you sure you want to delete "${ad.title}"?`)) {
      alert("Delete functionality would be implemented here!");
    }
  };

  const handleViewAd = (ad: Ad) => {
    // TODO: Navigate to ad detail or open modal
    alert(`View ad functionality for "${ad.title}" would be implemented here!`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}!</p>
          </div>
          <Button onClick={handleCreateAd}>
            <Plus className="mr-2 h-4 w-4" />
            Create Ad
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userAds.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userAds.filter(ad => ad.isActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
            </CardContent>
          </Card>
        </div>

        {/* My Ads */}
        <Card>
          <CardHeader>
            <CardTitle>My Ads</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p>Loading your ads...</p>
              </div>
            ) : userAds.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">No ads yet</p>
                  <p className="text-gray-400 mb-4">Create your first ad to get started</p>
                  <Button onClick={handleCreateAd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ad
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userAds.map((ad) => (
                  <div key={ad.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={ad.images[0] || "https://via.placeholder.com/80x80"}
                        alt={ad.title}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div>
                        <h3 className="font-semibold">{ad.title}</h3>
                        <p className="text-sm text-gray-600">{ad.location}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-bold text-primary">
                            ${parseFloat(ad.price).toLocaleString()}
                          </span>
                          <Badge variant={ad.isActive ? "default" : "secondary"}>
                            {ad.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAd(ad)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAd(ad)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAd(ad)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
