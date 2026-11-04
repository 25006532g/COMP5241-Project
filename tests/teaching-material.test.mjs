import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
import { crc32, deflateRawSync } from "node:zlib";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { extractTeachingMaterial, MAX_MATERIAL_BYTES } = await import("../src/lib/teaching-material.ts");
hooks.deregister();

function zip(parts) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [name, value, options = {}] of parts) {
    const filename = Buffer.from(name);
    const data = Buffer.from(value);
    const payload = options.deflate ? deflateRawSync(data) : data;
    const compressed = options.flags & 1 ? Buffer.concat([Buffer.alloc(12), payload]) : payload;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(options.flags ?? 0, 6);
    header.writeUInt16LE(options.deflate ? 8 : 0, 8);
    header.writeUInt32LE(crc32(data), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(options.size ?? data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, compressed);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE(20, 4);
    header.copy(directory, 6, 4, 30);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, filename);
    offset += header.length + filename.length + compressed.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(central.reduce((size, item) => size + item.length, 0), 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

const presentationNs = "http://schemas.openxmlformats.org/presentationml/2006/main";
const drawingNs = "http://schemas.openxmlformats.org/drawingml/2006/main";
const relationNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function pptxParts(texts = ["First slide", "Second &amp; final"], order = texts.map((_, index) => index + 1)) {
  return [
    ["[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>'],
    ["ppt/presentation.xml", `<p:presentation xmlns:p="${presentationNs}" xmlns:r="${relationNs}"><p:sldIdLst>${order.map((index) => `<p:sldId id="${255 + index}" r:id="slide${index}"/>`).join("")}</p:sldIdLst></p:presentation>`],
    ["ppt/_rels/presentation.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${texts.map((_, index) => `<Relationship Id="slide${index + 1}" Type="${relationNs}/slide" Target="slides/slide${index + 1}.xml"/>`).join("")}</Relationships>`],
    ...texts.map((text, index) => [`ppt/slides/slide${index + 1}.xml`, `<p:sld xmlns:p="${presentationNs}" xmlns:a="${drawingNs}"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`]),
  ];
}

function rc4(key, data) {
  const state = Array.from({ length: 256 }, (_, index) => index);
  let swapIndex = 0;
  for (let index = 0; index < 256; index++) {
    swapIndex = (swapIndex + state[index] + key[index % key.length]) % 256;
    [state[index], state[swapIndex]] = [state[swapIndex], state[index]];
  }
  let keyIndex = 0;
  swapIndex = 0;
  return Buffer.from(data.map((value) => {
    keyIndex = (keyIndex + 1) % 256;
    swapIndex = (swapIndex + state[keyIndex]) % 256;
    [state[keyIndex], state[swapIndex]] = [state[swapIndex], state[keyIndex]];
    return value ^ state[(state[keyIndex] + state[swapIndex]) % 256];
  }));
}

function pdf(texts = ["Teaching content"], extraCatalog = "", password) {
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R ${extraCatalog} >>`,
    `<< /Type /Pages /Count ${texts.length} /Kids [${texts.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [index, text] of texts.entries()) {
    const content = text ? `BT /F1 12 Tf 30 100 Td (${text.replace(/[\\()]/g, "\\$&")}) Tj ET` : "";
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }
  let encryption = "";
  if (password !== undefined) {
    const padding = Buffer.from("28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a", "hex");
    const padded = Buffer.concat([Buffer.from(password), padding]).subarray(0, 32);
    const digest = (value) => createHash("md5").update(value).digest();
    const owner = rc4(digest(padding).subarray(0, 5), padded);
    const permissions = Buffer.alloc(4);
    permissions.writeInt32LE(-4);
    const identifier = Buffer.alloc(16, 1);
    const key = digest(Buffer.concat([padded, owner, permissions, identifier])).subarray(0, 5);
    const user = rc4(key, padding);
    objects.push(`<< /Filter /Standard /V 1 /R 2 /O <${owner.toString("hex")}> /U <${user.toString("hex")}> /P -4 >>`);
    encryption = `/Encrypt ${objects.length} 0 R /ID [<${identifier.toString("hex")}> <${identifier.toString("hex")}>]`;
  }
  let output = "%PDF-1.7\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R ${encryption} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}

const extractPptx = (parts) => extractTeachingMaterial(new File([zip(parts)], "teaching.pptx"));
const wordNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

test("extracts DOCX paragraph text", async () => {
  const bytes = zip([
    ["[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ["word/document.xml", `<w:document xmlns:w="${wordNs}"><w:body><w:p><w:r><w:t>First paragraph</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:body></w:document>`],
  ]);
  assert.equal(await extractTeachingMaterial(new File([bytes], "notes.docx")), "First paragraph\nSecond paragraph");
});

test("extracts PDF text in page order without executing document JavaScript", async () => {
  const bytes = pdf(["First page", "Second page"], "/OpenAction << /S /JavaScript /JS (throw new Error) >>");
  assert.equal(await extractTeachingMaterial(new File([bytes], "teaching.PDF")), "First page\n\nSecond page");
});

test("extracts PPTX text in declared slide order and decodes entities", async () => {
  assert.equal(await extractPptx(pptxParts(undefined, [2, 1])), "Second & final\n\nFirst slide");
});

test("rejects image-only/empty documents and page/slide/text limits", async () => {
  await assert.rejects(extractTeachingMaterial(new File([pdf([""])], "scan.pdf")), /No extractable text.*OCR/);
  await assert.rejects(extractPptx(pptxParts([""])), /No extractable text/);
  await assert.rejects(extractTeachingMaterial(new File([pdf(Array(61).fill("text"))], "long.pdf")), /at most 60 pages/);
  await assert.rejects(extractPptx(pptxParts(Array(61).fill("text"))), /at most 60 slides/);
  await assert.rejects(extractPptx(pptxParts(["x".repeat(12_001)])), /Too much text/);
  await assert.rejects(extractPptx(pptxParts(Array(6).fill("x".repeat(10_000)))), /Too much text/);
});

test("rejects missing, empty, oversized and unsupported uploads before reading contents", async () => {
  await assert.rejects(extractTeachingMaterial(null), /non-empty/);
  await assert.rejects(extractTeachingMaterial(new File([], "empty.pdf")), /non-empty/);
  const oversized = new File([new Uint8Array(MAX_MATERIAL_BYTES + 1)], "large.pdf");
  oversized.arrayBuffer = () => { throw new Error("must not read"); };
  oversized.slice = () => { throw new Error("must not read"); };
  await assert.rejects(extractTeachingMaterial(oversized), /at most 4 MiB/);
  await assert.rejects(extractTeachingMaterial(new File(["text"], "file.docx")), /does not match/);
  await assert.rejects(extractTeachingMaterial(new File(["text"], "notes.txt")), /Choose a PDF, PPT, PPTX, DOC, or DOCX/);
});

test("requires matching signatures and rejects legacy PPT honestly", async () => {
  for (const name of ["fake.pdf", "fake.pptx", "fake.ppt"]) {
    await assert.rejects(extractTeachingMaterial(new File(["not a document"], name)), /does not match/);
  }
  const compound = Buffer.from("d0cf11e0a1b11ae1", "hex");
  await assert.rejects(extractTeachingMaterial(new File([compound], "legacy.ppt")), /Legacy binary PPT.*Export it as PPTX/);
  await assert.rejects(extractTeachingMaterial(new File([compound], "legacy.doc")), /Legacy binary DOC.*Export it as DOCX/);
  await assert.rejects(extractTeachingMaterial(new File([compound], "protected.pptx")), /Encrypted.*Remove the password/);
});

test("the production module enforces the server-only import boundary", () => {
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", "await import('./src/lib/teaching-material.ts')"], { encoding: "utf8", cwd: new URL("..", import.meta.url) });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cannot be imported from a Client Component/);
});

test("rejects encrypted PDFs including those that open with an empty password", async () => {
  for (const password of ["", "test-only-password"]) {
    await assert.rejects(extractTeachingMaterial(new File([pdf([""], "", password)], "encrypted.pdf")), /Encrypted PDF.*Remove/);
  }
});

test("rejects malformed archives, misleading content types and corrupt PDF data", async () => {
  await assert.rejects(extractTeachingMaterial(new File(["%PDF-1.7\ninvalid"], "bad.pdf")), /Could not read/);
  await assert.rejects(extractTeachingMaterial(new File([Buffer.from("504b030400000000", "hex")], "bad.pptx")), /Could not read/);
  await assert.rejects(extractPptx([["word/document.xml", "<document/>"]]), /Missing required PPTX/);
  const macro = pptxParts();
  macro[0][1] = macro[0][1].replace("application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml", "application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml");
  await assert.rejects(extractPptx(macro), /macro-free/);
  await assert.rejects(extractPptx([...pptxParts(), ["ppt/vbaProject.bin", "unused"]]), /Macro or ActiveX/);
});

test("rejects unsafe ZIP names, duplicate entries and encryption", async () => {
  for (const name of ["../outside.xml", "/absolute.xml", "C:/outside.xml", "ppt\\bad.xml", "ppt/%2e%2e/bad.xml", "ppt/./bad.xml"]) {
    await assert.rejects(extractPptx([...pptxParts(), [name, "not read"]]));
  }
  await assert.rejects(extractPptx([...pptxParts(), ["PPT/SLIDES/SLIDE1.XML", "duplicate"]]), /duplicate/);
  await assert.rejects(extractPptx([...pptxParts(), ["encrypted.bin", "not read", { flags: 1 }]]), /Encrypted/);
});

test("bounds ZIP expansion, entry counts and per-part XML size", async () => {
  await assert.rejects(extractPptx([...pptxParts(), ["bomb.bin", "x".repeat(100_000), { deflate: true }]]), /expansion limit/);
  await assert.rejects(extractPptx([...pptxParts(), ["huge.bin", randomBytes(100_000), { deflate: true, size: 9 * 1024 * 1024 }]]), /expansion limit/);
  const expandedParts = Array.from({ length: 4 }, (_, index) => [`media${index}.bin`, randomBytes(80_000), { deflate: true, size: 7 * 1024 * 1024 }]);
  await assert.rejects(extractPptx([...pptxParts(), ...expandedParts]), /expansion limit/);
  await assert.rejects(extractPptx(Array.from({ length: 1025 }, (_, index) => [`empty${index}`, ""])), /Too many PPTX/);
  const oversizedXml = pptxParts();
  oversizedXml[3][1] += " ".repeat(1024 * 1024);
  await assert.rejects(extractPptx(oversizedXml), /XML part exceeds 1 MiB/);
});

test("checks real inflated sizes and CRC instead of trusting ZIP metadata", async () => {
  const forged = pptxParts();
  forged[3].push({ deflate: true, size: 16 });
  await assert.rejects(extractPptx(forged), /Could not read|expansion limit/);
  const bytes = zip(pptxParts());
  const offset = bytes.indexOf("First slide");
  assert.ok(offset > 0);
  bytes[offset] = 88;
  await assert.rejects(extractTeachingMaterial(new File([bytes], "corrupt.pptx")), /Corrupt PPTX/);
});

test("rejects DTDs, entities, malformed XML and excessive XML depth", async () => {
  for (const xml of [
    '<!DOCTYPE p:sld [<!ENTITY lesson SYSTEM "https://example.invalid/private">]>',
    '<!DOCTYPE p:sld [<!ENTITY lesson "expanded">]>',
  ]) {
    const parts = pptxParts(["&lesson;"]);
    parts[3][1] = xml + parts[3][1];
    await assert.rejects(extractPptx(parts), /declarations\/entities/);
  }
  await assert.rejects(extractPptx(pptxParts(["&unknown;"])), /Malformed PPTX XML/);
  await assert.rejects(extractPptx(pptxParts(["<bad>"])), /Malformed PPTX XML/);
  await assert.rejects(extractPptx(pptxParts(["<nested>".repeat(65) + "text" + "</nested>".repeat(65)])), /too complex/);
});

test("rejects external/missing/repeated slide references and never fetches hyperlinks", async (context) => {
  const fetch = context.mock.method(globalThis, "fetch", () => { throw new Error("Network access is forbidden"); });
  for (const target of ["https://example.invalid/slide.xml", "../slide.xml", "slides/%2e%2e/slide.xml"]) {
    const parts = pptxParts();
    parts[2][1] = parts[2][1].replace("slides/slide1.xml", target);
    await assert.rejects(extractPptx(parts), /External or unsafe/);
  }
  const external = pptxParts();
  external[2][1] = external[2][1].replace('Target="slides/slide1.xml"', 'TargetMode="External" Target="slides/slide1.xml"');
  await assert.rejects(extractPptx(external), /External or unsafe/);
  await assert.rejects(extractPptx(pptxParts().slice(0, -1)), /Missing required/);
  await assert.rejects(extractPptx(pptxParts(undefined, [1, 1])), /Invalid PPTX slide references/);
  const linked = pptxParts(["https://example.invalid/lesson"]);
  linked.push(["ppt/slides/_rels/slide1.xml.rels", '<Relationships><Relationship TargetMode="External" Target="https://example.invalid/never-fetch"/></Relationships>']);
  assert.equal(await extractPptx(linked), "https://example.invalid/lesson");
  assert.equal(await extractTeachingMaterial(new File([pdf(["Linked lesson"], "/OpenAction << /S /URI /URI (https://example.invalid/never-fetch) >>")], "linked.pdf")), "Linked lesson");
  assert.equal(fetch.mock.callCount(), 0);
});

test("handles compressed XML, alternate prefixes, UTF-16, adjacent runs and line breaks", async () => {
  const parts = pptxParts(["Unicode &#x6559;&#x5B66;"]);
  parts[3][1] = parts[3][1].replace(/a:/g, "drawing:").replace("xmlns:a=", "xmlns:drawing=");
  parts[3][1] = parts[3][1].replace("</drawing:r>", "</drawing:r><drawing:r><drawing:t> adjacent</drawing:t></drawing:r><drawing:br/><drawing:r><drawing:t>next line</drawing:t></drawing:r>");
  parts[3][1] = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(parts[3][1], "utf16le")]);
  for (const part of parts) part.push({ deflate: true });
  assert.equal(await extractPptx(parts), "Unicode \u6559\u5b66 adjacent\nnext line");
});