/**
 * Admin API Authentication Utilities
 *
 * 用于验证 GitHub Actions 或外部系统调用的 Admin API 认证
 * 使用 Bearer Token 方式，与现有的 session 认证（getUserInfo）分离
 */

/**
 * Verify Bearer Token for admin API access
 * @param request - The incoming request object
 * @returns true if token is valid, false otherwise
 */
export async function verifyAdminToken(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');

  // Check if header exists and starts with 'Bearer '
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('⚠️ [AdminAuth] Missing or invalid Authorization header');
    return false;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  // Get expected token from environment variable
  const expectedToken = process.env.ADMIN_API_TOKEN;

  if (!expectedToken) {
    console.error('❌ [AdminAuth] ADMIN_API_TOKEN environment variable not set');
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = token === expectedToken;

  if (!isValid) {
    console.warn('⚠️ [AdminAuth] Invalid admin token provided');
  }

  return isValid;
}

/**
 * Verify admin access via either Bearer Token OR session-based admin user
 * This allows both GitHub Actions and logged-in admin users to access the API
 *
 * @param request - The incoming request object
 * @returns true if authenticated via token OR is admin user, false otherwise
 */
export async function verifyAdminAccess(request: Request): Promise<{
  authenticated: boolean;
  method: 'token' | 'session' | null;
}> {
  // Try Bearer Token first (for GitHub Actions / external calls)
  const tokenValid = await verifyAdminToken(request);
  if (tokenValid) {
    return { authenticated: true, method: 'token' };
  }

  // Fall back to session-based admin check (for web UI calls)
  try {
    const { isAdminUser } = await import('@/services/admin');
    const isAdmin = await isAdminUser();
    if (isAdmin) {
      return { authenticated: true, method: 'session' };
    }
  } catch (error) {
    // Session check failed, continue to rejection
    console.debug('⚠️ [AdminAuth] Session-based admin check failed:', error);
  }

  return { authenticated: false, method: null };
}

/**
 * Standard error response for unauthorized access
 */
export function unauthorizedResponse() {
  return Response.json(
    {
      message: 'permission denied',
      error: 'Admin access required. Use Bearer Token or admin session.',
    },
    { status: 403 }
  );
}
