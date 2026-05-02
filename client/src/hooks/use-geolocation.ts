import { useState, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Доступ к геолокации запрещён";
    case 2:
      return "Не удалось определить местоположение";
    case 3:
      return "Превышено время ожидания";
    default:
      return "Неизвестная ошибка геолокации";
  }
}

export function useGeolocation(options?: UseGeolocationOptions) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
  });

  const getLocation = useCallback(async (): Promise<void> => {
    if (!navigator.geolocation) {
      const errorMsg = "Геолокация не поддерживается вашим браузером";
      console.error("[useGeolocation]", errorMsg);
      setState((prev) => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    console.log("[useGeolocation] Запрос геолокации...");

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("[useGeolocation] Получены координаты:", { latitude, longitude });
          setState({
            latitude,
            longitude,
            loading: false,
            error: null,
          });
          resolve();
        },
        (error) => {
          const errorMsg = getErrorMessage(error.code);
          console.error("[useGeolocation] Ошибка:", errorMsg, error);
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorMsg,
          }));
          resolve();
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? false,
          timeout: options?.timeout ?? 5000,
          maximumAge: options?.maximumAge ?? 0,
        }
      );
    });
  }, [options?.enableHighAccuracy, options?.timeout, options?.maximumAge]);

  const clearLocation = useCallback(() => {
    console.log("[useGeolocation] Сброс геолокации");
    setState({
      latitude: null,
      longitude: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    getLocation,
    clearLocation,
  };
}
