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
import { IPublicKey, PublicKey, Distribution, DistributionProps, BehaviorOptions, KeyGroup, IKeyGroup, IOrigin, EdgeLambda, LambdaEdgeEventType } from '@aws-cdk/aws-cloudfront';
import {createSign, generateKeyPairSync} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';
import { Function, IVersion, Version } from '@aws-cdk/aws-lambda';
import { CompositePrincipal, Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';

export interface SignedKeyPairProps {
    url:string,
    type:SignedKeyPairType
    signedKeys:(SignedKeyProps | string)[] | string
    signedBehaviorOptions:BehaviorOptions
    cloudFrontDistributionProps?: DistributionProps
    defaultBehaviorOptions?:Partial<BehaviorOptions>
    defaultKeyPairOptions?:KeyPairOptions
    defaultCookieOptions?:CookieOptions,
}

export interface SignedKeyProps {
    path:string
    expires?:Date|number|string
    starts?:Date|number|string
    ipAddress?:string
    keyPairOptions?:KeyPairOptions
    cookieOptions?:CookieOptions
    keyPairName?:string
    comment?:string
}

export interface SignedKey {
    item:IPublicKey
    props:SignedKeyProps
    readonly expires:number
    readonly publicKey:string
    readonly policy:SignedKeyPairPolicy
    readonly signature:string
    readonly isCustomPolicy?:boolean
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

export enum SignedCookieType {
    STRING = 'string',
    HEADER = 'SignedCookieHeaders',
    EDGE_LAMBDA_HEADER = 'SignedCookieEdgeHeaders'
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

export class SignedKeyPair extends Construct {
    signedKeys: SignedKeyProps[]
    private url:URL

    constructor(
        private scope:Construct,
        private id:string, 
        private props: SignedKeyPairProps
    ) {
        super(scope,id);
        this.url = new URL(this.props.url);
        if (typeof props.signedKeys === 'string') props.signedKeys = [props.signedKeys];
        this.signedKeys = props.signedKeys.map(key => typeof key === 'string' ? {path:key} : key);
        this.getDistribution();
    }

    applyRemovalPolicy(policy:RemovalPolicy):void {
        this.applyRemovalPolicy(policy);
    }

    toString():string {
        return this.toString();
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

    getSignedUrl(signedKey:SignedKey) {
        this.url.searchParams.append(SignedUrlName.KEY_PAIR_ID, this.format(signedKey.item.publicKeyId));
        this.url.searchParams.append(SignedUrlName.SIGNATURE,signedKey.signature);
        if (signedKey.isCustomPolicy) {
            this.url.searchParams.append(SignedUrlName.POLICY, this.format(JSON.stringify(signedKey.policy)));
        } else {
            this.url.searchParams.append(SignedUrlName.EXPIRES, this.getExpires(signedKey.expires).toString());
        }
        return this.url.toString();
    }

    getSignedCookies(type:SignedCookieType, signedKey:SignedKey): string | SignedCookieHeaders | SignedCookieEdgeHeaders {
        switch(type) {
            case SignedCookieType.STRING: return this.getSignedCookieString(signedKey);
            case SignedCookieType.HEADER: return this.getSignedCookieHeaders(signedKey);
            case SignedCookieType.EDGE_LAMBDA_HEADER: return this.getEdgeLambdaSignedCookieHeaders(signedKey);
        }
    }

    getSignature($policy:SignedKeyPairPolicy, privateKey:string):string {
        const policy = JSON.stringify($policy);
        const sign = createSign('sha256')
        sign.update(policy);
        sign.end();
        const SignedKeyPair = sign.sign(privateKey);
        const st = Buffer.from(SignedKeyPair as any, 'utf8' as any);
        const sig = st.toString('base64');
        return this.format(sig);
    }

    getPolicy(props:SignedKeyProps, expires?:number): SignedKeyPairPolicy {
        const policy:any = {
            Statement: [
                {
                    Resource: this.addPath(this.prefixUrl(this.url.hostname),props.path),
                    Condition: {
                        DateLessThan: {
                            "AWS:EpochTime": expires || this.getExpires(props.expires)
                        }
                    }
                }
            ]
        }
        if (props.starts) {
            policy.Statement[0].Condition.DateGreaterThan['AWS:EpochTime'] = this.getStart(props.starts);
        }
        if (props.ipAddress) {
            policy.Statement[0].Condition.IpAddress['AWS:SourceIp'] = props.ipAddress; 
        }
        return policy;
    }

    getExpires(expires:Date | number | string):number {
        return this.getEpochTime(expires, Date.now() + (60*60*24*7*1000), true);
    }

    getStart(starts:Date|number|string):number {
        return this.getEpochTime(starts, Date.now(), true);
    }

    getSignedCookieString(signedKey:SignedKey):string {
        return this.getCookieList(signedKey).join('; ');
    }

    getSignedCookieHeaders(signedKey:SignedKey):SignedCookieHeaders {
        return this.getCookieList(signedKey).map(cookie => {
            return {
                ['Set-Cookie']: cookie
            }
        });
    }

    getEdgeLambdaSignedCookieHeaders(signedKey:SignedKey):SignedCookieEdgeHeaders {
        return this.getCookieList(signedKey).reduce((acc,cookie) => {
            acc['set-cookie'].push({
                key:'Set-Cookie',
                value: cookie
            });
            return acc;
        },{['set-cookie']: []});
    }

    protected getSignedKey(props:SignedKeyProps):SignedKey {
        const res:any = {props}
        const options = {
            ...(this.props.defaultKeyPairOptions || {}),
            ...(props.keyPairOptions || {})
        }
        const keyPair = SignedKeyPair.createKeyPair(options);
        res.publicKey = keyPair.publicKey;
        res.item = this.createPublicKey(res.publicKey, props.path);
        res.expires = this.getExpires(props.expires);
        res.policy = this.getPolicy(props, res.expires);
        res.signature = this.getSignature(res.policy, keyPair.privateKey);
        res.isCustomPolicy = props.starts || props.ipAddress ? true : false;
        return res;
    }

    protected createKeyGroup():KeyGroup {
        const nm = this.getName(this.id,'Key-Group');

        const items = this.signedKeys.map(props => {
            if (typeof props === 'string') props = {path:props}
            const signedKey = this.getSignedKey(props);
            return signedKey.item;
        },this);
        return new KeyGroup(this.scope,nm, {
            keyGroupName:nm,
            items
        })
    }

    protected getDefaultBehavior():BehaviorOptions {
        return {
            edgeLambdas: [this.getEdgeLambda()],
            ...(this.props.defaultBehaviorOptions || {}),
            origin:this.props.defaultBehaviorOptions?.origin || this.props.signedBehaviorOptions.origin,

        }
    }

    protected getDistribution():Distribution {
        const defaultBehavior = this.getDefaultBehavior();
        const props:DistributionProps = {
            defaultBehavior,
            ...(this.props.cloudFrontDistributionProps || {}),
            additionalBehaviors: {
                ...(this.props.cloudFrontDistributionProps?.additionalBehaviors || {}),
                '/*': {
                    ...this.props.signedBehaviorOptions,
                    trustedKeyGroups: [this.createKeyGroup()]
                }
            },
            ...(this.props.cloudFrontDistributionProps || {})
        }
        return new Distribution(this.scope,this.getName(this.id,'Distribution'), props);
    }

    private getEdgeLambda():EdgeLambda {
        const publicNm = this.getName(this.id, 'LambdaFunction');
        const Role = this.makeLambdaRole(publicNm);
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {
            service:'Lambda',
            physicalResourceId:PhysicalResourceId.fromResponse('FunctionArn'),
            region:'us-east-1'
        }
        const parameters = {
            Code: Buffer.from(this.getEdgeLambdaFunction().toString()),
            FunctionName:publicNm,
            Publish:true
        }
        const cr = new AwsCustomResource(this.scope,this.getName(publicNm, 'Resource'),{
            ...resourceOptions,
            onCreate: {
                ...eventOptions,
                action:'createFunction',
                parameters: {
                    ...parameters,
                    Role
                }
            },
            onUpdate: {
                ...eventOptions,
                action:'updateFunctionCode',
                parameters
            }
        });
        const fn = Function.fromFunctionArn(this.scope, this.getName(publicNm,'Function'), cr.getResponseField('FunctionArn'));
        const vs = new Version(this.scope,this.getName(publicNm,'Version'), {
            lambda:fn
        });
        return {
            eventType:LambdaEdgeEventType.VIEWER_RESPONSE,
            functionVersion:vs
        }
    }

    private getEdgeLambdaFunction(): (...a:any[]) => any {
        const $this = this;
        return function handler(event,context,callback) {
            const request = event.Records[0].cf.request;
            const response = event.Records[0].cf.response;
            const props = $this.signedKeys.find(key => key.path === request.uri);
            if (!props) return callback(null,response);
            const signedKey = $this.getSignedKey(props);
            if ($this.props.type === SignedKeyPairType.SIGNED_URL) {
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

    private makeLambdaRole(name:string) {
        const principal = new CompositePrincipal(
            new ServicePrincipal('lambda.amazonaws.com'),
            new ServicePrincipal('edgelambda.amazonaws.com')
        );
        const statement = new PolicyStatement({
            effect:Effect.ALLOW,
            actions:['sts:assumeRole']
        });
        principal.addToPolicy(statement);
        const role = new Role(this.scope, this.getName(name, 'Role'), {
            assumedBy:principal,
            roleName:this.getUniqueName(name)
        });
        role.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this.scope, this.getUniqueName(name,'ManagedPolicy'), 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'));
        return role;
    }

    private getCookieList(signedKey:SignedKey): string[] {
        const options = {
            ...(this.props.defaultCookieOptions || {}),
            ...(signedKey.props.keyPairOptions || {})
        }
        const res = [
            this.formatCookie(SignedCookieName.KEY_PAIR_ID,signedKey.item.publicKeyId,options),
            this.formatCookie(SignedCookieName.SIGNATURE,signedKey.signature,options)
        ];
        if (signedKey.isCustomPolicy) {
            res.push(this.formatCookie(SignedCookieName.POLICY,signedKey.policy,options));
        } else {
            res.push(this.formatCookie(SignedCookieName.EXPIRES,this.getExpires(signedKey.expires),options));
        }
        return res;
    }

    private createPublicKey(key:string, path, keyPairName?:string, comment?:string): IPublicKey {
        const publicNm = this.getName(this.id, 'PublicKey', path.substring(1) || '');
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
        return this.getPublicKey(cr.getResponseField('PublicKey.Id'), path);
    } 

    private getPublicKey(keyId:string, path:string): IPublicKey {
        const publicNm = this.getName(this.id, 'PublicKey', path.substring(1) || '');
        return PublicKey.fromPublicKeyId(this.scope, publicNm, keyId);
    }

    private addPath(url:string, path:string) {
        const urlEnd = url.length - 1;
        path = path.startsWith('/') ? path : `/${path}`;
        url = url.substring(urlEnd) === '/' ? url.substring(0,urlEnd - 1) :  url;
        return url + path;
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
}