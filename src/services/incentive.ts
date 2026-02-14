import { db } from "@/db";
import {
  findIncentiveByUserAndDate,
  findLastIncentiveByType,
  insertIncentiveRecord,
} from "@/models/incentive";
import { increaseCredits, CreditsTransType } from "./credit";
import { getOneMonthLaterTimestr } from "@/lib/time";

export const IncentiveType = {
  CheckIn: "check_in",
  ShareSNS: "share_sns",
} as const;

export const IncentiveRewards = {
  BaseCheckIn: 10,
  Day5Bonus: 10, // Total 20
  Day10Bonus: 30, // Total 40
  Day30Bonus: 60, // Total 70
  ShareSNS: 10,
};

type IncentiveFailure = { success: false; message: string };
type CheckInResult =
  | { success: true; reward: number; streakCount: number }
  | IncentiveFailure;
type ShareRewardResult = { success: true; reward: number } | IncentiveFailure;

function getUtcDateStr() {
  return new Date().toISOString().split("T")[0];
}

export async function getCheckInStatus(userUuid: string) {
  const todayStr = getUtcDateStr();
  const todayCheckIn = await findIncentiveByUserAndDate(
    userUuid,
    IncentiveType.CheckIn,
    todayStr,
  );

  // Get latest check-in to determine streak
  const lastCheckIn = await findLastIncentiveByType(
    userUuid,
    IncentiveType.CheckIn,
  );

  let streakCount = 0;
  if (lastCheckIn) {
    const lastDateStr = lastCheckIn.reward_date;
    const todayDate = new Date(todayStr);
    const lastDate = new Date(lastDateStr);

    // Calculate difference in days using UTC timestamps to be safe
    const diffTime = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      streakCount = lastCheckIn.streak_count || 0;
    } else if (diffDays === 1) {
      streakCount = lastCheckIn.streak_count || 0;
    } else {
      streakCount = 0; // Streak broken
    }
  }

  return {
    isTodayCheckedIn: !!todayCheckIn,
    streakCount,
    nextReward: calculateCheckInReward(streakCount + 1),
    todayStr,
  };
}

export function calculateCheckInReward(day: number) {
  const cycleDay = ((day - 1) % 30) + 1;
  let reward = IncentiveRewards.BaseCheckIn;
  if (cycleDay === 5) reward += IncentiveRewards.Day5Bonus;
  else if (cycleDay === 10) reward += IncentiveRewards.Day10Bonus;
  else if (cycleDay === 30) reward += IncentiveRewards.Day30Bonus;
  return reward;
}

export async function performCheckIn(userUuid: string): Promise<CheckInResult> {
  const status = await getCheckInStatus(userUuid);
  if (status.isTodayCheckedIn) {
    return { success: false as const, message: "Already checked in today" };
  }

  const newStreak = status.streakCount + 1;
  const reward = calculateCheckInReward(newStreak);
  const todayStr = status.todayStr;
  const rewardExpiredAt = getOneMonthLaterTimestr();

  try {
    const result = await db().transaction(async (tx) => {
      // Use unique constraint to prevent duplicate check-ins (idempotency)
      await insertIncentiveRecord(
        {
          user_uuid: userUuid,
          type: IncentiveType.CheckIn,
          reward_amount: reward,
          reward_date: todayStr,
          streak_count: newStreak,
        },
        tx,
      );

      await increaseCredits({
        user_uuid: userUuid,
        trans_type: CreditsTransType.CheckInReward,
        credits: reward,
        expired_at: rewardExpiredAt,
        tx,
      });

      return { success: true as const, reward, streakCount: newStreak };
    });
    return result;
  } catch (error: any) {
    // Check for unique constraint violation (Postgres error 23505)
    if (error.code === "23505") {
      return { success: false as const, message: "Already checked in today" };
    }
    throw error;
  }
}

export async function getShareRewardStatus(userUuid: string) {
  const todayStr = getUtcDateStr();
  const todayShare = await findIncentiveByUserAndDate(
    userUuid,
    IncentiveType.ShareSNS,
    todayStr,
  );

  return {
    hasReceivedToday: !!todayShare,
    todayStr,
  };
}

export async function claimShareReward(
  userUuid: string,
  metadata?: any,
): Promise<ShareRewardResult> {
  const status = await getShareRewardStatus(userUuid);
  if (status.hasReceivedToday) {
    return {
      success: false as const,
      message: "Already received share reward today",
    };
  }

  const reward = IncentiveRewards.ShareSNS;
  const todayStr = status.todayStr;
  const rewardExpiredAt = getOneMonthLaterTimestr();

  try {
    const result = await db().transaction(async (tx) => {
      await insertIncentiveRecord(
        {
          user_uuid: userUuid,
          type: IncentiveType.ShareSNS,
          reward_amount: reward,
          reward_date: todayStr,
          metadata: metadata || {},
        },
        tx,
      );

      await increaseCredits({
        user_uuid: userUuid,
        trans_type: CreditsTransType.ShareReward,
        credits: reward,
        expired_at: rewardExpiredAt,
        tx,
      });

      return { success: true as const, reward };
    });
    return result;
  } catch (error: any) {
    if (error.code === "23505") {
      return {
        success: false as const,
        message: "Already received share reward today",
      };
    }
    throw error;
  }
}
