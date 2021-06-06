import { IOrigin, IOriginAccessIdentity, OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { S3Origin, S3OriginProps } from "@aws-cdk/aws-cloudfront-origins";
import { CanonicalUserPrincipal, PolicyStatement } from "@aws-cdk/aws-iam";
import { IBucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import {ISignedKeyPair, SignedKeyPair} from './keypair'
import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';
import {randomBytes} from 'crypto';
import { Key } from "@aws-cdk/aws-kms";
import { CfnOutput } from "@aws-cdk/core";

export interface SecureOriginProps<Type extends OriginSecurityType> {
    originSecurityType:Type
    originPath?:string
    pathMatches?:string[]
    originAccessIdentity?:OriginAccessIdentity
    signedKeyPair?:SignedKeyPair
    contentPath?:string
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

export enum OriginSecurityType {
    SIGNED_COOKIE = 'signedCookies',
    SIGNED_URL = 'signedUrl',
    PUBLICLY_AVAILABLE = 'publiclyAvailable'
}

export class SecureOrigin<Type extends OriginSecurityType> extends S3Origin implements IOrigin {
    public originPath:string = this.props.originPath && !(['/', '/*'].includes(this.props.originPath)) ? this.props.originPath : '*' ;
    public name:string = SecureOrigin.getParameterKey(this.originPath || '*').replace('/', '_');
    public readonly signedKeyPair?:SignedKeyPair = this.props.originSecurityType === OriginSecurityType.PUBLICLY_AVAILABLE ? undefined : this.props.signedKeyPair;
    public readonly originAccessIdentity = this.props.originAccessIdentity || new OriginAccessIdentity(this.bucket.stack, `${this.name}OriginAccessIdentity`,{});
    public readonly principal = new CanonicalUserPrincipal(this.originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId);
    public pathMatches:string[] = 
    constructor(
        public bucket:IBucket, 
        protected props:SecureOriginProps<Type>
    ) {
        super(bucket,props);
        if (props.originSecurityType !== OriginSecurityType.PUBLICLY_AVAILABLE && !this.signedKeyPair) throw new Error('Signed Key Pair is required if  Origin Security Type is not "Publicly Available"');
        this.getBucketDeployment();
        if (props.originSecurityType !== OriginSecurityType.PUBLICLY_AVAILABLE) {

        }

    }

    getBucketDeployment():BucketDeployment | null {
        if (!this.props.contentPath) return null;
        const deployment = new BucketDeployment(this.bucket.stack, `${this.bucket.bucketName}SecureOriginDeployment${this.name}`, {
            sources:[Source.asset(this.props.contentPath)],
            destinationBucket:this.bucket,
            destinationKeyPrefix:this.originPath
        })
        const statement = new PolicyStatement({
            actions:['s3:ListBucket', 's3:GetBucket', 's3:GetObject'],
            resources:[this.bucket.bucketArn, this.bucket.arnForObjects(this.originPath)],
            principals: [this.principal]
        });
        this.bucket.addToResourcePolicy(statement);
        return deployment;        
    }

    storeParameters(
        key:string,
        value:string, 
        output?: boolean
    ):this {
        const scope = this.bucket.stack;
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const encryptionKey = new Key(scope, this.name + 'EncryptionKey', {
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
        new AwsCustomResource(scope,this.name,{
            ...resourceOptions,
            onUpdate: {
                ...eventOptions,
                action:'putParameter',
                physicalResourceId:PhysicalResourceId.of(`${this.name}_${key}`),
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
                physicalResourceId:PhysicalResourceId.of(`${this.name}_${key}`),
                action:'deleteParameter',
                parameters
            }
        });
      
        if (output) {
            new CfnOutput(scope,`${this.name}_${key}_Output`, {
                exportName:key,
                value
            })
        }
        return this;
    }

    static getParameterKey(str:string):string {
        return str
            .replace('*', '_STAR_')
            .replace('/', '_SLASH_')
            .replace(/[^a-z0-9\-\.\_\s]/i, '.')
            .replace(/^(aws|ssm)/i, (match:any,p1:any) => `PREFIX_${p1}_`)
    }
}