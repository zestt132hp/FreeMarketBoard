import { useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUploaderItem, type UploadedImage } from "./image-uploader-item";
import { getApiUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { createAuthHeaders } from "@/lib/auth";

interface ImageUploaderListProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  userId?: number;
  adId?: number; // для редактирования существующего объявления
  disabled?: boolean;
}

export function ImageUploaderList({
  images,
  onChange,
  maxImages = 10,
  userId,
  adId,
  disabled = false,
}: ImageUploaderListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const canAddMore = images.length < maxImages;
  const remainingSlots = maxImages - images.length;

  // Обработка выбора файлов
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Ограничиваем количество файлов
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    if (filesToUpload.length === 0) {
      alert(`Можно добавить максимум ${maxImages} изображений`);
      return;
    }

    setIsUploading(true);

    try {
      // Создаём FormData для загрузки
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append('images', file);
      });

      // Загружаем файлы на сервер
      const response = await fetch(getApiUrl('/api/upload/images'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Ошибка загрузки изображений: ${response.status} ${errorData.message || ''}`);
      }

      const result = await response.json();
      console.log('Server response:', result);
      
      // Проверяем, что images существует и это массив
      if (!result.images || !Array.isArray(result.images)) {
        throw new Error('Некорректный формат ответа сервера');
      }
      
      // Добавляем загруженные изображения в список
      const newImages: UploadedImage[] = result.images.map((img: any, index: number) => ({
        id: img.id,
        filename: img.filename,
        originalName: img.originalName,
        path: img.path,
        thumbnailPath: img.thumbnailPath,
        order: images.length + index,
        isPrimary: images.length === 0 && !images.some(img => img.isPrimary), // Первое изображение - основное
        status: 'uploaded' as const,
        adId: adId,
      }));

      onChange([...images, ...newImages]);
    } catch (error) {
      console.error('Ошибка загрузки изображений:', error);
      // Добавляем изображения со статусом ошибки
      const errorImages: UploadedImage[] = filesToUpload.map((file, index) => ({
        id: `error-${Date.now()}-${index}`,
        filename: '',
        originalName: file.name,
        path: '',
        thumbnailPath: '',
        order: images.length + index,
        isPrimary: false,
        status: 'error' as const,
      }));
      onChange([...images, ...errorImages]);
    } finally {
      setIsUploading(false);
      // Сбрасываем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Удаление изображения
  const handleRemoveImage = (imageId: string) => {
    onChange(images.filter(img => img.id !== imageId));
  };

  // Установка изображения как основного
  const handleSetPrimary = (imageId: string) => {
    onChange(images.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    })));
  };

  // Перемещение изображения в порядке (для drag-and-drop в будущем)
  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    
    // Обновляем порядок
    newImages.forEach((img, index) => {
      img.order = index;
    });
    
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Фотографии</h3>
          <p className="text-sm text-gray-500">
            {images.length} из {maxImages} изображений
            {remainingSlots > 0 && ` (можно добавить ещё ${remainingSlots})`}
          </p>
        </div>
        
        {/* Скрытый input для выбора файлов */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading || !canAddMore}
        />
      </div>

      {/* Кнопка добавления изображений */}
      {canAddMore && !disabled && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed border-2 hover:border-primary hover:bg-primary/5"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !canAddMore}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {isUploading ? 'Загрузка...' : 'Добавить фотографии'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WEBP до 5MB
              </p>
            </div>
          </div>
        </Button>
      )}

      {/* Сообщение, если достигнут лимит */}
      {!canAddMore && (
        <div className="text-center py-4 text-sm text-gray-500">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Достигнут лимит изображений ({maxImages})</p>
        </div>
      )}

      {/* Сетка изображений */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <ImageUploaderItem
              key={image.id}
              image={image}
              onRemove={() => handleRemoveImage(image.id)}
              onSetPrimary={() => handleSetPrimary(image.id)}
              canSetPrimary={!disabled}
            />
          ))}
        </div>
      )}

      {/* Подсказка */}
      {images.length > 0 && (
        <p className="text-xs text-gray-500">
          💡 Первое изображение будет основным. Нажмите на изображение, чтобы сделать его основным.
        </p>
      )}
    </div>
  );
}
