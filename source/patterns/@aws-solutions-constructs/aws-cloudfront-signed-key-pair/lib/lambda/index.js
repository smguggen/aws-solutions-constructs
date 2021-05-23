const {SignedKeyPair} = '../keypair';
exports.SignedKeyPair = SignedKeyPair;

exports.signedUrl = function signedUrl(event,context,callback) {
        const req = event.Records[0].cf.request;
        const res = event.Records[0].cf.response;
        const response = res || req;
        const props = $this.signedKeys.find(key => key.path === request.uri);
        if (!props) return callback(null,response);
        const signedKey = new SignedKeyPair(props);
        const value = $this.getSignedUrl(signedKey);
        return callback(null, {
            status:302,
            headers: {
                location: [{
                    key: "Location",
                    value
                }]
            }
        });
}

exports.signedCookies = function signedCookies(event,context,callback) {
    const req = event.Records[0].cf.request;
    const res = event.Records[0].cf.response;
    const response = res || req;
    const props = $this.signedKeys.find(key => key.path === request.uri);
    if (!props) return callback(null,response);
    const signedKey = new SignedKeyPair(props);
    const cookies = $this.getEdgeLambdaSignedCookieHeaders(signedKey);
    const headers = response.headers;
    if (!headers['set-cookie']) headers['set-cookie'] = [];
    headers['set-cookie'] = headers['set-cookie'].concat(cookies['set-cookie']);
}