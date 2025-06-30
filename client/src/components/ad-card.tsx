import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import type { Ad } from "../../../shared/schema";
import { formatDistanceToNow } from "date-fns";

interface AdCardProps {
  ad: Ad;
  onClick: (ad: Ad) => void;
}

export function AdCard({ ad, onClick }: AdCardProps) {
  const timeAgo = ad.createdAt 
    ? formatDistanceToNow(new Date(ad.createdAt), { addSuffix: true })
    : "Recently";

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(ad)}
    >
      <div className="aspect-w-16 aspect-h-12">
        <img
          src={ad.images[0] || "https://via.placeholder.com/400x300"}
          alt={ad.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{ad.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {ad.shortDescription}
        </p>
        <div className="flex justify-between items-center mb-2">
          <span className="text-2xl font-bold text-primary">
            ${parseFloat(ad.price).toLocaleString()}
          </span>
          <Badge variant="secondary" className="text-xs">
            {ad.category}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{ad.location}</span>
          <span className="mx-2">•</span>
          <Clock className="h-4 w-4 mr-1" />
          <span>{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}
