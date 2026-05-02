import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { createAuthHeaders } from "@/lib/auth";
import { getApiUrl } from "@/lib/queryClient";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import type { Ad, Image as AdImage, AdWithRelations } from "../../../shared/schema";
import AdModalV2 from "@/components/ad-modal-v2";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Fetch user's ads
  const { data: userAds = [], isLoading } = useQuery({
    queryKey: ["/api/my-ads"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/my-ads"), {
        headers: createAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch ads");
      return response.json();
    },
  });

  // Create ad mutation
  const createAdMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Create mutation called with data:', data);
      
      // Извлекаем изображения из данных
      const { _images, ...adData } = data;
      
      // Создаём FormData для загрузки с изображениями
      const formData = new FormData();
      
      // Добавляем данные объявления
      Object.keys(adData).forEach(key => {
        if (adData[key] !== null && adData[key] !== undefined) {
          formData.append(key, String(adData[key]));
        }
      });
      
      // Добавляем информацию об изображениях
      if (_images && _images.length > 0) {
        // Сортируем изображения по порядку
        const sortedImages = [..._images].sort((a, b) => a.order - b.order);
        
        // Добавляем каждое изображение как отдельное поле
        sortedImages.forEach((img, index) => {
          // Для новых изображений используем их filename для поиска на сервере
          formData.append(`images[${index}][filename]`, img.filename);
          formData.append(`images[${index}][originalName]`, img.originalName);
          formData.append(`images[${index}][order]`, String(index));
          formData.append(`images[${index}][isPrimary]`, String(img.isPrimary));
        });
      }
      
      const response = await fetch(getApiUrl("/api/ads"), {
        method: "POST",
        headers: createAuthHeaders(),
        // Content-Type будет установлен автоматически браузером для FormData
        body: formData,
      });
      
      console.log('Create response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Create error:', error);
        throw new Error(error.message || "Failed to create ad");
      }
      
      const result = await response.json();
      console.log('Create success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-ads"] });
      setIsModalOpen(false);
      toast({
        title: "Объявление создано",
        description: "Ваше объявление успешно добавлено",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update ad mutation
  const updateAdMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Extract _images from data if present
      const { _images, ...adData } = data;
      
      const formData = new FormData();
      
      // Append ad data
      Object.keys(adData).forEach(key => {
        if (adData[key] !== null && adData[key] !== undefined) {
          formData.append(key, String(adData[key]));
        }
      });
      
      // Append images if present
      if (_images && _images.length > 0) {
        const sortedImages = [..._images].sort((a: any, b: any) => a.order - b.order);
        sortedImages.forEach((img: any, index: number) => {
          formData.append(`images[${index}][filename]`, img.filename);
          formData.append(`images[${index}][originalName]`, img.originalName);
          formData.append(`images[${index}][order]`, String(index));
          formData.append(`images[${index}][isPrimary]`, String(img.isPrimary));
          if (img.dbId) {
            formData.append(`images[${index}][dbId]`, String(img.dbId));
          }
        });
      }
      
      const response = await fetch(getApiUrl(`/api/ads/${id}`), {
        method: "PUT",
        headers: createAuthHeaders(),
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update ad");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-ads"] });
      setIsModalOpen(false);
      setSelectedAd(null);
      toast({
        title: "Объявление обновлено",
        description: "Изменения успешно сохранены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete ad mutation
  const deleteAdMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/ads/${id}`, {
        method: "DELETE",
        headers: createAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete ad");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-ads"] });
      toast({
        title: "Объявление удалено",
        description: "Объявление успешно удалено",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAd = () => {
    setSelectedAd(null);
    setIsModalOpen(true);
  };

  const handleEditAd = (ad: Ad | AdWithRelations) => {
    setSelectedAd(ad);
    setIsModalOpen(true);
  };

  const handleDeleteAd = (ad: Ad | AdWithRelations) => {
    if (confirm(`Вы уверены, что хотите удалить "${ad.title}"?`)) {
      deleteAdMutation.mutate(ad.id);
    }
  };

  const handleViewAd = (ad: Ad | AdWithRelations) => {
    // Navigate to ad detail or open in new tab
    window.open(`/ads/${ad.id}`, "_blank");
  };

  const handleSubmitAd = async (data: any) => {
    console.log('Submitting ad data:', data);
    console.log('Selected ad:', selectedAd);
    
    if (selectedAd) {
      // Update existing ad
      console.log('Calling update mutation for ad ID:', selectedAd.id);
      updateAdMutation.mutate({ id: selectedAd.id, data });
    } else {
      // Create new ad
      console.log('Calling create mutation');
      createAdMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Панель управления</h1>
            <p className="text-gray-600">Добро пожаловать, {user?.name}!</p>
          </div>
          <Button onClick={handleCreateAd}>
            <Plus className="mr-2 h-4 w-4" />
            Создать объявление
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего объявлений</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userAds.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активные</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userAds.filter((ad: any) => ad.isActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Просмотры</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
            </CardContent>
          </Card>
        </div>

        {/* My Ads */}
        <Card>
          <CardHeader>
            <CardTitle>Мои объявления</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p>Загрузка...</p>
              </div>
            ) : userAds.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">Нет объявлений</p>
                  <p className="text-gray-400 mb-4">Создайте своё первое объявление</p>
                  <Button onClick={handleCreateAd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Создать объявление
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userAds.map((ad: any) => {
                  // Get first image path from images array (new schema) or fallback to string (old schema)
                  const firstImagePath = ad.images && ad.images.length > 0
                    ? (ad.images[0] as AdImage).path || (ad.images[0] as string)
                    : "https://via.placeholder.com/80x80";
                  
                  return (
                  <div key={ad.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={firstImagePath}
                        alt={ad.title}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div>
                        <h3 className="font-semibold">{ad.title}</h3>
                        <p className="text-sm text-gray-600">{ad.location}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-bold text-primary">
                            {parseFloat(ad.price).toLocaleString() + " руб."}
                          </span>
                          <Badge variant={ad.isActive ? "default" : "secondary"}>
                            {ad.isActive ? "Активно" : "Неактивно"}
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
                );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Ad Modal for Create/Edit */}
      <AdModalV2
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        ad={selectedAd}
        onSubmit={handleSubmitAd}
        isLoading={createAdMutation.isPending || updateAdMutation.isPending}
      />
    </div>
  );
}
