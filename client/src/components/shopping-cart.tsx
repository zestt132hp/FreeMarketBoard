import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import type { Image as AdImage } from "../../../shared/schema";

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShoppingCartComponent({ isOpen, onClose }: ShoppingCartProps) {
  const { cartItems, removeFromCart, clearCart, isLoading } = useCart();

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.ad ? parseFloat(item.ad.price) : 0);
  }, 0);

  const handleRemoveItem = async (adId: number) => {
    await removeFromCart(adId);
  };

  const handleClearCart = async () => {
    await clearCart();
  };

  const handleCheckout = () => {
    // TODO: Implement checkout functionality
    alert("Checkout functionality would be implemented here!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-96 flex flex-col">
        <SheetHeader>
          <SheetTitle>Корзина</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p>Загрузка...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Ваша корзина пуста</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                // Get first image path from images array (new schema) or fallback to string (old schema)
                const firstImagePath = item.ad?.images && item.ad.images.length > 0
                  ? (item.ad.images[0] as AdImage).path || (item.ad.images[0] as string)
                  : "https://via.placeholder.com/80x80";
                
                return (
                <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={firstImagePath}
                    alt={item.ad?.title || "Product"}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.ad?.title}</h4>
                    <p className="text-sm text-gray-600">
                      {item.ad ? parseFloat(item.ad.price).toLocaleString() : '0'} руб.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.adId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Итого:</span>
              <span className="text-2xl font-bold text-primary">
                {total.toLocaleString() + " руб."}
              </span>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleCheckout}
              >
                Перейти к оформлению
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearCart}
              >
                Очистить корзину
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
