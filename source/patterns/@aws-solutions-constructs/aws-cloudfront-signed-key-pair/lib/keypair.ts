///<reference types="@types/node"/>

import {createSign, generateKeyPairSync} from 'crypto';
import {Buffer} from 'buffer';
import { IPublicKey } from '@aws-cdk/aws-cloudfront';
import {SignedCookies,CookieOptions, SignedCookieType, SignedCookieHeaders, SignedCookieEdgeHeaders} from './signedcookies';
import {SignedUrl} from './signedurl';
export interface ISignedKeyPair {
    path:string
    expires:number
    readonly publicKey:string
    policy:SignedKeyPairPolicy
    signature:string
    starts:number
    ipAddress?:string
    cookieOptions?:CookieOptions
    item?:IPublicKey
}

export interface SignedKeyPairProps {
    path:string
    expires?:Date|number|string
    starts?:Date|number|string
    ipAddress?:string
    keyPairOptions?:KeyPairOptions
    cookieOptions?:CookieOptions
    hostname?: string
    keyPair?:IKeyPair
    isCannedPolicy?:boolean
}

export interface SignedKeyPairTime {
    'AWS:EpochTime':number
}
export interface SignedKeyPairIpAddress {
    'AWS:SourceIp':string
}
export interface IKeyPair {
    publicKey:string
    privateKey:string
}
export interface SignedKeyPairConditions {
    DateLessThan: SignedKeyPairTime
    DateGreaterThan?: SignedKeyPairTime
    IpAddress?: SignedKeyPairIpAddress
}
export interface SignedKeyPairStatement {
    Resource: string
    Condition: SignedKeyPairConditions           
}
export interface SignedKeyPairPolicy {
    Statement: SignedKeyPairStatement[]
}

export interface KeyPairOptions {
    type?: 'rsa' | 'dsa' | 'ec' | 'ed25519' | 'ed448' | 'x25519' | 'x448' | 'dh'
    format?: 'pem' | 'der'
    length?:number
    publicKeyType?: 'spki' | 'pkcs1'
    privateKeyType?: 'pkcs8' | 'pkcs1' | 'sec1'  
    cipher?:string
    passphrase?:string
}

export class SignedKeyPair implements ISignedKeyPair{
    public path = this.props.path
    public readonly publicKey:string
    public item?:IPublicKey
    public ipAddress?:string
    public cookieOptions?:CookieOptions = this.props.cookieOptions
    public url:URL;
    public readonly isCannedPolicy = this.props.isCannedPolicy ? true : false
    private privateKey:string
    private $expires:Date|number|string
    private $starts:Date|number|string
    private hasWildcard:boolean = false;
    private pathWithWildcard?:string
    constructor(private props:SignedKeyPairProps) {
        const keyPair = props.keyPair ? props.keyPair : SignedKeyPair.createKeyPair(props.keyPairOptions);
        this.publicKey = keyPair.publicKey;
        this.privateKey = keyPair.privateKey

        if (this.props.path.indexOf('/*') > -1) {
            this.hasWildcard = true;
            this.pathWithWildcard = this.props.path;
            this.props.path = this.props.path.replace('/*', '/');
        }
        this.url = new URL(this.props.path, this.props.hostname || '');
    }

    get policy():SignedKeyPairPolicy {
        return SignedKeyPair.getPolicy(this.getUrl(),this.expires,this.starts,this.props.ipAddress);
    }

    get signature(): string {
        return SignedKeyPair.getSignature(this.policy, this.privateKey);
    }

    get expires():number {
        if (!this.$expires) this.$expires = this.props.expires;
        return this.getExpires(this.$expires);
    }

    get starts():number {
        if (!this.$starts) this.$starts = this.props.starts;
        return this.getExpires(this.$starts);
    }

