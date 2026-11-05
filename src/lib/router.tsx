// A thin layer over React Router, so the components read the same as before.
import type { ComponentProps } from "react";
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
  type createBrowserRouter,
} from "react-router";
import { refreshData } from "@/lib/use-data";

type Router = ReturnType<typeof createBrowserRouter>;
let instance: Router | null = null;

export function setRouter(router: Router) {
  instance = router;
}

/** Navigate from outside a component, such as after a form action. */
export function redirect(path: string) {
  void instance?.navigate(path);
}

export function Link({ href, ...props }: Omit<ComponentProps<typeof RouterLink>, "to"> & { href: string }) {
  return <RouterLink to={href} {...props} />;
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  return useRouterSearchParams()[0];
}

export const useParams = useRouterParams;

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => void navigate(href),
    replace: (href: string) => void navigate(href, { replace: true }),
    /** Loads the current page's data again. */
    refresh: refreshData,
  };
}
