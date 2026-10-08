import fs from "node:fs";
import { Agent } from "undici";
import { program } from "commander";
import envPaths from "env-paths";

const DEFAULT_CONFIG = {
    host: "http://127.0.0.1:5000",
    input_lang: "de",
    output_lang: "en",
    api_key: ""
  };

const paths = envPaths("libretranslate-helper");
const config_path = `${paths.config}/config.json`;

if (!fs.existsSync(config_path)) {
  try {
    fs.mkdirSync(paths.config, { recursive: true });
    fs.writeFileSync(config_path, JSON.stringify(DEFAULT_CONFIG));
  } catch (err) {
    console.error(err);
  }
}

const config = (() => {
  let parsed = true;
  let res = {};
  try {
    res = JSON.parse(fs.readFileSync(config_path, "utf8"));
  } catch (err) {
    console.error(err);
    parsed = false;
  }

  if (!parsed)
    return DEFAULT_CONFIG;

  if (!res.host)
    res.host = DEFAULT_CONFIG.host;

  if (!res.input_lang)
    res.input_lang = DEFAULT_CONFIG.input_lang;

  if (!res.output_lang)
    res.output_lang = DEFAULT_CONFIG.output_lang;
  return res;
})();

const dispatcher = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0
});

async function languages() {
  const res = await fetch(`${config.host}/languages`, {
    dispatcher,
    method: "GET",
  });

  const result = await res.json();
  console.log(result);
}

async function translate(input, output) {
  const data = fs.readFileSync(input, "utf8");

  const res = await fetch(`${config.host}/translate`, {
    dispatcher,
	  method: "POST",
	  body: JSON.stringify({
		  q: data,
		  source: config.input_lang,
		  target: config.output_lang,
		  format: "text",
		  alternatives: 3,
		  api_key: config.api_key
	  }),
	  headers: { "Content-Type": "application/json" }
  });

  const result = await res.json();

  fs.writeFileSync(output, result.translatedText, { encoding: "utf8" });
}

async function detect(input) {
  const data = fs.readFileSync(input, "utf8");

  const res = await fetch(`${config.host}/detect`, {
    dispatcher,
	  method: "POST",
	  body: JSON.stringify({
		  q: data,
		  api_key: config.api_key
	  }),
	  headers: { "Content-Type": "application/json" }
  });

  const result = await res.json();
  console.log(result);
}

program
  .name("libretranslate-helper")
  .description("CLI helper for LibreTranslate")
  .option("-h, --host <host>", "proto://host:port", config.host)
  .option("-a, --api_key <api_key>", "api key", config.api_key)
  .version("1.0.0");

program
  .command("translate")
  .description('Takes a file and translates it')
  .requiredOption("-i, --input <path>", "input file path")
  .option("--input-lang <lang>", "input language", config.input_lang)
  .option("--output-lang <lang>", "output language", config.output_lang)
  .option("-o, --output <path>", "output file path")
  .action((options) => {
    config.host = program.opts().host;
    config.api_key = program.opts().api_key;
    config.input_lang = options?.inputLang;
    config.output_lang = options?.outputLang;

    const input = options.input;
    const output = options?.output || (
      input.replace(/(\.[^.]+)$/, `.${config.output_lang}$1`) +
        (/\.[^.]+$/.test(input) ? "" : `.${config.output_lang}`)
    );

    translate(input, output).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program
  .command("languages")
  .description('List all available languages')
  .action(() => languages().catch((err) => {
    config.host = program.opts().host;
    config.api_key = program.opts().api_key;

    console.error(err);
    process.exit(1);
  }));

program
  .command("detect")
  .description('Detect the language of a text')
  .requiredOption("-i, --input <path>", "input file path")
  .action((options) => {
    config.host = program.opts().host;
    config.api_key = program.opts().api_key;

    const input = options.input;

    detect(input).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.parse();
