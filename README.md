# BUILD

```sh
npx esbuild main.js --bundle --platform=node --format=cjs --outfile=bundle.cjs
node --build-sea sea-config.json
```

*OR*

```sh
bun build main.js --compile --outfile libretranslate-helper
```

# INSTALL

```sh
install -Dm755 libretranslate-helper ~/.local/bin/libretranslate-helper
```

# USAGE

```
Usage: libretranslate-helper [options] [command]

CLI helper for LibreTranslate

Options:
  -u, --allow-unauthorized          Allow unauthorized SSL connections (default: false)
  -h, --host <host>                 proto://host:port (default: "http://127.0.0.1:5000")
  -a, --api_key <api_key>           api key (default: "")
  -V, --version                     output the version number
  --help                            display help for command

Commands:
  translate [options] <input>       Takes a text and translates it
  translate-file [options] <input>  Takes a file and translates it
  languages                         List all available languages
  detect [options]                  Detect the language of a text
  help [command]                    display help for command
```
