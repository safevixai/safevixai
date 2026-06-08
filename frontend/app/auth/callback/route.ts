import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Auth Callback Handler
 * 
 * Handles the redirect from Supabase after:
 * - Password reset email link clicks
 * - Email verification / confirmation links
 * - OAuth provider callbacks (Google, GitHub, etc.)
 * 
 * Flow:
 * 1. User clicks a link in their email (e.g., password reset)
 * 2. Supabase redirects to this route with a `code` query parameter
 * 3. This handler exchanges the code for a session using PKCE
 * 4. On success, redirects the user to the appropriate page
 * 5. On failure, redirects to /login with an error message
 * 
 * Security:
 * - Uses server-side Supabase client (service role NOT required — uses anon key + code exchange)
 * - The `code` is single-use and time-limited by Supabase
 * - No credentials are exposed in the URL after redirect
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // e.g., 'recovery', 'signup', 'email_change'
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // ── Handle upstream error from Supabase ──
  if (errorParam) {
    console.error('[auth/callback] Supabase redirect error:', errorParam, errorDescription);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', errorDescription || 'Authentication failed. Please try again.');
    return NextResponse.redirect(loginUrl.toString());
  }

  // ── No code present — invalid request ──
  if (!code) {
    console.warn('[auth/callback] No code parameter in callback URL');
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'Invalid or expired authentication link. Please request a new one.');
    return NextResponse.redirect(loginUrl.toString());
  }

  // ── Exchange the code for a session ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_PROJECT_REF')) {
    // Supabase not configured — redirect to login gracefully
    console.warn('[auth/callback] Supabase env vars not configured');
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'Authentication service not configured. Please contact support.');
    return NextResponse.redirect(loginUrl.toString());
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[auth/callback] Code exchange failed:', exchangeError.message);
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set(
        'error',
        exchangeError.message.includes('expired')
          ? 'This link has expired. Please request a new password reset.'
          : 'Authentication failed. Please try again.'
      );
      return NextResponse.redirect(loginUrl.toString());
    }

    // ── Determine redirect destination based on auth event type ──
    let redirectPath = '/';

    switch (type) {
      case 'recovery':
        redirectPath = '/reset-password';
        break;
      case 'signup':
      case 'email_change':
        // Email confirmation — go to dashboard
        redirectPath = '/?verified=true';
        break;
      default:
        // Generic callback (OAuth, etc.) — go to dashboard
        redirectPath = '/';
        break;
    }

    return NextResponse.redirect(new URL(redirectPath, origin).toString());
  } catch (error) {
    console.error('[auth/callback] Unexpected error during code exchange:', error);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.');
    return NextResponse.redirect(loginUrl.toString());
  }
}
