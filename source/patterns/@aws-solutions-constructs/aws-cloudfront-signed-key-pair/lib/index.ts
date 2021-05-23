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
import {format,formatCookie,getName,getUniqueName} from './util';
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

    static getSignedUrl(uri:string | URL,signedKey:SignedKeyPair) {
        const url:URL = uri instanceof URL ? uri : new URL(uri);
        url.searchParams.append(SignedUrlName.KEY_PAIR_ID, format(signedKey.item.publicKeyId));
        url.searchParams.append(SignedUrlName.SIGNATURE,signedKey.signature);
        if (signedKey.isCustomPolicy) {
            url.searchParams.append(SignedUrlName.POLICY, format(JSON.stringify(signedKey.policy)));
        } else {
            url.searchParams.append(SignedUrlName.EXPIRES, signedKey.expires.toString());
        }
        return url.toString();
    }

    static getSignedCookies(type:SignedCookieType, signedKey:SignedKeyPair,options?:CookieOptions): string | SignedCookieHeaders | SignedCookieEdgeHeaders {
        switch(type) {
            case SignedCookieType.STRING: return this.getSignedCookieString(signedKey,options);
            case SignedCookieType.HEADER: return this.getSignedCookieHeaders(signedKey,options);
            case SignedCookieType.EDGE_LAMBDA_HEADER: return this.getEdgeLambdaSignedCookieHeaders(signedKey,options);
        }
    }

    static getSignedCookieString(signedKey:SignedKeyPair, cookieOptions?:CookieOptions):string {
        const options = {
            ...signedKey.cookieOptions || {},
            ...cookieOptions || {}
        }
        const res = [
                formatCookie(SignedCookieName.KEY_PAIR_ID,signedKey.item.publicKeyId,options),
                formatCookie(SignedCookieName.SIGNATURE,signedKey.signature,options)
            ];
            if (signedKey.isCustomPolicy) {
                res.push(formatCookie(SignedCookieName.POLICY,signedKey.policy,options));
            } else {
                res.push(formatCookie(SignedCookieName.EXPIRES,signedKey.expires,options));
            }
        return res.join('; ');
    }

    static getSignedCookieHeaders(signedKey:SignedKeyPair, options?:CookieOptions):SignedCookieHeaders {
        return SecureSiteStack.getSignedCookieString(signedKey,options).split('; ').map(cookie => {
            return {
                ['Set-Cookie']: cookie
            }
        });
    }

    static getEdgeLambdaSignedCookieHeaders(signedKey:SignedKeyPair, options?:CookieOptions):SignedCookieEdgeHeaders {


        return SecureSiteStack.getSignedCookieString(signedKey,options).split('; ').reduce((acc,cookie) => {
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
                const value = SecureSiteStack.getSignedUrl(this.url, signedKey);
                const headers = response.headers;
                headers.location = [{
                    key: 'Location',
                    value
                }]
            } else {
                const cookies = SecureSiteStack.getEdgeLambdaSignedCookieHeaders(signedKey, $this.props.defaultCookieOptions);
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
}