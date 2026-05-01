import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Phone, 
  MapPin, 
  Clock,
  ChevronLeft, 
  ChevronRight,
  Star,
  User
} from "lucide-react";
import type { Ad, Image as AdImage } from "../../../shared/schema";
import { useCart } from "@/hooks/use-cart";
import { formatDistanceToNow } from "date-fns";

interface AdDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ad: (Ad & { seller?: any; images?: AdImage[]; category?: { name: string } }) | null;
}

export function AdDetailModal({ isOpen, onClose, ad }: AdDetailModalProps) {
  const { addToCart } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!ad) return null;

  const specifications = JSON.parse(ad.specifications || '{}');
  const timeAgo = ad.createdAt
    ? formatDistanceToNow(new Date(ad.createdAt), { addSuffix: true })
    : "Недавно";

  // Get image paths from the images array
  const imagePaths = ad.images?.map(img => img.path) || [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === imagePaths.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? imagePaths.length - 1 : prev - 1
    );
  };

  const handleAddToCart = async () => {
    await addToCart(ad.id);
  };

  const handleContactSeller = () => {
    if (ad.seller?.phone) {
      window.open(`tel:${ad.seller.phone}`, '_self');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{ad.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Carousel */}
          <div className="space-y-4">
            <div className="relative">
              <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
                <img
                  src={imagePaths[currentImageIndex] || "https://via.placeholder.com/600x400"}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
                {imagePaths.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnail Navigation */}
            {imagePaths.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {imagePaths.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${ad.title} ${index + 1}`}
                    className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 ${
                      index === currentImageIndex ? 'border-primary' : 'border-gray-200'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-primary">
                  ${parseFloat(ad.price).toLocaleString()}
                </span>
                <Badge className="bg-blue-100 text-primary">
                  {ad.category?.name || 'Категория'}
                </Badge>
              </div>

              <div className="flex items-center text-gray-600 mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{ad.location}</span>
                <span className="mx-2">•</span>
                <Clock className="h-4 w-4 mr-1" />
                <span>{timeAgo}</span>
              </div>
            </div>

            {/* Product Specifications */}
            {Object.keys(specifications).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Спецификация</h3>
                <div className="space-y-2">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key}:</span>
                      <span>{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Описание</h3>
              <p className="text-gray-700 leading-relaxed">
                {ad.fullDescription}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Добавить в корзину
              </Button>
              {ad.seller?.phone && (
                <Button
                  variant="outline"
                  className="w-full bg-accent hover:bg-accent/90 text-white border-accent"
                  onClick={handleContactSeller}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Связаться с продавцом
                </Button>
              )}
            </div>

            {/* Seller Information */}
            {ad.seller && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Информация о продавце</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-600" />
                    <span>{ad.seller.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-600" />
                    <span>{ad.seller.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>4.8/5</span>
                    <span className="text-gray-500 ml-1">(23 reviews)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Map Placeholder */}
            <div>
              <h4 className="font-semibold mb-3">Местоположение</h4>
              <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Интерактивная карта</p>
                  <p className="text-sm text-gray-400">{ad.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
