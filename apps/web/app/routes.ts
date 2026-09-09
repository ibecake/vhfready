import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("logout", "routes/logout.tsx"),
    route("auth/callback", "routes/auth.callback.tsx"),
    route("practice", "routes/practice.tsx"),
    route("flashcards", "routes/flashcards.tsx"),
    route("mocks", "routes/mocks.tsx"),
    route("mocks/:examId", "routes/mocks.$examId.tsx"),
    route("progress", "routes/progress.tsx"),
    route("account", "routes/account.tsx"),
    route("ireland/harec", "routes/ireland.harec.tsx"),
    route("admin", "routes/admin._index.tsx"),
    route("admin/flags", "routes/admin.flags.tsx"),
    route("admin/imports", "routes/admin.imports.tsx"),
    route("admin/questions", "routes/admin.questions.tsx"),
  ]),
] satisfies RouteConfig;
