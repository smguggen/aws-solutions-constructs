import { RuleGroupReferenceStatement, ExcludedRule } from "../../../types";
import { WafOverrideStatement } from "../override";

export class RuleGroupReference extends WafOverrideStatement implements RuleGroupReferenceStatement {
    ARN:string
    ExcludedRules:ExcludedRule[] = []

    get():RuleGroupReferenceStatement {
        if (!this.ARN) throw new Error('RuleGroupReferenceStatement requires ARN property');
        const res:any = {
            ARN:this.ARN
        }
        if (this.ExcludedRules.length) {
            res.ExcludedRules = this.ExcludedRules
        }
        return res;
    }

    arn(str:string):this {
        this.ARN = str;
        return this;
    }

    excludedRule(str:string):this {
        const st = typeof str === 'string' ? {Name:str} : str
        this.ExcludedRules.push(st);
        return this;
    }

    removeExcludedRule(str:string):this {
        this.ExcludedRules = this.ExcludedRules.filter(rule => rule.Name !== 'string');
        return this;
    }

    excludedRules(...str:string[]):this {
        const strs = str.map(st =>  typeof st === 'string' ? {Name:st} : st);
        this.ExcludedRules = this.ExcludedRules.concat(strs);
        return this;
    }
}