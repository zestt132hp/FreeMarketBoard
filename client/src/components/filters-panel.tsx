import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterState } from '@/hooks/use-filters-local-storage';
import { LocationFilterButtonMobile } from '@/components/location-filter-button';

interface FiltersPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Текущие применённые фильтры (для отображения)
  filters: FilterState;
  
  // Временные фильтры (для редактирования в панели)
  tempFilters: FilterState;
  onTempFiltersChange: (filters: FilterState) => void;
  
  // Обработчики
  onApply: () => void;
  onReset: () => void;
}

export function FiltersPanel({
  isOpen,
  onOpenChange,
  filters,
  tempFilters,
  onTempFiltersChange,
  onApply,
  onReset,
}: FiltersPanelProps) {
  
  // При открытии панели копируем текущие фильтры во временные
  React.useEffect(() => {
    if (isOpen) {
      onTempFiltersChange(filters);
    }
  }, [isOpen, filters]);

  const handleTempChange = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onTempFiltersChange({ ...tempFilters, [key]: value });
  };

  const handleApply = () => {
    onApply(); // Применяем временные фильтры к основным
    onOpenChange(false); // Закрываем панель
  };

  const handleReset = () => {
    onReset(); // Сбрасываем основные фильтры
    // Сбрасываем временные фильтры к значениям по умолчанию
    onTempFiltersChange({
      priceFilter: 'any',
      locationFilter: '',
      sortBy: 'recent',
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-none h-[80vh]">
        <SheetHeader>
          <SheetTitle>Фильтры</SheetTitle>
          <SheetDescription>
            Настройте параметры для поиска объявлений
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Фильтр цены */}
          <div className="space-y-2">
            <Label htmlFor="price-filter">Цена:</Label>
            <Select 
              value={tempFilters.priceFilter} 
              onValueChange={(value) => handleTempChange('priceFilter', value)}
            >
              <SelectTrigger id="price-filter">
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

          {/* Фильтр местоположения */}
          <div className="space-y-2">
            <Label htmlFor="location-filter">Местоположение:</Label>
            <Input
              id="location-filter"
              placeholder="Введите город..."
              value={tempFilters.locationFilter}
              onChange={(e) => handleTempChange('locationFilter', e.target.value)}
            />
            <LocationFilterButtonMobile
              onLocationFound={(address) => {
                handleTempChange('locationFilter', address);
              }}
              onError={(error) => {
                console.error('Geolocation error', error);
              }}
              fullWidth
            />
          </div>

          {/* Сортировка */}
          <div className="space-y-2">
            <Label htmlFor="sort-filter">Сортировать:</Label>
            <Select 
              value={tempFilters.sortBy} 
              onValueChange={(value) => handleTempChange('sortBy', value)}
            >
              <SelectTrigger id="sort-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">По популярности</SelectItem>
                <SelectItem value="price-low">Цена: от Меньшей к Большей</SelectItem>
                <SelectItem value="price-high">Цена: от Большей к Меньшей</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            Сбросить
          </Button>
          <Button 
            onClick={handleApply}
            className="w-full sm:w-auto"
          >
            Применить
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
