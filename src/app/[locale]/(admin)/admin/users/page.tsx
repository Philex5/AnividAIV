import { getTranslations } from "next-intl/server";
import {
  getAdminUsersWithLastActive,
  type AdminUserSortField,
  type AdminUserSortOrder,
  type AdminUserTypeFilter,
} from "@/models/user";
import UsersTable from "@/components/admin/users/UsersTable";
import RefreshButton from "@/components/ui/refresh-button";

const USER_TYPE_FILTERS: AdminUserTypeFilter[] = ["all", "free", "paid", "basic", "plus", "pro"];
const SORT_FIELDS: AdminUserSortField[] = ["created_at", "last_active_at"];
const SORT_ORDERS: AdminUserSortOrder[] = ["asc", "desc"];

function parsePositiveInt(value: string | undefined, defaultValue: number) {
  if (!value) return defaultValue;
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : defaultValue;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations("admin.users");
  const resolvedSearchParams = await searchParams;

  const search = typeof resolvedSearchParams.search === "string"
    ? resolvedSearchParams.search
    : typeof resolvedSearchParams.user_uuid === "string"
      ? resolvedSearchParams.user_uuid
      : "";

  const requestedPage = parsePositiveInt(
    typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined,
    1
  );
  const limit = parsePositiveInt(
    typeof resolvedSearchParams.limit === "string" ? resolvedSearchParams.limit : undefined,
    50
  );

  const userTypeRaw = typeof resolvedSearchParams.user_type === "string"
    ? resolvedSearchParams.user_type
    : "all";
  const userType = USER_TYPE_FILTERS.includes(userTypeRaw as AdminUserTypeFilter)
    ? (userTypeRaw as AdminUserTypeFilter)
    : "all";

  const sortFieldRaw = typeof resolvedSearchParams.sort_field === "string"
    ? resolvedSearchParams.sort_field
    : "created_at";
  const sortField = SORT_FIELDS.includes(sortFieldRaw as AdminUserSortField)
    ? (sortFieldRaw as AdminUserSortField)
    : "created_at";

  const sortOrderRaw = typeof resolvedSearchParams.sort_order === "string"
    ? resolvedSearchParams.sort_order
    : "desc";
  const sortOrder = SORT_ORDERS.includes(sortOrderRaw as AdminUserSortOrder)
    ? (sortOrderRaw as AdminUserSortOrder)
    : "desc";

  const result = await getAdminUsersWithLastActive({
    page: requestedPage,
    limit,
    search,
    userType,
    sortField,
    sortOrder,
  });

  const page = Math.min(requestedPage, result.pagination.totalPages);
  const users = page === requestedPage
    ? result
    : await getAdminUsersWithLastActive({
      page,
      limit,
      search,
      userType,
      sortField,
      sortOrder,
    });

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <RefreshButton onRefresh={async () => {
          "use server";
          await getAdminUsersWithLastActive({
            page,
            limit,
            search,
            userType,
            sortField,
            sortOrder,
          });
        }} />
      </div>
      <UsersTable
        users={users.users}
        pagination={users.pagination}
        initialSearchQuery={search}
        initialUserTypeFilter={userType}
        initialSortField={sortField}
        initialSortOrder={sortOrder}
      />
    </div>
  );
}
