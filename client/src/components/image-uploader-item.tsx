import { X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UploadedImage {
  id: string; // временный id для новых изображений
  filename: string;
  originalName: string;
  path: string; // URL для отображения
  thumbnailPath: string; // URL миниатюры
  adId?: number; // если изображение уже сохранено в БД
  dbId?: number; // id записи в таблице images
  order: number;
  isPrimary: boolean;
  status: 'uploading' | 'uploaded' | 'error';
}

interface ImageUploaderItemProps {
  image: UploadedImage;
  onRemove: () => void;
  onSetPrimary: () => void;
  canSetPrimary: boolean;
}

export function ImageUploaderItem({ 
  image, 
  onRemove, 
  onSetPrimary,
  canSetPrimary 
}: ImageUploaderItemProps) {
  const isUploading = image.status === 'uploading';
  const isError = image.status === 'error';

  return (
    <div 
      className={`
        relative group aspect-square rounded-lg overflow-hidden border-2 
        ${image.isPrimary ? 'border-primary' : 'border-gray-200'}
        ${isError ? 'border-red-500 opacity-50' : ''}
        hover:border-primary transition-colors
      `}
    >
      {/* Миниатюра изображения */}
      <img
        src={image.thumbnailPath || image.path}
        alt={image.originalName}
        className={`
          w-full h-full object-cover
          ${isUploading ? 'animate-pulse' : ''}
        `}
        loading="lazy"
      />

      {/* Индикатор загрузки */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Индикатор ошибки */}
      {isError && (
        <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
          <X className="w-8 h-8 text-white" />
        </div>
      )}

      {/* Кнопка удаления (крестик) */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={isUploading}
      >
        <X className="w-3 h-3" />
      </Button>

      {/* Индикатор основного изображения */}
      {image.isPrimary && (
        <div className="absolute top-1 left-1 bg-primary text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          Основное
        </div>
      )}

      {/* Кнопка "Сделать основным" (показывается при наведении) */}
      {!image.isPrimary && canSetPrimary && !isUploading && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-1 left-1 right-1 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onSetPrimary();
          }}
        >
          <Star className="w-3 h-3 mr-1" />
          Основное
        </Button>
      )}

      {/* Название файла (при наведении) */}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
        {image.originalName}
      </div>
    </div>
  );
}
