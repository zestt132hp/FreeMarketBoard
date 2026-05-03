import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SpecificationTemplate {
  id: number;
  categoryId: number;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  placeholder: string | null;
}

export interface SpecificationOption {
  id: number;
  templateId: number;
  value: string;
  sortOrder: number;
}

export interface AdSpecification {
  id: number;
  adId: number;
  templateId: number;
  value: string;
  template?: SpecificationTemplate;
}

// Fetch specification templates for a category
export function useSpecTemplates(categorySlug: string) {
  return useQuery<SpecificationTemplate[]>({
    queryKey: ['specTemplates', categorySlug],
    queryFn: async () => {
      const response = await fetch(`/api/specs/templates?categorySlug=${categorySlug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch specification templates');
      }
      return response.json();
    },
    enabled: !!categorySlug,
  });
}

// Fetch specification options for a template
export function useSpecOptions(templateId: number | null) {
  return useQuery<SpecificationOption[]>({
    queryKey: ['specOptions', templateId],
    queryFn: async () => {
      const response = await fetch(`/api/specs/options?templateId=${templateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch specification options');
      }
      return response.json();
    },
    enabled: templateId !== null,
  });
}

// Fetch ad specifications
export function useAdSpecifications(adId: number | null) {
  return useQuery<AdSpecification[]>({
    queryKey: ['adSpecifications', adId],
    queryFn: async () => {
      if (adId === null) return [];
      const response = await fetch(`/api/ads/${adId}/specs`);
      if (!response.ok) {
        throw new Error('Failed to fetch ad specifications');
      }
      return response.json();
    },
    enabled: adId !== null,
  });
}

// Hook for managing specifications form state
export function useSpecificationsForm(categorySlug: string, existingSpecifications?: Record<string, any>) {
  const { data: templates, isLoading } = useSpecTemplates(categorySlug);
  const [specValues, setSpecValues] = useState<Record<string, { templateId: number; value: string }>>({});

  // Initialize form values when templates are loaded
  useEffect(() => {
    if (templates && !isLoading) {
      const initialValues: Record<string, { templateId: number; value: string }> = {};
      
      templates.forEach((template: SpecificationTemplate) => {
        const existingValue = existingSpecifications?.[template.key];
        let defaultValue = '';
        
        if (existingValue !== undefined) {
          defaultValue = String(existingValue);
        } else {
          // Set default based on type
          switch (template.type) {
            case 'text':
              defaultValue = '';
              break;
            case 'number':
              defaultValue = '0';
              break;
            case 'select':
              defaultValue = '';
              break;
            case 'boolean':
              defaultValue = 'false';
              break;
          }
        }
        
        initialValues[template.key] = {
          templateId: template.id,
          value: defaultValue,
        };
      });
      
      setSpecValues(initialValues);
    }
  }, [templates, isLoading, existingSpecifications]);

  const handleSpecChange = useCallback((key: string, value: string) => {
    setSpecValues(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
      },
    }));
  }, []);

  const getSpecificationsData = useCallback(() => {
    return Object.entries(specValues).map(([key, data]) => ({
      templateId: data.templateId,
      value: data.value,
    }));
  }, [specValues]);

  return {
    templates,
    specValues,
    handleSpecChange,
    getSpecificationsData,
    isLoading,
  };
}
