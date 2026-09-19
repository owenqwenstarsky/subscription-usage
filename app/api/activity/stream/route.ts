import { fetchActivityStream, toApiError } from "@/lib/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * EventSource cannot attach an Authorization header. Keep the proxy API key on
 * this server and transparently relay the protected upstream stream instead.
 */
export async function GET(request: Request) {
  try {
    const upstream = await fetchActivityStream(request.signal);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const { status, body } = toApiError(err);
    return Response.json(body, { status });
  }
}
