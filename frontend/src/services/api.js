// In Docker, Nginx proxies /api/ to backend
// In dev, calls localhost:8080 directly
const BASE = import.meta.env.PROD
  ? "/api"
  : "http://localhost:8080/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  getAllTickets:      ()         => request("/tickets"),
  getTicket:         (id)       => request(`/tickets/${id}`),
  createTicket:      (data)     => request("/tickets", { method: "POST", body: JSON.stringify(data) }),
  updateTicket:      (id, data) => request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  summariseTicket:   (id)       => request(`/tickets/${id}/summarise`, { method: "POST" }),
  getSimilarTickets: (id)       => request(`/tickets/${id}/similar`),
  getResolution:     (id)       => request(`/tickets/${id}/resolve`),
  draftResponse:     (id)       => request(`/tickets/${id}/draft-response`, { method: "POST" }),
  getDuplicates:     (id)       => request(`/tickets/${id}/duplicates`),
  confirmDuplicate:  (id, of)   => request(`/tickets/${id}/confirm-duplicate`, { method: "POST", body: JSON.stringify({ duplicateOfTicket: of }) }),
  dismissDuplicate:  (id)       => request(`/tickets/${id}/dismiss-duplicate`, { method: "POST" }),
};
