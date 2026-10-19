import { useCallback } from "react";
import { ticketsApi } from "../api/tickets.api";
import { useResource } from "./useResource";
import { useTicketStream } from "./useTicketStream";

/** Author's ticket list. Any live event triggers a silent refetch, so status changes appear without a reload. */
export function useTickets() {
  const res = useResource((signal) => ticketsApi.list({ signal }), []);
  const { refresh } = res;
  useTicketStream(useCallback(() => refresh(), [refresh]));
  return res;
}

/** One ticket. Refetches only when the event concerns this ticket (or after a reconnect). */
export function useTicket(id) {
  const res = useResource((signal) => ticketsApi.get(id, { signal }), [id]);
  const { refresh } = res;
  const live = useTicketStream(
    useCallback((evt) => {
      if (evt.type === "reconnected" || evt.data?.ticketId === id) refresh();
    }, [id, refresh])
  );
  return { ...res, live };
}