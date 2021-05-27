import {createSign, generateKeyPairSync} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {format,prefixUrl,store} from './util';
import { IPublicKey } from '@aws-cdk/aws-cloudfront';
import { SecureSiteStack } from '.';

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
export interface CookieOptions {
    expires?:Date | number | string
    maxAge?:Date | number | string
    secure?:boolean
    httpOnly?:boolean
    domain?:string
    path?:string
    sameSite?: 'strict' | 'lax' | 'none'
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
    prefix:string
    public path = this.props.path
    public readonly publicKey:string
    public item?:IPublicKey
    public ipAddress?:string
    public cookieOptions?:CookieOptions = this.props.cookieOptions
    public url:URL;

    private privateKey:string
    private $expires:Date|number|string
    private $starts:Date|number|string
    private hasWildcard:boolean = false;
    private pathWithWildcard?:string
    constructor(private props:SignedKeyPairProps) {
        const keyPair = props.keyPair ? props.keyPair : SignedKeyPair.createKeyPair(props.keyPairOptions);
        this.publicKey = keyPair.publicKey;
        this.privateKey = keyPair.privateKey
        this.prefix = SignedKeyPair.sanitize(this.props.path);

        if (this.props.path.indexOf('/*') > -1) {
            this.hasWildcard = true;
            this.pathWithWildcard = this.props.path;
            this.props.path = this.props.path.replace('/*', '/');
        }
        this.url = new URL(this.props.path, this.props.hostname || '');
    }

    get policy():SignedKeyPairPolicy {
        return this.getPolicy(this.getUrl(), this.expires,this.starts,this.props.ipAddress);
    }

    get signature(): string {
        return this.getSignature(this.policy, this.privateKey);
    }

    get expires():number {
        if (!this.$expires) this.$expires = this.props.expires;
        return this.getExpires(this.$expires);
    }

    get starts():number {
        if (!this.$starts) this.$starts = this.props.starts;
        return this.getExpires(this.$starts);
    }

    setExpiration(time:Date|number|string):this {
        this.$expires = time;
        return this;
    }

    setStart(time:Date|number|string):this {
        this.$starts = time;
        return this;
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

    getSignature($policy:SignedKeyPairPolicy, privateKey:string):string {
        const policy = JSON.stringify($policy);
        const sign = createSign('sha256')
        sign.update(policy);
        sign.end();
        const SignedKeyPair = sign.sign(privateKey);
        const st = Buffer.from(SignedKeyPair as any, 'utf8' as any);
        const sig = st.toString('base64');
        return format(sig);
    }


    getPolicy(
        url:string,
        starts:number,
        expires:number,
        ipAddress?:string
    ): SignedKeyPairPolicy {
        
        const policy:any = {
            Statement: [
                {
                    Resource: prefixUrl(url),
                    Condition: {
                        DateLessThan: {
                            "AWS:EpochTime": expires
                        },
                        DateGreaterThan: {
                            "AWS:EpochTime": starts
                        },
                    }
                }
            ]
        }
        
        if (ipAddress) {
            this.ipAddress = ipAddress;
            policy.Statement[0].Condition.IpAddress['AWS:SourceIp'] = ipAddress; 
        }
        return policy;
    }

    static sanitize(name:string):string {
        return name
            .replace('*', '_STAR_')
            .replace('/', '_SLASH_')
            .replace(/[^a-zA-Z0-9\_\.\-]/, '.');
    }

    static normalize(name:string):string {
        name = name
        .replace('_STAR_', '.*')
        .replace('_SLASH_', '/')
        .replace(/^\//, '/?');

        return name.startsWith('/') ? name : '/?' + name;
    }

    static isPath(id:string, path:string):boolean {
        const normalized = SignedKeyPair.normalize(id);
        const reg = new RegExp(normalized, 'g');
        return reg.test(path);
    }

    storeKeyPair(scope:SecureSiteStack, name:string = ''):this {
        store(scope, `${this.prefix}_SignedKeyPairPublicKey`, this.publicKey, scope.principal, false, name);
        store(scope, `${this.prefix}_SignedKeyPairPrivateKey`, this.privateKey, scope.principal, false, name);
        return this;
    }

    getEpochTime(time?:Date | number | string, def?:Date | number | string, useSeconds:boolean = false): number {

        const $this = this;
        try {
            def = $this.timeToNumberInMilliseconds(def)
        } catch(e) {
            def = (new Date()).getTime();
        }
        let res;
        try {
            res = $this.timeToNumberInMilliseconds(time);
        } catch(e) {
            res = def;
        }
        return useSeconds ? Math.round(res/1000) : res;
    }

    timeToNumberInMilliseconds(time?:Date | number | string):number {
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

    setItem(item:IPublicKey):void {
        this.item = item;
    }
    protected getExpires(expires:Date | number | string):number {
        return this.getEpochTime(expires, Date.now() + (60*60*24*7*1000), true);
    }

    protected getStart(starts:Date|number|string):number {
        return this.getEpochTime(starts, Date.now(), true);
    }

    private getUrl() {
        if (this.hasWildcard) {
            const url = this.url.toString();
            return url.replace(this.props.path, this.pathWithWildcard);
        }
        return this.url.toString();
    }

}