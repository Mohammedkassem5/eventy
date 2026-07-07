import api from "../lib/api";

export const seatApi = {
  hold: (event_id, session_id, seat_ids) =>
    api.post("/seats/hold", { event_id, session_id, seat_ids }).then((r) => r.data),
  release: (event_id, session_id, seat_ids) =>
    api.post("/seats/release", { event_id, session_id, seat_ids }).then((r) => r.data),
};
