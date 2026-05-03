import { useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { YMaps, Map as YandexMap, Placemark } from "@pbe/react-yandex-maps";

interface LocationViewProps {
  latitude: number;
  longitude: number;
  address?: string;
  adId?: number;
}

interface RouteResponse {
  distance: number;
  duration: number;
  polyline?: string;
}

const MOSCOW_COORDS: [number, number] = [55.7558, 37.6173];

export function LocationView({
  latitude,
  longitude,
  address,
  adId,
}: LocationViewProps) {
  const isMobile = useIsMobile();
  
  // Состояние для mobile sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Состояние построения маршрута
  const [buildingRoute, setBuildingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

  // Функция построения маршрута
  const handleBuildRoute = async () => {
    setBuildingRoute(true);
    setRouteInfo(null);
    
    try {
      // 1. Получить местоположение пользователя
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });
      
      const fromLat = position.coords.latitude;
      const fromLng = position.coords.longitude;
      
      // 2. Запрос к backend для построения маршрута
      const response = await fetch(
        `/api/route?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${latitude}&toLng=${longitude}`
      );
      
      if (!response.ok) {
        throw new Error("Не удалось построить маршрут");
      }
      
      const data: RouteResponse = await response.json();
      
      // 3. Показать результат
      setRouteInfo({
        distance: data.distance,
        duration: data.duration,
      });
      
      toast({
        title: "Маршрут построен",
        description: `${data.distance} м, ~${Math.round(data.duration / 60)} мин`,
      });
    } catch (error) {
      console.error("Ошибка построения маршрута:", error);
      
      // 4. Fallback: предложить открыть в Яндекс.Картах
      const yandexMapsUrl = `https://yandex.ru/maps/?rtext=~${latitude},${longitude}`;
      
      toast({
        title: "Не удалось построить маршрут",
        description: "Открываем Яндекс.Карты для навигации",
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(yandexMapsUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Открыть
          </Button>
        ),
      });
    } finally {
      setBuildingRoute(false);
    }
  };

  // Обработчик открытия в Яндекс.Картах
  const handleOpenInYandexMaps = () => {
    const yandexMapsUrl = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=15`;
    window.open(yandexMapsUrl, '_blank');
  };

  // Центр карты
  const center: [number, number] = latitude && longitude
    ? [latitude, longitude]
    : MOSCOW_COORDS;

  // Проверка на отсутствие координат
  if (!latitude || !longitude) {
    return (
      <div className="h-48 w-full rounded-lg border bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p>Местоположение не указано</p>
        </div>
      </div>
    );
  }

  // Компонент карты
  const MapContent = ({ height = "h-64" }: { height?: string }) => (
    <div
      className={`relative w-full ${height} rounded-lg overflow-hidden border`}
      style={{
        clipPath: "inset(0 0 35px 0)" // Обрезаем нижнюю панель с элементами управления
      }}
    >
      <style>{`
        .ymaps-2-1-79-controls,
        .ymaps-2-1-79-control,
        .ymaps-2-1-79-button,
        [class*="ymaps"][class*="-controls"],
        [class*="ymaps"][class*="-control"],
        [class*="ymaps"][class*="-button"] {
          display: none !important;
        }
      `}</style>
      <YandexMap
        state={{
          center,
          zoom: 14,
        }}
        width="100%"
        height="100%"
        style={{ width: "100%", height: "100%", maxWidth: "100%" }}
      >
        <Placemark
          geometry={[latitude, longitude]}
          properties={{
            balloonContent: address || "Местоположение товара",
            hintContent: address || "Местоположение товара",
          }}
          options={{
            preset: "islands#blueCircleDotIcon",
            draggable: false,
          }}
        />
      </YandexMap>
      
      {/* Индикатор маршрута */}
      {routeInfo && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 px-4 py-2 rounded-full shadow-lg text-sm font-medium z-10">
          {routeInfo.distance} м • ~{Math.round(routeInfo.duration / 60)} мин
        </div>
      )}
    </div>
  );

  // Desktop версия (≥768px)
  if (!isMobile) {
    return (
      <div className="space-y-3">
        <MapContent height="h-64" />
        
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {address ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span className="break-words">{address}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Координаты: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenInYandexMaps}
              title="Открыть в Яндекс.Картах"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBuildRoute}
              disabled={buildingRoute}
            >
              <Navigation className="h-4 w-4 mr-2" />
              {buildingRoute ? "Построение..." : "Построить маршрут"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile версия (<768px)
  return (
    <>
      <div className="space-y-3">
        <MapContent height="h-48" />
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {address ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{address}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            )}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            На весь экран
          </Button>
        </div>
      </div>
      
      {/* Sheet с картой на весь экран */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="inset-0 h-screen w-screen p-0" side="bottom">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Местоположение</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 h-[calc(100vh-140px)] px-0 py-4 overflow-hidden">
            <MapContent height="h-full" />
          </div>
          
          <SheetFooter className="px-4 py-3 border-t flex-col gap-2">
            {routeInfo && (
              <div className="text-center text-sm font-medium text-muted-foreground">
                {routeInfo.distance} м • ~{Math.round(routeInfo.duration / 60)} мин
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleOpenInYandexMaps}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Яндекс.Карты
              </Button>
              
              <Button
                type="button"
                className="flex-1"
                onClick={handleBuildRoute}
                disabled={buildingRoute}
              >
                <Navigation className="h-4 w-4 mr-2" />
                {buildingRoute ? "Построение..." : "Построить маршрут"}
              </Button>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSheetOpen(false)}
              className="w-full"
            >
              Закрыть
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
