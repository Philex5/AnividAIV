import { getPaiedOrders } from "@/models/order";
import { getTranslations } from "next-intl/server";
import OrdersTable from "@/components/admin/OrdersTable";
import RefreshButton from "@/components/ui/refresh-button";

export default async function AdminOrdersPage() {
  const t = await getTranslations("admin.orders");
  const orders = await getPaiedOrders(1, 50);

  const translations = {
    order_no: t("table.order_no"),
    paid_email: t("table.paid_email"),
    product_name: t("table.product_name"),
    amount: t("table.amount"),
    created_at: t("table.created_at"),
    status: t("table.status"),
    actions: t("table.actions"),
    view_details: t("table.view_details"),
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <RefreshButton onRefresh={async () => {
          "use server";
          await getPaiedOrders(1, 50);
        }} />
      </div>
      <OrdersTable orders={orders || []} translations={translations} />
    </div>
  );
}
