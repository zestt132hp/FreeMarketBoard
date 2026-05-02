import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { createAuthHeaders } from "@/lib/auth";
import { useToast } from "./use-toast";

export interface CheckoutItem {
  adId: number;
  title: string;
  price: string;
  quantity: number;
  imagePath?: string;
}

export interface CheckoutFormData {
  paymentMethod: 'sbp' | 'card' | 'installments';
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryRegion: string;
  deliveryCity: string;
  deliveryDistrict?: string;
  deliveryStreet: string;
  deliveryBuilding: string;
  deliveryApartment?: string;
  saveAddress: boolean;
}

export interface Address {
  id: number;
  userId: number;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  region: string;
  city: string;
  district?: string;
  street: string;
  building: string;
  apartment?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Order {
  id: number;
  userId: number;
  status: string;
  totalAmount: string;
  paymentMethod: string;
  deliveryMethod: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryRegion: string;
  deliveryCity: string;
  deliveryDistrict?: string;
  deliveryStreet: string;
  deliveryBuilding: string;
  deliveryApartment?: string;
  addressId?: number;
  qrCode?: string;
  createdAt: string;
  items: Array<{
    id: number;
    orderId: number;
    adId: number;
    title: string;
    price: string;
    quantity: number;
    imagePath?: string;
  }>;
}

export function useCheckout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's saved addresses
  const { data: addresses = [], isLoading: isLoadingAddresses } = useQuery<Address[]>({
    queryKey: ['/api/addresses'],
    queryFn: async () => {
      const response = await fetch('/api/addresses', {
        headers: createAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      return response.json();
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: { formData: CheckoutFormData; items: CheckoutItem[] }) => {
      const { formData, items } = data;
      
      const response = await apiRequest('POST', '/api/orders', {
        ...formData,
        items,
      });
      return response.json() as Promise<Order>;
    },
    onSuccess: (order: Order) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: 'Заказ оформлен',
        description: `Заказ #${order.id} успешно создан`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка оформления заказа',
        description: error?.message || 'Не удалось создать заказ',
        variant: 'destructive',
      });
    },
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (address: Omit<Address, 'id' | 'createdAt'>) => {
      const response = await apiRequest('POST', '/api/addresses', address);
      return response.json() as Promise<Address>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      toast({
        title: 'Адрес сохранен',
        description: 'Адрес доставки добавлен в ваш профиль',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка сохранения адреса',
        description: error?.message || 'Не удалось сохранить адрес',
        variant: 'destructive',
      });
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Address> }) => {
      const response = await apiRequest('PUT', `/api/addresses/${id}`, updates);
      return response.json() as Promise<Address>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      toast({
        title: 'Адрес обновлен',
        description: 'Данные адреса успешно обновлены',
      });
    },
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/addresses/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      toast({
        title: 'Адрес удален',
        description: 'Адрес успешно удален',
      });
    },
  });

  // Set default address mutation
  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('PUT', `/api/addresses/${id}/default`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      toast({
        title: 'Адрес по умолчанию',
        description: 'Адрес установлен как адрес по умолчанию',
      });
    },
  });

  // Fetch orders
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders', {
        headers: createAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    },
  });

  // Fetch single order
  const { mutateAsync: fetchOrder } = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: createAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      return response.json() as Promise<Order>;
    },
  });

  return {
    addresses,
    isLoadingAddresses,
    orders,
    isLoadingOrders,
    fetchOrder,
    createOrder: createOrderMutation.mutateAsync,
    isCreatingOrder: createOrderMutation.isPending,
    createAddress: createAddressMutation.mutateAsync,
    updateAddress: updateAddressMutation.mutateAsync,
    deleteAddress: deleteAddressMutation.mutateAsync,
    setDefaultAddress: setDefaultAddressMutation.mutateAsync,
    defaultAddress: addresses.find((a: Address) => a.isDefault),
  };
}
