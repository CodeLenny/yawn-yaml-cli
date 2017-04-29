const chai = require("chai");
const should = chai.should();
const YAMLEditor = require("../YAMLEditor");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const yaml = require("js-yaml");
const jsc = require("jsverify");
const tmp = require("tmp-promise");

describe("YAMLEditor.load", function() {

  describe("writing and reading YAML files", function() {
    let tested = 0;
    let needed = 40;

    jsc.property("should return the written data", jsc.json, function(obj) {
      if(!obj || typeof obj !== "object") { return true; }
      ++tested;
      let tmpFile = null;
      let yamlString = yaml.safeDump(obj);
      return Promise
        .resolve(tmp.file())
        .then(o => tmpFile = o)
        .then(() => fs.writeFileAsync(tmpFile.path, yamlString))
        .then(() => YAMLEditor.load(tmpFile.path))
        .then(loaded => {
          loaded.json.should.deep.equal(obj);
          loaded.yaml.should.equal(yamlString);
        })
        .finally(() => tmpFile.cleanup())
        .then(() => true);
    });

    it("should run at least "+needed+" valid test cases", function() {
      tested.should.be.above(needed);
    });

  });

});
