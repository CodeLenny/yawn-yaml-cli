const chai = require("chai");
const should = chai.should();
const YAMLEditor = require("../YAMLEditor");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const yaml = require("js-yaml");
const jsc = require("jsverify");
const tmp = require("tmp-promise");

describe("YAMLEditor.load() then YAMLEditor.save()", function() {

  let tmpFile = null;
  let yamlString = null;

  beforeEach(function() {
    yamlString = yaml.dump({
      foo: { bar: { baz: 1 } },
      test: "asdf",
    });
    return tmp.file()
      .then(o => tmpFile = o)
      .then(() => fs.writeFileAsync(tmpFile.path, yamlString));
  });

  afterEach(function() {
    return tmpFile.cleanup();
  });

  it("saves changes to the file", function() {
    return YAMLEditor.load(tmpFile.path)
      .then(yawn => {
        json = yawn.json;
        json.foo.bar.baz2 = 2;
        yawn.json = json;
        yawn.json.foo.bar.should.have.property("baz2", 2, "JSON value should be settable");
        return YAMLEditor.save(tmpFile.path, yawn.yaml);
      })
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.load)
      .then(obj => {
        obj.should.have.property("foo");
        obj.foo.bar.should.have.property("baz2", 2, "Changed value should be set in file");
      });
  });

});
