'use client';

import { Category, CATEGORY_LABELS } from '@/types';

interface CategoryBarProps {
  selectedCategory: Category | 'all';
  onSelectCategory: (category: Category | 'all') => void;
}

export default function CategoryBar({ selectedCategory, onSelectCategory }: CategoryBarProps) {
  const categories = Object.entries(CATEGORY_LABELS) as [Category, string][];

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pb-2 min-w-max">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[#74AA9C] text-[#141414]'
              : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#2a2a2a] border border-[#333]'
          }`}
        >
          All
        </button>
        {categories.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onSelectCategory(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === key
                ? 'bg-[#74AA9C] text-[#141414]'
                : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#2a2a2a] border border-[#333]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
