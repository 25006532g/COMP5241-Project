// PptxGenJS's optional Node file/URL paths are deliberately unavailable in the
// browser. Export uses embedded, authenticated image bytes only.
const unavailable = new Proxy({}, {get(){throw new Error("Node file/network access is unavailable in browser presentation export.");}});
export default unavailable;
