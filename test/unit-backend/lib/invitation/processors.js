const sinon = require('sinon');
const { expect } = require('chai');

describe('The processors email module', function() {
  let module;

  describe('The process function', function() {
    beforeEach(function() {
      module = require(this.moduleHelpers.backendPath + '/lib/invitation/processors')(this.moduleHelpers.dependencies);
    });

    it('should run the processors in waterfall', function(done) {
      const method = 'reply';
      const ics = 'A';

      const handler1 = sinon.spy(ics => Promise.resolve({ ics: ics.ics + 'B' }));
      const handler2 = sinon.spy(ics => Promise.resolve({ ics: ics.ics + 'C' }));
      const handler3 = sinon.spy(ics => Promise.resolve({ ics: ics.ics + 'D' }));

      module.register([method], handler1);
      module.register([method], handler2);
      module.register([method], handler3);

      module.process(method, { ics })
        .then(result => {
          expect(result).to.deep.equals({ ics: 'ABCD' });
          expect(handler1).to.have.been.calledWith({ ics: 'A' });
          expect(handler2).to.have.been.calledWith({ ics: 'AB' });
          expect(handler3).to.have.been.calledWith({ ics: 'ABC' });
          expect(handler3).to.have.been.calledAfter(handler2);
          expect(handler2).to.have.been.calledAfter(handler1);
          done();
        })
        .catch(done);
    });

    it('should resolve with initial value when a processor rejects', function(done) {
      const method = 'reply';
      const ics = 'A';

      const handler1 = sinon.spy(ics => Promise.resolve({ ics: ics.ics + 'B' }));
      const handler2 = sinon.spy(() => Promise.reject(new Error('I failed')));
      const handler3 = sinon.spy(ics => Promise.resolve({ ics: ics.ics + 'D' }));

      module.register([method], handler1);
      module.register([method], handler2);
      module.register([method], handler3);

      module.process(method, { ics })
        .then(result => {
          expect(result).to.deep.equals({ ics: 'A' });
          expect(handler1).to.have.been.calledWith({ ics: 'A' });
          expect(handler2).to.have.been.calledWith({ ics: 'AB' });
          expect(handler3).to.not.have.been.called;
          expect(handler2).to.have.been.calledAfter(handler1);
          done();
        })
        .catch(done);
    });

    it('should only call processors for given method', function(done) {
      const method = 'reply';
      const handler1 = sinon.spy(() => Promise.resolve());
      const handler2 = sinon.spy(() => Promise.resolve());
      const handler3 = sinon.spy(() => Promise.resolve());

      module.register([method], handler1);
      module.register(['anothermethod'], handler2);
      module.register([method], handler3);

      module.process(method)
        .then(() => {
          expect(handler1).to.have.been.called;
          expect(handler2).to.not.have.been.called;
          expect(handler3).to.have.been.called;
          expect(handler3).to.have.been.calledAfter(handler1);
          done();
        })
        .catch(done);
    });

    it('should not fail when no processors are set', function(done) {
      const method = 'reply';

      module.process(method)
        .then(() => {
          done();
        })
        .catch(done);
    });
  });
});
