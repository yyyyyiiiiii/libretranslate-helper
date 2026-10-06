import fs from "node:fs";
import { Agent } from "undici";
import { program } from "commander";

program
  .name("libretranslate-helper")
  .description("CLI tool that takes a file and sends it to LibreTranslate")
  .version("1.0.0")
  .requiredOption("-i, --input <path>")
  .option("--input-lang <lang>", "de")
  .option("--output-lang <lang>", "en")
  .option("-o, --output <path>");

program.parse();

const options = program.opts();

const input = options.input;
const input_lang = options?.input_lang || "de";
const output_lang = options?.output_lang || "en";
const output = options?.output || input.replace(/(\.[^.]+)$/, `.${output_lang}$1`);

async function main() {
  const dispatcher = new Agent({
    headersTimeout: 0,
    bodyTimeout: 0,
  });

  const data = fs.readFileSync(input, "utf8");

  const res = await fetch("http://127.0.0.1:5000/translate", {
    dispatcher,
	  method: "POST",
	  body: JSON.stringify({
		  q: data,
		  source: input_lang,
		  target: output_lang,
		  format: "text",
		  alternatives: 3,
		  api_key: ""
	  }),
	  headers: { "Content-Type": "application/json" }
  });

  const result = await res.json();

  fs.writeFileSync(output, result.translatedText, { encoding: "utf8" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