    static createKeyPair(options:KeyPairOptions = {}):IKeyPair {
        const opt:KeyPairOptions = {
          type:'rsa',
          format: 'pem',
          length: 2048,
          publicKeyType: 'spki',
          privateKeyType: 'pkcs8',
          ...options
        }
        
        if ((opt.publicKeyType === 'pkcs1' || opt.privateKeyType === 'pkcs1') && opt.type !== 'rsa') {
          throw new Error('Key Type of "pkcs1" is only allowed with rsa keys');
        }
        if (opt.privateKeyType === 'sec1' && opt.type !== 'ec') {
          throw new Error('Private Key Type of "sec1" is only allowed with ec keys');
        }
        const publicKeyEncoding:any = {
          type: opt.publicKeyType,
          format: opt.format
        }
        const privateKeyEncoding:any = {
          type: opt.privateKeyType,
          format: opt.format
        }
        if (opt.cipher) privateKeyEncoding.cipher = opt.cipher;
        if (opt.passphrase) privateKeyEncoding.passphrase = opt.passphrase;
        
        const res = generateKeyPairSync(opt.type as any, {
            modulusLength: opt.length,
            publicKeyEncoding,
            privateKeyEncoding
        });
        return res as unknown as IKeyPair;
    }

    static getEpochTime(
        time?:Date | number | string, 
        def?:Date | number | string, 
        useSeconds:boolean = false
    ): number {
        try {
            def = SignedKeyPair.timeToNumberInMilliseconds(def)
        } catch(e) {
            def = (new Date()).getTime();
        }
        let res;
        try {
            res = SignedKeyPair.timeToNumberInMilliseconds(time);
        } catch(e) {
            res = def;
        }
        return useSeconds ? Math.round(res/1000) : res;
    }

    static timeToNumberInMilliseconds(time?:Date | number | string):number {
        let dt;
        if (time instanceof Date) {
            dt = time;
        } else {
            time = Number(time);
            if (isNaN(time)) throw new Error(`${time} is not a valid time`); 
            if (time < 946728000000) time *= 1000;
            dt = new Date(time);
        }
        if (/invalid date/i.test(dt.toString())) {
            throw new Error(`${time} is not a valid date`); 
        }
        return Math.round(dt.getTime());
    }

    static getSignature($policy:SignedKeyPairPolicy, privateKey:string):string {
        const policy = JSON.stringify($policy);
        const sign = createSign('sha256')
        sign.update(policy);
        sign.end();
        const SignedKeyPair = sign.sign(privateKey);
        const st = Buffer.from(SignedKeyPair as any, 'utf8' as any);
        const sig = st.toString('base64');
        return encodeURIComponent(sig)
            .replace('+', '-')
            .replace('=', '_')
            .replace('/', '~');
    }


    static getPolicy(
        url:string,
        expires:number,
        starts?:number,
        ipAddress?:string
    ): SignedKeyPairPolicy {
        
        const policy:any = {
            Statement: [
                {
                    Resource: 'https://' + String(url).replace(/https?\:\/\//, ''),
                    Condition: {
                        DateLessThan: {
                            "AWS:EpochTime": expires
                        }
                    }
                }
            ]
        }
        if (starts) {
            policy.Statement[0].Condition.DateGreaterThan['AWS:EpochTime'] = starts;
        }
        if (ipAddress) {
            policy.Statement[0].Condition.IpAddress['AWS:SourceIp'] = ipAddress; 
        }
        return policy;
    }

    getSignedUrl(url:string | URL):string {
        return SignedUrl.get(url, this);
    }
    
    getSignedCookies(type:SignedCookieType, options:CookieOptions = {}): string | SignedCookieHeaders | SignedCookieEdgeHeaders {
        return SignedCookies.get(type,this,{...options,...this.props.cookieOptions});
    }

    setItem(item:IPublicKey):void {
        this.item = item;
    }
    protected getExpires(expires:Date | number | string):number {
        return SignedKeyPair.getEpochTime(expires, Date.now() + (60*60*24*7*1000), true);
    }

    protected getStart(starts:Date|number|string):number {
        return SignedKeyPair.getEpochTime(starts, Date.now(), true);
    }

    protected setExpiration(time:Date|number|string):this {
        this.$expires = time;
        return this;
    }

    protected setStart(time:Date|number|string):this {
        this.$starts = time;
        return this;
    }

    private getUrl() {
        if (this.hasWildcard) {
            const url = this.url.toString();
            return url.replace(this.props.path, this.pathWithWildcard);
        }
        return this.url.toString();
    }

}