import "server-only";
import { Buffer } from "node:buffer";
import { crc32 } from "node:zlib";
import sax, { type QualifiedTag } from "sax";
import { fromBufferPromise, type Entry, type ZipFile } from "yauzl";
import type { TextContent } from "pdfjs-dist/types/src/display/api";

export const MAX_MATERIAL_BYTES = 4 * 1024 * 1024;
const MAX_UNITS = 60;
const MAX_TEXT = 60_000;
const MAX_UNIT_TEXT = 12_000;
const MAX_XML_BYTES = 1024 * 1024;
const MAX_EXPANDED_BYTES = 24 * 1024 * 1024;
const MAX_ENTRIES = 1024;
const MAX_PARSE_MS = 20_000;
const PRESENTATION_NS = new Set([
  "http://schemas.openxmlformats.org/presentationml/2006/main",
  "http://purl.oclc.org/ooxml/presentationml/main",
]);
const DRAWING_NS = new Set([
  "http://schemas.openxmlformats.org/drawingml/2006/main",
  "http://purl.oclc.org/ooxml/drawingml/main",
]);
const RELATIONSHIP_NS = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  "http://purl.oclc.org/ooxml/officeDocument/relationships",
]);
const PACKAGE_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CONTENT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const PPTX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml";

class MaterialError extends Error {}

function checkDeadline(deadline: number) {
  if (Date.now() > deadline) throw new MaterialError("Extraction took too long. Split the teaching file and try again.");
}

function textCollector() {
  let text = "";
  let unitLength = 0;
  return {
    next() {
      unitLength = 0;
      if (text) this.append("\n\n");
    },
    append(value: string) {
      unitLength += value.length;
      if (unitLength > MAX_UNIT_TEXT || text.length + value.length > MAX_TEXT) {
        throw new MaterialError("Too much text: limit 12,000 characters per page/slide and 60,000 per file. Split the file.");
      }
      text += value;
    },
    finish() {
      const result = text.replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!/[\p{L}\p{N}]/u.test(result)) {
        throw new MaterialError("No extractable text found. Scanned or image-only files need OCR first; export a searchable PDF or a PPTX containing text.");
      }
      return result;
    },
  };
}

function parseXml(xml: string, root: string, namespaces: Set<string>, handlers: {
  open?: (tag: QualifiedTag, parent: QualifiedTag | undefined) => void;
  close?: (tag: QualifiedTag) => void;
  text?: (value: string, parent: QualifiedTag | undefined) => void;
}, deadline: number) {
  const options = { xmlns: true, strictEntities: true, noscript: true };
  const parser = sax.parser(true, options);
  const stack: QualifiedTag[] = [];
  let nodes = 0;
  let roots = 0;
  parser.onerror = () => { throw new MaterialError("Malformed PPTX XML. Re-export the presentation as PPTX."); };
  parser.ondoctype = parser.onsgmldeclaration = () => { throw new MaterialError("PPTX XML declarations/entities are not allowed. Re-export the file."); };
  parser.onprocessinginstruction = (instruction) => {
    if (instruction.name !== "xml") throw new MaterialError("PPTX processing instructions are not supported. Re-export the file.");
  };
  parser.onopentag = (raw) => {
    const tag = raw as QualifiedTag;
    if (++nodes > 100_000 || stack.length >= 64 || Object.keys(tag.attributes).length > 64) {
      throw new MaterialError("PPTX XML is too complex. Simplify or split the presentation.");
    }
    if (!stack.length && (++roots !== 1 || tag.local !== root || !namespaces.has(tag.uri))) {
      throw new MaterialError("Invalid PPTX document structure. Re-export the presentation.");
    }
    handlers.open?.(tag, stack.at(-1));
    stack.push(tag);
  };
  parser.onclosetag = () => {
    const tag = stack.pop();
    if (tag) handlers.close?.(tag);
  };
  parser.ontext = parser.oncdata = (value) => handlers.text?.(value, stack.at(-1));
  for (let offset = 0; offset < xml.length; offset += 4096) {
    checkDeadline(deadline);
    parser.write(xml.slice(offset, offset + 4096));
  }
  parser.close();
  if (roots !== 1) throw new MaterialError("Missing PPTX XML content. Re-export the presentation.");
}

