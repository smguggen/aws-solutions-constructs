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

import {Construct, CfnTag,CfnOutput} from '@aws-cdk/core';
import {DistributionProps} from '@aws-cdk/aws-cloudfront';
import {AwsCustomResource,AwsCustomResourcePolicy, PhysicalResourceId} from '@aws-cdk/custom-resources';
import {CfnWebACL, CfnWebACLProps} from '@aws-cdk/aws-wafv2';

export interface WafToCloudFrontProps {
    distributionProps: DistributionProps
    defaultAction?:DefaultAction | CfnWebACL.Sdk.DefaultActionProperty
    name?:string
    description?:string
    customResponseBodies?:CustomResponseBody[]
    cloudWatchMetricsEnabled?:boolean
    sampledRequestsEnabled?:boolean
    tags?: (CfnTag | {[name:string]:any})[]
    rules?: CfnWebACL.Sdk.RuleProperty[]
    includeMinimalRuleConfig?:boolean
}

export interface CustomResponseBody {
    key:string
    type:CustomResponseBodyType
    content:string | {[name:string]:any}
}

export enum CustomResponseBodyType {
    Json = 'APPLICATION_JSON',
    Html = 'TEXT_HTML',
    Plain = 'TEXT_PLAIN'
}

export enum DefaultAction {
    Allow = 'allow',
    Block = 'block'
}

export class WafToCloudFront extends Construct {
    readonly name = this.props.name || this.id
    visibilityConfig = this.getVisibilityConfig(this.name, this.props.cloudWatchMetricsEnabled, this.props.sampledRequestsEnabled)
    rules:CfnWebACL.Sdk.RuleProperty[] = this.getRules()
    constructor(
        protected scope:Construct, 
        protected id:string,
        protected props:WafToCloudFrontProps
    ) {
        super(scope,id);


    }
    getMinimalRuleConfig(
        action: 'none' | 'count' = 'none',
        excluded?:(string | CfnWebACL.Sdk.ExcludedRuleProperty)[],
        scopeDownStatement?: CfnWebACL.Sdk.StatementProperty
    ): CfnWebACL.Sdk.RuleProperty[] {
        const props = {
            visibilityConfig:this.getVisibilityConfig(`${this.name}MinimalRuleConfig`, true,true),
            overrideAction: {[action]:{}},
        }
        const excludedRules = excluded ? excluded.map(ex => {
            if (typeof ex === 'string') {
                ex = {
                    name: ex
                }
            }
            return ex;
        }) : undefined;
        return [
            {key: 'adminProtection', value: 'AWSManagedRulesAdminProtectionRuleSet'},
            {key: 'core', value:'AWSManagedRulesCommonRuleSet'},
            {key:'knownBadInputs', value:'AWSManagedRulesKnownBadInputsRuleSet'}
        ].map((name, ind) => {
            return {
                ...props,
                name:name.key,
                priority:ind,
                statement: {
                    managedRuleGroupStatement: {
                        name:name.value,
                        vendorName:'AWS',
                        excludedRules,
                        scopeDownStatement
                    }
                }
            }
        });
    }

    protected getWebACL(): AwsCustomResource {
        const name = `${this.name}WebACL`;
        const policy = AwsCustomResourcePolicy.fromSdkCalls({resources:AwsCustomResourcePolicy.ANY_RESOURCE});
        const resourceOptions = {
            policy,
            installLatestAwsSdk:true
        }
        const eventOptions = {
            service:'WAFV2',
            region:'us-east-1'
        }
        const listCr = new AwsCustomResource(this.scope, name, {
            ...resourceOptions,
            onUpdate: {
                ...eventOptions,
                action:'createWebACL',
                parameters: {
                    Scope: 'CLOUDFRONT',
                    Region: 'us-east-1'
                }
            }
        });
        const list = listCr.getResponseField('WebACLs');
        let acl;
        if (list )
    }

    protected getWebACLProps(): CfnWebACLProps { 
        const customResponseBodies = this.props.customResponseBodies ? this.getCustomResponseBodies(this.props.customResponseBodies) : undefined;
        const tags = this.props.tags ? this.getTags(this.props.tags) : undefined;
        return {
            defaultAction: this.getDefaultAction(this.props.defaultAction || DefaultAction.Allow),
            scope: 'CLOUDFRONT',
            visibilityConfig:this.visibilityConfig,
            name:this.name,
            customResponseBodies,
            tags,
            description:this.props.description,
            rules:this.rules
        }
    }

    protected getDefaultAction(action:DefaultAction | CfnWebACL.Sdk.DefaultActionProperty): CfnWebACL.Sdk.DefaultActionProperty {
        if (typeof action === 'string') {
            return {
                [action]: {}
            }
        }
        return action;
    }

    protected getRules():CfnWebACL.Sdk.RuleProperty[] {
        let res = [];
        if (this.props.rules) res = res.concat(this.props.rules);
        if (this.props.includeMinimalRuleConfig || !res.length) res = res.concat(this.getMinimalRuleConfig());

        return res;
    }
    protected getVisibilityConfig(
        name:string,
        metricsEnabled?:any, 
        requestsEnabled?:any
    ): CfnWebACL.Sdk.VisibilityConfigProperty {
        const cloudWatchMetricsEnabled = typeof metricsEnabled === 'boolean' ?metricsEnabled : true; 
        const sampledRequestsEnabled = typeof requestsEnabled === 'boolean' ?requestsEnabled : true;
        return {
            cloudWatchMetricsEnabled,
            metricName: name,
            sampledRequestsEnabled
        }
    }

    protected getCustomResponseBodies(body:CustomResponseBody[] = []): {
        [name:string]:CfnWebACL.Sdk.CustomResponseBodyProperty
    } {
        const $this = this;
        return body.reduce((acc,b) => {
            const content = $this.validateCustomResponseBodyContent(b);
            acc[b.key] = {
                content,
                contentType:b.type as string
            }
            return acc;
        }, {});
    }

    protected getTags(tags:any): CfnTag[] {
        let res:CfnTag[] = [];
        if (tags && typeof tags === 'object') {
            for (const key in tags) {
                if (tags.hasOwnProperty(key)) {
                    const tag = tags[key];
                    if (tag.key && tag.value) {
                        tag.value = this.validateTagValue(tag.value);
                        res.push(tag);
                    } else {
                        res.push({
                            key,value:this.validateTagValue(tag)
                        })
                    }
                }
            }
        }
        return res;
    }

    private validateCustomResponseBodyContent(body:CustomResponseBody): string {
        const content = body.content;
        let con:string = '';
        if (typeof content !== 'string') {
            try {
                con = JSON.stringify(content);
            } catch(e) {
                if (body.type === CustomResponseBodyType.Json) {
                    throw new Error('Invalid Custom Response Body. Content type is APPLICATION_JSON but content is not valid JSON');
                }
                try {
                    con = content.toString();
                } catch(e) {
                    throw new Error('Invalid Custom Response Body. Content cannot be converted into string');
                }
            }
        } else {
            con = content;
        }
        if (!con) throw new Error('Custom Response Body Content cannot be empty string')
        if (con.length > 10240) throw new Error('Invalid Custom Response Body.Content cannot be longer then 10,240 characters');
        if (!/[\s\S]*/.test(con)) throw new Error('Invalid Custom Response Body. Content must follow regular expression pattern /[\s\S]*/')
        return con;
    }

    private validateTagValue(value:any): string {
        if (typeof value !== 'string') {
            try {
                return value.toString();
            } catch(e) {
                throw new Error(`WebAcl failed to create; ${value} is not a valid tag value`);
            }
        }
        return value;
    }
}