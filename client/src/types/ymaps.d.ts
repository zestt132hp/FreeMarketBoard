// Type declarations for Yandex Maps API v2.1
// @see https://yandex.ru/dev/maps/jsapi/doc/2.1/ref/reference/

declare namespace ymaps {
  // Базовые типы координат
  type Coordinates = [number, number] | [number, number, number];
  
  // Общие интерфейсы событий
  interface IEvent {
    get<T = any>(key: string): T;
  }
  
  interface IMapEvent extends IEvent {
    get<T = any>(key: string): T;
  }
  
  interface IPlacemarkEvent extends IEvent {
    get<T = any>(key: string): T;
  }
  
  // Опции карты
  interface IMapOptions {
    searchControlProvider?: string;
  }
  
  // Состояние карты
  interface IMapState {
    center?: Coordinates;
    zoom?: number;
    controls?: string[];
    type?: string;
  }
  
  // Карта
  interface IMap {
    setState(state: Partial<IMapState>): void;
    getState(): IMapState;
    setCenter(center: Coordinates): void;
    getCenter(): Coordinates;
    setZoom(zoom: number): void;
    getZoom(): number;
    geoObjects: IGeoObjectCollection;
    events: IEventManager;
  }
  
  // Коллекция геообъектов
  interface IGeoObjectCollection {
    add(object: IGeoObject): void;
    remove(object: IGeoObject): void;
    clear(): void;
  }
  
  // Геообъект
  interface IGeoObject {
    properties: IPropertiesAccessor;
    options: IOptionsManager;
    geometry: IGeometry;
  }
  
  // Менеджер свойств
  interface IPropertiesAccessor {
    get<T = any>(key: string): T;
    set(key: string, value: any): void;
  }
  
  // Менеджер опций
  interface IOptionsManager {
    get<T = any>(key: string): T;
    set(key: string, value: any): void;
  }
  
  // Геометрия
  interface IGeometry {
    getCoordinates(): Coordinates;
    getType(): string;
  }
  
  // Менеджер событий
  interface IEventManager {
    add(event: string, callback: (e: IEvent) => void, context?: any): void;
    remove(event: string, callback: (e: IEvent) => void): void;
  }
  
  // Метаданные для геокодирования
  interface IGeocodeMetaData {
    GeocoderMetaData: {
      kind: string;
      name: string;
      description: string;
      Address: {
        country_code: string;
        formatted: string;
        Components: Array<{
          kind: string;
          name: string;
        }>;
      };
    };
  }
  
  // Метаданные
  interface IMetaData {
    metaDataProperty: IGeocodeMetaMetaDataProperty;
  }
  
  interface IGeocodeMetaMetaDataProperty {
    GeocoderMetaData: {
      kind: string;
      name: string;
      description: string;
      Address: {
        country_code: string;
        formatted: string;
        Components: Array<{
          kind: string;
          name: string;
        }>;
      };
    };
  }
  
  // Ответ геокодера
  interface IGeocodeResponse {
    response: {
      GeoObjectCollection: {
        featureMember: Array<{
          GeoObject: IGeoObjectData;
        }>;
      };
    };
  }
  
  interface IGeoObjectData {
    metaDataProperty: IGeocodeMetaMetaDataProperty;
    name: string;
    description: string;
    Point: {
      pos: string;
    };
  }
  
  // Глобальный объект ymaps
  const ready: (callback: () => void) => void;
  const geocode: (request: string | Coordinates, options?: any) => Promise<IGeocodeResponse>;
}

// Расширение глобального окна
interface Window {
  ymaps: typeof ymaps;
}
