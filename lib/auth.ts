export function verifyToken(token?: string | null) {
  if (!token) return null;
  try {
    if (token.toLowerCase().startsWith("bearer "))
      token = token.split(" ", 2)[1];

    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payloadB64.length % 4;
    const padded = pad === 0 ? payloadB64 : payloadB64 + "=".repeat(4 - pad);

    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(""),
    );
    const payload = JSON.parse(json);

    if (payload.exp && typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) return null;
    }

    return payload;
  } catch {
    return null;
  }
}
