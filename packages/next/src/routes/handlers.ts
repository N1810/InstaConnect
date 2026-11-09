import {
  InstaConnectError,
  InstagramAuthError,
  type InstagramClient,
  type InstagramProfile,
  type InstagramScope,
  type InstagramTokenRecord
} from "@neerajkr1810/instaconnect-core";

export const OAUTH_STATE_COOKIE_NAME = "instaconnect_oauth_state";

export interface AuthorizeRequestFn {
  (request: Request): Promise<boolean | { authorized: boolean; accountId?: string }> | boolean;
}

export interface ConnectHandlerOptions {
  client: InstagramClient;
  scopes?: InstagramScope[];
  cookieName?: string;
  authorizeRequest?: AuthorizeRequestFn;
}

export interface AuthorizedInstagramAccount {
  accountId: string;
  token: InstagramTokenRecord;
  profile?: InstagramProfile;
}

export interface CallbackHandlerOptions {
  client: InstagramClient;
  cookieName?: string;
  fetchProfile?: boolean;
  successRedirectUrl?: string;
  errorRedirectUrl?: string;
  onSuccess?: (account: AuthorizedInstagramAccount, request: Request) => Promise<void> | void;
  onError?: (error: InstaConnectError, request: Request) => Promise<void> | void;
}

export interface DisconnectHandlerOptions {
  client: InstagramClient;
  authorizeRequest?: AuthorizeRequestFn;
  onDisconnect?: (accountId: string, request: Request) => Promise<void> | void;
}

export interface MediaRouteHandlerOptions {
  client: InstagramClient;
  authorizeRequest?: AuthorizeRequestFn;
  resolveAccountId?: (request: Request) => Promise<string | undefined> | string | undefined;
}

export interface ProfileRouteHandlerOptions {
  client: InstagramClient;
  authorizeRequest?: AuthorizeRequestFn;
  resolveAccountId?: (request: Request) => Promise<string | undefined> | string | undefined;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      out[key] = decodeURIComponent(val);
    }
  }
  return out;
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

async function checkRequestAuthorization(
  request: Request,
  authorizeFn?: AuthorizeRequestFn
): Promise<{ authorized: boolean; accountId?: string }> {
  if (!authorizeFn) {
    return { authorized: true };
  }
  const res = await authorizeFn(request);
  if (typeof res === "boolean") {
    return { authorized: res };
  }
  return res;
}

/**
 * Next.js App Router GET handler to start the Instagram OAuth flow.
 * Generates a cryptographic CSRF state token, sets an HttpOnly cookie, and redirects to Instagram Login.
 */
