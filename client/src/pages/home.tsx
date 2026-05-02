import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { CategoryNav } from "@/components/category-nav";
import { AdCard } from "@/components/ad-card";
import { AdDetailModal } from "@/components/ad-detail-modal";
import { FiltersPanel } from "@/components/filters-panel";
import { LocationFilterButton } from "@/components/location-filter-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import type { Ad, Category, AdWithRelations } from "../../../shared/schema";
import { logger } from '@/lib/logger';
import { getApiUrl } from "@/lib/queryClient";
import { useFiltersLocalStorage, type FilterState } from "@/hooks/use-filters-local-storage";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAd, setSelectedAd] = useState<AdWithRelations | null>(null);
  const [showAdDetail, setShowAdDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Используем хук для работы с localStorage
  const { filters, updateFilter, resetFilters, activeFiltersCount } = useFiltersLocalStorage();
  
  // Состояние для панели фильтров (мобильные)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/categories"));
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  // Fetch ads
  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["/api/ads", selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await fetch(getApiUrl(`/api/ads?${params}`));
      if (!response.ok) throw new Error("Failed to fetch ads");
      return response.json();
    },
  });

  // Filter and sort ads
  const filteredAds = useMemo(() => {
    let filtered = [...ads];

    // Price filter
    if (filters.priceFilter && filters.priceFilter !== "any") {
      const [min, max] = filters.priceFilter === "1000+"
        ? [1000, Infinity]
        : filters.priceFilter.split("-").map(Number);
      
      filtered = filtered.filter(ad => {
        const price = parseFloat(ad.price);
        return price >= min && (max === undefined || price <= max);
      });
    }

    // Location filter
    if (filters.locationFilter) {
      filtered = filtered.filter(ad =>
        ad.location.toLowerCase().includes(filters.locationFilter.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "price-low":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price-high":
          return parseFloat(b.price) - parseFloat(a.price);
        case "recent":
        default:
          return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      }
    });

    return filtered;
  }, [ads, filters.priceFilter, filters.locationFilter, filters.sortBy]);

  const handleAdClick = async (ad: Ad) => {
    try {
      const response = await fetch(getApiUrl(`/api/ads/${ad.id}`));
      if (response.ok) {
        const adWithSeller = await response.json();
        setSelectedAd(adWithSeller);
      } else {
        setSelectedAd(ad);
      }
      setShowAdDetail(true);
    } catch (error) {
      logger.error("Ошибка UI", error);
      setSelectedAd(ad);
      setShowAdDetail(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <CategoryNav selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} categories={categories} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Filters Button - visible only on mobile */}
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setTempFilters(filters);
              setShowFiltersPanel(true);
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
            {activeFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {activeFiltersCount()}
              </Badge>
            )}
          </Button>
        </div>

        {/* Desktop Filters - hidden on mobile */}
        <div className="mb-6 hidden md:block">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Цена:</Label>
                <Select value={filters.priceFilter} onValueChange={(value) => updateFilter('priceFilter', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Любая цена" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любая цена</SelectItem>
                    <SelectItem value="0-100">0 - 100 ₽</SelectItem>
                    <SelectItem value="100-500">100 - 500 ₽</SelectItem>
                    <SelectItem value="500-1000">500 - 1000 ₽</SelectItem>
                    <SelectItem value="1000+">1000+ ₽</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Местоположение:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Введите город..."
                    value={filters.locationFilter}
                    onChange={(e) => updateFilter('locationFilter', e.target.value)}
                    className="flex-1"
                  />
                  <LocationFilterButton
                    onLocationFound={(address) => {
                      updateFilter('locationFilter', address);
                    }}
                    onError={(error) => {
                      logger.error('Geolocation error', error);
                    }}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Сортировать:</Label>
                <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">По популярности</SelectItem>
                    <SelectItem value="price-low">Цена: от Меньшей к Большей</SelectItem>
                    <SelectItem value="price-high">Цена: от Большей к Меньшей</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                >
                  Очистить фильтр
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Listings */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p>Загрузка объявлений...</p>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Объявления ненайдены</p>
              <p className="text-gray-400">Попробуйте настроить фильтры или условия поиска.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} onClick={handleAdClick} />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Filters Panel */}
      <FiltersPanel
        isOpen={showFiltersPanel}
        onOpenChange={setShowFiltersPanel}
        filters={filters}
        tempFilters={tempFilters}
        onTempFiltersChange={setTempFilters}
        onApply={() => {
          updateFilter('priceFilter', tempFilters.priceFilter);
          updateFilter('locationFilter', tempFilters.locationFilter);
          updateFilter('sortBy', tempFilters.sortBy);
        }}
        onReset={() => {
          resetFilters();
          setTempFilters({
            priceFilter: 'any',
            locationFilter: '',
            sortBy: 'recent',
          });
        }}
      />

      <AdDetailModal
        isOpen={showAdDetail}
        onClose={() => setShowAdDetail(false)}
        ad={selectedAd}
      />
    </div>
  );
}
