import {CFManagedStatement} from './statement'
import {CfnWebACL} from 'monocdk/aws-wafv2';
import {CF} from '../..';
import {getName,capitalize} from '../../util';

export class CFManagedRule {
    statement:CfnWebACL.Sdk.StatementOneProperty
    Statement: any
    visibility: CfnWebACL.Sdk.VisibilityConfigProperty
    Visibility:any
    actionType: 'action' | 'override';
    readonly action?: CfnWebACL.Sdk.RuleActionProperty
    readonly override?: CfnWebACL.Sdk.OverrideActionProperty
    readonly Action:any
    readonly Override:any

    constructor(
        public name: string,
        public statementName: string,
        public vendor:string = 'AWS',
        public priority:number = 0,
        action: CF.Waf.RuleAction = 'count',
        public excluded: string[] = [],
        visibility?: CfnWebACL.Sdk.VisibilityConfigProperty
    ) {
        this.statement = this.getStatement();
        this.Statement = this.GetStatement();
        this.visibility = visibility ? visibility : {
            cloudWatchMetricsEnabled: true,
            metricName: getName(name, 'Visibility'),
            sampledRequestsEnabled: true
        };
        this.Visibility = visibility ? visibility : {
            CloudWatchMetricsEnabled: true,
            MetricName: getName(name, 'Visibility'),
            SampledRequestsEnabled: true
        };
        this.actionType = this.statement.managedRuleGroupStatement || this.statement.ruleGroupReferenceStatement ? 'override' : 'action';
        const obj = this.getAction(action);
        const Obj = this.GetAction(action);
        if (this.actionType === 'action') {
            this.action = obj;
            this.Action = Obj;
        } else {
            this.override = obj;
            this.Override = Obj;
        }
    }

    static isRuleAction(name:any):boolean {
        return ['allow', 'block', 'count', 'none'].includes(name);
    }

    static IsRuleAction(name:any):boolean {
        return ['Allow', 'Block', 'Count', 'None'].includes(name);
    }

    static get(name: string, statementName:string, priority: number, action?: CF.Waf.RuleAction, excluded?:string[],vendor?:string): CfnWebACL.Sdk.RuleProperty {
        return (new CFManagedRule(name, statementName, vendor, priority, action, excluded)).get();
    }

    static Get(name: string, statementName:string, priority: number, action?: CF.Waf.RuleAction, excluded?:string[],vendor?:string): CfnWebACL.Sdk.RuleProperty {
        return (new CFManagedRule(name, statementName, vendor, priority, action, excluded)).Get();
    }

    get(): CfnWebACL.Sdk.RuleProperty {
        return {
            name: this.name,
            priority: this.priority,
            statement: this.statement,
            visibilityConfig: this.visibility,
            action: this.action ? this.action : undefined,
            overrideAction: this.override ? this.override : undefined
        }
    }

    Get(): any {
        return {
            Name: this.name,
            Priority: this.priority,
            Statement: this.Statement,
            VisibilityConfig: this.Visibility,
            Action: this.Action ? this.Action : undefined,
            OverrideAction: this.Override ? this.Override : undefined
        }
    }

    getAction(action: CF.Waf.RuleAction): any {
        const res:any = {}
        res[action] = {}
        return res;
    }

    GetAction(action: CF.Waf.RuleAction): any {
        const res:any = {}
        res[capitalize(action)] = {}
        return res;
    }

    getStatement(): CfnWebACL.Sdk.StatementOneProperty {
        return CFManagedStatement.get(this.statementName, this.vendor, this.excluded);
    }

    GetStatement(): CfnWebACL.Sdk.StatementOneProperty {
        return CFManagedStatement.Get(this.statementName, this.vendor, this.excluded);
    }
}