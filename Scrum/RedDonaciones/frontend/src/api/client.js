const TOKEN_KEY = 'auth_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    /* ignore */
  }
}

export async function apiRequest(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const finalHeaders = { 'Content-Type': 'application/json', ...headers }

  if (auth) {
    const token = getToken()
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }

  if (!response.ok) {
    const message = (data && (data.error || data.message)) || `Error ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}
