// Viora Trend – serves the shop at "/" and product share links at "/p/<id>"
// (the /p/ page carries the product photo/name/price for WhatsApp previews).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ENDPOINT = "https://script.google.com/macros/s/AKfycbzMxGSAvirtv7puCW8YOkPxNh2HDdHB5jlve-Yt-EekJVFLWEoR0kqvO8TFewygba2h/exec";
const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, "index.html");

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gimg = u => {
  u = String(u || "").trim();
  if (!u) return "";
  const m = u.match(/\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/);
  return u.includes("drive.google.com") && m ? "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w800" : u;
};

async function productPage(id, origin) {
  const shop = origin + "/#p" + id;
  let title = "Viora Trend – Trendy Jewellery & Fashion Accessories";
  let desc = "Shop pearl, crystal and statement earrings. New styles every week.";
  let img = "";
  try {
    const r = await fetch(ENDPOINT + "?t=" + Date.now());
    const s = await r.json();
    const p = (s.products || []).find(x => String(x.id) === id && String(x.show).trim().toUpperCase() !== "NO");
    if (p) {
      const pr = Number(p.price), mrp = Number(p.mrp) || pr;
      const off = mrp > pr ? Math.round(100 - (pr / mrp) * 100) : 0;
      title = p.name + " – ₹" + pr + " | Viora Trend";
      desc = "₹" + pr + (off > 0 ? " (" + off + "% off, MRP ₹" + mrp + ")" : "") + " • Cash on Delivery • Order now on Viora Trend";
      img = gimg(p.img);
    }
  } catch (e) { /* generic preview */ }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta property="og:type" content="product">
<meta property="og:site_name" content="Viora Trend">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${img ? `<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(img)}">` : ""}
<meta http-equiv="refresh" content="0;url=${esc(shop)}">
<script>location.replace(${JSON.stringify(shop)})</script>
</head><body style="font-family:sans-serif;text-align:center;padding:40px"><p>Opening Viora Trend… <a href="${esc(shop)}">Tap here if it doesn't open</a></p></body></html>`;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const origin = "https://" + host;
  try {
    const m = url.pathname.match(/^\/p\/(\d+)\/?$/);
    if (m) {
      const html = await productPage(m[1], origin);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" });
      return res.end(html);
    }
    if (url.pathname === "/healthz") { res.writeHead(200); return res.end("ok"); }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return fs.createReadStream(INDEX).pipe(res);
    }
    res.writeHead(302, { Location: "/" });
    res.end();
  } catch (e) {
    res.writeHead(500); res.end("Something went wrong");
  }
}).listen(PORT, () => console.log("Viora Trend running on " + PORT));
