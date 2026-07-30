import { NextRequest } from "next/server";
import { readFile, contentTypeFor } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Servíruje nahrané soubory (GPX, obrázky) z úložiště.
export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string[] } }
) {
  const key = params.key.join("/");
  const data = await readFile(key);
  if (!data) {
    return new Response("Soubor nenalezen", { status: 404 });
  }
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(key),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
