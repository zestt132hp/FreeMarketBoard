import React, { createContext, useContext, ReactNode, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { createAuthHeaders } from "@/lib/auth";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

interface CartDialogItem {
  adId: number;
  title: string;
  price: number;
  imagePath: string;
}

interface CartContextType {
  cartItems: any[];
  isLoading: boolean;
  addToCart: (adId: number, adUserId?: number) => Promise<void>;
  removeFromCart: (adId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartCount: number;
  isOwner: (adUserId: number | undefined) => boolean;
  isInCart: (adId: number) => boolean;
  // Диалоговое окно
  isAddToCartDialogOpen: boolean;
  selectedCartItem: CartDialogItem | null;
  openAddToCartDialog: (item: CartDialogItem) => void;
  closeAddToCartDialog: () => void;
  // Открытие корзины
  openCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Состояния для диалогового окна
  const [isAddToCartDialogOpen, setIsAddToCartDialogOpen] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<CartDialogItem | null>(null);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["/api/cart"],
    queryFn: async () => {
      const response = await fetch("/api/cart", {
        headers: createAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }

      return response.json();
    },
    enabled: isAuthenticated,
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ adId, adUserId }: { adId: number; adUserId?: number }) => {
      // Проверка: нельзя добавить своё объявление в корзину
      if (adUserId && isAuthenticated && adUserId === (window as any).__CURRENT_USER_ID__) {
        throw new Error("Cannot add your own ad to cart");
      }
      const response = await apiRequest("POST", "/api/cart", { adId });
      return response.json();
    },
    onSuccess: (data: any, variables: { adId: number; adUserId?: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      
      // Проверяем, был ли товар уже в корзине до добавления
      const wasInCart = cartItems.some((item: any) => item.adId === variables.adId);
      
      // Показываем диалог только если товара не было в корзине
      if (!wasInCart && data) {
        setSelectedCartItem({
          adId: variables.adId,
          title: data.title || "Товар",
          price: data.price ? parseFloat(data.price) : 0,
          imagePath: data.imagePath || "https://via.placeholder.com/80x80",
        });
        setIsAddToCartDialogOpen(true);
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Не удалось добавить товар в корзину.";
      toast({
        title: message.includes("own ad") ? "Нельзя добавить своё объявление" : "Ошибка",
        description: message,
        variant: "destructive",
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (adId: number) => {
      const response = await apiRequest("DELETE", `/api/cart/${adId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Удалено из корзины",
        description: "Товар удалён из вашей корзины.",
      });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/cart");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Корзина очищена",
        description: "Все товары удалены из вашей корзины.",
      });
    },
  });

  const addToCart = async (adId: number, adUserId?: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Требуется вход",
        description: "Для добавления товаров в корзину необходимо войти в систему.",
        variant: "destructive",
      });
      return;
    }
    await addToCartMutation.mutateAsync({ adId, adUserId });
  };

  const isOwner = (adUserId: number | undefined): boolean => {
    return isAuthenticated && adUserId === (window as any).__CURRENT_USER_ID__;
  };

  const isInCart = (adId: number): boolean => {
    return cartItems.some((item: any) => item.adId === adId);
  };

  const removeFromCart = async (adId: number) => {
    await removeFromCartMutation.mutateAsync(adId);
  };

  const clearCart = async () => {
    await clearCartMutation.mutateAsync();
  };

  // Функции для управления диалогом
  const openAddToCartDialog = (item: CartDialogItem) => {
    setSelectedCartItem(item);
    setIsAddToCartDialogOpen(true);
  };

  const closeAddToCartDialog = () => {
    setIsAddToCartDialogOpen(false);
    setSelectedCartItem(null);
  };

  const openCart = useCallback(() => {
    // Вызываем глобальную функцию открытия корзины, если она установлена
    const openCartFn = (window as any).__openCart__;
    if (openCartFn) {
      openCartFn();
    }
  }, []);

  const contextValue: CartContextType = {
    cartItems,
    isLoading,
    addToCart,
    removeFromCart,
    clearCart,
    cartCount: cartItems.length,
    isOwner,
    isInCart,
    isAddToCartDialogOpen,
    selectedCartItem,
    openAddToCartDialog,
    closeAddToCartDialog,
    openCart,
  };

  return React.createElement(CartContext.Provider, { value: contextValue }, children);
}
