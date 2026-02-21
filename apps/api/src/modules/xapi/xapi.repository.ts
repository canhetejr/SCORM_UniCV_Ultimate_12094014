/**
 * Envia um statement ao LRS. Único lugar que faz a requisição HTTP.
 * Não lança AppError.
 */
export async function sendStatement(
  lrsEndpoint: string,
  basicAuth: string,
  statement: object
): Promise<unknown> {
  const url = new URL("/statements", lrsEndpoint);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      "X-Experience-API-Version": "1.0.3"
    },
    body: JSON.stringify(statement)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar statement ao LRS (HTTP ${res.status}). ${txt}`);
  }

  return res.json().catch(() => ({ ok: true }));
}
