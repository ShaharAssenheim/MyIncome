"use client";
import { Plus } from "lucide-react";
import { CATEGORIES, getCategoryIcon } from "../constants";
import { IncomeType } from "../types";
import { Button } from "./ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
export function CategoryCard({
  type,
  amount,
  onAddClick,
  canAdd = true,
}: {
  type: IncomeType;
  amount: number;
  onAddClick: (type: IncomeType) => void;
  canAdd?: boolean;
}) {
  const category = CATEGORIES[type];
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span
            className="metric-card-icon"
            style={{
              color: category.color,
              background: `color-mix(in srgb, ${category.color} 9%, transparent)`,
            }}
            aria-hidden="true"
          >
            {getCategoryIcon(type, 17)}
          </span>
          <CardTitle>{category.label}</CardTitle>
        </div>
        {canAdd && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`הוספת הכנסה ל${category.label}`}
              onClick={() => onAddClick(type)}
            >
              <Plus />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p className="category-amount">
          {new Intl.NumberFormat("he-IL", {
            style: "currency",
            currency: "ILS",
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
          }).format(amount)}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          הכנסה בחודש הנבחר
        </p>
      </CardContent>
    </Card>
  );
}
