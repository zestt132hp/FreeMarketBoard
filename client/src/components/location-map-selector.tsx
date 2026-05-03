import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getApiUrl } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { YMaps, Map as YandexMap, Placemark } from "@pbe/react-yandex-maps";

interface LocationMapSelectorProps {
  onLocationChange: (data: {
    latitude: number;
    longitude: number;
    address?: string;
  }) => void;
  initialLatitude?: number;
  initialLongitude?: number;
  initialAddress?: string;
}

interface GeocodeResponse {
  address: string;
}

const MOSCOW_COORDS: [number, number] = [55.7558, 37.6173];

export function LocationMapSelector({
  onLocationChange,
  initialLatitude,
  initialLongitude,
  initialAddress,
}: LocationMapSelectorProps) {
  const isMobile = useIsMobile();
  
  // Состояние координат
  const [latitude, setLatitude] = useState<number | undefined>(initialLatitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialLongitude);
  const [address, setAddress] = useState<string | undefined>(initialAddress);
  
  // Состояние для mobile sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Хук геолокации
  const { getLocation, loading: geoLoading, error: geoError, latitude: geoLatitude, longitude: geoLongitude } = useGeolocation();
  
  // Состояние геокодинга
  const [geocoding, setGeocoding] = useState(false);
  
  // Ref для хранения экземпляра карты
  const mapRef = useRef<ymaps.Map | null>(null);
  
  // Ref для хранения центра карты (чтобы избежать ре-рендеров)
  const centerRef = useRef<[number, number]>(initialLatitude && initialLongitude ? [initialLatitude, initialLongitude] : MOSCOW_COORDS);
  
  // Ref для отслеживания первого рендера
  const isFirstRender = useRef(true);
  
  // Функция обратного геокодинга
  const performGeocoding = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const response = await fetch(
        getApiUrl(`/api/geocode?latitude=${lat}&longitude=${lng}`)
      );
      
      if (!response.ok) {
        throw new Error("Не удалось получить адрес");
      }
      
      const data: GeocodeResponse = await response.json();
      setAddress(data.address);
      onLocationChange({ latitude: lat, longitude: lng, address: data.address });
    } catch (error) {
      console.error("Ошибка геокодинга:", error);
      // При ошибке геокодинга передаём координаты без адреса
      onLocationChange({ latitude: lat, longitude: lng });
      toast({
        title: "Геокодинг",
        description: "Не удалось определить адрес. Будут использованы координаты.",
        variant: "destructive",
      });
    } finally {
      setGeocoding(false);
    }
  }, [onLocationChange]);
  
  // Обработчик перетаскивания метки
  const handlePlacemarkDrag = useCallback((evt: any) => {
    const coords = evt.get("coords") as [number, number];
    const [newLat, newLng] = coords;
    
    setLatitude(newLat);
    setLongitude(newLng);
    
    // Триггерим геокодинг для нового адреса
    performGeocoding(newLat, newLng);
  }, [performGeocoding]);
  
  // Обработчик клика по карте (установка метки)
  const handleMapClick = useCallback((evt: any) => {
    const coords = evt.get("coords") as [number, number];
    const [newLat, newLng] = coords;
    
    setLatitude(newLat);
    setLongitude(newLng);
    
    // Триггерим геокодинг для нового адреса
    performGeocoding(newLat, newLng);
  }, [performGeocoding]);
  
  // Инициализация координат при монтировании (только если есть initial)
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      setLatitude(initialLatitude);
      setLongitude(initialLongitude);
      centerRef.current = [initialLatitude, initialLongitude];
    }
  }, []); // Пустой массив - только при монтировании
  
  // Обработка ошибки геолокации - fallback на Москву
  useEffect(() => {
    if (geoError && !latitude && !longitude) {
      setLatitude(MOSCOW_COORDS[0]);
      setLongitude(MOSCOW_COORDS[1]);
      centerRef.current = MOSCOW_COORDS;
      onLocationChange({
        latitude: MOSCOW_COORDS[0],
        longitude: MOSCOW_COORDS[1],
        address: "Москва"
      });
    }
  }, [geoError, latitude, longitude, onLocationChange]);
  
  // Обработчик "Моё местоположение" с обновлением центра карты
  const handleGetLocation = useCallback(async () => {
    const result = await getLocation();
    // Координаты будут обновлены через useEffect ниже
  }, [getLocation]);
  
  // Эффект для обработки координат от геолокации
  useEffect(() => {
    // Пропускаем первый рендер
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Если useGeolocation вернул координаты
    if (geoLatitude !== null && geoLongitude !== null) {
      // Обновляем только если это новые координаты
      if (latitude !== geoLatitude || longitude !== geoLongitude) {
        setLatitude(geoLatitude);
        setLongitude(geoLongitude);
        centerRef.current = [geoLatitude, geoLongitude];
        performGeocoding(geoLatitude, geoLongitude);
        
        // Обновляем центр карты через API
        if (mapRef.current) {
          mapRef.current.setCenter([geoLatitude, geoLongitude], 14, {
            duration: 300,
            checkZoomRange: true,
          });
        }
      }
    }
  }, [geoLatitude, geoLongitude, latitude, longitude, performGeocoding]);
  
  // Эффект для обновления центра карты при изменении координат из других источников
  useEffect(() => {
    if (latitude && longitude && mapRef.current) {
      // Проверяем, что центр отличается от текущего
      const currentCenter = mapRef.current.getCenter();
      if (Math.abs(currentCenter[0] - latitude) > 0.0001 || Math.abs(currentCenter[1] - longitude) > 0.0001) {
        mapRef.current.setCenter([latitude, longitude], 14, {
          duration: 300,
          checkZoomRange: true,
        });
      }
    }
  }, [latitude, longitude]);
  
  // Обработчик получения экземпляра карты
  const handleMapInstanceRef = useCallback((map: ymaps.Map | null) => {
    if (map) {
      mapRef.current = map;
      // Устанавлием начальный центр из ref
      map.setCenter(centerRef.current, 14);
    } else {
      mapRef.current = null;
    }
  }, []);
  
  // Компонент карты
  const MapContent = () => (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: "288px",
        maxWidth: "100%",
        clipPath: "inset(0 0 40px 0)" // Обрезаем нижнюю панель с элементами управления
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
          center: centerRef.current,
          zoom: 14,
        }}
        instanceRef={handleMapInstanceRef}
        onClick={handleMapClick}
        width="100%"
        height="100%"
        style={{ width: "100%", height: "100%", maxWidth: "100%" }}
      >
        <Placemark
          geometry={latitude && longitude ? [latitude, longitude] : MOSCOW_COORDS}
          properties={{
            balloonContent: address || "Выберите местоположение",
            hintContent: address || "Перетащите метку",
          }}
          options={{
            preset: "islands#blueCircleDotIcon",
            draggable: true,
          }}
          onDrag={handlePlacemarkDrag}
        />
      </YandexMap>
      
      {/* Индикатор геокодинга */}
      {geocoding && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 px-3 py-1.5 rounded-full shadow-md text-sm text-muted-foreground z-10">
          Определение адреса...
        </div>
      )}
    </div>
  );
  
  // Desktop версия
  if (!isMobile) {
    return (
      <div className="space-y-3">
        <div className="h-72 w-full rounded-lg overflow-hidden border" style={{ clipPath: "inset(0 0 40px 0)" }}>
          <MapContent />
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {address ? (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground break-words max-w-[200px]">{address}</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Перетащите метку или кликните на карту
              </span>
            )}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={geoLoading}
            className="shrink-0"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {geoLoading ? "Определение..." : "Моё местоположение"}
          </Button>
        </div>
      </div>
    );
  }
  
  // Mobile версия
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setSheetOpen(true)}
      >
        <MapPin className="h-4 w-4 mr-2" />
        {address ? "Изменить местоположение" : "Выбрать местоположение"}
      </Button>
      
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="inset-0 h-screen w-screen p-0" side="bottom">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Выберите местоположение</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 h-[calc(100vh-140px)] px-0 py-4 overflow-hidden">
            <MapContent />
          </div>
          
          <SheetFooter className="px-4 py-3 border-t flex-row gap-2 justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleGetLocation}
              disabled={geoLoading}
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {geoLoading ? "Определение..." : "Моё местоположение"}
            </Button>
            
            <Button
              type="button"
              onClick={() => {
                if (latitude && longitude) {
                  onLocationChange({ latitude, longitude, address });
                }
                setSheetOpen(false);
              }}
              className="flex-1"
              disabled={!latitude || !longitude}
            >
              Готово
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Отображение текущего адреса под кнопкой */}
      {address && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
          <MapPin className="h-4 w-4 mt-0.5" />
          <span className="break-words">{address}</span>
        </div>
      )}
    </>
  );
}
