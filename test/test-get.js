const chai = require("chai");
const should = chai.should();
const YAMLEditor = require("../YAMLEditor");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const yaml = require("js-yaml");
const jsc = require("jsverify");
const tmp = require("tmp-promise");
const _get = require("lodash.get");
const _set = require("lodash.set");

/**
 * An alphanumeric string.
 * @return {Arbitrary<String>} the generated string.
*/
function alphaNumericString() {
  let alpha = "abcdefghijklmnopqrstuvwxyz";
  let digits = "0123456789";
  let validChars = alpha.toLowerCase() + alpha.toUpperCase() + digits;
  return jsc.bless({
    generator: (size) => {
      let count = jsc.random(1, size);
      let out = "";
      for(let i = 0; i < count; i++) {
        out += validChars[jsc.random(0, validChars.length - 1)];
      }
      return out;
    },
    shrink: function(str) {
      return str.slice(0, Math.max(1, str.length / 2));
    },
  });
}

const simpleArray = {
  foo: { bar: { baz: 1 } },
  test: "asdf"
}

describe("YAMLEditor.get", function() {

  describe("reading keys from a written file", function() {
    let tested = 0;
    let needed = 40;
    let fails = { parentObj: 0, badData: 0, yamlFail: 0, badYAML: 0};

    this.timeout(10 * 1000);

    jsc.property("should return the written key",
      jsc.constant({}), //jsc.json
      jsc.nearray(jsc.oneof(jsc.nat, alphaNumericString())),
      jsc.oneof(jsc.number, alphaNumericString(), jsc.constant(simpleArray)), // jsc.json
      function(obj, path, data) {
        obj = Object.create(obj);
        if(!obj || typeof obj !== "object" || Array.isArray(obj)) { ++fails.parentObj; return true; }
        if(!data) { ++fails.badData; return true; }
        if(typeof path[0] === "number") { path = ["foobar", ...path]; }
        // _set({}, ["a", 12], 1) will create an array with 12 undefined entries, which get collapsed in YAML.
        // To prevent this, prefix all numbers with digits.  However, this does prevent arrays from being tested.
        path = path.map(i => "a"+i);
        let tmpFile = null;
        _set(obj, path, data);
        data.should.deep.equal(_get(obj, path), "Data should be inserted into the object");
        let yamlString = null;
        try {
          yamlString = yaml.safeDump(obj, { skipInvalid: true });
          if(!yamlString || yamlString.length < 1) { ++fails.badYAML; return true; }
        } catch (e) {
          ++fails.yamlFail;
          return true;
        }
        data.should.deep.equal(_get(yaml.safeLoad(yamlString), path), "The created YAML should be parseable.");
        ++tested;
        return Promise
          .resolve(tmp.file())
          .then(o => tmpFile = o)
          .then(() => fs.writeFileAsync(tmpFile.path, yamlString))
          .then(() => YAMLEditor.get(tmpFile.path, path))
          .then(val => data.should.deep.equal(val, "Value read from file should match data inserted"))
          .finally(() => tmpFile.cleanup())
          .then(() => true);
      }
    );

    it("should run at least "+needed+" valid test cases", function() {
      if(tested <= needed) {
        console.log(`Failures:
          ${fails.parentObj}  Invalid parent object
          ${fails.badData}  Invalid inserted data
          ${fails.yamlFail}  YAML stringify failed
          ${fails.badYAML}  YAML stringify returned bad data`);
      }
      tested.should.be.above(needed);
    });

  });

});
