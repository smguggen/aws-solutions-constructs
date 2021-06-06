///<reference types="@types/node"/>

import {createSign, generateKeyPairSync} from 'crypto';
import {Buffer} from 'buffer';
import { IPublicKey, PublicKey } from '@aws-cdk/aws-cloudfront';
import { Construct } from '@aws-cdk/core';
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';
export interface ISignedKeyPair {
    url:URL
    expires:number
    keyPairId:string
    keyPair:IKeyPair
    policy?:SignedKeyPairPolicy
    starts?:number
    ipAddress?:string
    publicKey?:IPublicKey
}

export interface SignedKeyPairProps {
    url:string
    expires?:Date|number|string
    starts?:Date|number|string
    ipAddress?:string
    keyPairOptions?:KeyPairOptions
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

export class SignedKeyPair extends Construct implements ISignedKeyPair {
    public keyPair = SignedKeyPair.createKeyPair(this.props.keyPairOptions)
    public publicKey:IPublicKey = this.createPublicKey(this.keyPair.publicKey)
    public keyPairId:string = this.publicKey.publicKeyId 
    public url:URL = new URL(this.props.url)
    public ipAddress?:string
    private $expires:Date|number|string
    private $starts:Date|number|string
    constructor(
        private scope:Construct,
        private id:string,
        private props:SignedKeyPairProps
    ) {
        super(scope,id);
    }

    get policy():SignedKeyPairPolicy {
        return SignedKeyPair.getPolicy(this.url.toString(),this.expires,this.starts,this.props.ipAddress);
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

    protected createPublicKey(
        key:string, 
        keyPairName?:string,
        comment?:string
    ): IPublicKey {
        const publicNm = this.getName(this.id, 'PublicKey', this.url.toString());
        const pkName = this.getUniqueName(publicNm);
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {
            service:'CloudFront',
            physicalResourceId:PhysicalResourceId.fromResponse('PublicKey.Id')
        }
        const cr = new AwsCustomResource(this.scope,this.getName(keyPairName || publicNm, 'Resource'),{
            ...resourceOptions,
            onUpdate: {
                ...eventOptions,
                action:'createPublicKey',
                parameters:{
                    PublicKeyConfig: {
                        CallerReference: this.getUniqueName(pkName),
                        Name:keyPairName || publicNm,
                        EncodedKey:key,
                        Comment:comment,
                    }
                }
            }
        })
        return this.getPublicKey(cr.getResponseField('PublicKey.Id'), publicNm);
    } 

    protected getPublicKey(keyId:string, name:string): IPublicKey {
        return PublicKey.fromPublicKeyId(this.scope, name, keyId);
    }

    private getName(...names: string[]): string {
        return `${names.join('-')}`
    }

    private getUniqueName(...names: string[]): string {
        const differentiator = Math.random().toString(36).substring(7);
        names.push(differentiator);
        return this.getName(...names);
    }
}