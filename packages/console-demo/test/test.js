const assert = require('chai').assert;
const should = require('chai').should();
const demo = require('../index');


//var assert = require('assert');
describe('Demo', function() {
  describe('#initTree()', function() {
    it('initial tree state as saved', function() {
      demo.initTree();
      demo.Tree.isAlive.should.equal(true);
      demo.Tree.norm.should.equal(1);
      demo.Tree.deadPruned.should.equal(0);
      // demo.Tree.h2oTil.should.equal(0);
    });
  });
  describe('#idle1hr()', function() {
    it('after 1 hour', function() {
      demo.initTree();
      demo.idle1hr();
      demo.Ctx.time.should.equal(3600);
      // demo.Tree.h2oTil.should.equal(0);
    });
  });
  describe('#idle1hr - water to force updateBranches', function() {
    it('should update branches after 1h', function() {
      demo.initTree();
      demo.idle1hr();
      demo.water();
      console.log(demo.Tree);
      demo.printHead();
      demo.printTree();
      demo.Tree.norm.should.be.gt(2);
      demo.Tree.weak.should.equal(0.06406400000000001);
      demo.Tree.h2oTil.should.equal(11190.0413952);
    });
  });
});
