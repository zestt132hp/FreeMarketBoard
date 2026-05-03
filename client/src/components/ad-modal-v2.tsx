import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAdSchema, adFormSchema, type Ad, type Category, type Image as AdImage } from "../../../shared/schema";
import SpecificationsForm from "./specifications-form";
import { LocationMapSelector } from "./location-map-selector";
import { useQuery } from "@tanstack/react-query";
import { ImageUploaderList, type UploadedImage } from "./image-uploader-list";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiUrl } from "@/lib/queryClient";

interface AdFormData {
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: string;
  categoryId: number;
  location: string;
  latitude?: string;
  longitude?: string;
  specifications: Record<string, any>;
  isActive?: boolean;
}

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad?: Ad | null;
  onSubmit: (data: AdFormData) => Promise<void>;
  isLoading?: boolean;
}

export default function AdModalV2({
  open,
  onOpenChange,
  ad,
  onSubmit,
  isLoading = false,
}: AdModalProps) {
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("electronics");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [specificationsData, setSpecificationsData] = useState<Array<{ templateId: number; key: string; value: string }>>([]);
  const { user } = useAuth();

  // Load specifications from API when editing an ad
  const { data: specsData } = useQuery({
    queryKey: ['ad-specs', ad?.id],
    queryFn: async () => {
      if (!ad?.id) return [];
      const res = await fetch(`/api/ads/${ad.id}/specs`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ad?.id && open,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: open,
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/categories"));
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const form = useForm<AdFormData>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      title: "",
      shortDescription: "",
      fullDescription: "",
      price: "",
      categoryId: 1,
      location: "",
      latitude: "",
      longitude: "",
      specifications: {},
      isActive: true,
    },
  });

  const categorySlug = form.watch("categoryId");

  useEffect(() => {
    if (ad) {
      // Find category by ID to get the slug for specifications form
      const category = categories.find((c: Category) => c.id === ad.categoryId);
      if (category) {
        setSelectedCategorySlug(category.slug);
      }
      
      // Convert specifications from API to key-value format (if loaded)
      const specsMap: Record<string, any> = {};
      if (specsData && Array.isArray(specsData)) {
        specsData.forEach((spec: any) => {
          if (spec.template?.key) {
            specsMap[spec.template.key] = spec.value;
          }
        });
      }
      
      form.reset({
        title: ad.title,
        shortDescription: ad.shortDescription,
        fullDescription: ad.fullDescription,
        price: ad.price,
        categoryId: ad.categoryId,
        location: ad.location,
        latitude: ad.latitude || "",
        longitude: ad.longitude || "",
        specifications: specsMap,
        isActive: ad.isActive ?? true,
      });
      
      // Инициализация загруженных изображений из существующего объявления
      if (ad.images && ad.images.length > 0) {
        const existingImages: UploadedImage[] = ad.images.map((img: AdImage, index: number) => ({
          id: `db-${img.id}`,
          dbId: img.id,
          filename: img.path.split('/').pop() || '',
          originalName: img.path.split('/').pop() || '',
          path: getApiUrl(img.path),
          thumbnailPath: getApiUrl(img.path.replace(/\/([^\/]+)$/, '/thumbnails/$1')),
          order: img.order ?? index,
          isPrimary: img.isPrimary ?? (index === 0),
          status: 'uploaded' as const,
          adId: ad.id,
        }));
        setUploadedImages(existingImages);
      } else {
        setUploadedImages([]);
      }
    } else {
      form.reset({
        title: "",
        shortDescription: "",
        fullDescription: "",
        price: "",
        categoryId: 1,
        location: "",
        latitude: "",
        longitude: "",
        specifications: {},
        isActive: true,
      });
      setSelectedCategorySlug("electronics");
      setUploadedImages([]);
    }
  }, [ad, open, form, categories, specsData]);

  const handleSubmit = async (data: AdFormData) => {
    console.log('Form data submitted:', data);
    console.log('Uploaded images:', uploadedImages);
    console.log('Specifications data:', specificationsData);
    
    try {
      // Проверяем, есть ли изображения
      if (uploadedImages.length === 0) {
        alert('Пожалуйста, добавьте хотя бы одно изображение');
        return;
      }
      
      // Convert form data to match the server schema
      const submitData: any = {
        ...data,
        price: data.price, // Keep as string for decimal database field
        specifications: typeof data.specifications === 'object' && data.specifications !== null
          ? JSON.stringify(data.specifications)
          : data.specifications || '{}',
        // Keep latitude and longitude as strings for decimal database fields
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        isActive: data.isActive ?? true,
        // Add specificationsData for server-side saving
        specificationsData: JSON.stringify(specificationsData)
      };
      
      console.log('Processed submit data:', submitData);
      console.log('Calling onSubmit callback with images...');
      
      // Передаём данные с изображениями в родительский компонент
      await onSubmit({
        ...submitData,
        _images: uploadedImages, // Временное поле для передачи изображений
      });
      
      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleCategoryChange = (categoryIdStr: string) => {
    const categoryId = parseInt(categoryIdStr, 10);
    form.setValue("categoryId", categoryId);
    
    // Find the category to get the slug
    const category = categories.find((c: Category) => c.id === categoryId);
    if (category) {
      setSelectedCategorySlug(category.slug);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ad ? "Редактировать объявление" : "Создать объявление"}</DialogTitle>
          <DialogDescription>
            {ad
              ? "Внесите изменения в объявление"
              : "Заполните форму для создания нового объявления"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => {
            e.preventDefault();
            console.log('Form onSubmit event triggered manually');
            console.log('Form validation errors:', JSON.stringify(form.formState.errors, null, 2));
            if (Object.keys(form.formState.errors).length > 0) {
              console.log('Form has validation errors, submission blocked');
              return;
            }
            form.handleSubmit(handleSubmit)(e);
          }} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Например, iPhone 14 Pro Max" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена (₽)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="999.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <Select onValueChange={handleCategoryChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Краткое описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Краткое описание товара (2-3 предложения)"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Полное описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Подробное описание товара"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Город/Местоположение</FormLabel>
                    <FormControl>
                      <Input placeholder="Например, Москва" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      value={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Активно</SelectItem>
                        <SelectItem value="false">Неактивно</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Specifications Section */}
            <SpecificationsForm
              category={selectedCategorySlug}
              specifications={form.watch("specifications") || {}}
              onSpecificationsChange={(specs) => form.setValue("specifications", specs)}
              onSpecificationsDataChange={useCallback((specsData: Array<{ templateId: number; key: string; value: string }>) => {
                console.log('SpecificationsData changed:', specsData);
                setSpecificationsData(specsData);
              }, [])}
            />

            {/* Секция загрузки изображений */}
            <div className="border-t pt-4">
              <ImageUploaderList
                images={uploadedImages}
                onChange={setUploadedImages}
                maxImages={10}
                userId={user?.id}
                adId={ad?.id}
                disabled={isLoading}
              />
            </div>

            {/* Местоположение */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Местоположение</h3>
              <LocationMapSelector
                onLocationChange={(data) => {
                  form.setValue('latitude', data.latitude.toString());
                  form.setValue('longitude', data.longitude.toString());
                  if (data.address) {
                    form.setValue('location', data.address);
                  }
                }}
                initialLatitude={form.getValues('latitude') ? parseFloat(form.getValues('latitude')) : undefined}
                initialLongitude={form.getValues('longitude') ? parseFloat(form.getValues('longitude')) : undefined}
                initialAddress={form.getValues('location')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отменить
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Сохранение..." : ad ? "Сохранить изменения" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
