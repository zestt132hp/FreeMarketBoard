import { useEffect, useState } from "react";
import { getCategorySpecs, type CategorySpec } from "../../../shared/category-specs";
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
  const [specs, setSpecs] = useState<CategorySpec[]>([]);
  const [localSpecs, setLocalSpecs] = useState<Record<string, any>>({});

  useEffect(() => {
    const categorySpecs = getCategorySpecs(category);
    setSpecs(categorySpecs);
    
    // Initialize form values with existing specifications or empty values
    const initialValues: Record<string, any> = {};
    categorySpecs.forEach((spec: CategorySpec) => {
      const currentValue = specifications[spec.key];
      if (currentValue !== undefined) {
        initialValues[spec.key] = currentValue;
      } else {
        // Set default values based on type
        switch (spec.type) {
          case 'text':
            initialValues[spec.key] = '';
            break;
          case 'number':
            initialValues[spec.key] = 0;
            break;
          case 'select':
            initialValues[spec.key] = '';
            break;
          case 'boolean':
            initialValues[spec.key] = false;
            break;
        }
      }
    });
    setLocalSpecs(initialValues);
  }, [category, specifications]);

  const handleSpecChange = (key: string, value: any) => {
    const updatedSpecs = { ...localSpecs, [key]: value };
    setLocalSpecs(updatedSpecs);
    if (onSpecificationsChange) {
      onSpecificationsChange(updatedSpecs);
    }
  };

  const renderSpecField = (spec: CategorySpec) => {
    const value = localSpecs[spec.key];
    
    switch (spec.type) {
      case 'text':
        return (
          <FormItem>
            <FormLabel>
              {spec.label}
              {spec.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={spec.placeholder}
                value={value || ''}
                onChange={(e) => handleSpecChange(spec.key, e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'number':
        return (
          <FormItem>
            <FormLabel>
              {spec.label}
              {spec.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder={spec.placeholder}
                value={value ?? 0}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  handleSpecChange(spec.key, val);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );

      case 'select':
        return (
          <FormItem>
            <FormLabel>
              {spec.label}
              {spec.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <Select onValueChange={(val) => handleSpecChange(spec.key, val)} value={value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={spec.placeholder || `Select ${spec.label.toLowerCase()}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {spec.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );

      case 'boolean':
        return (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={value || false}
                onCheckedChange={(checked) => handleSpecChange(spec.key, checked)}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                {spec.label}
                {spec.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        );

      default:
        return null;
    }
  };

  if (specs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No specifications available for the selected category
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Характеристики</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specs.map((spec) => (
          <div key={spec.key} className="space-y-2">
            {renderSpecField(spec)}
          </div>
        ))}
      </div>
    </div>
  );
}
