import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'adboard_filters';

export interface FilterState {
  priceFilter: string;      // "any", "0-100", "100-500", "500-1000", "1000+"
  locationFilter: string;   // город
  sortBy: string;           // "recent", "price-low", "price-high"
}

const defaultFilters: FilterState = {
  priceFilter: 'any',
  locationFilter: '',
  sortBy: 'recent',
};

export function useFiltersLocalStorage() {
  // Инициализация состояния из localStorage
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filters from localStorage:', error);
    }
    return defaultFilters;
  });

  // Сохранение в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters to localStorage:', error);
    }
  }, [filters]);

  // Обновление конкретного фильтра
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Сброс к значениям по умолчанию
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Подсчёт активных фильтров (отличных от значений по умолчанию)
  const activeFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.priceFilter !== defaultFilters.priceFilter) count++;
    if (filters.locationFilter !== defaultFilters.locationFilter) count++;
    if (filters.sortBy !== defaultFilters.sortBy) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    activeFiltersCount,
  };
}
