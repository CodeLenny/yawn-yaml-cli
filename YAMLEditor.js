const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const YAWN = require("./YAWN");
const get = require("lodash.get");

function staticGetDefault(_this, name, defaultValue) {
  return typeof _this[`_${name}`] === "undefined" ? defaultValue : _this[`_${name}`];
}

function staticSetBoolean(_this, name, val) {
  if(val !== true && val !== false) {
    throw new TypeError(`YAMLEditor.${name} must be a boolean.`);
  }
  _this[`_${name}`] = val;
}

class YAMLEditor {

  /**
   * If `true`, file reads will be cached.  Defaults to `true`.
   * @type {boolean}
  */
  static get cache() { return staticGetDefault(this, "cache", true); }

  static set cache(val) { return staticSetBoolean(this, "cache", val); }

  /**
   * If `true`, referencing an undefined path in a file will throw a {@link ReferenceError}.
   * Defaults to `false`.
   * @type {boolean}
  */
  static get referenceFatal() { return staticGetDefault(this, "referenceFatal", false); }

  static set referenceFatal(val) { return staticSetBoolean(this, "referenceFatal", val); }

  /**
   * If `null`, reading a non-existant file will throw an error (as normal).
   * Otherwise, reading a non-existant file will return this default object (e.g. `{}`).
   * @type {null|Object}
  */
  static get defaultFile() { return staticGetDefault(this, "defaultFile", null); }

  static set defaultFile(val) {
    if(val !== null && typeof val !== "object") {
      throw new TypeError("YAMLEditor.defaultFile must be 'null' or an Object.");
    }
    this._defaultFile = val;
  }

  /**
   * Load the given file using YAWN.
   * @param {String} file the path to a YAML file.  Given to `fs.readFile`.
   * @return {Promise<YAWN>} resolves to a YAWN instance
  */
  static load(file) {
    if(this.cache && this._cached && this._cached[file]) {
      return this._cached[file];
    }
    return fs.readFileAsync(file, "utf8")
      .then(yaml => new YAWN(yaml))
      .catch(err => {
        if(this.defaultFile !== null) {
          return this.defaultFile;
        }
        throw err;
      })
      .then(obj => {
        if(this.cache) {
          if(!this._cached) { this._cached = {}; }
          this._cached[file] = obj;
        }
        return obj;
      });
  }

  /**
   * Get a value from a YAML file.
   * @param {String} file the path to a YAML file.  Given to `fs.readFile`.
   * @return {Promise<Any>} resolves to the value requested from the YAML file.
  */
  static get(file, path) {
    return this.load(file)
      .then(loaded => get(loaded.json, path))
      .then(val => {
        if(val === undefined && this.referenceFatal) {
          throw new ReferenceError("YAML file " + file + " doens't include" + path + ".");
        }
        return val;
      });
  }

}

module.exports = YAMLEditor;
