import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface CartDialogItem {
  adId: number;
  title: string;
  price: number;
  imagePath: string;
}

interface AddToCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartDialogItem | null;
  onGoToCart: () => void;
  onContinueShopping: () => void;
}

export function AddToCartDialog({
  open,
  onOpenChange,
  item,
  onGoToCart,
  onContinueShopping,
}: AddToCartDialogProps) {
  const handleGoToCart = () => {
    onGoToCart();
    onOpenChange(false);
  };

  const handleContinueShopping = () => {
    onContinueShopping();
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Товар добавлен в корзину!
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4 py-4">
          <img
            src={item.imagePath || "https://via.placeholder.com/80x80"}
            alt={item.title}
            className="w-20 h-20 object-cover rounded-md"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-lg line-clamp-2 mb-1">
              {item.title}
            </h4>
            <p className="text-2xl font-bold text-primary">
              {item.price.toLocaleString()} руб.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleContinueShopping}
          >
            Продолжить покупки
          </Button>
          <Button
            className="flex-1"
            onClick={handleGoToCart}
          >
            Перейти в корзину
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
