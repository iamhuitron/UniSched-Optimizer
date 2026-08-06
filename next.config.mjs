/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist and tesseract.js both resolve real filesystem paths at runtime
  // (font metrics, language data, the OCR worker script). Letting webpack bundle
  // them rewrites those require.resolve() calls into webpack module ids instead
  // of real paths, which breaks that lookup — so these stay external and load
  // straight from node_modules via Node's own module resolution instead.
  serverExternalPackages: ['pdfjs-dist', 'tesseract.js', 'tesseract.js-core', '@tesseract.js-data/spa'],
};

export default nextConfig;
