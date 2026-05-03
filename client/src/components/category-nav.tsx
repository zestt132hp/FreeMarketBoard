import { Button } from "@/components/ui/button";
import { Category } from "../../../shared/schema";
import * as Icons from "lucide-react";

interface CategoryNavProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Category[];
}

export function CategoryNav({ selectedCategory, onCategoryChange, categories }: CategoryNavProps) {
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

  // Add "All Categories" option at the beginning
  const allCategories = [{ id: 0, name: "All Categories", icon: "th-large", slug: "all", parentId: null }, ...categories];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto py-4">
          {allCategories.map((category) => (
            <Button
              key={category.slug}
              variant={selectedCategory === category.slug ? "default" : "ghost"}
              size="sm"
              onClick={() => onCategoryChange(category.slug)}
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
