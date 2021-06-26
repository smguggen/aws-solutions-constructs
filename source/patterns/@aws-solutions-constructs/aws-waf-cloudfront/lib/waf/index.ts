import {Construct} from '@aws-cdk/core'
//import {CfnWebACL,CfnWebACLProps} from 'monocdk/aws-wafv2';
//import {getName,getUniqueName} from '../util';
//import {CFManagedRule} from './rules/rule';
//import {CF} from '..';

export class CFWaf {
    acl: CfnWebACL
    options: CfnWebACLProps

    constructor(
        public scope: Construct, 
        public name: string, 
        options:CF.Waf.Options = {}
    ) {
        this.init(options);
    }

    get arn(): string {
        return this.acl.attrArn;
    }

    static getWafArn(scope:Construct, name:string, options:CF.Waf.Options | boolean | string | CF.Waf.RuleActions): string {
        if (typeof options === 'string') {
            return options;
        } else {
            let wafOptions:CF.Waf.Options = {};
            if (typeof options !== 'boolean') {
                if (options.hasOwnProperty('default')) {
                    wafOptions = {
                        actions:options as CF.Waf.RuleActions
                    }
                } else {
                    wafOptions = options as CF.Waf.Options;
                }
            }
            const waf = new CFWaf(scope, getName(name, 'WAF'), wafOptions);
            return waf.arn;
        }
    }

    init(options:CF.Waf.Options = {}) { 
        this.options = Object.assign({}, {
                scope: 'CLOUDFRONT',
                visibilityConfig: {
                    cloudWatchMetricsEnabled: true,
                    metricName: getUniqueName(this.name, 'Metrics'),
                    sampledRequestsEnabled: true
                },
                name:this.name
            }, options || {}, {
                defaultAction: this.parseDefaultAction(options),
                rules: this.parseRules(options.rules)
            }
        );
        this.acl = new CfnWebACL(this.scope, this.name, this.options);
    }

    parseDefaultAction(options:CF.Waf.Options = {}): CfnWebACL.Sdk.DefaultActionProperty {
        let actionKey: keyof CfnWebACL.Sdk.DefaultActionProperty; 
        if (options.defaultAction) {
            actionKey = options.defaultAction;
        } else if (options.actions && options.actions.default) {
            actionKey = options.actions.default;
        } else {
            actionKey = 'allow';
        }
        return {[actionKey]:{}}
    }

    parseRules(rules:(CfnWebACL.Sdk.RuleProperty | CFManagedRule)[] = []): CfnWebACL.Sdk.RuleProperty[] {
        if (!rules || !rules.length) return this.getDefaultRules();
        return rules.map(rule => {
            if (rule instanceof CFManagedRule) {
                return rule.get();
            } else {
                return rule;
            }
        })
    }

    getVisibility(name:string = getName(this.name, 'Visibility'), metrics:boolean = true, samples:boolean = false): CfnWebACL.Sdk.VisibilityConfigProperty {
        return {
            cloudWatchMetricsEnabled: metrics,
            metricName: name,
            sampledRequestsEnabled: samples
        }
    }

    getDefaultRules(options:CF.Waf.Options = {}): CfnWebACL.Sdk.RuleProperty[] {
        const action = options.actions && CFManagedRule.isRuleAction(options.actions.rules) ? options.actions.rules : 'none';
        return [
            {key: 'adminProtection', value: 'AWSManagedRulesAdminProtectionRuleSet'},
            {key: 'core', value:'AWSManagedRulesCommonRuleSet'},
            {key:'knownBadInputs', value:'AWSManagedRulesKnownBadInputsRuleSet'}
        ].map((name, ind) => CFManagedRule.get(name.key, name.value, ind, action))
    }
}

export {CFManagedRule, CFManagedStatement} from './rules';
