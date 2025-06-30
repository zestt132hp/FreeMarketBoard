import { Button } from "@/components/ui/button";
import { categories } from "../../../shared/schema";
import * as Icons from "lucide-react";

interface CategoryNavProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryNav({ selectedCategory, onCategoryChange }: CategoryNavProps) {
  const getIcon = (iconName: string) => {
    const IconMap: { [key: string]: any } = {
      "th-large": Icons.Grid3X3,
      "laptop": Icons.Laptop,
      "couch": Icons.Sofa,
      "car": Icons.Car,
      "briefcase": Icons.Briefcase,
      "tshirt": Icons.Shirt,
      "home": Icons.Home,
    };
    
    const IconComponent = IconMap[iconName] || Icons.Grid3X3;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto py-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className="flex items-center space-x-2 whitespace-nowrap"
            >
              {getIcon(category.icon)}
              <span>{category.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
