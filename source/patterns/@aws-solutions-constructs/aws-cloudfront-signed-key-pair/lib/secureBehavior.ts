import { AddBehaviorOptions, Behavior, BehaviorOptions, IOrigin, IOriginAccessIdentity, OriginAccessIdentity } from "@aws-cdk/aws-cloudfront";
import { S3Origin, S3OriginProps } from "@aws-cdk/aws-cloudfront-origins";
import { CanonicalUserPrincipal, PolicyStatement } from "@aws-cdk/aws-iam";
import { Bucket, IBucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import {ISignedKeyPair, SignedKeyPair} from './keypair'

export type PathPattern = string

export enum OriginSecurityType {
    SIGNED_COOKIES = 'signedCookies',
    SIGNED_URL = 'signedUrl',
    PUBLICLY_AVAILABLE = 'publiclyAvailable'
}

export interface ISecureBehavior extends BehaviorOptions {
    originSecurityType?:OriginSecurityType
}

export interface ISecureOrigin extends IOrigin {
    originSecurityType?:OriginSecurityType
}

export interface SecureBehaviorProps {
    bucket:Bucket
    originSecurityType?:OriginSecurityType
    originPath?:PathPattern
    originAccessIdentity?:OriginAccessIdentity
    paths?:string[]
    signedKeyPair?:SignedKeyPair
    contentPath?:string
    behaviorOptions?:Behavior
}

export class SecureBehavior {
    readonly origin:ISecureOrigin = this.getOrigin()
    readonly originPath:string = this.props.originPath && this.props.originPath !== '/' ? this.props.originPath : '*' ;
    readonly originSecurityType:OriginSecurityType = this.props.originSecurityType || OriginSecurityType.PUBLICLY_AVAILABLE
    behavior:Behavior = this.props.behaviorOptions
    readonly signedKeyPair?:SignedKeyPair = this.props.originSecurityType === OriginSecurityType.PUBLICLY_AVAILABLE ? undefined : this.props.signedKeyPair;
    paths:string[] = this.getPaths()
    contentPath?:string = this.props.contentPath

    constructor(private props:SecureBehaviorProps) {
        if (props.originSecurityType !== OriginSecurityType.PUBLICLY_AVAILABLE && !this.signedKeyPair) throw new Error('Signed Key Pair is required if  Origin Security Type is not "Publicly Available"');
    }

    getPaths():string[] {
        let originPath = (this.originPath === '*' ? '/' : this.originPath)
            .replace(/\/*\/?/, '/')
        return [originPath, ...(this.props.paths || [])]
    }

    protected getOrigin():IOrigin {
        return new S3Origin(this.props.bucket,this.props);
    }

}