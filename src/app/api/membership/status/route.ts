import { auth } from '@/auth';
import { getMembershipLevel, getMembershipConfig, getUserBillingCycle } from '@/services/membership';
import { getUserInfo } from '@/services/user';

export async function GET() {
  const session = await auth();
  if (!session?.user?.uuid) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await getUserInfo();
    if (!user || !user.uuid) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const level = await getMembershipLevel(user.uuid);
    const config = getMembershipConfig(level);
    const billing_cycle = await getUserBillingCycle(user.uuid);

    return Response.json({
      level,
      display_name: config.display_name,
      monthly_credits: config.monthly_credits,
      yearly_credits: config.yearly_credits,
      billing_cycle,
      features: config.features,
      expired_at: user.sub_expired_at,
      is_active: user.is_sub
    });
  } catch (error) {
    console.error('Get membership status failed:', error);
    return Response.json({ error: 'Failed to get membership status' }, { status: 500 });
  }
}
