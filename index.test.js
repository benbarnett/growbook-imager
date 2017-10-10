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

const index = proxyquire('./index', {
    'aws-sdk': {'S3': sinon.stub().returns(s3Stub)}
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
});
