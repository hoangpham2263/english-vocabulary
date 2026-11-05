import { StrictMode, Suspense, useEffect, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useSearchParams } from "react-router";
import { AccentProvider } from "@/components/accent-provider";
import { AppHeader } from "@/components/app-header";
import { StopSoundOnNavigate } from "@/components/stop-sound-on-navigate";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { getToken, subscribeToken } from "@/lib/api";
import { BASE_PATH } from "@/lib/base-path";
import { setRouter } from "@/lib/router";
import { DashboardPage } from "@/pages/dashboard";
import { DeckPage } from "@/pages/deck";
import { EditCardPage, ImportPage, NewCardPage } from "@/pages/card-pages";
import { LoginPage } from "@/pages/login";
import { NotFound } from "@/pages/not-found";
import { PracticePage } from "@/pages/practice";
import { StudyPage } from "@/pages/study";
import { UnitPage } from "@/pages/unit";
import "./globals.css";

/** Filters keep the scroll position; a new page or a new list page starts at the top. */
function ScrollToTop() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const page = params.get("page");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, page]);
  return null;
}

function Crash() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <p className="text-lg font-medium">Trang gặp lỗi</p>
      <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
    </div>
  );
}

// One account, no sign-up: everything except the login page needs a session.
function Layout() {
  const token = useSyncExternalStore(subscribeToken, getToken);
  const { pathname, search } = useLocation();
  if (!token && pathname !== "/login") {
    const next = `${pathname}${search}`;
    return <Navigate to={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return (
    <AccentProvider>
      <StopSoundOnNavigate />
      <ScrollToTop />
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
    </AccentProvider>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      errorElement: <Crash />,
      children: [
        { path: "/", element: <DashboardPage /> },
        { path: "/login", element: <LoginPage /> },
        { path: "/:deck", element: <DeckPage /> },
        { path: "/:deck/learn", element: <StudyPage mode="learn" /> },
        { path: "/:deck/review", element: <StudyPage mode="review" /> },
        { path: "/:deck/practice", element: <PracticePage /> },
        { path: "/:deck/unit/:unit", element: <UnitPage /> },
        { path: "/:deck/new", element: <NewCardPage /> },
        { path: "/:deck/import", element: <ImportPage /> },
        { path: "/:deck/:cardId/edit", element: <EditCardPage /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename: BASE_PATH },
);
setRouter(router);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-center" />
  </StrictMode>,
);
