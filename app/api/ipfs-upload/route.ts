// app/api/ipfs-upload/route.ts — v1.6.0

import { NextRequest, NextResponse } from "next/server";

const PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

function sanitizeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[^\x20-\x7E]/g, "").trim();
}

function sanitizeFilename(nombre: string): string {
  return (
    nombre
      .replace(/[áàäâã]/gi, "a")
      .replace(/[éèëê]/gi,  "e")
      .replace(/[íìïî]/gi,  "i")
      .replace(/[óòöôõ]/gi, "o")
      .replace(/[úùüû]/gi,  "u")
      .replace(/[ñ]/gi,     "n")
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x20-\x7E]/g, "_")
      .trim() || "archivo"
  );
}

function getPinataAuth():
  | { type: "jwt";  value: string }
  | { type: "keys"; key: string; secret: string } {
  const jwt    = process.env.NEXT_PUBLIC_PINATA_JWT?.trim();
  const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY?.trim();
  const secret = process.env.NEXT_PUBLIC_PINATA_API_SECRET?.trim();

  if (jwt)              return { type: "jwt",  value: sanitizeHeaderValue(jwt) };
  if (apiKey && secret) return { type: "keys", key: sanitizeHeaderValue(apiKey), secret: sanitizeHeaderValue(secret) };

  throw new Error(
    "Credenciales Pinata no configuradas. " +
    "Agrega NEXT_PUBLIC_PINATA_JWT o NEXT_PUBLIC_PINATA_API_KEY + " +
    "NEXT_PUBLIC_PINATA_API_SECRET en .env.local"
  );
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const a = getPinataAuth();
  return {
    ...extra,
    ...(a.type === "jwt"
      ? { Authorization: `Bearer ${a.value}` }
      : { pinata_api_key: a.key, pinata_secret_api_key: a.secret }),
  };
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const total  = arrays.reduce((n, a) => n + a.byteLength, 0);
  const result = new Uint8Array(total);
  let   offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.byteLength; }
  return result;
}

function buildMultipartBlob(
  fileBytes: Uint8Array,
  filename:  string,
  mimeType:  string,
  metadata:  string,
): { blob: Blob; contentType: string } {
  const boundary = `----PinataBoundary${Date.now().toString(16)}`;
  const CRLF     = "\r\n";
  const e        = (s: string) => new TextEncoder().encode(s);

  const bytes = concatUint8Arrays([
    e(`--${boundary}${CRLF}`),
    e(`Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}`),
    e(`Content-Type: ${mimeType}${CRLF}${CRLF}`),
    fileBytes,
    e(CRLF),
    e(`--${boundary}${CRLF}`),
    e(`Content-Disposition: form-data; name="pinataMetadata"${CRLF}`),
    e(`Content-Type: application/json${CRLF}${CRLF}`),
    e(metadata),
    e(CRLF),
    e(`--${boundary}--${CRLF}`),
  ]);

  const contentType = `multipart/form-data; boundary=${boundary}`;
  return {
    blob: new Blob([bytes.buffer as ArrayBuffer], { type: contentType }),
    contentType,
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    // ── MODO JSON ──────────────────────────────────────────────────────────
    if (contentType.includes("application/json")) {
      const { tipo, contenido, nombre } = (await request.json()) as {
        tipo: string; contenido: unknown; nombre?: string;
      };

      if (tipo !== "json" || !contenido) {
        return NextResponse.json(
          { error: "Parámetros inválidos para modo JSON" },
          { status: 400 }
        );
      }

      const res = await fetch(PINATA_JSON_URL, {
        method:  "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body:    JSON.stringify({
          pinataContent:  contenido,
          pinataMetadata: { name: sanitizeFilename(nombre ?? "metadata.json") },
          pinataOptions:  { cidVersion: 1 },
        }),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: `Pinata JSON error: ${await res.text()}` },
          { status: res.status }
        );
      }

      const data = (await res.json()) as { IpfsHash: string };
      return NextResponse.json({ IpfsHash: data.IpfsHash });
    }

    // ── MODO ARCHIVO ───────────────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const formData  = await request.formData();
      const file      = formData.get("file") as File | null;
      const nombreRaw = (formData.get("nombre") as string | null) ?? file?.name ?? "archivo";

      if (!file) {
        return NextResponse.json(
          { error: "No se recibió ningún archivo" },
          { status: 400 }
        );
      }

      const filename  = sanitizeFilename(nombreRaw);
      const mimeType  = file.type || "application/octet-stream";

      // ✅ FIX v1.6: arrayBuffer() preserva bytes binarios intactos.
      //    Las versiones anteriores usaban .text() o Buffer.from(string)
      //    lo que corrompía los bytes de la imagen al pasar por UTF-8.
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const metadata  = JSON.stringify({ name: filename });

      const { blob, contentType: ct } = buildMultipartBlob(
        fileBytes, filename, mimeType, metadata
      );

      const res = await fetch(PINATA_FILE_URL, {
        method:  "POST",
        headers: authHeaders({
          // ✅ FIX v1.5+: Content-Type con boundary explícito — fetch no lo lee de blob.type
          "Content-Type": ct,
        }),
        body: blob,
      });

      if (!res.ok) {
        const txt = await res.text();
        return NextResponse.json(
          { error: `Pinata File error: ${txt}` },
          { status: res.status }
        );
      }

      const data = (await res.json()) as { IpfsHash: string };
      return NextResponse.json({ IpfsHash: data.IpfsHash });
    }

    return NextResponse.json(
      { error: "Content-Type no soportado" },
      { status: 415 }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    console.error("❌ Error en /api/ipfs-upload:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}