async function readXml(zip: ZipFile, entry: Entry | undefined, deadline: number): Promise<string> {
  if (!entry) throw new MaterialError("Missing required PPTX parts. Re-export the presentation.");
  if (entry.uncompressedSize > MAX_XML_BYTES) throw new MaterialError("PPTX XML part exceeds 1 MiB. Split the presentation.");
  const stream = await zip.openReadStreamPromise(entry);
  const chunks: Buffer[] = [];
  let size = 0;
  let checksum = 0;
  try {
    for await (const chunk of stream) {
      checkDeadline(deadline);
      size += chunk.length;
      if (size > MAX_XML_BYTES || size > entry.uncompressedSize) throw new MaterialError("PPTX expansion limit exceeded. Re-export or split the file.");
      checksum = crc32(chunk, checksum);
      chunks.push(chunk);
    }
  } finally {
    stream.destroy();
  }
  if (size !== entry.uncompressedSize || checksum !== entry.crc32) throw new MaterialError("Corrupt PPTX contents. Re-export the file.");
  const buffer = Buffer.concat(chunks, size);
  const encoding = buffer[0] === 0xff && buffer[1] === 0xfe ? "utf-16le" : buffer[0] === 0xfe && buffer[1] === 0xff ? "utf-16be" : "utf-8";
  return new TextDecoder(encoding, { fatal: true }).decode(buffer);
}

function attribute(tag: QualifiedTag, name: string): string {
  return tag.attributes[name]?.value ?? "";
}

const WORD_NS = new Set([
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "http://purl.oclc.org/ooxml/wordprocessingml/main",
]);
const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";

