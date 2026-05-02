import { useEffect, useState } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSpecTemplates, useSpecOptions, type SpecificationTemplate } from "@/hooks/use-specifications";

interface SpecificationsFormProps {
  category: string;
  specifications?: Record<string, any>;
  onSpecificationsChange?: (specs: Record<string, any>) => void;
}

export default function SpecificationsForm({
  category,
  specifications = {},
  onSpecificationsChange,
}: SpecificationsFormProps) {
  const { data: templates, isLoading } = useSpecTemplates(category);
  const [specValues, setSpecValues] = useState<Record<string, string>>({});

  // Initialize form values when templates are loaded or specifications change
  useEffect(() => {
    if (templates && !isLoading) {
      setSpecValues(prev => {
        const newValues: Record<string, string> = { ...prev };
        templates.forEach((template: SpecificationTemplate) => {
          const currentValue = specifications[template.key];
          if (currentValue !== undefined) {
            newValues[template.key] = String(currentValue);
          } else if (!(template.key in newValues)) {
            // Set default values based on type only if not already set
            switch (template.type) {
              case 'text':
                newValues[template.key] = '';
                break;
              case 'number':
                newValues[template.key] = '0';
                break;
              case 'select':
                newValues[template.key] = '';
                break;
              case 'boolean':
                newValues[template.key] = 'false';
                break;
            }
          }
        });
        return newValues;
      });
    }
  }, [templates, isLoading, specifications]);

  const handleSpecChange = (key: string, value: string) => {
    const updatedSpecs = { ...specValues, [key]: value };
    setSpecValues(updatedSpecs);
    if (onSpecificationsChange) {
      onSpecificationsChange(updatedSpecs);
    }
  };

  const renderSpecField = (template: SpecificationTemplate) => {
    const value = specValues[template.key] ?? '';
    
    switch (template.type) {
      case 'text':
        return (
          <FormItem>
            <FormLabel>
              {template.label}
              {template.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={template.placeholder || ''}
                value={value}
                onChange={(e) => handleSpecChange(template.key, e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'number':
        return (
          <FormItem>
            <FormLabel>
              {template.label}
              {template.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder={template.placeholder || ''}
                value={value}
                onChange={(e) => {
                  const val = e.target.value === '' ? '0' : e.target.value;
                  handleSpecChange(template.key, val);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'select':
        return <SelectField template={template} value={value} onChange={handleSpecChange} />;

      case 'boolean':
        return (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={value === 'true'}
                onCheckedChange={(checked) => handleSpecChange(template.key, checked ? 'true' : 'false')}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                {template.label}
                {template.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        );

      default:
        return null;
    }
  };

  // Separate component for select type to use useSpecOptions hook
  function SelectField({ template, value, onChange }: { template: SpecificationTemplate; value: string; onChange: (key: string, value: string) => void }) {
    const { data: options } = useSpecOptions(template.id);
    
    return (
      <FormItem>
        <FormLabel>
          {template.label}
          {template.required && <span className="text-red-500 ml-1">*</span>}
        </FormLabel>
        <Select onValueChange={(val) => onChange(template.key, val)} value={value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder={template.placeholder || `Выберите ${template.label.toLowerCase()}`} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    );
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Загрузка характеристик...
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Характеристики</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="space-y-2">
            {renderSpecField(template)}
          </div>
        ))}
      </div>
    </div>
  );
}
