import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { createAuthHeaders } from "@/lib/auth";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

interface CartContextType {
  cartItems: any[];
  isLoading: boolean;
  addToCart: (adId: number, adUserId?: number) => Promise<void>;
  removeFromCart: (adId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartCount: number;
  isOwner: (adUserId: number | undefined) => boolean;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: "Item has been added to your cart.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to add item to cart.";
      toast({
        title: message.includes("own ad") ? "Cannot add own ad" : "Error",
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
        title: "Removed from cart",
        description: "Item has been removed from your cart.",
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
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
      });
    },
  });

  const addToCart = async (adId: number, adUserId?: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to be logged in to add items to cart.",
        variant: "destructive",
      });
      return;
    }
    await addToCartMutation.mutateAsync({ adId, adUserId });
  };

  const isOwner = (adUserId: number | undefined): boolean => {
    return isAuthenticated && adUserId === (window as any).__CURRENT_USER_ID__;
  };

  const removeFromCart = async (adId: number) => {
    await removeFromCartMutation.mutateAsync(adId);
  };

  const clearCart = async () => {
    await clearCartMutation.mutateAsync();
  };

  const contextValue: CartContextType = {
    cartItems,
    isLoading,
    addToCart,
    removeFromCart,
    clearCart,
    cartCount: cartItems.length,
    isOwner,
  };

  return React.createElement(CartContext.Provider, { value: contextValue }, children);
}