export function createInstagramConnectHandler(options: ConnectHandlerOptions) {
  const cookieName = options.cookieName ?? OAUTH_STATE_COOKIE_NAME;

  return async function GET(request: Request): Promise<Response> {
    try {
      const authCheck = await checkRequestAuthorization(request, options.authorizeRequest);
      if (!authCheck.authorized) {
        return jsonResponse({ error: { message: "Unauthorized request." } }, 401);
      }

      const url = new URL(request.url);
      const accountId = url.searchParams.get("accountId") ?? authCheck.accountId;

      const state = options.client.auth.stateManager.generateState(
        accountId ? { accountId } : undefined
      );
      const authorizationUrl = options.client.auth.getAuthorizationUrl({
        state,
        scopes: options.scopes
      });

      const isSecure = url.protocol === "https:";
      const cookieFlags = [
        `${cookieName}=${encodeURIComponent(state)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=600",
        ...(isSecure ? ["Secure"] : [])
      ].join("; ");

      return new Response(null, {
        status: 302,
        headers: {
          Location: authorizationUrl,
          "Set-Cookie": cookieFlags,
          "Cache-Control": "no-store"
        }
      });
    } catch (err) {
      const sdkError =
        err instanceof InstaConnectError
          ? err
          : new InstaConnectError(err instanceof Error ? err.message : "Failed to start OAuth flow");
      return jsonResponse({ error: sdkError.toJSON() }, sdkError.statusCode);
    }
  };
}

/**
 * Next.js App Router GET handler for the Instagram OAuth callback route.
 * Validates CSRF state cookie, exchanges code for a long-lived token, optionally loads profile,
 * invokes `onSuccess`, and redirects or returns JSON.
 */
export function createInstagramCallbackHandler(options: CallbackHandlerOptions) {
  const cookieName = options.cookieName ?? OAUTH_STATE_COOKIE_NAME;

  return async function GET(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const clearCookieHeader = `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

    try {
      const oauthError = url.searchParams.get("error");
      if (oauthError) {
        const errorReason =
          url.searchParams.get("error_description") ??
          url.searchParams.get("error_reason") ??
          oauthError;
        throw new InstagramAuthError(`Instagram OAuth authorization denied: ${errorReason}`, {
          code: "OAUTH_ACCESS_DENIED",
          oauthErrorCode: oauthError
        });
      }

      const code = url.searchParams.get("code");
      const receivedState = url.searchParams.get("state");

      if (!code) {
        throw new InstagramAuthError("Missing authorization `code` in Instagram callback.", {
          code: "OAUTH_CODE_MISSING",
          statusCode: 400
        });
      }

      const cookies = parseCookies(request.headers.get("cookie"));
      const expectedCookieState = cookies[cookieName];

      // Validate state against cookie if present, or validate state integrity directly
      const statePayload = options.client.auth.stateManager.validateState(
        receivedState,
        expectedCookieState
      );

      const persistAccountId = statePayload?.metadata?.accountId;
      const token = await options.client.auth.handleCallback({
        code,
        persistAccountId
      });

      const effectiveAccountId = persistAccountId ?? token.userId;
      // Also store under "default" so single-account setups work seamlessly out of the box
      await options.client.tokens.saveToken("default", token);

      let profile: InstagramProfile | undefined;
      if (options.fetchProfile ?? true) {
        try {
          profile = await options.client.profile.get({
            accessToken: token.accessToken,
            bypassCache: true
          });
        } catch {
          // Non-fatal if profile fetch fails during callback
        }
      }

      const authorizedAccount: AuthorizedInstagramAccount = {
        accountId: effectiveAccountId,
        token,
        ...(profile ? { profile } : {})
      };

      if (options.onSuccess) {
        await options.onSuccess(authorizedAccount, request);
      }

      if (options.successRedirectUrl) {
        const redirectTarget = new URL(options.successRedirectUrl, url.origin);
        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectTarget.toString(),
            "Set-Cookie": clearCookieHeader,
            "Cache-Control": "no-store"
          }
        });
      }

      return jsonResponse(
        {
          connected: true,
          accountId: effectiveAccountId,
          userId: token.userId,
          tokenType: token.tokenType,
          expiresAt: token.expiresAt,
          ...(profile ? { profile } : {})
        },
        200,
        { "Set-Cookie": clearCookieHeader }
      );
    } catch (err) {
      const sdkError =
        err instanceof InstaConnectError
          ? err
          : new InstaConnectError(err instanceof Error ? err.message : "OAuth callback failed");

      if (options.onError) {
        await options.onError(sdkError, request);
      }

      if (options.errorRedirectUrl) {
        const redirectTarget = new URL(options.errorRedirectUrl, url.origin);
        redirectTarget.searchParams.set("error", sdkError.code);
        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectTarget.toString(),
            "Set-Cookie": clearCookieHeader,
            "Cache-Control": "no-store"
          }
        });
      }

      return jsonResponse({ error: sdkError.toJSON() }, sdkError.statusCode, {
        "Set-Cookie": clearCookieHeader
      });
    }
  };
}

/**
 * Next.js App Router POST handler for disconnecting an Instagram account.
 */
