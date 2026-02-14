import { users, generations } from "@/db/schema";
import type { AdminUserRow } from "@/types/admin-user";
import { db } from "@/db";
import {
  desc,
  eq,
  gte,
  inArray,
  sql,
  and,
  or,
  ilike,
  isNull,
  gt,
  lte,
  asc,
} from "drizzle-orm";

export type AdminUserTypeFilter = "all" | "free" | "paid" | "basic" | "plus" | "pro";
export type AdminUserSortField = "created_at" | "last_active_at";
export type AdminUserSortOrder = "asc" | "desc";

export interface AdminUsersQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  userType?: AdminUserTypeFilter;
  sortField?: AdminUserSortField;
  sortOrder?: AdminUserSortOrder;
}

export interface AdminUsersQueryResult {
  users: AdminUserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function insertUser(
  data: typeof users.$inferInsert
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db().insert(users).values(data).returning();

  return user;
}

export async function findUserByEmail(
  email: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
}

export async function findUserByUuid(
  uuid: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.uuid, uuid))
    .limit(1);

  return user;
}

export async function getUsers(
  page: number = 1,
  limit: number = 50
): Promise<(typeof users.$inferSelect)[] | undefined> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select()
    .from(users)
    .orderBy(desc(users.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function updateUserInviteCode(
  user_uuid: string,
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .update(users)
    .set({ invite_code, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid))
    .returning();

  return user;
}

export async function updateUserInvitedBy(
  user_uuid: string,
  invited_by: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .update(users)
    .set({ invited_by, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid))
    .returning();

  return user;
}

export async function updateUserProfile(
  user_uuid: string,
  data: {
    display_name?: string | null;
    avatar_url?: string | null;
    gender?: string | null;
    bio?: string | null;
    background_url?: string | null;
  }
): Promise<typeof users.$inferSelect | undefined> {
  const updates: Partial<typeof users.$inferInsert> = {
    updated_at: new Date(),
  };

  if (data.display_name !== undefined) updates.display_name = data.display_name;
  if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
  if (data.gender !== undefined) updates.gender = data.gender;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.background_url !== undefined)
    updates.background_url = data.background_url;

  const [user] = await db()
    .update(users)
    .set(updates)
    .where(eq(users.uuid, user_uuid))
    .returning();

  return user;
}

export async function isUserProfileImageReference(
  user_uuid: string,
  image_uuid: string,
): Promise<boolean> {
  if (!user_uuid || !image_uuid) return false;
  const [user] = await db()
    .select({ uuid: users.uuid })
    .from(users)
    .where(
      and(
        eq(users.uuid, user_uuid),
        or(eq(users.avatar_url, image_uuid), eq(users.background_url, image_uuid)),
      ),
    )
    .limit(1);

  return Boolean(user);
}

export async function getUsersByUuids(
  user_uuids: string[]
): Promise<(typeof users.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(users)
    .where(inArray(users.uuid, user_uuids));

  return data;
}

export async function findUserByInviteCode(
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.invite_code, invite_code))
    .limit(1);

  return user;
}

export async function getUserUuidsByEmail(
  email: string
): Promise<string[] | undefined> {
  const data = await db()
    .select({ uuid: users.uuid })
    .from(users)
    .where(eq(users.email, email));

  return data.map((user) => user.uuid);
}

export async function getUsersTotal(): Promise<number> {
  const total = await db().$count(users);

  return total;
}

export async function getUserCountByDate(
  startTime: string
): Promise<Map<string, number> | undefined> {
  const data = await db()
    .select({ created_at: users.created_at })
    .from(users)
    .where(gte(users.created_at, new Date(startTime)));

  data.sort((a, b) => a.created_at!.getTime() - b.created_at!.getTime());

  const dateCountMap = new Map<string, number>();
  data.forEach((item) => {
    const date = item.created_at!.toISOString().split("T")[0];
    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
  });

  return dateCountMap;
}

/**
 * 获取用户列表并附带最后活跃时间
 * 使用LEFT JOIN和子查询高效获取用户最后一次生成任务的时间
 */
