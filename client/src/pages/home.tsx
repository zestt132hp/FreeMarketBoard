import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { CategoryNav } from "@/components/category-nav";
import { AdCard } from "@/components/ad-card";
import { AdDetailModal } from "@/components/ad-detail-modal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Ad } from "../../../shared/schema";
import { logger } from '@/lib/logger';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAd, setSelectedAd] = useState<(Ad & { seller?: any }) | null>(null);
  const [showAdDetail, setShowAdDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState("any");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  // Fetch ads
  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["/api/ads", selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await fetch(`/api/ads?${params}`);
      if (!response.ok) throw new Error("Failed to fetch ads");
      return response.json();
    },
  });

  // Filter and sort ads
  const filteredAds = useMemo(() => {
    let filtered = [...ads];

    // Price filter
    if (priceFilter && priceFilter !== "any") {
      const [min, max] = priceFilter === "1000+" 
        ? [1000, Infinity] 
        : priceFilter.split("-").map(Number);
      
      filtered = filtered.filter(ad => {
        const price = parseFloat(ad.price);
        return price >= min && (max === undefined || price <= max);
      });
    }

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter(ad => 
        ad.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
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
  }, [ads, priceFilter, locationFilter, sortBy]);

  const handleAdClick = async (ad: Ad) => {
    try {
      const response = await fetch(`/api/ads/${ad.id}`);
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
      <CategoryNav selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Цена:</Label>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любая Цена</SelectItem>
                    <SelectItem value="0-100">$0 - $100</SelectItem>
                    <SelectItem value="100-500">$100 - $500</SelectItem>
                    <SelectItem value="500-1000">$500 - $1000</SelectItem>
                    <SelectItem value="1000+">$1000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Местоположение:</Label>
                <Input
                  placeholder="Введите город..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Сортировать:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
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
                  onClick={() => {
                    setPriceFilter("any");
                    setLocationFilter("");
                    setSortBy("recent");
                  }}
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
            <p>Loading ads...</p>
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

      <AdDetailModal
        isOpen={showAdDetail}
        onClose={() => setShowAdDetail(false)}
        ad={selectedAd}
      />
    </div>
  );
}
