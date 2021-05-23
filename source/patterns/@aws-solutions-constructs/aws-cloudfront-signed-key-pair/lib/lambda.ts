import {SecureSiteType} from '.';
import {SignedKeyPair} from './keypair';
export {SecureSiteType,SignedKeyPair};

export function handler(event,context,callback) {
        const request = event.Records[0].cf.request;
        const response = event.Records[0].cf.response;
        const props = $this.signedKeys.find(key => key.path === request.uri);
        if (!props) return callback(null,response);
        const signedKey = $this.getSignedKey(props);
        if ($this.props.type === SecureSiteType.SIGNED_URL) {
            response.status = 302;
            const value = $this.getSignedUrl(signedKey);
            const headers = response.headers;
            headers.location = [{
                key: 'Location',
                value
            }]
        } else {
            const cookies = $this.getEdgeLambdaSignedCookieHeaders(signedKey);
            const headers = response.headers;
            if (!headers['set-cookie']) headers['set-cookie'] = [];
            headers['set-cookie'] = headers['set-cookie'].concat(cookies['set-cookie']);
        }
        return callback(null, response);
    }
}