export async function getUsersWithLastActive(
  page: number = 1,
  limit: number = 50
): Promise<AdminUserRow[] | undefined> {
  const offset = (page - 1) * limit;

  // 使用子查询获取每个用户的最新generation时间
  const lastActiveSubquery = db()
    .select({
      user_uuid: generations.user_uuid,
      last_active: sql<Date>`MAX(${generations.created_at})`.as('last_active'),
    })
    .from(generations)
    .groupBy(generations.user_uuid)
    .as('last_active_subquery');

  const data = await db()
    .select({
      id: users.id,
      uuid: users.uuid,
      email: users.email,
      created_at: users.created_at,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      locale: users.locale,
      signin_type: users.signin_type,
      signin_ip: users.signin_ip,
      signin_provider: users.signin_provider,
      signin_openid: users.signin_openid,
      signup_country: users.signup_country,
      signup_ref: users.signup_ref,
      signup_utm_source: users.signup_utm_source,
      invite_code: users.invite_code,
      updated_at: users.updated_at,
      invited_by: users.invited_by,
      is_affiliate: users.is_affiliate,
      is_sub: users.is_sub,
      sub_expired_at: users.sub_expired_at,
      sub_plan_type: users.sub_plan_type,
      last_active_at: lastActiveSubquery.last_active,
    })
    .from(users)
    .leftJoin(lastActiveSubquery, eq(users.uuid, lastActiveSubquery.user_uuid))
    .orderBy(desc(users.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function getAdminUsersWithLastActive(
  options: AdminUsersQueryOptions = {}
): Promise<AdminUsersQueryResult> {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 50;
  const offset = (page - 1) * limit;
  const userType = options.userType || "all";
  const sortField = options.sortField || "created_at";
  const sortOrder = options.sortOrder || "desc";
  const search = options.search?.trim();
  const now = new Date();

  const paidCondition = and(
    eq(users.is_sub, true),
    sql<boolean>`${users.sub_expired_at} IS NOT NULL`,
    gt(users.sub_expired_at, now)
  );

  const freeCondition = or(
    eq(users.is_sub, false),
    isNull(users.sub_expired_at),
    lte(users.sub_expired_at, now)
  );

  const conditions = [];

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(users.email, searchPattern),
        ilike(users.display_name, searchPattern),
        ilike(users.uuid, searchPattern)
      )
    );
  }

  if (userType !== "all") {
    if (userType === "free") {
      conditions.push(freeCondition);
    } else if (userType === "paid") {
      conditions.push(paidCondition);
    } else if (userType === "basic") {
      conditions.push(
        and(
          paidCondition,
          sql<boolean>`lower(coalesce(${users.sub_plan_type}, '')) = 'basic'`
        )
      );
    } else if (userType === "plus") {
      conditions.push(
        and(
          paidCondition,
          sql<boolean>`lower(coalesce(${users.sub_plan_type}, '')) = 'plus'`
        )
      );
    } else if (userType === "pro") {
      conditions.push(
        and(
          paidCondition,
          sql<boolean>`lower(coalesce(${users.sub_plan_type}, '')) in ('pro', '')`
        )
      );
    }
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const lastActiveSubquery = db()
    .select({
      user_uuid: generations.user_uuid,
      last_active: sql<Date>`MAX(${generations.created_at})`.as("last_active"),
    })
    .from(generations)
    .groupBy(generations.user_uuid)
    .as("last_active_subquery");

  const sortColumn = sortField === "last_active_at"
    ? lastActiveSubquery.last_active
    : users.created_at;
  const sortBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  const dataQueryBase = db()
    .select({
      id: users.id,
      uuid: users.uuid,
      email: users.email,
      created_at: users.created_at,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      locale: users.locale,
      signin_type: users.signin_type,
      signin_ip: users.signin_ip,
      signin_provider: users.signin_provider,
      signin_openid: users.signin_openid,
      signup_country: users.signup_country,
      signup_ref: users.signup_ref,
      signup_utm_source: users.signup_utm_source,
      invite_code: users.invite_code,
      updated_at: users.updated_at,
      invited_by: users.invited_by,
      is_affiliate: users.is_affiliate,
      is_sub: users.is_sub,
      sub_expired_at: users.sub_expired_at,
      sub_plan_type: users.sub_plan_type,
      last_active_at: lastActiveSubquery.last_active,
    })
    .from(users)
    .leftJoin(lastActiveSubquery, eq(users.uuid, lastActiveSubquery.user_uuid))
    .orderBy(sortBy)
    .limit(limit)
    .offset(offset);

  const dataQuery = whereCondition ? dataQueryBase.where(whereCondition) : dataQueryBase;

  const countQueryBase = db()
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(users);

  const countQuery = whereCondition ? countQueryBase.where(whereCondition) : countQueryBase;

  const [usersData, countData] = await Promise.all([dataQuery, countQuery]);
  const total = Number(countData[0]?.count || 0);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  return {
    users: usersData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * 更新用户的订阅状态
 * 用于在订阅被删除时立即更新用户订阅权限
 */
export async function updateUserSubStatus(
  user_uuid: string,
  is_sub: boolean,
  sub_expired_at?: Date | null,
  sub_plan_type?: string | null
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .update(users)
    .set({
      is_sub,
      sub_expired_at: sub_expired_at || null,
      sub_plan_type: sub_plan_type || null,
      updated_at: new Date(),
    })
    .where(eq(users.uuid, user_uuid))
    .returning();

  return user;
}
