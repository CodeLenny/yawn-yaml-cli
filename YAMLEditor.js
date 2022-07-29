const Promise = require("bluebird");
Promise.defer = require("defer-promise");
const fs = Promise.promisifyAll(require("fs"));
const YAWN = require("yawn-yaml/cjs");
const get = require("lodash.get");
const set = require("lodash.set");

function staticGetDefault(_this, name, defaultValue) {
  return typeof _this[`_${name}`] === "undefined" ? defaultValue : _this[`_${name}`];
}

function staticSetBoolean(_this, name, val) {
  if(val !== true && val !== false) {
    throw new TypeError(`YAMLEditor.${name} must be a boolean.`);
  }
  _this[`_${name}`] = val;
}

/**
 * Reads and modifies YAML files preserving comments and styling.
*/
class YAMLEditor {

  /**
   * If `true`, file reads will be cached.
   * Required to be `true` if a file is changed multiple times simultaneously.
   * Defaults to `true`.
   * @type {boolean}
  */
  static get cache() { return staticGetDefault(this, "cache", true); }

  static set cache(val) { return staticSetBoolean(this, "cache", val); }

  /**
   * If `true`, referencing an undefined path in a file will throw a {@link ReferenceError}.
   * If `false`, referencing an undefined path will return `undefined` (the default for `lodash.get`).
   * Defaults to `false`.
   * @type {boolean}
   * @example <caption>With `referenceFatal=true`</caption>
   * require("fs").writeFileSync("test.yaml", "");
   * let username = "bob";
   * YAMLEditor.get("test.yaml", `users.${username}.name`)
   *   .catch(ReferenceError, => { console.log(`${username}` not found.)});
   * @example <caption>With `referenceFatal=false` (default)</caption>
   * require("fs").writeFileSync("test.yaml", "");
   * let username = "bob";
   * YAMLEditor.get("test.yaml", `users.${username}.name`)
   *   .then(name => console.log("Bob's name is " + name)); // => "Bob's name is undefined"
  */
  static get referenceFatal() { return staticGetDefault(this, "referenceFatal", false); }

  static set referenceFatal(val) { return staticSetBoolean(this, "referenceFatal", val); }

  /**
   * If `true`, the YAML file will be saved whenever the contents have been altered.
   * Otherwise, {@link YAMLEditor.save} needs to be called after all changes have been made.
   * @type {boolean}
   * @example <caption>With `autosave=true` (default)</caption>
   * YAMLEditor.set("test.yaml", "newkey", "newvalue").then(() => console.log("Updated test.yaml"))
   * @example <caption>With `autosave=false`</caption>
   * YAMLEditor.autosave = false;
   * YAMLEditor.cache = true; // cache is required if file is being changed simultaneously.
   * Promise.all([
   *   YAMLEditor.set("test.yaml", "key1", "foo"),
   *   YAMLEditor.set("test.yaml", "key2", "bar"),
   * ]).then(=> {
   *   // `test.yaml` hasn't been changed on the file system yet.  Changes have been saved inside YAMLEditor's cache.
   *   YAMLEditor.save("test.yaml");
   * }).then(() => console.log("Updated test.yaml"));
  */
  static get autosave() { return staticGetDefault(this, "autosave", true); }

  static set autosave(val) { return staticSetBoolean(this, "autosave", val); }

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
      return this._cached[file].promise;
    }
    if(this.cache) {
      if(!this._cached) { this._cached = {}; }
      this._cached[file] = Promise.defer();
    }
    return fs.readFileAsync(file, "utf8")
      .then(yaml => new YAWN(yaml))
      .catch(err => {
        if(this.defaultFile !== null) { return this.defaultFile; }
        throw err;
      })
      .then(obj => {
        if(this.cache) { this._cached[file].resolve(obj); }
        return obj;
      })
      .catch(err => {
        if(this.cache) { this._cached[file].reject(err); }
        throw err;
      });
  }

  /**
   * Save the given file using YAWN.
   * @param {String} path the path to the YAML file.  Given to `fs.writeFile`.
   * @param {String} yaml the YAML contents as a string.  If not provided, YAMLEditor's internal cache will be tried.
   * @param {Boolean} automatic Flag to determine if `save` is being explicitly, or being called to autosave the file
   *   after making a change.  Internal methods should set the flag to `true`.  Otherwise, the flag defaults to `false`.
   * @return {Promise} resolves when the file has been saved.
  */
  static save(path, yaml, automatic) {
    if(automatic && !this.autosave) { return Promise.resolve(); }
    if(!yaml && this._cached && this._cached[path] && this._cached[path].promise) {
      yaml = this._cached[path].promise.then(yawn => yawn.yaml);
    }
    if(!yaml) {
      return Promise.reject(
        new ReferenceError("No contents given to YAMLEditor.save for file "+path+", and the file isn't cached.")
      );
    }
    return Promise
      .resolve(yaml)
      .then(str => fs.writeFileAsync(path, str));
  }

  /**
   * Get a value from a YAML file.
   * @param {String} file the path to a YAML file.  Given to `fs.readFile`.
   * @param {String} path the path to the desired value inside the YAML file.  Uses `lodash.get` syntax.
   * @return {Promise<Any>} resolves to the value requested from the YAML file.
  */
  static get(file, path) {
    return this.load(file)
      .then(loaded => path ? get(loaded.json, path) : loaded.json)
      .then(val => {
        if(val === undefined && this.referenceFatal) {
          throw new ReferenceError("YAML file " + file + " doens't include" + path + ".");
        }
        return val;
      });
  }

  /**
   * Set a value in a YAML file.
   * @param {String} file the path to a YAML file.  Given to `fs.readFile`.
   * @param {String} path the path to insert the desired value inside the YAML file.  Uses `lodash.set` syntax.
   * @param {Any} val the value to insert
   * @return {Promise} resolves when the value has been inserted.
  */
  static set(file, path, val) {
    let contents = null;
    return this.load(file)
      .then(loaded => contents = loaded)
      .then(() => {
        if(path !== "") {
          let json = contents.json;
          set(json, path, val);
          contents.json = json;
        }
        else {
          contents.json = null;
          contents.json = val;
        }
        return this.save(file, contents.yaml, true);
      });
  }

  /**
   * Add a value to an array in a YAML file.
   * If an array with the given path doesn't exist, an empty array will be created.
   * @param {String} file the path to a YAML file.  Given to `fs.readFile`.
   * @param {String} path the path to an array inside the YAML file.  Uses `lodash.get`/`lodash.set` syntax.
   * @param {Any} val the value to insert into the specified array.
   * @return {Promise} resolves when the value has been inserted.
  */
  static push(file, path, val) {
    let contents = null;
    return this.load(file)
      .then(loaded => contents = loaded)
      .then(() => {
        let json = contents.json;
        let array = get(json, path);
        if(array === undefined) { array = []; set(json, path, array); }
        array.push(val);
        contents.json = json;
        return this.save(file, contents.yaml, true);
      });
  }

}

module.exports = YAMLEditor;
