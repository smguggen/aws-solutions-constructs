/**
 *  Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

///<reference types="@types/node"/>

import {Construct,ConstructNode,ResourceEnvironment,Stack,RemovalPolicy} from '@aws-cdk/core';
import { IPublicKey, PublicKey, Distribution, DistributionProps, BehaviorOptions } from '@aws-cdk/aws-cloudfront';
import {createSign, generateKeyPairSync} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';

export interface SignedKeyPairProps {
    url:string,
    type:SignedKeyPairType,
    cloudFrontDistributionProps?: DistributionProps
    defaultBehaviorOptions?:BehaviorOptions
    expires?:Date | string | number,
    starts?:Date | string | number,
    ipAddress?:string
    comment?:string
    SignedKeyPairName?:string
    KeyPairOptions?:KeyPairOptions
    cookieOptions?:CookieOptions
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
export enum SignedUrlName {
    KEY_PAIR_ID = 'Key-Pair-Id',
    SIGNATURE = 'Signature',
    EXPIRES = 'Expires',
    POLICY = 'Policy'
}

export enum SignedKeyPairType {
    SIGNED_COOKIE = 'Signed-Cookie',
    SIGNED_URL = 'Signed-Url'
}

export interface AwsCustomResourceOptions {
    scope: Construct
    name:string
    command:string
    resourceId:PhysicalResourceId
    region?:string
    parameters?: {[name:string]:any}
    createAction?:string
    createParameters?:{[name:string]:any}
    deleteAction?:string
    deleteParameters?:{[name:string]:any}
}

export class SignedKeyPair extends Construct implements IPublicKey {
    public node:ConstructNode
    public env:ResourceEnvironment
    public stack:Stack
    public publicKeyId:string
    public readonly publicKey:string
    private privateKey:string
    private PublicKey:IPublicKey
    private url:URL

    constructor(
        private scope:Construct,
        private id:string, 
        private options: SignedKeyPairProps
    ) {
        super(scope,id);
        const {publicKey,privateKey} = SignedKeyPair.createKeyPair(options.KeyPairOptions);
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.PublicKey = this.createPublicKey(this.publicKey);
        this.publicKeyId = this.PublicKey.publicKeyId;
        this.env = this.PublicKey.env;
        this.node = this.PublicKey.node;
        this.stack = this.PublicKey.stack
        this.url = new URL(this.options.url);
    }

    applyRemovalPolicy(policy:RemovalPolicy):void {
        this.applyRemovalPolicy(policy);
    }

    toString():string {
        return this.toString();
    }

    get edgeLambdaSignedCookieHeaders():SignedCookieEdgeHeaders {
        return this.signedCookies.split('; ').reduce((acc,cookie) => {
            acc['set-cookie'].push({
                key:'Set-Cookie',
                value: cookie
            });
            return acc;
        },{['set-cookie']: []});
    }

    get signedCookieHeaders():SignedCookieHeaders {
        return this.signedCookies.split('; ').map(cookie => {
            return {
                ['Set-Cookie']: cookie
            }
        });
    }

    getSignature($policy:SignedKeyPairPolicy):string {
        const policy = JSON.stringify($policy);
        const sign = createSign('sha256')
        sign.update(policy);
        sign.end();
        const SignedKeyPair = sign.sign(this.privateKey);
        const st = Buffer.from(SignedKeyPair as any, 'utf8' as any);
        const sig = st.toString('base64');
        return this.format(sig);
    }

    getSignedUrl(policy:SignedKeyPairPolicy, publicKeyId:string, expires:Date|number|string):string {
        const signature = this.getSignature(policy);
        this.url.searchParams.append(SignedUrlName.KEY_PAIR_ID, this.format(publicKeyId));
        this.url.searchParams.append(SignedUrlName.SIGNATURE,signature);
        if (this.options.starts || this.options.ipAddress) {
            this.url.searchParams.append(SignedUrlName.POLICY, this.format(JSON.stringify(policy)));
        } else {
            this.url.searchParams.append(SignedUrlName.EXPIRES, this.getExpires(expires).toString());
        }
        return this.url.toString();
    }

    get signedCookies():string {
        return this.getCookieList().join('; ');
    }

    private get policy(): SignedKeyPairPolicy {
        const policy:any = {
            Statement: [
                {
                    Resource: this.prefixUrl(this.url.hostname),
                    Condition: {
                        DateLessThan: {
                            "AWS:EpochTime": this.getExpires()
                        }
                    }
                }
            ]
        }
        if (this.options.starts) {
            policy.Statement[0].Condition.DateGreaterThan['AWS:EpochTime'] = this.getStart();
        }
        if (this.options.ipAddress) {
            policy.Statement[0].Condition.IpAddress['AWS:SourceIp'] = this.options.ipAddress; 
        }
        return policy;
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

    protected getExpires(expires:Date | number | string):number {
        return this.getEpochTime(expires, Date.now() + (60*60*24*7*1000), true);
    }

    protected getStart(starts:Date|number|string):number {
        return this.getEpochTime(starts, Date.now(), true);
    }


    protected getPublicKey(keyId:string, path:string): IPublicKey {
        const publicNm = this.getName(this.id, 'PublicKey', path.substring(1) || '');
        return PublicKey.fromPublicKeyId(this.scope, publicNm, keyId);
    }

    protected createPublicKey(key:string, path, keyPairName?:string, comment?:string): IPublicKey {
        const publicNm = this.getName(this.id, 'PublicKey', path.substring(1) || '');
        const pkName = this.getUniqueName(publicNm);
        const cr = this.customResource({
            scope:this.scope,
            name:this.getName(this.options.SignedKeyPairName || publicNm, 'Resource'),
            command:'CloudFront.createPublicKey',
            resourceId:PhysicalResourceId.fromResponse('PublicKey.Id'),
            parameters: {
                PublicKeyConfig: {
                    CallerReference: this.getUniqueName(pkName),
                    Name:keyPairName || publicNm,
                    EncodedKey:key,
                    Comment:comment,
                }
            }
        });
        return this.getPublicKey(cr.getResponseField('PublicKey.Id'), path)
    } 

    private getCookieList(
        publicKeyId:string, 
        policy:SignedKeyPairPolicy,
        signature:string, 
        options:CookieOptions,
        expires?:Date|number|string
    ):string[] {
        const res = [
            this.formatCookie(SignedCookieName.KEY_PAIR_ID,publicKeyId,options),
            this.formatCookie(SignedCookieName.SIGNATURE,signature,options)
        ];
        if (this.options.starts || this.options.ipAddress) {
            res.push(this.formatCookie(SignedCookieName.POLICY,policy,this.options));
        } else {
            res.push(this.formatCookie(SignedCookieName.EXPIRES,this.getExpires(expires),options));
        }
        return res;
    }

    private getEpochTime(time?:Date | number | string, def?:Date | number | string, useSeconds:boolean = false): number {

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

    private timeToNumberInMilliseconds(time?:Date | number | string):number {
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

    private prefixUrl(url:string):string {
        return 'https://' + String(url).replace(/https?\:\/\//, '');
    }

    private format(str:string = '') {
        return encodeURIComponent(str).replace('+', '-')
        .replace('=', '_')
        .replace('/', '~');
    }

    private formatCookie($name:SignedCookieName, val:any, options:CookieOptions = {}) {
        if (val && typeof val === 'object') val = JSON.stringify(val);
        const opt = {
          path:'/',
          secure:true,
          httpOnly:false,
          ...options
        }
        const regex = /[\;\,\s]/;
        const msg = 'cannot contain semicolons, colons, or spaces'
        const value = this.format(val);
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
        
        let exp = options.expires || options.maxAge ? this.formatCookieDate(options.expires || options.maxAge as Date | string | number) : null;
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

    private formatCookieDate(exp:Date | number | string):Date {
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

    private getName(...names: string[]): string {
        return `${names.join('-')}`
    }
    
    private getUniqueName(...names: string[]): string {
        const differentiator = Math.random().toString(36).substring(7);
        names.push(differentiator);
        return this.getName(...names);
    }

    private customResource(params:AwsCustomResourceOptions): AwsCustomResource {
        const [service,action] = params.command.split('.');
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {service,region:params.region, physicalResourceId: params.resourceId}
        return new AwsCustomResource(params.scope,params.name,{
            ...resourceOptions,
            onUpdate: {
                ...eventOptions,
                action,
                parameters:params.parameters || {}
            }
        })
    }

    private getDistribution() {
        const props:DistributionProps = {
            defaultBehavior: {

                ...this.options.defaultBehaviorOptions
            },
            ...this.options.cloudFrontDistributionProps || {}
        }
    }
}