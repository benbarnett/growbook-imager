const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chai = require('chai');
const proxyquire = require('proxyquire');
const fs = require('fs');

chai.use(sinonChai);
const expect = chai.expect

const imageData = fs.readFileSync('./fixtures/image.jpg');
const getObjectStub = sinon.stub().returns({ 
  promise: () => Promise.resolve({ Body: imageData }) 
});
const putObjectStub = sinon.stub().returns({
  promise: () => Promise.resolve()
});
const s3Stub = {
  getObject: getObjectStub,
  putObject: putObjectStub
};

const Sharp = require('sharp');
const resizeSpy = sinon.spy(Sharp.prototype, 'resize');
const extractSpy = sinon.spy(Sharp.prototype, 'extract');

const index = proxyquire('./index', {
  'aws-sdk': {'S3': sinon.stub().returns(s3Stub)},
  'sharp': Sharp
});

const fakeEvent = props => ({
  queryStringParameters: Object.assign({
    bucket: 'growbook-test-bucket',
    url: 'http://growbook.s3.com',
    key: 'test-key'
  }, props)
})

const callHandler = (props = {}, cb) => index.handler(fakeEvent(props), null, cb);

describe('#Growbook Image Service', () => {
  afterEach(() => {
    getObjectStub.resetHistory();
    putObjectStub.resetHistory();
  });
  
  it('calls S3.getObject with the given key and bucket', function(done) {
    callHandler({ key: 'w_500/test' }, function() {
      expect(getObjectStub).to.have.been.calledWithMatch({Bucket: 'growbook-test-bucket', Key: 'test'})
      done();
    });
  });
  
  it('returns a 301 to the supplied URL with key', function(done) {
    callHandler({ key: 'w_500/test' }, function(err, data) {
      process.nextTick(function() {
        expect(data).to.deep.include({
          statusCode: '301',
          headers: {'location': `http://growbook.s3.com/w_500/test`}
        });
        done();
      });
    });
  });

  it('resizes according to url params', function(done) {
    callHandler({ key: 'w_500/h_20/test'}, function(err, data) {
      process.nextTick(function() {
        process.nextTick(function() {
          expect(resizeSpy).to.have.been.calledWith(500, 20);
          done();
        });
      });
    });
  });

  it('crops according to url params', function(done) {
    callHandler({ key: 'c_50,50,10,10/test'}, function(err, data) {
      process.nextTick(function() {
        expect(extractSpy).to.have.been.calledWith({
          left: 250,
          top: 166.5,
          width: 50,
          height: 50
        });
        done();
      });
    });
  });

  it('resizes and crops according to url params', function(done) {
    callHandler({ key: 'c_50,50,10,10/w_500/h_20/test'}, function(err, data) {
      process.nextTick(function() {
        process.nextTick(function() {
          expect(resizeSpy).to.have.been.calledWith(500, 20);
          expect(extractSpy).to.have.been.calledWith({
            left: 250,
            top: 166.5,
            width: 50,
            height: 50
          });
          done();
        });
      });
    });
  });
});
