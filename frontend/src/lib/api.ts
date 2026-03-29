const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export interface CreateRoomPayload {
  categories: string[];
  answerTime: number;
}

export const api = {
  createRoom: (data: CreateRoomPayload) =>
    request<{ room: { joinCode: string } }>("/rooms/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
