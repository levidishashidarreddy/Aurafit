import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/google-fit/callback`;

  if (error || !code) {
    console.error('Google Fit OAuth Error:', error);
    return NextResponse.redirect(`${appUrl}/?fit_error=${encodeURIComponent(error || 'No authorization code provided')}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/?fit_error=Missing+Google+API+credentials`);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token Exchange Failed:', tokenData);
      return NextResponse.redirect(`${appUrl}/?fit_error=${encodeURIComponent(tokenData.error_description || 'Failed to exchange token')}`);
    }

    // Redirect to home dashboard with fit_token or store in HTTP cookie
    const response = NextResponse.redirect(`${appUrl}/?fit_connected=true`);
    response.cookies.set('google_fit_token', tokenData.access_token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in || 3600,
      path: '/',
    });

    if (tokenData.refresh_token) {
      response.cookies.set('google_fit_refresh', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (err: any) {
    console.error('Google Fit Callback Exception:', err);
    return NextResponse.redirect(`${appUrl}/?fit_error=${encodeURIComponent(err.message || 'Unexpected server error')}`);
  }
}
