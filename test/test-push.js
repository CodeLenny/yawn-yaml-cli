const chai = require("chai");
const should = chai.should();
const YAMLEditor = require("../YAMLEditor");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const yaml = require("js-yaml");
const jsc = require("jsverify");
const tmp = require("tmp-promise");

describe("YAMLEditor.push()", function() {

  let tmpFile = null;
  let yamlString = null;

  beforeEach(function() {
    yamlString = yaml.safeDump({
      list: ["a", "b"],
    });
    return tmp.file()
      .then(o => tmpFile = o)
      .then(() => fs.writeFileAsync(tmpFile.path, yamlString));
  });

  afterEach(function() {
    return tmpFile.cleanup();
  });

  it("should add new entries to an existing array", function() {
    return YAMLEditor
      .push(tmpFile.path, "list", "c")
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.safeLoad)
      .then(obj => {
        obj.should.have.property("list");
        obj.list.should.be.an.array;
        obj.list.length.should.equal(3);
        obj.list[2].should.equal("c");
      });
  });

  it("should create non-existant arrays", function() {
    return YAMLEditor
      .push(tmpFile.path, "list2", "1")
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.safeLoad)
      .then(obj => {
        obj.should.have.property("list");
        obj.should.have.property("list2");
        obj.list2.should.be.an.array;
        obj.list2.length.should.equal(1);
        obj.list2[0].should.equal("1");
      });
  })

});
