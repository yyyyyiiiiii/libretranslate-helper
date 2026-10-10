import fs from "node:fs";
import { Agent } from "undici";
import { program } from "commander";
import envPaths from "env-paths";
import { fileTypeFromFile } from "file-type";

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

let dispatcher = {};

async function languages() {
  const res = await fetch(`${config.host}/languages`, {
    dispatcher,
    method: "GET",
  });

  const result = await res.json();
  console.log(result);
}

async function translate(input) {
  const res = await fetch(`${config.host}/translate`, {
    dispatcher,
	  method: "POST",
	  body: JSON.stringify({
		  q: input,
		  source: config.input_lang,
		  target: config.output_lang,
		  format: "text",
		  alternatives: 3,
		  api_key: config.api_key
	  }),
	  headers: { "Content-Type": "application/json" }
  });

  const result = await res.json();
  return result.translatedText;
}

async function translate_file(input, output) {
  const type = await fileTypeFromFile(input);
  const data = fs.readFileSync(input);
  const file = new Blob([data], { type: type?.mime || "text/plain" });
  const form = new FormData();
  form.append("file", file, input);
  form.append("source", config.input_lang);
  form.append("target", config.output_lang);
  form.append("api_key", config.api_key);

  let res = await fetch(`${config.host}/translate_file`, {
    dispatcher,
	  method: "POST",
	  body: form
  });

  const result = await res.json();

  if (result?.error) {
    throw new Error(result.error);
  }

  const translatedFileUrl = (config.host +
    result.translatedFileUrl.slice(result.translatedFileUrl.indexOf("/download_file")));

  res = await fetch(`${translatedFileUrl}`, { dispatcher });

  if (!res.ok) {
    throw new Error(`Failed to download translated file: ${res.status} ${res.statusText}`);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(output, bytes);
}

async function detect(input) {
  const res = await fetch(`${config.host}/detect`, {
    dispatcher,
	  method: "POST",
	  body: JSON.stringify({
		  q: input,
		  api_key: config.api_key
	  }),
	  headers: { "Content-Type": "application/json" }
  });

  const result = await res.json();
  console.log(result);
}

const preset = () => {
  config.host = program.opts().host;
  config.api_key = program.opts().api_key;
  dispatcher = new Agent({
    headersTimeout: 0,
    bodyTimeout: 0,
    connect: { rejectUnauthorized: !program.opts().allowUnauthorized },
  });
}

program
  .name("libretranslate-helper")
  .description("CLI helper for LibreTranslate")
  .option("-u, --allow-unauthorized", "Allow unauthorized SSL connections", false)
  .option("-h, --host <host>", "proto://host:port", config.host)
  .option("-a, --api_key <api_key>", "api key", config.api_key)
  .version("1.0.0");

const command_translate = program
  .command("translate")
  .description('Takes an input and translates it');

command_translate
  .command("text")
  .description('Takes a text and translates it')
  .requiredOption("-i, --input <path>", "input")
  .option("--input-lang <lang>", "input language", config.input_lang)
  .option("--output-lang <lang>", "output language", config.output_lang)
  .action((options) => {
    preset();
    config.input_lang = options?.inputLang;
    config.output_lang = options?.outputLang;

    const input = options.input;

    translate(input)
      .then((result) => {
        console.log(result);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

command_translate
  .command("file")
  .description('Takes a file and translates it')
  .requiredOption("-i, --input <path>", "input file path")
  .option("--input-lang <lang>", "input language", config.input_lang)
  .option("--output-lang <lang>", "output language", config.output_lang)
  .option("-o, --output <path>", "output file path")
  .action((options) => {
    preset();
    config.input_lang = options?.inputLang;
    config.output_lang = options?.outputLang;

    const input = options.input;
    const output = options?.output || (
      input.replace(/(\.[^.]+)$/, `.${config.output_lang}$1`) +
        (/\.[^.]+$/.test(input) ? "" : `.${config.output_lang}`)
    );

    translate_file(input, output).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program
  .command("languages")
  .description('List all available languages')
  .action(() => {
    preset();
    languages().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program
  .command("detect")
  .description('Detect the language of a text')
  .option("-t, --text <text>", "input text")
  .option("-f, --file <file>", "input file")
  .action((options) => {
    preset();

    const text = options?.text;
    const file = options?.file;

    if (!text && !file) {
      console.error("Provide either --text or --file option");
      process.exit(1);
    }

    if (!!text) {
      detect(text).catch((err) => {
        console.error(err);
        process.exit(1);
      });
    }

    if (!file)
      return;

    let data = "";
    try {
      data = fs.readFileSync(file, "utf8");
    } catch (err) {
      console.error(err);
      process.exit(1);
    }

    detect(data).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.parse();
