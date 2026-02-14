"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface Product {
  product_id: string;
  product_name: string;
  count: number;
  total_amount: number;
}

interface ProductDistributionCardProps {
  products: Product[];
  range: string;
}

export default function ProductDistributionCard({ products, range }: ProductDistributionCardProps) {
  const t = useTranslations("admin.revenue");

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("cards.product_distribution")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {products.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t("no_data")}
            </div>
          ) : (
            products.slice(0, 10).map((product) => (
              <div
                key={product.product_id}
                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm truncate flex-1" title={product.product_name}>
                  {product.product_name}
                </span>
                <span className="text-sm font-medium ml-2">
                  {product.count}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
