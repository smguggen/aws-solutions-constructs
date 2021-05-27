import {SignedKeyPair} from './keypair'

export interface CookieOptions {
    expires?:Date | number | string
    maxAge?:Date | number | string
    secure?:boolean
    httpOnly?:boolean
    domain?:string
    path?:string
    sameSite?: 'strict' | 'lax' | 'none'
}

export interface SignedCookieEdgeHeader {
    key:'Set-Cookie'
    value:string
}

export interface SignedCookieEdgeHeaders {
    'set-cookie': SignedCookieEdgeHeader[]
}

export interface SignedCookieHeader {
    'Set-Cookie': string
}

export type SignedCookieHeaders = SignedCookieHeader[]

export enum SignedCookieName {
    KEY_PAIR_ID = 'CloudFront-Key-Pair-Id',
    SIGNATURE = 'CloudFront-Signature',
    EXPIRES = 'CloudFront-Expires',
    POLICY = 'CloudFront-Policy'
}

export enum SignedCookieType {
    STRING = 'string',
    HEADER = 'SignedCookieHeaders',
    EDGE_LAMBDA_HEADER = 'SignedCookieEdgeHeaders'
}

export class SignedCookies {

    static get(type:SignedCookieType, signedKey:SignedKeyPair,options?:CookieOptions): string | SignedCookieHeaders | SignedCookieEdgeHeaders {
        switch(type) {
            case SignedCookieType.STRING: return SignedCookies.string(signedKey,options);
            case SignedCookieType.HEADER: return SignedCookies.headers(signedKey,options);
            case SignedCookieType.EDGE_LAMBDA_HEADER: return SignedCookies.edgeLambdaHeaders(signedKey,options);
        }
    }

    static string(signedKey:SignedKeyPair, cookieOptions?:CookieOptions):string {
        const options = {
            ...signedKey.cookieOptions || {},
            ...cookieOptions || {}
        }
        const res = [
                SignedCookies.format(SignedCookieName.KEY_PAIR_ID,signedKey.item.publicKeyId,options),
                SignedCookies.format(SignedCookieName.SIGNATURE,signedKey.signature,options)
            ];
        if (signedKey.isCannedPolicy) {
            res.push(SignedCookies.format(SignedCookieName.EXPIRES,signedKey.expires,options));
        } else {
            res.push(SignedCookies.format(SignedCookieName.POLICY,signedKey.policy,options));
        }
        return res.join('; ');
    }

    static headers(signedKey:SignedKeyPair, options?:CookieOptions):SignedCookieHeaders {
        return SignedCookies.string(signedKey,options).split('; ').map(cookie => {
            return {
                ['Set-Cookie']: cookie
            }
        });
    }

    static edgeLambdaHeaders(signedKey:SignedKeyPair, options?:CookieOptions):SignedCookieEdgeHeaders {


        return SignedCookies.string(signedKey,options).split('; ').reduce((acc,cookie) => {
            acc['set-cookie'].push({
                key:'Set-Cookie',
                value: cookie
            });
            return acc;
        },{['set-cookie']: []});
    }

    static format($name:SignedCookieName, val:any, options:CookieOptions = {}) {
        if (val && typeof val === 'object') val = JSON.stringify(val);
        const opt = {
          path:'/',
          secure:true,
          httpOnly:false,
          ...options
        }
        const regex = /[\;\,\s]/;
        const msg = 'cannot contain semicolons, colons, or spaces'
        const value = SignedCookies.formatURIComponent(val);
        let name = $name as string;
        if (regex.test(name) || regex.test(value)) {
          throw new Error('Cookie strings ' + msg);
        }
        name += '=' + value;
        
        if (opt.domain) {
          if (!regex.test(opt.domain)) {
            name += '; Domain=' + opt.domain;
          } else { console.error(`Domain "${opt.domain}" ${msg}`) }
        }
        
        if (opt.path) {
          if (!regex.test(opt.path)) {
              name += '; Path=' + opt.path;
          } else {console.error(`Path ${opt.path} ${msg}`)}
        }
        
        let exp = options.expires || options.maxAge ? SignedCookies.formatDate(options.expires || options.maxAge as Date | string | number) : null;
        if (exp) {
          if (exp.getTime() <= Date.now()) {
            console.error(`Cookie ${name} is expired`);
          }
          if (opt.maxAge) {
              name += '; Max-Age=' + Math.floor(exp.getTime()/1000);
          } else {
              name += '; Expires=' + exp.toUTCString();
          }
        }
        if (opt.sameSite) {
          const ss = opt.sameSite;
          name += '; SameSite=';
          const sameSite = /(strict|lax|none)/i.test(ss) ?
            (ss.substring(0,1).toUpperCase() + ss.substring(1).toLowerCase()) : 
            opt.sameSite ? 'Strict' : 'Lax';
          name += sameSite;
        }
        if (opt.httpOnly) name += '; HttpOnly';
        if (opt.secure) name += '; Secure';
        
        return name;
    }

    static formatDate(exp:Date | number | string):Date {
        let dt;
        if (exp instanceof Date) {
            dt = exp;
        } else {
            exp = Number(exp);
            if (isNaN(exp)) throw new Error('Invalid Cookie Date')
            if (exp < 946728000000) exp *= 1000;
            dt = new Date(exp);
        }
        if (/invalid date/i.test(dt.toString())) {
            throw new Error('Invalid Cookie Date');
        }
        return dt;
    }

    static formatURIComponent(str:string = ''):string {
        return encodeURIComponent(str)
            .replace('+', '-')
            .replace('=', '_')
            .replace('/', '~');
    }
}