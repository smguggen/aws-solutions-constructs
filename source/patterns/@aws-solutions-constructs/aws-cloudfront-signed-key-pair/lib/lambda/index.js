const {SecureSiteStack} = require('.');
const {SignedKeyPair} = require('../keypair');
const {SSM, CloudFront} = require('aws-sdk');
exports.SecureSiteStack = SecureSiteStack;
exports.SignedKeyPair = SignedKeyPair;
const ssm = new SSM();
exports.signedUrl = function signedUrl(event,context,callback) {
    const req = event.Records[0].cf.request;
    const res = event.Records[0].cf.response;
    const response = res || req;
    ssm.getParameters({
        Names:['SignedKeyPairPaths', 'Signed']
    }, (err,data) => {
        if (err) throw new Error(err);
        const signedKeys = JSON.parse(data.Parameter.Value);
        const props = signedKeys.find(key => key.path === request.uri);
        if (!props) return callback(null,response);
        const signedKey = new SignedKeyPair(props);
        const value = SecureSiteStack.getSignedUrl(signedKey);
        return callback(null, {
            status:302,
            headers: {
                location: [{
                    key: "Location",
                    value
                }]
            }
        });
    });
}

exports.signedCookies = function signedCookies(event,context,callback) {
    const req = event.Records[0].cf.request;
    const res = event.Records[0].cf.response;
    const response = res || req;
    ssm.getParameter({
        Name:'SignedKeyPairPaths'
    }, (err,data) => {
        if (err) throw new Error(err);
        const signedKeys = JSON.parse(data.Parameter.Value);
        const props = signedKeys.find(key => key.path === request.uri);
        if (!props) return callback(null,response);
        const signedKey = new SignedKeyPair(props);
        const cookies = $this.getEdgeLambdaSignedCookieHeaders(signedKey);
        const headers = response.headers;
        if (!headers['set-cookie']) headers['set-cookie'] = [];
        headers['set-cookie'] = headers['set-cookie'].concat(cookies['set-cookie']);
    })
}