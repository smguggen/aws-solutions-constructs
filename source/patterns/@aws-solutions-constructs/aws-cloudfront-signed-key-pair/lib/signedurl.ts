import {SignedKeyPair} from './keypair'

export enum SignedUrlName {
    KEY_PAIR_ID = 'Key-Pair-Id',
    SIGNATURE = 'Signature',
    EXPIRES = 'Expires',
    POLICY = 'Policy'
}

export class SignedUrl {
    
    static get(uri:string | URL,signedKey:SignedKeyPair) {
        const url:URL = uri instanceof URL ? uri : new URL(uri);
        url.searchParams.append(SignedUrlName.KEY_PAIR_ID, SignedUrl.formatURIComponent(signedKey.item.publicKeyId));
        url.searchParams.append(SignedUrlName.SIGNATURE,signedKey.signature);
        if (signedKey.isCannedPolicy) {
            url.searchParams.append(SignedUrlName.EXPIRES, signedKey.expires.toString());
        } else {
            url.searchParams.append(SignedUrlName.POLICY, SignedUrl.formatURIComponent(JSON.stringify(signedKey.policy)));
        }
        return url.toString();
    }

    static formatURIComponent(str:string = ''):string {
        return encodeURIComponent(str)
            .replace('+', '-')
            .replace('=', '_')
            .replace('/', '~');
    }
}