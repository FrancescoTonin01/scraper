export async function postJson<TResponse>(url: string, body: unknown, fallbackError: string): Promise<TResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? fallbackError);
  return data;
}
