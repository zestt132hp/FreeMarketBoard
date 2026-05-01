import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import type { Ad, Image as AdImage } from "../../../shared/schema";
import { formatDistanceToNow } from "date-fns";

interface AdCardProps {
  ad: Ad & { images?: AdImage[]; category?: string };
  onClick: (ad: Ad) => void;
}

export function AdCard({ ad, onClick }: AdCardProps) {
  const timeAgo = ad.createdAt
    ? formatDistanceToNow(new Date(ad.createdAt), { addSuffix: true })
    : "Недавно";

  // Get first image path from images array (new schema) or fallback to string (old schema)
  const firstImagePath = ad.images && ad.images.length > 0
    ? ((ad.images[0] as AdImage).path ?? "") || "https://via.placeholder.com/400x300"
    : "https://via.placeholder.com/400x300";

  // Get category name from category relation or fallback to string
  const categoryName = typeof ad.category === 'object' && ad.category !== null
    ? (ad.category as any).name
    : ad.category;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(ad)}
    >
      <div className="aspect-w-16 aspect-h-12">
        <img
          src={firstImagePath}
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
            {categoryName || 'Категория'}
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
