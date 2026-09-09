import { Link, Outlet, useLocation } from "react-router";
import type { Route } from "./+types/layout";
import { createSupabaseServerClient, jsonWithHeaders } from "~/lib/supabase.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { supabase, configured, headers } = createSupabaseServerClient(
    request,
    context,
  );
  let email: string | null = null;
  let isAdmin = false;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    if (user) {
      const { data } = await supabase.rpc("is_admin" as never);
      isAdmin = Boolean(data);
    }
  }
  return jsonWithHeaders(
    { email, isAdmin, configured },
    { headers },
  );
}

const links = [
  { to: "/practice", label: "Practice" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/mocks", label: "Mocks" },
  { to: "/progress", label: "Progress" },
];

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const { email, isAdmin, configured } = loaderData;

  return (
    <div className="shell">
      <header className="site-header">
        <Link to="/" className="brand">
          VHFReady
        </Link>
        <nav className="nav" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={location.pathname.startsWith(link.to) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? <Link to="/admin">Admin</Link> : null}
          {email ? (
            <>
              <Link to="/account">{email}</Link>
              <Link to="/logout">Log out</Link>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      {!configured ? (
        <p className="muted" role="status">
          Supabase env not configured yet — auth and content APIs are offline in
          this environment.
        </p>
      ) : null}
      <Outlet />
      <footer className="site-footer">
        <p>
          Educational content is imported verbatim from owner-supplied JSON.
          Flag issues — never invent answers.
        </p>
      </footer>
    </div>
  );
}
