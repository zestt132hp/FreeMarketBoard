import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAdSchema, categories } from "../../../shared/schema";
import type { Ad } from "../../../shared/schema";
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
import { Plus, X } from "lucide-react";

interface AdFormData {
  title: string;
  shortDescription: string;
  fullDescription: string;
  price: string;
  category: string;
  location: string;
  latitude?: string;
  longitude?: string;
  images: string[];
  specifications: string;
  isActive?: boolean;
}

interface AdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad?: Ad | null;
  onSubmit: (data: AdFormData) => Promise<void>;
  isLoading?: boolean;
}

export default function AdModal({
  open,
  onOpenChange,
  ad,
  onSubmit,
  isLoading = false,
}: AdModalProps) {
  const [specificationsText, setSpecificationsText] = useState("{}");
  const [specError, setSpecError] = useState<string | null>(null);

  const form = useForm<AdFormData>({
    resolver: zodResolver(insertAdSchema.omit({ userId: true, createdAt: true, id: true })),
    defaultValues: {
      title: "",
      shortDescription: "",
      fullDescription: "",
      price: "",
      category: "electronics",
      location: "",
      latitude: "",
      longitude: "",
      images: [],
      specifications: "{}",
      isActive: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "images",
  });

  useEffect(() => {
    if (ad) {
      form.reset({
        title: ad.title,
        shortDescription: ad.shortDescription,
        fullDescription: ad.fullDescription,
        price: ad.price,
        category: ad.category,
        location: ad.location,
        latitude: ad.latitude || "",
        longitude: ad.longitude || "",
        images: ad.images || [],
        specifications: ad.specifications,
        isActive: ad.isActive,
      });
      setSpecificationsText(ad.specifications);
    } else {
      form.reset({
        title: "",
        shortDescription: "",
        fullDescription: "",
        price: "",
        category: "electronics",
        location: "",
        latitude: "",
        longitude: "",
        images: [],
        specifications: "{}",
        isActive: true,
      });
      setSpecificationsText("{}");
    }
    setSpecError(null);
  }, [ad, open, form]);

  const handleValidateSpecifications = () => {
    try {
      JSON.parse(specificationsText);
      setSpecError(null);
      form.setValue("specifications", specificationsText);
      return true;
    } catch (e) {
      setSpecError("Неверный формат JSON");
      return false;
    }
  };

  const handleSubmit = async (data: AdFormData) => {
    // Validate specifications before submitting
    if (!handleValidateSpecifications()) {
      return;
    }
    
    // Ensure data has the specifications as JSON string
    const submitData = {
      ...data,
      specifications: specificationsText,
    };
    
    await onSubmit(submitData);
  };

  const handleAddImage = () => {
    append("");
  };

  const handleRemoveImage = (index: number) => {
    remove(index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ad ? "Редактировать объявление" : "Создать объявление"}</DialogTitle>
          <DialogDescription>
            {ad
              ? "Внесите изменения в ваше объявление"
              : "Заполните форму для создания нового объявления"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: iPhone 14 Pro Max" {...field} />
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
                    <FormLabel>Цена ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="999.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.filter(c => c.id !== "all").map((category) => (
                          <SelectItem key={category.id} value={category.id}>
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
                      <Input placeholder="Например: Москва" {...field} />
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
                      defaultValue={field.value ? "true" : "false"}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Широта (опционально)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="55.7558" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Долгота (опционально)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="37.6173" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Images Section */}
            <div className="space-y-2">
              <FormLabel>Изображения (URL)</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`images.${index}`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddImage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить изображение
              </Button>
            </div>

            {/* Specifications Section */}
            <FormField
              control={form.control}
              name="specifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Характеристики (JSON)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Textarea
                        placeholder='{"brand": "Apple", "model": "iPhone 14", "condition": "New"}'
                        className="resize-none font-mono text-sm"
                        rows={4}
                        value={specificationsText}
                        onChange={(e) => setSpecificationsText(e.target.value)}
                        onBlur={handleValidateSpecifications}
                      />
                      {specError && (
                        <p className="text-sm text-red-500">{specError}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Введите характеристики в формате JSON
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Сохранение..." : ad ? "Сохранить изменения" : "Создать объявление"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
