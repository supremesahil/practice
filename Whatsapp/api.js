const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function updateStatus(payload) {
  return postJson('/api/status/update', payload);
}

export function triggerSos(payload) {
  return postJson('/api/sos', payload);
}

export { API_BASE_URL };
