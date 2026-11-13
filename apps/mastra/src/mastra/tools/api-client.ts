const API_URL = process.env.API_URL || 'http://localhost:3000';

// Araçlar API'yi kullanıcının kendi oturumuyla çağırır; böylece yetki ve sahiplik kuralları API'de aynen geçerli olur.
// Oturum çerezi API tarafından her istekte requestContext ile gönderilir, modele hiç gösterilmez.
type Context = { get: (key: string) => unknown };

export async function callApi<T>(
  requestContext: Context,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const cookie = requestContext.get('cookie');
  if (typeof cookie !== 'string' || !cookie) {
    throw new Error('Oturum bilgisi bulunamadı, işlem yapılamadı');
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new Error(data?.message ?? `İstek başarısız oldu (${response.status})`);
  }
  return data as T;
}
