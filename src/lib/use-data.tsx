// Loads a page's data from the API and renders it, with the loading, not-found
// and error states every page shares.
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";

let version = 0;
const listeners = new Set<() => void>();

export function refreshData() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type State<T> = { key: string; group: string; data?: T; error?: unknown };

export function useData<T>(key: string, load: () => Promise<T>, group: string = key) {
  const current = useSyncExternalStore(subscribe, () => version);
  const [state, setState] = useState<State<T>>({ key: "", group: "" });

  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ key, group, data }),
      (error) => live && setState({ key, group, error }),
    );
    return () => {
      live = false;
    };
    // `key` names everything `load` reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, current]);

  // A refresh or a new filter keeps showing the old data until the new data
  // arrives, so a search box keeps its focus. A different page shows the
  // loading state rather than another page's data.
  return state.group === group ? state : ({ key, group } as State<T>);
}

export function DataPage<T>({
  dataKey,
  group,
  load,
  fallback,
  notFound,
  children,
}: {
  dataKey: string;
  /** Requests in one group replace each other without a loading state. */
  group?: string;
  load: () => Promise<T>;
  fallback: ReactNode;
  notFound: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const { data, error } = useData(dataKey, load, group);
  if (error instanceof ApiError && error.status === 404) return notFound;
  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <p className="text-lg font-medium">{error instanceof Error ? error.message : "Không tải được dữ liệu"}</p>
        <Button onClick={refreshData}>Thử lại</Button>
      </div>
    );
  }
  if (data === undefined) return fallback;
  return children(data);
}
