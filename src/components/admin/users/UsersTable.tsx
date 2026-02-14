"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TableSlot from "@/components/dashboard/slots/table";
import { useTranslations } from "next-intl";
import moment from "moment";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import type { AdminUserRow } from "@/types/admin-user";
import { getMemberBadgeUrl } from "@/lib/asset-loader";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import type {
  AdminUserSortField,
  AdminUserSortOrder,
  AdminUserTypeFilter,
} from "@/models/user";

interface UsersTableProps {
  users: AdminUserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  initialSearchQuery: string;
  initialUserTypeFilter: AdminUserTypeFilter;
  initialSortField: AdminUserSortField;
  initialSortOrder: AdminUserSortOrder;
}

function AvatarCell({
  avatarUrl,
  name,
  email,
  fallbackText,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  fallbackText: string;
}) {
  void fallbackText;
  return (
    <AdminUserAvatar
      avatarUrl={avatarUrl}
      name={name}
      email={email}
      className="size-10"
      fallbackClassName="text-[10px]"
    />
  );
}

export default function UsersTable({
  users,
  pagination,
  initialSearchQuery,
  initialUserTypeFilter,
  initialSortField,
  initialSortOrder,
}: UsersTableProps) {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);

  const userTypeFilter = initialUserTypeFilter;
  const sortField = initialSortField;
  const sortOrder = initialSortOrder;

  const pageStart = useMemo(() => {
    if (pagination.total === 0) return 0;
    return (pagination.page - 1) * pagination.limit + 1;
  }, [pagination.page, pagination.limit, pagination.total]);

  const pageEnd = useMemo(() => {
    if (pagination.total === 0) return 0;
    return Math.min(pagination.page * pagination.limit, pagination.total);
  }, [pagination.page, pagination.limit, pagination.total]);

  const buildAndPushParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearchSubmit = () => {
    buildAndPushParams({
      search: searchInput.trim() || null,
      page: "1",
    });
  };

  const handleUserTypeChange = (value: string) => {
    buildAndPushParams({
      user_type: value === "all" ? null : value,
      page: "1",
    });
  };

  const handleSortFieldChange = (value: string) => {
    buildAndPushParams({
      sort_field: value === "created_at" ? null : value,
      page: "1",
    });
  };

  const handleSortOrderToggle = () => {
    buildAndPushParams({
      sort_order: sortOrder === "asc" ? "desc" : "asc",
      page: "1",
    });
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    buildAndPushParams({ page: String(nextPage) });
  };

  const handleCopyUuid = async (uuid: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopiedUuid(uuid);
      toast.success(t("toast.uuid_copied"));
      setTimeout(() => setCopiedUuid(null), 2000);
    } catch {
      toast.error(t("toast.uuid_copy_failed"));
    }
  };

  const formatCountry = (countryCode?: string | null) => {
    if (!countryCode) return "-";
    const code = countryCode.toUpperCase();
    try {
      const display = new Intl.DisplayNames([navigator.language], {
        type: "region",
      }).of(code);
      return display ? `${display} (${code})` : code;
    } catch {
      return code;
    }
  };

  const formatSource = (row: AdminUserRow) => {
    const parts: string[] = [];
    if (row.signup_ref) parts.push(`ref=${row.signup_ref}`);
    if (row.signup_utm_source) parts.push(`utm_source=${row.signup_utm_source}`);
    return parts.length ? parts.join(" ") : "-";
  };

  const columns = [
    {
      name: "uuid",
      title: t("table.uuid"),
      callback: (row: AdminUserRow) => (
        <div className="group relative flex items-center gap-2">
          <span
            className="font-mono text-xs truncate max-w-[80px]"
            title={row.uuid || ""}
          >
            {row.uuid ? row.uuid.substring(0, 8) : "-"}...
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            onClick={() => row.uuid && handleCopyUuid(row.uuid)}
            disabled={!row.uuid}
          >
            {copiedUuid === row.uuid ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      ),
    },
    { name: "email", title: t("table.email"), className: "w-[280px]" },
    {
      name: "display_name",
      title: t("table.name"),
      callback: (row: AdminUserRow) => row.display_name || "-",
      className: "w-[140px]",
    },
    {
      name: "avatar_url",
      title: t("table.avatar"),
      callback: (row: AdminUserRow) => (
        <AvatarCell
          avatarUrl={row.avatar_url}
          name={row.display_name}
          email={row.email}
          fallbackText={t("table.no_avatar")}
        />
      ),
    },
    {
      name: "user_type",
      title: t("table.user_type"),
      callback: (row: AdminUserRow) => {
        const isSub =
          Boolean(row.is_sub) &&
          !!row.sub_expired_at &&
          new Date(row.sub_expired_at).getTime() > Date.now();

        const plan = (row.sub_plan_type || "").toString().trim();
        const membershipLevel = isSub && plan ? plan : isSub ? "pro" : "free";

        const src = getMemberBadgeUrl(`${membershipLevel}_member`);
        const alt = `${membershipLevel} Member`;

        return (
          <div className="flex items-center justify-start">
            <img src={src} alt={alt} className="h-6 w-6 rounded" />
          </div>
        );
      },
      className: "w-[100px]",
    },
    {
      name: "signup_country",
      title: t("table.country"),
      callback: (row: AdminUserRow) => (
        <span className="text-xs" title={row.signup_country || ""}>
          {formatCountry(row.signup_country)}
        </span>
      ),
      className: "w-[180px]",
    },
    {
      name: "signup_source",
      title: t("table.source"),
      callback: (row: AdminUserRow) => (
        <span className="font-mono text-xs" title={formatSource(row)}>
          {formatSource(row)}
        </span>
      ),
      className: "w-[240px]",
    },
    {
      name: "created_at",
      title: t("table.created_at"),
      callback: (row: AdminUserRow) => (
        <span className="text-xs">
          {moment(row.created_at).format("YYYY-MM-DD HH:mm")}
        </span>
      ),
      className: "w-[140px]",
    },
  ];

  return (
    <div>
      <div className="mt-2 mb-0 flex gap-4">
        <Input
          placeholder={t("filters.search_placeholder")}
          className="flex-1"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchSubmit();
            }
          }}
        />
        <Button variant="outline" onClick={handleSearchSubmit}>
          {t("filters.search")}
        </Button>
        <Select value={userTypeFilter} onValueChange={handleUserTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filters.user_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_users")}</SelectItem>
            <SelectItem value="free">{t("filters.free_users")}</SelectItem>
            <SelectItem value="paid">{t("filters.paid_users")}</SelectItem>
            <SelectItem value="basic">{t("filters.basic_members")}</SelectItem>
            <SelectItem value="plus">{t("filters.plus_members")}</SelectItem>
            <SelectItem value="pro">{t("filters.pro_members")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Select value={sortField} onValueChange={handleSortFieldChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">
                {t("filters.sort_created")}
              </SelectItem>
              <SelectItem value="last_active_at">
                {t("filters.sort_active")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSortOrderToggle}
            className="h-9 w-9"
          >
            <div className="flex flex-col gap-0.5">
              <ArrowUp
                className={`h-3 w-3 ${sortOrder === "asc" ? "text-primary" : "text-muted-foreground"}`}
              />
              <ArrowDown
                className={`h-3 w-3 ${sortOrder === "desc" ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
          </Button>
        </div>
      </div>

      <TableSlot
        title=""
        columns={columns}
        data={users}
        showHeader={false}
      />

      {users.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          {t("no_users")}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {t("pagination.showing", {
            start: pageStart,
            end: pageEnd,
            total: pagination.total,
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            {t("pagination.previous")}
          </Button>
          <span className="text-sm text-muted-foreground min-w-[72px] text-center">
            {pagination.page}/{pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            {t("pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