async function openOfficeZip(buffer: Buffer, deadline: number, kind: "PPTX" | "DOCX") {
  const zip = await fromBufferPromise(buffer, { strictFileNames: true, validateEntrySizes: true, autoClose: false });
  try {
    if (zip.entryCount > MAX_ENTRIES) throw new MaterialError(`Too many ${kind} archive entries (maximum 1,024). Split the file.`);
    const entries = new Map<string, Entry>();
    let expanded = 0;
    for await (const entry of zip.eachEntry()) {
      checkDeadline(deadline);
      const name = entry.fileName;
      if (entries.size >= MAX_ENTRIES || entries.has(name.toLowerCase()) || name.length > 240 || /[\\:%\x00-\x1f]/.test(name) || name.split("/").some((part) => part === ".")) {
        throw new MaterialError(`Unsafe or duplicate ${kind} archive path. Re-export the file.`);
      }
      if (entry.isEncrypted()) throw new MaterialError(`Encrypted ${kind} files are not supported. Remove the password first.`);
      if (![0, 8].includes(entry.compressionMethod) || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) {
        throw new MaterialError(`Unsupported ${kind} archive entry. Re-export the file.`);
      }
      expanded += entry.uncompressedSize;
      if (expanded > MAX_EXPANDED_BYTES || entry.uncompressedSize > 8 * 1024 * 1024 || entry.uncompressedSize > Math.max(1, entry.compressedSize) * 100) {
        throw new MaterialError(`${kind} expansion limit exceeded (24 MiB total, 8 MiB per entry, 100:1 ratio). Split the file.`);
      }
      if (/vbaProject|\/activeX\//i.test(name)) throw new MaterialError(`Macro or ActiveX content is not supported. Export a macro-free ${kind}.`);
      entries.set(name.toLowerCase(), entry);
    }
    return { zip, entries };
  } catch (error) {
    zip.close();
    throw error;
  }
}

async function extractPptx(buffer: Buffer, deadline: number): Promise<string> {
  const { zip, entries } = await openOfficeZip(buffer, deadline, "PPTX");
  try {
    const getPart = (name: string) => readXml(zip, entries.get(name.toLowerCase()), deadline);
    let isPresentation = false;
    parseXml(await getPart("[Content_Types].xml"), "Types", new Set([CONTENT_NS]), {
      open(tag) {
        if (tag.uri === CONTENT_NS && tag.local === "Override" && attribute(tag, "PartName") === "/ppt/presentation.xml") {
          if (isPresentation || attribute(tag, "ContentType") !== PPTX_CONTENT_TYPE) throw new MaterialError("Not a macro-free PPTX presentation. Export as PPTX.");
          isPresentation = true;
        }
      },
    }, deadline);
    if (!isPresentation) throw new MaterialError("Not a PPTX presentation. Export the original as PPTX.");
    const slideIds: string[] = [];
    parseXml(await getPart("ppt/presentation.xml"), "presentation", PRESENTATION_NS, {
      open(tag, parent) {
        if (PRESENTATION_NS.has(tag.uri) && tag.local === "sldId" && parent?.local === "sldIdLst" && PRESENTATION_NS.has(parent.uri)) {
          const id = Object.values(tag.attributes).find((value) => value.local === "id" && RELATIONSHIP_NS.has(value.uri))?.value;
          if (!id || slideIds.includes(id)) throw new MaterialError("Invalid PPTX slide references. Re-export the presentation.");
          slideIds.push(id);
          if (slideIds.length > MAX_UNITS) throw new MaterialError("Teaching files may contain at most 60 slides. Split the presentation.");
        }
      },
    }, deadline);
    const slides = new Map<string, string>();
    const relationshipIds = new Set<string>();
    parseXml(await getPart("ppt/_rels/presentation.xml.rels"), "Relationships", new Set([PACKAGE_NS]), {
      open(tag) {
        if (tag.uri !== PACKAGE_NS || tag.local !== "Relationship") return;
        const id = attribute(tag, "Id");
        if (!id || relationshipIds.has(id)) throw new MaterialError("Duplicate PPTX relationships. Re-export the presentation.");
        relationshipIds.add(id);
        if (!slideIds.includes(id)) return;
        const target = attribute(tag, "Target");
        const type = attribute(tag, "Type");
        if (attribute(tag, "TargetMode") === "External" || ![...RELATIONSHIP_NS].some((namespace) => type === `${namespace}/slide`) || !/^(?:slides\/|\/ppt\/slides\/)[a-zA-Z0-9_-]+\.xml$/.test(target)) {
          throw new MaterialError("External or unsafe PPTX slide references are not supported. Embed the slides and re-export.");
        }
        slides.set(id, target.startsWith("/") ? target.slice(1) : `ppt/${target}`);
      },
    }, deadline);
    const output = textCollector();
    const usedSlides = new Set<string>();
    for (const id of slideIds) {
      const path = slides.get(id);
      if (!path || usedSlides.has(path.toLowerCase())) throw new MaterialError("Missing or repeated PPTX slide. Re-export the presentation.");
      usedSlides.add(path.toLowerCase());
      output.next();
      parseXml(await getPart(path), "sld", PRESENTATION_NS, {
        text(value, parent) {
          if (parent?.local === "t" && DRAWING_NS.has(parent.uri)) output.append(value);
        },
        close(tag) {
          if (DRAWING_NS.has(tag.uri) && ["p", "br"].includes(tag.local)) output.append("\n");
        },
      }, deadline);
    }
    return output.finish();
  } finally {
    zip.close();
  }
}

async function extractDocx(buffer: Buffer, deadline: number): Promise<string> {
  const { zip, entries } = await openOfficeZip(buffer, deadline, "DOCX");
  try {
    const getPart = (name: string) => readXml(zip, entries.get(name.toLowerCase()), deadline);
    let isDocument = false;
    parseXml(await getPart("[Content_Types].xml"), "Types", new Set([CONTENT_NS]), {
      open(tag) {
        if (tag.uri === CONTENT_NS && tag.local === "Override" && attribute(tag, "PartName") === "/word/document.xml") {
          if (isDocument || attribute(tag, "ContentType") !== DOCX_CONTENT_TYPE) throw new MaterialError("Not a macro-free DOCX document. Export as DOCX.");
          isDocument = true;
        }
      },
    }, deadline);
    if (!isDocument) throw new MaterialError("Not a DOCX document. Export the original as DOCX.");
    const output = textCollector();
    output.next();
    parseXml(await getPart("word/document.xml"), "document", WORD_NS, {
      text(value, parent) {
        if (parent?.local === "t" && WORD_NS.has(parent.uri)) output.append(value);
      },
      close(tag) {
        if (WORD_NS.has(tag.uri) && ["p", "br"].includes(tag.local)) output.append("\n");
      },
    }, deadline);
    return output.finish();
  } finally {
    zip.close();
  }
}

class NoExternalResources {
  async fetch(): Promise<never> {
    throw new MaterialError("PDF requires unavailable font resources. Re-export with embedded fonts.");
  }
}

async function extractPdf(buffer: Buffer, deadline: number): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  checkDeadline(deadline);
  const task = getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
    useWorkerFetch: false,
    BinaryDataFactory: NoExternalResources,
    useSystemFonts: false,
    disableFontFace: true,
    useWasm: false,
    enableXfa: false,
    maxImageSize: 0,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    stopAtErrors: true,
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
  });
  const timer = setTimeout(() => { void task.destroy().catch(() => {}); }, Math.max(1, deadline - Date.now()));
  try {
    const document = await task.promise;
    if (await document.getPermissions() !== null) throw new MaterialError("Encrypted PDF files are not supported. Remove encryption and export a new PDF.");
    if (document.numPages > MAX_UNITS) throw new MaterialError("Teaching files may contain at most 60 pages. Split the PDF.");
    const output = textCollector();
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      checkDeadline(deadline);
      const page = await document.getPage(pageNumber);
      const reader = page.streamTextContent().getReader() as ReadableStreamDefaultReader<TextContent>;
      output.next();
      try {
        while (true) {
          checkDeadline(deadline);
          const { done, value } = await reader.read();
          if (done) break;
          for (const item of value.items) {
            if ("str" in item) output.append(item.str + (item.hasEOL ? "\n" : " "));
          }
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
        page.cleanup();
      }
    }
    return output.finish();
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new MaterialError("Encrypted PDF files are not supported. Remove the password and export a new PDF.");
    }
    checkDeadline(deadline);
    throw error;
  } finally {
    clearTimeout(timer);
    await task.destroy();
  }
}

