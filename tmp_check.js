const fs = require("fs");
const s = fs.readFileSync("app/(teacher)/class/[id]/gradebook.tsx", "utf8").split("\n");
let bal = 0;
for (let i = 0; i < s.length; i++) {
  const l = s[i];
  const opens = (l.match(/<View[ >]/g) || []).length;
  const closes = (l.match(/<\/View>/g) || []).length;
  bal += opens - closes;
  if (opens || closes) {
    console.log(String(i + 1).padStart(4) + " " + "  ".repeat(Math.max(0, bal)) + (opens - closes) + (opens - closes >= 0 ? ">" : "<") + " | " + l.trim());
  }
}
console.log("FINAL BALANCE:", bal);