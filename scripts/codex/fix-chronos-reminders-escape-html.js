const fs = require("fs");
const file = "D:\\programari\\app\\api\\reminders\\route.ts";

let s = fs.readFileSync(file, "utf8");

if (!s.includes("function escapeHtml")) {
  s = s.replace(
    'import { checkAndConsumeWhatsAppQuota } from "@/lib/whatsappQuota";\n',
    `import { checkAndConsumeWhatsAppQuota } from "@/lib/whatsappQuota";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
`
  );
}

fs.writeFileSync(file, s, "utf8");
console.log("Added escapeHtml helper to reminders route.");
