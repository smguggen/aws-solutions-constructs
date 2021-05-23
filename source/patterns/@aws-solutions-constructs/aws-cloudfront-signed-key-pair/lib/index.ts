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

import {Construct,Stack,RemovalPolicy, StackProps} from '@aws-cdk/core';
import { IPublicKey, PublicKey, Distribution, DistributionProps, BehaviorOptions, KeyGroup, EdgeLambda, LambdaEdgeEventType } from '@aws-cdk/aws-cloudfront';
import {Buffer} from 'node:buffer';
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';
import { Function, Version } from '@aws-cdk/aws-lambda';
import { CompositePrincipal, Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import {SignedKeyPair,KeyPairOptions,CookieOptions,SignedKeyPairProps} from './keypair';
import {format,getName,getUniqueName} from './util';
export interface SecureSiteProps extends StackProps {
    type:SecureSiteType
    signedKeys:(SignedKeyPairProps | string)[] | string
    signedBehaviorOptions:BehaviorOptions
    cloudFrontDistributionProps?: DistributionProps
    defaultBehaviorOptions?:Partial<BehaviorOptions>
    defaultKeyPairOptions?:KeyPairOptions
    defaultCookieOptions?:CookieOptions,
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

export enum SecureSiteType {
    SIGNED_COOKIE = 'Signed-Cookie',
    SIGNED_URL = 'Signed-Url'
}

export enum SignedCookieType {
    STRING = 'string',
    HEADER = 'SignedCookieHeaders',
    EDGE_LAMBDA_HEADER = 'SignedCookieEdgeHeaders'
}

export class SecureSiteStack extends Stack {
    signedKeys: SignedKeyPair[]
    private url:URL

    constructor(
        private scope:Construct,
        private id:string, 
        private props: SecureSiteProps
    ) {
        super(scope,id);
        if (typeof props.signedKeys === 'string') props.signedKeys = [props.signedKeys];
        
        //getDistribution
        //get url
        this.signedKeys = props.signedKeys.map(key => {
            const keys = typeof key === 'string' ? {path:key} : key;
            const pair = new SignedKeyPair(keys);
            pair.setItem(this.createPublicKey(pair.publicKey,pair.path));
            return pair;
        },this);

    }

    applyRemovalPolicy(policy:RemovalPolicy):void {
        this.applyRemovalPolicy(policy);
    }

    toString():string {
        return this.toString();
    }

    getSignedUrl(signedKey:SignedKeyPair) {
        this.url.searchParams.append(SignedUrlName.KEY_PAIR_ID, format(signedKey.item.publicKeyId));
        this.url.searchParams.append(SignedUrlName.SIGNATURE,signedKey.signature);
        if (signedKey.isCustomPolicy) {
            this.url.searchParams.append(SignedUrlName.POLICY, format(JSON.stringify(signedKey.policy)));
        } else {
            this.url.searchParams.append(SignedUrlName.EXPIRES, signedKey.expires.toString());
        }
        return this.url.toString();
    }

    getSignedCookies(type:SignedCookieType, signedKey:SignedKeyPair): string | SignedCookieHeaders | SignedCookieEdgeHeaders {
        switch(type) {
            case SignedCookieType.STRING: return this.getSignedCookieString(signedKey);
            case SignedCookieType.HEADER: return this.getSignedCookieHeaders(signedKey);
            case SignedCookieType.EDGE_LAMBDA_HEADER: return this.getEdgeLambdaSignedCookieHeaders(signedKey);
        }
    }

    getSignedCookieString(signedKey:SignedKeyPair):string {
        return this.getCookieList(signedKey).join('; ');
    }

    getSignedCookieHeaders(signedKey:SignedKeyPair):SignedCookieHeaders {
        return this.getCookieList(signedKey).map(cookie => {
            return {
                ['Set-Cookie']: cookie
            }
        });
    }

    getEdgeLambdaSignedCookieHeaders(signedKey:SignedKeyPair):SignedCookieEdgeHeaders {
        return this.getCookieList(signedKey).reduce((acc,cookie) => {
            acc['set-cookie'].push({
                key:'Set-Cookie',
                value: cookie
            });
            return acc;
        },{['set-cookie']: []});
    }

    protected createKeyGroup():KeyGroup {
        const nm = getName(this.id,'Key-Group');
        const items = this.signedKeys.map(signedKey => signedKey.item);
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
        }
        return new Distribution(this.scope,getName(this.id,'Distribution'), props);
    }

    protected getEdgeLambdaFunction(): (...a:any[]) => any {
        const $this = this;
        return function handler(event,context,callback) {
            const request = event.Records[0].cf.request;
            const response = event.Records[0].cf.response;
            const signedKey = $this.signedKeys.find(key => key.path === request.uri);
            if (!signedKey) return callback(null,response);
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

    protected makeLambdaRole(name:string) {
        const principal = new CompositePrincipal(
            new ServicePrincipal('lambda.amazonaws.com'),
            new ServicePrincipal('edgelambda.amazonaws.com')
        );
        const statement = new PolicyStatement({
            effect:Effect.ALLOW,
            actions:['sts:assumeRole']
        });
        principal.addToPolicy(statement);
        const role = new Role(this.scope, getName(name, 'Role'), {
            assumedBy:principal,
            roleName:getUniqueName(name)
        });
        role.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this.scope, getUniqueName(name,'ManagedPolicy'), 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'));
        return role;
    }


    protected getEdgeLambda():EdgeLambda {
        const publicNm = getName(this.id, 'LambdaFunction');
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
        const cr = new AwsCustomResource(this.scope,getName(publicNm, 'Resource'),{
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
        const fn = Function.fromFunctionArn(this.scope, getName(publicNm,'Function'), cr.getResponseField('FunctionArn'));
        const vs = new Version(this.scope,getName(publicNm,'Version'), {
            lambda:fn
        });
        return {
            eventType:LambdaEdgeEventType.VIEWER_RESPONSE,
            functionVersion:vs
        }
    }
    private getCookieList(signedKey:SignedKeyPair): string[] {
        const options = {
            ...(this.props.defaultCookieOptions || {}),
            ...(signedKey.cookieOptions || {})
        }
        const res = [
            this.formatCookie(SignedCookieName.KEY_PAIR_ID,signedKey.item.publicKeyId,options),
            this.formatCookie(SignedCookieName.SIGNATURE,signedKey.signature,options)
        ];
        if (signedKey.isCustomPolicy) {
            res.push(this.formatCookie(SignedCookieName.POLICY,signedKey.policy,options));
        } else {
            res.push(this.formatCookie(SignedCookieName.EXPIRES,signedKey.expires,options));
        }
        return res;
    }

    private createPublicKey(
        key:string, 
        path, 
        keyPairName?:string,
        comment?:string
    ): IPublicKey {
        const publicNm = getName(this.id, 'PublicKey', path.substring(1) || '');
        const pkName = getUniqueName(publicNm);
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {
            service:'CloudFront',
            physicalResourceId:PhysicalResourceId.fromResponse('PublicKey.Id')
        }
        const cr = new AwsCustomResource(this.scope,getName(keyPairName || publicNm, 'Resource'),{
            ...resourceOptions,
            onUpdate: {
                ...eventOptions,
                action:'createPublicKey',
                parameters:{
                    PublicKeyConfig: {
                        CallerReference: getUniqueName(pkName),
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
        const publicNm = getName(this.id, 'PublicKey', path.substring(1) || '');
        return PublicKey.fromPublicKeyId(this.scope, publicNm, keyId);
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
        const value = format(val);
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
}