export class BackendError extends Error {
  constructor(status, body) {
    super(body.message);
    this.name = "Backend Error";
    this.status = body.status;
  }
}

export async function backendFetch(url, options = {}) {
  const response = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN}${url}`, {
    ...options,
    credentials: "include",
  });
  let body;
  if (Number(response.headers.get("Content-Length")) > 0) {
    body = await response.json();
  }
  if (response.ok) {
    return body;
  } else {
    throw new BackendError(response.status, body);
  }
}

export function retryConfig(failureCount, error) {
  if (error instanceof BackendError) {
    return error.status === 500 && failureCount < 3;
  } else {
    return true;
  }
}

// expose for testing
window.backendFetch = backendFetch;
