import { useQuery } from "@tanstack/react-query";
import { createAuthHeaders } from "@/lib/auth";
import { getApiUrl } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Package, Clock, MapPin } from "lucide-react";
import type { Image as AdImage } from "../../../shared/schema";

interface OrderItem {
  id: number;
  orderId: number;
  adId: number;
  title: string;
  price: string;
  quantity: number;
  imagePath?: string;
}

interface Order {
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
  items: OrderItem[];
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Ожидает оплаты", variant: "secondary" },
  paid: { label: "Оплачен", variant: "default" },
  shipping: { label: "Доставляется", variant: "default" },
  completed: { label: "Выполнен", variant: "outline" },
  cancelled: { label: "Отменён", variant: "destructive" },
};

export function MyOrdersSection() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/orders"), {
        headers: createAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const config = statusLabels[status] || { label: status, variant: "secondary" as const };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Мои заказы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p>Загрузка заказов...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Мои заказы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">У вас пока нет заказов</p>
              <p className="text-gray-400 text-sm">Оформите первый заказ в корзине</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Мои заказы</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order) => {
            // Get first image from first item for order preview
            const firstItemImagePath = order.items.length > 0 && order.items[0].imagePath
              ? order.items[0].imagePath
              : "https://via.placeholder.com/80x80";

            return (
              <div
                key={order.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">Заказ #{order.id}</span>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items - Miniatures (up to 5 in a row) */}
                {order.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">
                      Товары в заказе ({order.items.length})
                    </p>
                    <ScrollArea className="w-full whitespace-nowrap">
                      <div className="flex gap-2 pb-2">
                        {order.items.slice(0, 10).map((item, index) => (
                          <div
                            key={item.id}
                            className="flex-shrink-0 w-24 h-24 border rounded-md overflow-hidden bg-white relative"
                            title={`${item.title} - ${parseFloat(item.price).toLocaleString()} руб.`}
                          >
                            <img
                              src={item.imagePath || "https://via.placeholder.com/80x80"}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            {index === 0 && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 truncate">
                                {parseFloat(item.price).toLocaleString()} ₽
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 10 && (
                          <div className="flex-shrink-0 w-24 h-24 border rounded-md bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              +{order.items.length - 10}
                            </span>
                          </div>
                        )}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                )}

                {/* Delivery Info and Total */}
                <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {order.deliveryCity}, {order.deliveryStreet}, д. {order.deliveryBuilding}
                      {order.deliveryApartment && `, кв. ${order.deliveryApartment}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Сумма заказа:</p>
                    <p className="text-xl font-bold text-primary">
                      {parseFloat(order.totalAmount).toLocaleString()} ₽
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
