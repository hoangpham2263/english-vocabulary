// Converts a hand-written `data-bookN.js` word list into the JSON the seed reads.
//
//   pnpm convert:4000 /path/to/data-book1.js book1
//
// The source file assigns `window.BOOKN = [unit[], ...]`, each word being
// [en, ipa, vi, example, exampleVi]. It is evaluated in an empty sandbox, so it
// cannot reach the file system or the network.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { bookSize, validateBook, UNITS_PER_BOOK } from "./book-format.mjs";

const [source, book] = process.argv.slice(2);
if (!source || !/^book[1-6]$/.test(book ?? "")) {
  console.error("Usage: pnpm convert:4000 <data-bookN.js> <book1..book6>");
  process.exit(1);
}

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(source, "utf8"), sandbox, { timeout: 1000 });
const units = Object.values(sandbox.window)[0];
if (!Array.isArray(units)) {
  console.error("No window.BOOKn array found in", source);
  process.exit(1);
}

const words = units.flatMap((unit, index) =>
  unit.map(([en, ipa, vi, example, exampleVi]) => ({ unit: index + 1, en, ipa, vi, example, exampleVi })),
);

const problems = validateBook(words, book);
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "4000-words", `${book}.json`);
writeFileSync(out, `${JSON.stringify(words, null, 2)}\n`);
console.log(`Wrote ${words.length}/${bookSize(book)} words in ${UNITS_PER_BOOK} units to ${out}`);
