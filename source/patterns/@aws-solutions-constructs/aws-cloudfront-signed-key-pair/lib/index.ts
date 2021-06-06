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

import {Construct,Stack,RemovalPolicy, StackProps,CfnOutput, Duration} from '@aws-cdk/core';
import { IPublicKey, PublicKey, Distribution, DistributionProps,  KeyGroup, EdgeLambda, LambdaEdgeEventType, IOrigin, OriginAccessIdentity, BehaviorOptions, AddBehaviorOptions } from '@aws-cdk/aws-cloudfront';
import {S3Origin} from '@aws-cdk/aws-cloudfront-origins';
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';
import {BlockPublicAccess, Bucket, BucketEncryption} from '@aws-cdk/aws-s3'
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment';
import { Function, Version } from '@aws-cdk/aws-lambda';
import { CanonicalUserPrincipal, CompositePrincipal, Effect, IPrincipal, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import path from 'path';
import {Key} from '@aws-cdk/aws-kms';
import fs from 'fs'; 
import {ISecureOrigin,ISecureBehavior,SecureBehavior,OriginSecurityType} from './secureBehavior';
export interface SecureSiteProps extends DistributionProps {
    defaultBehavior:ISecureBehavior
    additionalBehaviors?:ISecureAdditionalBehaviors
}

export interface ISecureAdditionalBehaviors extends Record<string,ISecureBehavior> {}

export class SecureSiteStack extends Stack {
    protected distribution: Distribution
    protected principal:IPrincipal
    constructor(
        protected scope:Construct,
        protected id:string,
        protected props:SecureSiteProps
    ) {
        super(scope,id);
        this.secureOrigins = this.getSecureOrigins(props.defaultBehavior.origin,...(Object.values(props.additionalBehaviors || {}).map(behavior => behavior.origin)));
        this.distribution = new Distribution(scope,id,props);
    }

    addBehavior(
        pathPattern:string,
        origin:SecureOrigin,
        behaviorOptions:AddBehaviorOptions
    ) {
        if (origin.hasSecureOrigin(origin)) this.secureOrigins.push(origin);
        return this.distribution.addBehavior(pathPattern,origin,behaviorOptions);
    }

    protected getSecureOrigins(...origins:ISecureOrigin[]):SecureOrigin[] {
        return origins.reduce((acc,origin) => {
            if (this.hasSecureOrigin(origin)) {
                acc.push(origin as SecureOrigin);
            }
            return acc;
        },[]);
    }

    protected getBucketDeployment(origin:SecureOrigin):BucketDeployment | null {
        if (!origin.contentPath) return null;
        const deployment = new BucketDeployment(this.scope, `${origin.bucket.bucketName}SecureOriginDeployment${this.id}`, {
            sources:[Source.asset(origin.contentPath)],
            destinationBucket:origin.bucket,
            destinationKeyPrefix:origin.originPath
        })
        const statement = new PolicyStatement({
            actions:['s3:ListBucket', 's3:GetBucket', 's3:GetObject'],
            resources:[origin.bucket.bucketArn, origin.bucket.arnForObjects(origin.originPath)],
            principals: [this.principal]
        });
        this.bucket.addToResourcePolicy(statement);
        return deployment;        
    }

    protected encodeParameterKey(str:string):string {
        if (/![^a-z0-9\-\.\_\s]/ig.test(str) && !/^(aws|ssm)/.test(str)) return str;
        const encodedStr = encodeURIComponent(str)
        const newStr = encodedStr
            .replace('*', '_STAR_')
            .replace('%', '_PER_')
            .replace(/^(aws|ssm)/i, (match:any,p1:any) => `PREFIX_${p1}_`);

        if (/[^a-z0-9\-\.\_]/i.test(newStr)) throw new Error(`Parameter key ${str} (encoded as ${newStr}) has invalid characters`);
        return newStr;
    }

    protected decodeParameterKey(str:string):string {
        const newStr = str
            .replace('_STAR_', '*')
            .replace('_PER_', '%')
            .replace(/^PREFIX\_(aws|ssm)\_/i, (match:any,p1:any) => p1);
        return decodeURIComponent(newStr);
    }
    storeParameters(
        principal:IPrincipal,
        key:string,
        value:string, 
        output?: boolean
    ):this {
        const name = this.id + key;
        const Name = this.encodeParameterKey(key);
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const encryptionKey = new Key(this.scope, `${name}EncryptionKey`, {
            enableKeyRotation:true,
            admins:[principal]
        })
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {
            service:'SSM',
            region:'us-east-1'
        }
        const parameters = {Name}
        new AwsCustomResource(this.scope,name + 'CustomResource',{
            ...resourceOptions,
            onUpdate: {
                ...eventOptions,
                action:'putParameter',
                physicalResourceId:PhysicalResourceId.of(name),
                parameters: {
                    ...parameters,
                    Value: value,
                    Overwrite:true,
                    Type:'SecureString',
                    KeyId: encryptionKey.keyId
                }
            },
            onDelete: {
                ...eventOptions,
                physicalResourceId:PhysicalResourceId.of(name),
                action:'deleteParameter',
                parameters
            }
        });
      
        if (output) {
            new CfnOutput(this.scope,`${name}Output`, {
                exportName:key,
                value
            })
        }
        return this;
    }
}