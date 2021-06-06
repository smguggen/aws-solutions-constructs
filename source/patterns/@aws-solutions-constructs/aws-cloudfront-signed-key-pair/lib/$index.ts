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
import { IPublicKey, PublicKey, Distribution, DistributionProps,  KeyGroup, EdgeLambda, LambdaEdgeEventType, IOrigin, OriginAccessIdentity } from '@aws-cdk/aws-cloudfront';
import {S3Origin} from '@aws-cdk/aws-cloudfront-origins';
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';
import {BlockPublicAccess, Bucket, BucketEncryption} from '@aws-cdk/aws-s3'
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment';
import { Function, Version } from '@aws-cdk/aws-lambda';
import { CanonicalUserPrincipal, CompositePrincipal, Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import {SignedKeyPair,KeyPairOptions,SignedKeyPairProps} from './keypair';
import path from 'path';
import {Key} from '@aws-cdk/aws-kms';
import fs from 'fs'; 
export interface SecureSiteProps extends DistributionProps {
    type:SecureSiteType
    securePaths:SignedKeyPairProps[]
    loginPath?:string
    contentPath?:string
    defaultKeyPairOptions?:KeyPairOptions
}


export enum SecureSiteType {
    SIGNED_COOKIE = 'signedCookies',
    SIGNED_URL = 'signedUrl'
}

export class SecureSiteStack extends Distribution {
    signedKeys: SignedKeyPair[]
    oai:OriginAccessIdentity = new OriginAccessIdentity(this, this.getName(this.id,'oai'), {});
    principal = new CanonicalUserPrincipal(this.oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)

    constructor(
        scope:Construct,
        private id:string, 
        private props: SecureSiteProps
    ) {
        super(scope,id);
        
        const paths = [];
        if (typeof props.signedKeys === 'string') props.signedKeys = [props.signedKeys];
        this.signedKeys = props.signedKeys.map(key => {
            const keys = typeof key === 'string' ? {path:key} : key;
            const pair = new SignedKeyPair(keys);
            pair.setItem(this.createPublicKey(pair.publicKey,pair.path));
            paths.push(pair.path);
            return pair;
        },this);
        this.storeParameters('SignedKeyPairPaths',JSON.stringify(paths), true);
    }

    applyRemovalPolicy(policy:RemovalPolicy):void {
        this.applyRemovalPolicy(policy);
    }

    toString():string {
        return this.toString();
    }

    protected createKeyGroup():KeyGroup {
        const nm = this.getName(this.id,'Key-Group');
        const items = this.signedKeys.map(signedKey => signedKey.item);
        return new KeyGroup(this,nm, {
            keyGroupName:nm,
            items
        })
    }

    protected getDistribution():Distribution {
        let login;
        let props = this.props.distributionProps || {}
        if (this.props.loginPath) {
            login = this.props.loginPath;
            if (!fs.existsSync(login)) login = path.join(process.cwd(),login);
        }
        let defaultOrigin;
        if (!props.defaultBehavior?.origin) {
            if (!login) login = path.join(__dirname, './login');
            const loginKey = '/' + login.split('/').pop().split('.').shift();
            defaultOrigin = this.createOrigin(login, loginKey);
        } else {
            defaultOrigin = props.defaultBehavior.origin;
        }
        const defaultBehavior = {
            ...(props.defaultBehavior || {}),
            origin:defaultOrigin,
            edgeLambdas: [this.getEdgeLambda()]
        }
        let content,contentKey, contentOrigin;
        if (this.props.contentPath) {
            content = this.props.contentPath;
            if (!fs.existsSync(content)) content = path.join(process.cwd(),content);
            if (fs.existsSync(content)) {
                contentKey = '/' + content.split('/').pop().split('.').shift();
                contentOrigin = this.createOrigin(content, contentKey);
            } else {
                content = undefined;
            }
        }
        if (!content && props.additionalBehaviors) {
            const keys = Object.keys(props.additionalBehaviors);
            if (keys.length) {
                let contentKey = keys.find(keyName => /(home|main|index|src)/.test(keyName));
                if (!contentKey) contentKey = keys[0];
                content = props.additionalBehaviors[contentKey];
                contentOrigin = content.origin;
            }
        }
        if (!content || !contentKey || !contentOrigin) throw new Error('Can\'t find Destination Origin, please add origin to distribution');
        const additionalBehaviors = {            
            ...(props.additionalBehaviors || {}),
            [contentKey]: {
                ...((props.additionalBehaviors || {})[contentKey] || {}),
                origin:contentOrigin
            }, 
        }
        
        return new Distribution(this,this.getName(this.id,'Distribution'), {
            ...(this.props.cloudFrontDistributionProps || {}),
            defaultBehavior,
            additionalBehaviors
        });
    }

    protected createOrigin(content:string, key:string = '/'):IOrigin {
        const bucket = new Bucket(this,this.getName(this.id, content, 'Bucket'), {
            encryption:BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            versioned:true,
            lifecycleRules: [
                { abortIncompleteMultipartUploadAfter: Duration.days(2) },
                { noncurrentVersionExpiration: Duration.days(10) }
            ]

        });
        new BucketDeployment(this, this.getName(this.id,content,'ContentDeployment'), {
            sources:[Source.asset(content)],
            destinationBucket:bucket,
            destinationKeyPrefix:key
        });

        const statement = new PolicyStatement({
            actions:['s3:ListBucket', 's3:GetBucket', 's3:GetObject'],
            resources:[bucket.bucketArn, bucket.arnForObjects('*')],
            principals: [this.principal]
        });
        bucket.addToResourcePolicy(statement);
        return new S3Origin(bucket, {
            originAccessIdentity:this.oai,
            originPath:key
        });
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
        const role = new Role(this, this.getName(name, 'Role'), {
            assumedBy:principal,
            roleName:this.getUniqueName(name)
        });
        role.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, this.getUniqueName(name,'ManagedPolicy'), 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'));
        return role;
    }


    protected getEdgeLambda():EdgeLambda {
        const publicNm = this.getName(this.id, 'LambdaFunction');
        const Role = this.makeLambdaRole(publicNm);
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {
            service:'Lambda',
            physicalResourceId:PhysicalResourceId.fromResponse('FunctionArn'),
            region:'us-east-1'
        }
        const Code = fs.readFileSync(path.join(__dirname,'./lambda/index.js'));
        const parameters = {
            FunctionName:publicNm,
            Publish:true
        }
        const cr = new AwsCustomResource(this,this.getName(publicNm, 'Resource'),{
            ...resourceOptions,
            onCreate: {
                ...eventOptions,
                action:'createFunction',
                parameters: {
                    ...parameters,
                    Handler: `index.${this.props.type as string}`,
                    Code,
                    Role
                }
            },
            onUpdate: {
                ...eventOptions,
                action:'updateFunctionCode',
                parameters: {
                    ...parameters,
                    ZipFile:Code
                }
            },
            onDelete: {
                ...eventOptions,
                action:'deleteFunction',
                parameters: {
                    FunctionName:publicNm
                }
            }
        });
        const fn = Function.fromFunctionArn(this, this.getName(publicNm,'Function'), cr.getResponseField('FunctionArn'));
        const vs = new Version(this,this.getName(publicNm,'Version'), {
            lambda:fn
        });
        return {
            eventType:LambdaEdgeEventType.VIEWER_REQUEST,
            functionVersion:vs
        }
    }

    private createPublicKey(
        key:string, 
        path, 
        keyPairName?:string,
        comment?:string
    ): IPublicKey {
        const publicNm = this.getName(this.id, 'PublicKey', path.substring(1) || '');
        const pkName = this.getUniqueName(publicNm);
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {
            service:'CloudFront',
            physicalResourceId:PhysicalResourceId.fromResponse('PublicKey.Id')
        }
        const cr = new AwsCustomResource(this,this.getName(keyPairName || publicNm, 'Resource'),{
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
        return PublicKey.fromPublicKeyId(this, publicNm, keyId);
    }

    private storeParameters(
        key:string,
        value:string, 
        output?: boolean
    ) {
        const publicNm = this.getName(this.id, key, 'PathParams');
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const encryptionKey = new Key(this,this.getName(publicNm,'EncryptionKey'), {
            enableKeyRotation:true,
            admins:[this.principal]
        })
        const resourceOptions = {policy, installLatestAwsSdk:true}
        const eventOptions = {
            service:'SSM',
            region:'us-east-1'
        }
        const parameters = {
            Name: key,
      
        }
        new AwsCustomResource(this,publicNm,{
            ...resourceOptions,
            onUpdate: {
                ...eventOptions,
                action:'putParameter',
                physicalResourceId:PhysicalResourceId.of(this.getUniqueName(key)),
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
                physicalResourceId:PhysicalResourceId.of(this.getUniqueName(key)),
                action:'deleteParameter',
                parameters
            }
        });
      
        if (output) {
            new CfnOutput(this,`${key}Output`, {
                exportName:key,
                value
            })
        }
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