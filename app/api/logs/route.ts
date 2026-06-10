import { getAvailablePCs } from "@/lib/logParser";

export async function GET() {
  try {
    const pcs = getAvailablePCs();
    return Response.json({ pcs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
