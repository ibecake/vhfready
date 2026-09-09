import { data } from "react-router";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";
import type { AppLoadContext } from "react-router";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SupabaseEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function getSupabaseEnv(context: AppLoadContext): SupabaseEnv {
  const env = context.cloudflare?.env as SupabaseEnv | undefined;
  return {
    SUPABASE_URL:
      env?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY:
      env?.SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY,
  };
}

export function createSupabaseServerClient(
  request: Request,
  context: AppLoadContext,
) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getSupabaseEnv(context);
  const headers = new Headers();

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      supabase: null as SupabaseClient | null,
      headers,
      configured: false as const,
    };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
          (c) => ({ name: c.name, value: c.value ?? "" }),
        );
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options),
          );
        });
      },
    },
  });

  return { supabase, headers, configured: true as const };
}

export function jsonWithHeaders<T>(payload: T, init?: ResponseInit) {
  return data(payload, init);
}

export async function requireUser(request: Request, context: AppLoadContext) {
  const { supabase, headers, configured } = createSupabaseServerClient(
    request,
    context,
  );
  if (!configured || !supabase) {
    throw new Response("Supabase is not configured", { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    headers.set("Location", "/login");
    throw new Response(null, {
      status: 302,
      headers,
    });
  }
  return { supabase, user, headers };
}

export async function requireAdmin(request: Request, context: AppLoadContext) {
  const session = await requireUser(request, context);
  const { data: admin, error } = await session.supabase.rpc("is_admin" as never);
  if (error || !admin) {
    throw new Response("Forbidden", { status: 403 });
  }
  return session;
}
