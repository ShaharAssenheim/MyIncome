"use client";
import { CSSProperties } from "react";
import { Plus } from "lucide-react";
import { IncomeType } from "../types";
import { CATEGORIES, getCategoryIcon } from "../constants";

interface CategoryCardProps {
  type: IncomeType;
  amount: number;
  onAddClick: (type: IncomeType) => void;
  canAdd?: boolean;
}
export function CategoryCard({
  type,
  amount,
  onAddClick,
  canAdd = true,
}: CategoryCardProps) {
  const category = CATEGORIES[type];
  return (
    <article
      className="ui-category"
      style={{ "--category-color": category.color } as CSSProperties}
    >
      <div className="flex items-center justify-between">
        <div className="ui-category-icon" aria-hidden="true">
          {getCategoryIcon(type, 19)}
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={() => onAddClick(type)}
            className="ui-icon-btn -my-1 -ml-2"
            aria-label={`הוסף הכנסה ל${category.label}`}
            title={`הוסף הכנסה ל${category.label}`}
          >
            <Plus size={19} />
          </button>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-xs font-medium text-slate-500">
          {category.label}
        </h3>
        <p className="ui-number text-3xl font-semibold text-slate-900">
          {new Intl.NumberFormat("he-IL", {
            style: "currency",
            currency: "ILS",
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
          }).format(amount)}
        </p>
      </div>
    </article>
  );
}
