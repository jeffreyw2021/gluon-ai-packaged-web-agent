import * as fs from "node:fs";
import * as path from "node:path";

export function exists(p: string) {
  return fs.existsSync(p);
}

export function read(p: string) {
  return fs.readFileSync(p, "utf-8");
}

export function write(
  p: string,
  content: string,
  { overwrite = false } = {},
): boolean {
  if (exists(p) && !overwrite) {
    log("skip", p);
    return false;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf-8");
  log("write", p);
  return true;
}

export function log(
  verb: "skip" | "write" | "append" | "info" | "warn",
  msg: string,
) {
  const icons: Record<string, string> = {
    skip: "  ⏭  skip  ",
    write: "  ✅ wrote ",
    append: "  ➕ appended to ",
    info: "  ℹ️  ",
    warn: "  ⚠️  ",
  };
  console.log((icons[verb] ?? "  ") + msg);
}
