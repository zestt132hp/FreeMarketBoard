import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCheckout, type CheckoutFormData, type CheckoutItem, type Address } from "@/hooks/use-checkout";
import { useCart } from "@/hooks/use-cart";
import { CreditCard, MapPin, User, Phone, Mail, Building, Home, Package } from "lucide-react";
import { Image as AdImage } from "../../../shared/schema";

interface AdCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems?: any[];
  onSuccess?: (order: any) => void;
}

export function AdCheckout({ open, onOpenChange, cartItems: externalCartItems, onSuccess }: AdCheckoutProps) {
  const { cartItems: hookCartItems } = useCart();
  const cartItems = externalCartItems || hookCartItems;
  const {
    createOrder,
    isCreatingOrder,
    addresses,
    defaultAddress,
    createAddress,
  } = useCheckout();

  const [formData, setFormData] = useState<CheckoutFormData>({
    paymentMethod: 'sbp',
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    deliveryRegion: '',
    deliveryCity: '',
    deliveryDistrict: '',
    deliveryStreet: '',
    deliveryBuilding: '',
    deliveryApartment: '',
    saveAddress: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Load default address on mount
  useEffect(() => {
    if (defaultAddress && !formData.recipientName) {
      fillAddress(defaultAddress);
    }
  }, [defaultAddress]);

  const fillAddress = (address: Address) => {
    setFormData(prev => ({
      ...prev,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      recipientEmail: address.recipientEmail,
      deliveryRegion: address.region,
      deliveryCity: address.city,
      deliveryDistrict: address.district || '',
      deliveryStreet: address.street,
      deliveryBuilding: address.building,
      deliveryApartment: address.apartment || '',
    }));
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.recipientName.trim()) {
      newErrors.recipientName = 'ФИО обязательно';
    }
    if (!formData.recipientPhone.trim()) {
      newErrors.recipientPhone = 'Номер телефона обязателен';
    }
    if (!formData.recipientEmail.trim()) {
      newErrors.recipientEmail = 'Email обязателен';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipientEmail)) {
      newErrors.recipientEmail = 'Некорректный email';
    }
    if (!formData.deliveryRegion.trim()) {
      newErrors.deliveryRegion = 'Регион обязателен';
    }
    if (!formData.deliveryCity.trim()) {
      newErrors.deliveryCity = 'Город обязателен';
    }
    if (!formData.deliveryStreet.trim()) {
      newErrors.deliveryStreet = 'Улица обязательна';
    }
    if (!formData.deliveryBuilding.trim()) {
      newErrors.deliveryBuilding = 'Дом обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const items: CheckoutItem[] = cartItems.map(item => {
      const firstImagePath = item.ad?.images && item.ad.images.length > 0
        ? (item.ad.images[0] as AdImage).path
        : undefined;
      
      return {
        adId: item.adId,
        title: item.ad?.title || 'Товар',
        price: item.ad?.price || '0',
        quantity: 1,
        imagePath: firstImagePath,
      };
    });

    try {
      const order = await createOrder({ formData, items });
      setCreatedOrder(order);
      setShowQrModal(true);
      onSuccess?.(order);
    } catch (error) {
      // Error handled in hook
    }
  };

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.ad ? parseFloat(item.ad.price) : 0);
  }, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Оформление заказа</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Payment Method Section */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Способ оплаты
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {/* SBP Card - Default */}
                <button
                  type="button"
                  onClick={() => handleInputChange('paymentMethod', 'sbp')}
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    formData.paymentMethod === 'sbp'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-8 bg-gradient-to-r from-blue-500 via-red-500 to-green-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">СБП</span>
                    </div>
                    <span className="text-sm font-medium">СБП</span>
                  </div>
                  {formData.paymentMethod === 'sbp' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full" />
                  )}
                </button>

                {/* Card Payment */}
                <button
                  type="button"
                  onClick={() => handleInputChange('paymentMethod', 'card')}
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    formData.paymentMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <CreditCard className="h-8 w-8 text-gray-600" />
                    <span className="text-sm font-medium">Карта</span>
                  </div>
                  {formData.paymentMethod === 'card' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full" />
                  )}
                </button>

                {/* Installments */}
                <button
                  type="button"
                  onClick={() => handleInputChange('paymentMethod', 'installments')}
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    formData.paymentMethod === 'installments'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      0% рассрочка
                    </Badge>
                    <span className="text-sm font-medium">Рассрочка</span>
                  </div>
                  {formData.paymentMethod === 'installments' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full" />
                  )}
                </button>
              </div>
            </section>

            <Separator />

            {/* Delivery Section - AdBoard Delivery */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                AdBoard Delivery
                <Badge variant="secondary" className="ml-2">Курьером</Badge>
              </h3>

              <div className="space-y-4">
                {/* Saved Addresses */}
                {addresses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {addresses.map(address => (
                      <Button
                        key={address.id}
                        variant="outline"
                        size="sm"
                        onClick={() => fillAddress(address)}
                        className="text-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {address.city}, {address.street}
                        {address.isDefault && <Badge className="ml-1 h-4">По умолчанию</Badge>}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Recipient Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">ФИО получателя</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        id="recipientName"
                        value={formData.recipientName}
                        onChange={(e) => handleInputChange('recipientName', e.target.value)}
                        className={`pl-10 ${errors.recipientName ? 'border-red-500' : ''}`}
                        placeholder="Иванов Иван Иванович"
                      />
                    </div>
                    {errors.recipientName && (
                      <p className="text-xs text-red-500">{errors.recipientName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientPhone">Номер телефона</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        id="recipientPhone"
                        value={formData.recipientPhone}
                        onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
                        className={`pl-10 ${errors.recipientPhone ? 'border-red-500' : ''}`}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    {errors.recipientPhone && (
                      <p className="text-xs text-red-500">{errors.recipientPhone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={formData.recipientEmail}
                      onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                      className={`pl-10 ${errors.recipientEmail ? 'border-red-500' : ''}`}
                      placeholder="example@email.com"
                    />
                  </div>
                  {errors.recipientEmail && (
                    <p className="text-xs text-red-500">{errors.recipientEmail}</p>
                  )}
                </div>

                {/* Delivery Address */}
                <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Адрес доставки
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="region">Регион</Label>
                      <Input
                        id="region"
                        value={formData.deliveryRegion}
                        onChange={(e) => handleInputChange('deliveryRegion', e.target.value)}
                        className={errors.deliveryRegion ? 'border-red-500' : ''}
                        placeholder="Московская область"
                      />
                      {errors.deliveryRegion && (
                        <p className="text-xs text-red-500">{errors.deliveryRegion}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Город</Label>
                      <Input
                        id="city"
                        value={formData.deliveryCity}
                        onChange={(e) => handleInputChange('deliveryCity', e.target.value)}
                        className={errors.deliveryCity ? 'border-red-500' : ''}
                        placeholder="Москва"
                      />
                      {errors.deliveryCity && (
                        <p className="text-xs text-red-500">{errors.deliveryCity}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Район (необязательно)</Label>
                    <Input
                      id="district"
                      value={formData.deliveryDistrict}
                      onChange={(e) => handleInputChange('deliveryDistrict', e.target.value)}
                      placeholder="Железнодорожный"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="street">Улица</Label>
                      <Input
                        id="street"
                        value={formData.deliveryStreet}
                        onChange={(e) => handleInputChange('deliveryStreet', e.target.value)}
                        className={errors.deliveryStreet ? 'border-red-500' : ''}
                        placeholder="ул. Корнилова"
                      />
                      {errors.deliveryStreet && (
                        <p className="text-xs text-red-500">{errors.deliveryStreet}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="building">Дом</Label>
                      <Input
                        id="building"
                        value={formData.deliveryBuilding}
                        onChange={(e) => handleInputChange('deliveryBuilding', e.target.value)}
                        className={errors.deliveryBuilding ? 'border-red-500' : ''}
                        placeholder="16"
                      />
                      {errors.deliveryBuilding && (
                        <p className="text-xs text-red-500">{errors.deliveryBuilding}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apartment">Квартира/офис (необязательно)</Label>
                    <Input
                      id="apartment"
                      value={formData.deliveryApartment}
                      onChange={(e) => handleInputChange('deliveryApartment', e.target.value)}
                      placeholder="42"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      checked={formData.saveAddress}
                      onChange={(e) => handleInputChange('saveAddress', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="saveAddress" className="text-sm cursor-pointer">
                      Сохранить адрес для будущих заказов
                    </Label>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Order Items Section */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Товары в заказе ({cartItems.length})
              </h3>
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const firstImagePath = item.ad?.images && item.ad.images.length > 0
                    ? (item.ad.images[0] as AdImage).path || 'https://via.placeholder.com/80x80'
                    : 'https://via.placeholder.com/80x80';
                  
                  return (
                    <Card key={item.id}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <img
                          src={firstImagePath}
                          alt={item.ad?.title || 'Товар'}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.ad?.title}</h4>
                          <p className="text-sm text-gray-500">{item.ad?.shortDescription}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {item.ad ? parseFloat(item.ad.price).toLocaleString() : '0'} ₽
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* Total and Submit */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Итого:</p>
                <p className="text-2xl font-bold text-primary">{total.toLocaleString()} ₽</p>
              </div>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isCreatingOrder || cartItems.length === 0}
                className="px-8"
              >
                {isCreatingOrder ? 'Обработка...' : 'Оплатить онлайн'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={(open) => {
        setShowQrModal(open);
        if (!open) {
          onOpenChange(false);
          setCreatedOrder(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Оплата заказа</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-lg mb-4">Заказ #{createdOrder?.id} создан</p>
            <p className="text-sm text-gray-600 mb-6">
              Отсканируйте QR код для оплаты через СБП
            </p>
            <div className="bg-white p-4 rounded-lg inline-block">
              {createdOrder?.qrCode ? (
                <img
                  src={createdOrder.qrCode}
                  alt="QR Code для оплаты"
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                  <CreditCard className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-600">
                Сумма к оплате: <span className="font-bold text-primary">{createdOrder?.totalAmount} ₽</span>
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setShowQrModal(false);
                  onOpenChange(false);
                  setCreatedOrder(null);
                }}
                className="w-full"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
