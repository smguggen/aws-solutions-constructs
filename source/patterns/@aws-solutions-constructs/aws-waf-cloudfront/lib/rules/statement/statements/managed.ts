import { ManagedRuleGroupStatement,ExcludedRule,WebACLStatement } from "../../../types";
import { WafOverrideStatement } from "../override";

export class ManagedRuleGroup extends WafOverrideStatement implements ManagedRuleGroupStatement {
    Name:string
    VendorName:string
    ExcludedRules:ExcludedRule[] = []
    ScopeDownStatement?:WebACLStatement

    get():ManagedRuleGroupStatement {
        if (!this.Name) throw new Error('ManagedRuleGroupStatement requires Name property');

        if (!this.VendorName) throw new Error('ManagedRuleGroupStatement requires VendorName property');
        const res:any = {
            Name:this.Name,
            VendorName:this.VendorName,
            ScopeDownStatement:this.ScopeDownStatement
        }
        if (this.ExcludedRules.length) {
            res.ExcludedRules = this.ExcludedRules
        }
        return res;
    }

    name(str:string):this {
        this.Name = str;
        return this;
    }

    vendorName(str:string):this {
        this.VendorName = str;
        return this;
    }
    vendor(str:string):this {
        return this.vendorName(str);
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

    scopeDownget(statement:WebACLStatement):this {
        this.ScopeDownStatement = statement;
        return this;
    }
}