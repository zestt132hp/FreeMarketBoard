import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/queryClient";

interface LocationFilterButtonProps {
  onLocationFound: (address: string) => void;
  onError?: (error: string) => void;
}

interface LocationFilterButtonMobileProps {
  onLocationFound: (address: string) => void;
  onError?: (error: string) => void;
  fullWidth?: boolean;
}

interface GeocodeResponse {
  address: string;
}

export function LocationFilterButton({ onLocationFound, onError }: LocationFilterButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGeolocate = async () => {
    setLoading(true);
    try {
      // 1. Получить координаты через navigator.geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        });
      });
      
      // 2. Обратный геокодинг через backend
      const response = await fetch(
        getApiUrl(`/api/geocode?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`)
      );
      
      if (!response.ok) {
        throw new Error("Не удалось получить адрес");
      }
      
      const data: GeocodeResponse = await response.json();
      
      // 3. Обновить фильтр
      onLocationFound(data.address);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Не удалось определить местоположение";
      toast({
        title: "Ошибка геолокации",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={handleGeolocate}
            disabled={loading}
          >
            <MapPin className="h-4 w-4" />
            <span className="sr-only">Определить моё местоположение</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Определить моё местоположение</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LocationFilterButtonMobile({
  onLocationFound,
  onError,
  fullWidth = true
}: LocationFilterButtonMobileProps) {
  const [loading, setLoading] = useState(false);

  const handleGeolocate = async () => {
    setLoading(true);
    try {
      // 1. Получить координаты через navigator.geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        });
      });
      
      // 2. Обратный геокодинг через backend
      const response = await fetch(
        getApiUrl(`/api/geocode?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`)
      );
      
      if (!response.ok) {
        throw new Error("Не удалось получить адрес");
      }
      
      const data: GeocodeResponse = await response.json();
      
      // 3. Обновить фильтр
      onLocationFound(data.address);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Не удалось определить местоположение";
      toast({
        title: "Ошибка геолокации",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={fullWidth ? "w-full" : ""}
      onClick={handleGeolocate}
      disabled={loading}
    >
      <MapPin className="h-4 w-4 mr-2" />
      {loading ? "Определение..." : "Определить моё местоположение"}
    </Button>
  );
}
