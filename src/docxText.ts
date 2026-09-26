export async function readDocxTextFromArrayBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) return '';

  let cursor = view.getUint32(eocd + 16, true);
  const entries = view.getUint16(eocd + 10, true);
  const decoder = new TextDecoder();
  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (name !== 'word/document.xml' || view.getUint32(localOffset, true) !== 0x04034b50) continue;

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.slice(dataStart, dataStart + compressedSize);
    if (method !== 0 && typeof DecompressionStream === 'undefined') return '';
    const xml = method === 0
      ? decoder.decode(data)
      : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(doc.getElementsByTagNameNS('*', 'p'))
      .map(paragraph => Array.from(paragraph.getElementsByTagNameNS('*', 't')).map(node => node.textContent || '').join('').trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export const readDocxTextFromFile = async (file: File) =>
  file.name.toLowerCase().endsWith('.docx') ? readDocxTextFromArrayBuffer(await file.arrayBuffer()) : '';

export async function readDocxTextFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Document read failed: ${response.status}`);
  return readDocxTextFromArrayBuffer(await response.arrayBuffer());
}
