import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchOrders,
  type Controls,
  type Filters,
  type Order,
} from "../domain";
export function useLiveOrders(filters: Filters, controls: Controls) {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const refresh = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    fetchOrders(filters, controls)
      .then((data) => {
        if (id === requestId.current) setRows(data);
      })
      .catch((cause: Error) => {
        if (id === requestId.current) setError(cause.message);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [filters, controls]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { rows, loading, error, refresh };
}
