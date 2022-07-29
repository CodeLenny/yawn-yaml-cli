const chai = require("chai");
const should = chai.should();
const YAMLEditor = require("../YAMLEditor");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const yaml = require("js-yaml");
const jsc = require("jsverify");
const tmp = require("tmp-promise");

describe("YAMLEditor.set()", function() {

  let tmpFile = null;
  let yamlString = null;

  beforeEach(function() {
    yamlString = yaml.dump({
      foo: { bar: { baz: 1 } },
      list: ["a", "b"],
      test: "asdf",
    });
    return tmp.file()
      .then(o => tmpFile = o)
      .then(() => fs.writeFileAsync(tmpFile.path, yamlString));
  });

  afterEach(function() {
    return tmpFile.cleanup();
  });

  it("should add new values to objects in the file", function() {
    return YAMLEditor
      .set(tmpFile.path, "foo.bar.baz2", 2)
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.load)
      .then(obj => {
        obj.should.have.property("foo");
        obj.foo.bar.should.have.property("baz2", 2, "Changed value should be set in file");
      });
  });

  it("should add new top-level entries to the file", function() {
    return YAMLEditor
      .set(tmpFile.path, "test2", "foobar")
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.load)
      .then(obj => {
        obj.should.have.property("foo");
        obj.should.have.property("test");
        obj.should.have.property("test2", "foobar");
      });
  });

  it("should replace the entire file", function() {
    return YAMLEditor
      .set(tmpFile.path, "", { test2: "foobar" })
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.load)
      .then(obj => {
        obj.should.not.have.property("foo");
        obj.should.not.have.property("test");
        obj.should.have.property("test2", "foobar");
      });
  });

  it("should mutate values inside the file", function() {
    return YAMLEditor
      .set(tmpFile.path, "foo.bar.baz", 2)
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.load)
      .then(obj => {
        obj.should.have.property("foo");
        obj.foo.bar.should.have.property("baz", 2, "Changed value should be set in file");
      });
  });

  it("should add values to arrays", function() {
    return YAMLEditor
      .set(tmpFile.path, "list[2]", "c")
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.load)
      .then(obj => {
        obj.should.have.property("list");
        obj.list.should.be.an.array;
        obj.list.length.should.equal(3);
        obj.list[2].should.equal("c");
      });
  });

  it.skip("should compact missing array entries", function() {
    return YAMLEditor
      .set(tmpFile.path, "list[5]", "e")
      .then(() => fs.readFileAsync(tmpFile.path, "utf8"))
      .then(yaml.load)
      .then(obj => {
        obj.should.have.property("list");
        obj.list.should.be.an.array;
        obj.list.length.should.equal(3);
        obj.list[2].should.equal("e");
      });
  });

});
