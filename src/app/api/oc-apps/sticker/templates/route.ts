import { NextResponse } from 'next/server';
import templateConfig from '@/configs/prompts/oc-apps/sticker-templates.json';

/**
 * GET /api/oc-apps/sticker/templates
 *
 * Returns sticker template configurations
 *
 * @returns JSON response with templates array
 *
 * Related: docs/2-implementation/api/oc-apps.md
 */
export async function GET() {
  try {
    return NextResponse.json(templateConfig);
  } catch (error) {
    console.error('[Sticker Templates API] Failed to load templates:', error);
    return NextResponse.json(
      { error: 'Failed to load templates' },
      { status: 500 }
    );
  }
}