export async function extractTeachingMaterial(file: File): Promise<string> {
  if (!(file instanceof File) || !file.size) {
    throw new MaterialError("Choose a non-empty PDF, PPTX, or DOCX file.");
  }
  if (file.size > MAX_MATERIAL_BYTES) {
    throw new MaterialError("Teaching files must be at most 4 MiB. Split or reduce the file.");
  }
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1].toLowerCase();
  if (!["pdf", "pptx", "ppt", "docx", "doc"].includes(extension ?? "")) {
    throw new MaterialError("Choose a PDF, PPT, PPTX, DOC, or DOCX file.");
  }
  const header = Buffer.from(await file.slice(0, 8).arrayBuffer());
  const compound = header.equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
  if (extension === "ppt" || extension === "doc") {
    if (!compound) throw new MaterialError(`The ${extension.toUpperCase()} extension does not match a legacy Office file.`);
    throw new MaterialError(`Legacy binary ${extension.toUpperCase()} cannot be safely extracted here. Export it as ${extension === "ppt" ? "PPTX" : "DOCX"} or a text-based PDF and upload that copy.`);
  }
  if ((extension === "pptx" || extension === "docx") && compound) {
    throw new MaterialError("Encrypted Office files are not supported. Remove the password and save as PPTX or DOCX.");
  }
  if (extension === "pdf" ? !/^%PDF-[12]\.\d/.test(header.toString("ascii")) : !header.subarray(0, 4).equals(Buffer.from("504b0304", "hex"))) {
    throw new MaterialError("The file extension does not match its contents. Export a valid PDF, PPTX, or DOCX.");
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length !== file.size || buffer.length > MAX_MATERIAL_BYTES) throw new MaterialError("Invalid upload size. Upload the file again.");
    const deadline = Date.now() + MAX_PARSE_MS;
    return await (extension === "pdf" ? extractPdf(buffer, deadline) : extension === "docx" ? extractDocx(buffer, deadline) : extractPptx(buffer, deadline));
  } catch (error) {
    if (error instanceof MaterialError) throw error;
    throw new MaterialError("Could not read this file. It may be corrupt, encrypted or unsupported. Export a new unencrypted PDF, PPTX, or DOCX and try again.");
  }
}