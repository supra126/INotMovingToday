#!/usr/bin/env node

/**
 * I'm Not Moving Today CLI (不想動了)
 *
 * Launch the static version of AI Video Generator locally
 * Users need to provide their own Gemini API Key
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// i18n messages
const messages = {
  zh: {
    title: "不想動了 - AI 短影音生成工具",
    serverStarted: "伺服器已啟動",
    instructions: "使用說明",
    step1: "在瀏覽器中開啟上方網址",
    step2: "點擊「API 設定」輸入你的 Gemini API Key",
    step3: "上傳圖片，開始生成影片腳本",
    getApiKey: "取得 API Key",
    pressCtrlC: "按 Ctrl+C 停止伺服器",
    goodbye: "感謝使用，再見！",
    errorNotFound: "錯誤: 找不到靜態檔案目錄",
    errorNotFoundHint: "請先執行 pnpm build:static 建置靜態版本",
    helpUsage: "使用方式",
    helpOptions: "選項",
    helpOptPort: "指定埠號",
    helpOptLang: "指定語言 (zh/en)",
    helpOptHelp: "顯示說明",
    helpOptVersion: "顯示版本",
    helpExamples: "範例",
    helpDefault: "預設",
  },
  en: {
    title: "I'm Not Moving Today - AI Video Generator",
    serverStarted: "Server started",
    instructions: "Instructions",
    step1: "Open the URL above in your browser",
    step2: "Click 'API Settings' to enter your Gemini API Key",
    step3: "Upload images and start generating video scripts",
    getApiKey: "Get API Key",
    pressCtrlC: "Press Ctrl+C to stop the server",
    goodbye: "Thanks for using, goodbye!",
    errorNotFound: "Error: Static files directory not found",
    errorNotFoundHint: "Please run pnpm build:static first",
    helpUsage: "Usage",
    helpOptions: "Options",
    helpOptPort: "Specify port",
    helpOptLang: "Specify language (zh/en)",
    helpOptHelp: "Show help",
    helpOptVersion: "Show version",
    helpExamples: "Examples",
    helpDefault: "default",
  },
};

// Detect system locale, default to English if not Chinese
function detectLocale() {
  try {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    return systemLocale.startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

// Settings
const DEFAULT_PORT = 3456;
const args = process.argv.slice(2);

// Parse language first (needed for help message)
let lang = detectLocale();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--lang" || args[i] === "-l") {
    const requestedLang = args[i + 1];
    lang = requestedLang === "zh" ? "zh" : "en";
  }
}
const t = messages[lang];

// Parse other arguments
let port = DEFAULT_PORT;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" || args[i] === "-p") {
    port = parseInt(args[i + 1], 10) || DEFAULT_PORT;
  }
  if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
${t.title}

${t.helpUsage}:
  npx inotmovingtoday [options]

${t.helpOptions}:
  -p, --port <port>  ${t.helpOptPort} (${t.helpDefault}: ${DEFAULT_PORT})
  -l, --lang <lang>  ${t.helpOptLang}
  -h, --help         ${t.helpOptHelp}
  -v, --version      ${t.helpOptVersion}

${t.helpExamples}:
  npx inotmovingtoday
  npx inotmovingtoday --port 8080
  npx inotmovingtoday --lang en
`);
    process.exit(0);
  }
  if (args[i] === "--version" || args[i] === "-v") {
    const pkg = require("../package.json");
    console.log(pkg.version);
    process.exit(0);
  }
}

// MIME types
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

// Get static files directory
const distDir = path.join(__dirname, "..", "dist");

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error(`❌ ${t.errorNotFound}`);
  console.error(`   ${t.errorNotFoundHint}`);
  process.exit(1);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Parse URL
  let urlPath = req.url.split("?")[0];

  // Handle root path
  if (urlPath === "/") {
    urlPath = "/index.html";
  }

  // Try to find file
  let filePath = path.join(distDir, urlPath);

  // If path has no extension, try adding .html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + ".html")) {
      filePath = filePath + ".html";
    } else if (fs.existsSync(path.join(filePath, "index.html"))) {
      filePath = path.join(filePath, "index.html");
    }
  }

  // Security check: prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(distDir))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // Read and return file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found, return index.html (SPA fallback)
      const indexPath = path.join(distDir, "index.html");
      fs.readFile(indexPath, (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexData);
      });
      return;
    }

    // Get MIME type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

// Open browser
function openBrowser(url) {
  const platform = process.platform;
  let command;

  switch (platform) {
    case "darwin": // macOS
      command = `open "${url}"`;
      break;
    case "win32": // Windows
      command = `start "" "${url}"`;
      break;
    default: // Linux and others
      command = `xdg-open "${url}"`;
  }

  try {
    execSync(command, { stdio: "ignore" });
  } catch {
    // Ignore error, browser may not open
  }
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// Start server
server.listen(port, () => {
  const url = `http://localhost:${port}`;
  const separator = "━".repeat(50);

  console.log(`
${colors.cyan}${colors.bold}🎬 ${t.title}${colors.reset}
${colors.dim}${separator}${colors.reset}

${colors.green}✓${colors.reset} ${t.serverStarted}: ${colors.cyan}${url}${colors.reset}

${colors.yellow}📝 ${t.instructions}:${colors.reset}
   1. ${t.step1}
   2. ${t.step2}
   3. ${t.step3}

${colors.yellow}🔑 ${t.getApiKey}:${colors.reset}
   ${colors.dim}https://aistudio.google.com/app/apikey${colors.reset}

${colors.dim}${separator}${colors.reset}
${colors.dim}${t.pressCtrlC}${colors.reset}
`);

  // Auto open browser
  openBrowser(url);
});

// Handle shutdown signals
process.on("SIGINT", () => {
  console.log(`\n👋 ${t.goodbye}`);
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
