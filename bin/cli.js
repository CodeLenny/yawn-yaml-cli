#!/usr/bin/env node

const cli = require("commander");
const pkg = require(`${__dirname}/../package.json`);
const YAMLEditor = require(`${__dirname}/../YAMLEditor`);
const yaml = require("js-yaml");

cli.version(pkg.version);

cli
  .option("--reference-fatal", "Throw an error if requesting an undefined key in a file.")
  .option("--catch-missing-file", "Recovers when reading or writing a non-existant file by creating an empty file.")

/**
 * Pass options to YAMLEditor.
*/
function setOptions() {
  if(cli.referenceFatal) { YAMLEditor.referenceFatal = true; }
  if(cli.catchMissingFile) { YAMLEditor.defaultFile = {}; }
}

cli
  .option("-O, --format <format>", "Specify the output format: [fancy, json, y(a)ml]  (default: fancy)",
    /^(fancy|json|ya?ml)$/i)

function output(val) {
  if(!cli.format || /^fancy$/i.test(cli.format)) {
    if(Array.isArray(val)) { console.log(val.join("\n")); }
    else if(typeof val === "object") {
      try { console.log(yaml.safeDump(val).trim()); } catch (e) {
        console.error("Error writing YAML to console: "+e.message);
        console.log(val);
        process.exit(1);
      }
    }
    else { console.log(val.toString()); }
  }
  else if(/^ya?ml$/i.test(cli.format)) {
    try { console.log(yaml.safeDump(val).trim()); } catch (e) {
      console.error("Error writing YAML to console: "+e.message);
      process.exit(2);
    }
  }
  else if(/^json$/i.test(cli.format)) {
    try { console.log(JSON.stringify(val)); } catch (e) {
      console.log("Error writing JSON to console: "+e.message);
      process.exit(2);
    }
  }
  else {
    console.log("Unknown output format: "+cli.format);
    process.exit(1);
  }
}

cli
  .command("get <file> [path]")
  .description("Get the contents of a YAML file")
  .action((file, path) => {
    YAMLEditor.get(file, path)
      .then(output)
      .catch(err => {
        console.error(err.stack);
        process.exit(3);
      });
  });

cli
  .command("set <file> [path] <value>")
  .description("Set a key in a YAML file")
  .action((file, path, value) => {
    return YAMLEditor.set(file, path, value)
      .catch(err => {
        console.error(err.stack);
        process.exit(3);
      });
  });

cli
  .command("push <file> <path> <value>")
  .description("Push a value to an array in a YAML file")
  .action((file, path, value) => {
    return YAMLEditor.push(file, path, value)
      .catch(err => {
        console.error(err.stack);
        process.exit(3);
      });
  });

cli.parse(process.argv);
