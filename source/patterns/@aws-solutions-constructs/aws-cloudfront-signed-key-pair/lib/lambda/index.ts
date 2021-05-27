import {SignedKeyPair} from '../keypair';
import {SSM} from 'aws-sdk';
import { SignedCookieType } from '../signedcookies';
export {SignedKeyPair} from '../keypair';

const ssm = new SSM();
export function signedUrl(event,context,callback) {
    const req = event.Records[0].cf.request;
    const res = event.Records[0].cf.response;
    const response = res || req;
    const base = req.headers.host[0].value;
    ssm.getParameter({
        Name:'SignedKeyPairPaths',

    }, (err,data) => {
        if (err) throw new Error(err as any);
        const signedKeys = JSON.parse(data.Parameter.Value);
        const props = signedKeys.find(key => key.path === req.uri);
        if (!props) return callback(null,response);
        const signedKey = new SignedKeyPair(props);
        const value = signedKey.getSignedUrl(new URL(req.uri, base));
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

export function signedCookies(event,context,callback) {
    const req = event.Records[0].cf.request;
    const res = event.Records[0].cf.response;
    const response = res || req;
    ssm.getParameter({
        Name:'SignedKeyPairPaths',
        WithDecryption:true
    }, (err,data) => {
        if (err) throw new Error(err as any);
        const signedKeys = JSON.parse(data.Parameter.Value);
        const props = signedKeys.find(key => key.path === req.uri);
        if (!props) return callback(null,response);
        const signedKey = new SignedKeyPair(props);
        const cookies = signedKey.getSignedCookies(SignedCookieType.EDGE_LAMBDA_HEADER);
        const headers = response.headers;
        if (!headers['set-cookie']) headers['set-cookie'] = [];
        headers['set-cookie'] = headers['set-cookie'].concat(cookies['set-cookie']);
    })
}