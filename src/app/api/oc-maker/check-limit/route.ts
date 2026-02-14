import { getUserUuid } from '@/services/user';
import { getUserCharacterCount } from '@/models/character';
import { getMembershipLevel, getUserOcLimit } from '@/services/membership';

export async function GET() {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get current OC count
    const currentCount = await getUserCharacterCount(userUuid);

    // Get membership level and limit
    const membershipLevel = await getMembershipLevel(userUuid);
    const limit = await getUserOcLimit(userUuid);

    return Response.json({
      success: true,
      data: {
        current_count: currentCount,
        limit: limit,
        can_create_more: currentCount < limit,
        membership_level: membershipLevel
      }
    });
  } catch (error: any) {
    console.error('Check OC limit failed:', error);
    return Response.json(
      { success: false, error: error.message || 'Failed to check OC limit' },
      { status: 500 }
    );
  }
}
