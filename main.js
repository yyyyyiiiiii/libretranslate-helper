import fs from "node:fs";
import { Agent } from "undici";
import { program } from "commander";

const HOST = "http://127.0.0.1:5000/";

const dispatcher = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
});

async function languages() {
  const res = await fetch(`${HOST}/languages`, {
    dispatcher,
    method: "GET",
  });

  const result = await res.json();
  console.log(result);
}

async function translate(input, input_lang, output_lang, output) {
  const data = fs.readFileSync(input, "utf8");

  const res = await fetch(`${HOST}/translate`, {
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

async function detect(input) {
  const data = fs.readFileSync(input, "utf8");

  const res = await fetch(`${HOST}/detect`, {
    dispatcher,
	  method: "POST",
	  body: JSON.stringify({
		  q: data,
		  api_key: ""
	  }),
	  headers: { "Content-Type": "application/json" }
  });

  const result = await res.json();
  console.log(result);
}

program
  .name("libretranslate-helper")
  .description("CLI helper for LibreTranslate")
  .version("1.0.0");

program
  .command("translate")
  .description('Takes a file and translates it')
  .requiredOption("-i, --input <path>", "input file path")
  .option("--input-lang <lang>", "input language", "de")
  .option("--output-lang <lang>", "output language", "en")
  .option("-o, --output <path>", "output file path")
  .action((options) => {
    const input = options.input;
    const input_lang = options?.inputLang;
    const output_lang = options?.outputLang;
    const output = options?.output || (
      input.replace(/(\.[^.]+)$/, `.${output_lang}$1`) +
        (/\.[^.]+$/.test(input) ? "" : `.${output_lang}`)
    );

    translate(input, input_lang, output_lang, output).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program
  .command("languages")
  .description('List all available languages')
  .action(() => languages().catch((err) => {
    console.error(err);
    process.exit(1);
  }));

program
  .command("detect")
  .description('Detect the language of a text')
  .requiredOption("-i, --input <path>", "input file path")
  .action((options) => {
    const input = options.input;

    detect(input).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.parse();