export function createInstagramDisconnectHandler(options: DisconnectHandlerOptions) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const authCheck = await checkRequestAuthorization(request, options.authorizeRequest);
      if (!authCheck.authorized) {
        return jsonResponse({ error: { message: "Unauthorized request." } }, 401);
      }

      let bodyAccountId: string | undefined;
      try {
        const body = (await request.json()) as { accountId?: string };
        bodyAccountId = body?.accountId;
      } catch {
        // Optional JSON body
      }

      const accountId = bodyAccountId ?? authCheck.accountId ?? "default";
      const result = await options.client.auth.disconnect({ accountId });

      if (options.onDisconnect) {
        await options.onDisconnect(accountId, request);
      }

      return jsonResponse(result, 200);
    } catch (err) {
      const sdkError =
        err instanceof InstaConnectError
          ? err
          : new InstaConnectError(err instanceof Error ? err.message : "Disconnect failed");
      return jsonResponse({ error: sdkError.toJSON() }, sdkError.statusCode);
    }
  };
}

/**
 * Next.js App Router GET handler for fetching Instagram media (list, Reels, single item, or children).
 */
export function createInstagramMediaHandler(options: MediaRouteHandlerOptions) {
  return async function GET(request: Request): Promise<Response> {
    try {
      const authCheck = await checkRequestAuthorization(request, options.authorizeRequest);
      if (!authCheck.authorized) {
        return jsonResponse({ error: { message: "Unauthorized request." } }, 401);
      }

      const url = new URL(request.url);
      const customAccountId = options.resolveAccountId
        ? await options.resolveAccountId(request)
        : undefined;
      const accountId =
        url.searchParams.get("accountId") ?? customAccountId ?? authCheck.accountId ?? undefined;

      const mediaId = url.searchParams.get("id");
      const childrenOf = url.searchParams.get("childrenOf");

      if (childrenOf) {
        const children = await options.client.media.getChildren(childrenOf, { accountId });
        return jsonResponse({ data: children });
      }

      if (mediaId) {
        const item = await options.client.media.get(mediaId, { accountId });
        return jsonResponse(item);
      }

      const limitParam = url.searchParams.get("limit");
      const limit = limitParam ? Number.parseInt(limitParam, 10) : 12;
      const after = url.searchParams.get("after") ?? undefined;
      const before = url.searchParams.get("before") ?? undefined;
      const type = url.searchParams.get("type");

      if (type === "REELS") {
        const reelsResponse = await options.client.media.listReels({
          limit: Number.isFinite(limit) ? limit : 12,
          after,
          before,
          accountId
        });
        return jsonResponse(reelsResponse);
      }

      const response = await options.client.media.list({
        limit: Number.isFinite(limit) ? limit : 12,
        after,
        before,
        accountId
      });

      return jsonResponse(response);
    } catch (err) {
      const sdkError =
        err instanceof InstaConnectError
          ? err
          : new InstaConnectError(err instanceof Error ? err.message : "Failed to fetch media");
      return jsonResponse({ error: sdkError.toJSON() }, sdkError.statusCode);
    }
  };
}

/**
 * Next.js App Router GET handler for fetching the connected Instagram profile.
 */
export function createInstagramProfileHandler(options: ProfileRouteHandlerOptions) {
  return async function GET(request: Request): Promise<Response> {
    try {
      const authCheck = await checkRequestAuthorization(request, options.authorizeRequest);
      if (!authCheck.authorized) {
        return jsonResponse({ error: { message: "Unauthorized request." } }, 401);
      }

      const url = new URL(request.url);
      const customAccountId = options.resolveAccountId
        ? await options.resolveAccountId(request)
        : undefined;
      const accountId =
        url.searchParams.get("accountId") ?? customAccountId ?? authCheck.accountId ?? undefined;

      const profile = await options.client.profile.get({ accountId });
      return jsonResponse(profile);
    } catch (err) {
      const sdkError =
        err instanceof InstaConnectError
          ? err
          : new InstaConnectError(err instanceof Error ? err.message : "Failed to fetch profile");
      return jsonResponse({ error: sdkError.toJSON() }, sdkError.statusCode);
    }
  };
}

