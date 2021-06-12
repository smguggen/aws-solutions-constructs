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

import {Construct, CfnTag} from '@aws-cdk/core';
import {DistributionProps} from '@aws-cdk/aws-cloudfront';
import {CfnWebACL, CfnWebACLProps} from '@aws-cdk/aws-wafv2';

export interface WafToCloudFrontProps {
    distributionProps: DistributionProps

    defaultAction?:DefaultAction | CfnWebACL.DefaultActionProperty
    name?:string
    description?:string
    customResponseBodies?:CustomResponseBody[]
    cloudWatchMetricsEnabled?:boolean
    sampledRequestsEnabled?:boolean
    tags?: (CfnTag | {[name:string]:any})[]
}

interface WebACLRuleOptions {
    priority?:number
    visibilityConfig?:CfnWebACL.VisibilityConfigProperty
    labels?:string[]
}

export interface WebAclRuleGroup extends WebACLRuleOptions {
    action?: CfnWebACL.OverrideActionProperty
    statement: RuleGroupStatementProperty
}

export interface WebAclRule extends WebACLRuleOptions {
    action?:CfnWebACL.RuleActionProperty
    statement: Omit<CfnWebACL.StatementProperty, 'managedRuleGroupStatement' | 'ruleGroupReferenceStatement'>
}

export type RuleGroupStatementProperty = {
    managedRuleGroupStatement?:CfnWebACL.ManagedRuleGroupStatementProperty 
    ruleGroupReferenceStatement?:CfnWebACL.RuleGroupReferenceStatementProperty
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

export enum RuleAction {
    Allow = 'allow',
    Block = 'block',
    Count = 'count'
}

export enum OverrideAction {
    Count = 'count',
    None = 'none'
}

export enum DefaultAction {
    Allow = 'allow',
    Block = 'block'
}

export enum WebACLStatementType {
    Statement = 'STATEMENT',
    Action = 'ACTION',
    Override = 'OVERRIDE',
    Custom = 'CUSTOM'
}

export enum CustomStatement {
    Default = 'DEFAULT',
    RateBased = 'RATE_BASED',
}


export class WafToCloudFront extends Construct {
    readonly name = this.props.name || this.id
    visibilityConfig = this.getVisibilityConfig(this.name, this.props.cloudWatchMetricsEnabled, this.props.sampledRequestsEnabled)

    constructor(
        protected scope:Construct, 
        protected id:string,
        protected props:WafToCloudFrontProps
    ) {
        super(scope,id);
    }

    getRuleAction(action:RuleAction): CfnWebACL.RuleActionProperty {
        return this.getAction(action) as CfnWebACL.RuleActionProperty;
    }

    getOverrideAction(action:OverrideAction): CfnWebACL.OverrideActionProperty {
        return this.getAction(action) as CfnWebACL.OverrideActionProperty;
    }

    getDefaultAction(action:DefaultAction | CfnWebACL.DefaultActionProperty): CfnWebACL.DefaultActionProperty {
        if (typeof action === 'string') {
            return this.getAction(action) as CfnWebACL.DefaultActionProperty;
        }
        return action;
    }

    protected getWebAclProps(): CfnWebACLProps { 
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
            rules:[]
        }
    }

    protected getRule():CfnWebACL.RuleProperty {}

    protected getVisibilityConfig(
        name:string,
        metricsEnabled?:any, 
        requestsEnabled?:any
    ): CfnWebACL.VisibilityConfigProperty {
        const cloudWatchMetricsEnabled = typeof metricsEnabled === 'boolean' ?metricsEnabled : true; 
        const sampledRequestsEnabled = typeof requestsEnabled === 'boolean' ?requestsEnabled : true;
        return {
            cloudWatchMetricsEnabled,
            metricName: name,
            sampledRequestsEnabled
        }
    }

    protected getCustomResponseBodies(body:CustomResponseBody[] = []): {
        [name:string]:CfnWebACL.CustomResponseBodyProperty
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

    protected getManagedStatement(name:string,vendor:string,excluded?:string[]): CfnWebACL.ManagedRuleGroupStatementProperty {
        return {
            name,
            vendorName:vendor, 
            excludedRules: excluded ? excluded.map(rule => { return {name:rule} }) : undefined
        }
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

    private getAction(action:string):
        CfnWebACL.RuleActionProperty | 
        CfnWebACL.OverrideActionProperty | 
        CfnWebACL.DefaultActionProperty
    {
        return {
            [action]: {}
        }
    }

    private getRuleLabel(label:string):CfnWebACL.LabelProperty {
        return {
            name:label
        }
    }
}