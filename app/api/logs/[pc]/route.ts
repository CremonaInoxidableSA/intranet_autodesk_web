import { parseLogFile } from "@/lib/logParser";

interface RouteContext {
  params: Promise<{ pc: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { pc } = await context.params;
    const data = parseLogFile(pc);
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Invalid PC name" ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
