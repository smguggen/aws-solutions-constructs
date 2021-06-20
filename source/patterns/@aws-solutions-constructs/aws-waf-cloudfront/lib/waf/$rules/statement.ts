import {CfnWebACL} from '@aws-cdk/aws-wafv2';

export class CFManagedStatement {
    excluded: CfnWebACL.ExcludedRuleProperty[]

    constructor(
        public name: string,
        public vendor: string = 'AWS',
        excluded: string[] = []
    ) {
        this.exclude(...excluded);
    }

    static get(name: string, vendor: string, excluded: string[] = []): CfnWebACL.StatementOneProperty {
        return (new CFManagedStatement(name,vendor,excluded)).get();
    }

    static Get(name: string, vendor: string, excluded: string[] = []): CfnWebACL.StatementOneProperty {
        return (new CFManagedStatement(name,vendor,excluded)).Get();
    }

    get(): CfnWebACL.StatementOneProperty {
        return {
            managedRuleGroupStatement: this.getManagedStatement()
        }
    }

    Get(): any {
        return {
            ManagedRuleGroupStatement: this.GetManagedStatement()
        }
    }

    get hasExcluded():boolean {
        return this.excluded && this.excluded.length ? true : false
    }

    exclude(...names:string[]): this {
        if (names && names.length) names.forEach(a => this.$exclude(a),this);
        return this;
    }

    include(...names:string[]): this {
        if (names && names.length) names.forEach(a => this.$include(a),this);
        return this;
    }

    getManagedStatement(): CfnWebACL.ManagedRuleGroupStatementProperty {
        return {
            name:this.name, 
            vendorName:this.vendor, 
            excludedRules: this.hasExcluded ? this.excluded : undefined  
        }
    }

    GetManagedStatement(): any {
        return {
            Name:this.name, 
            VendorName:this.vendor, 
            ExcludedRules: this.hasExcluded ? this.excluded : undefined  
        }
    }

    protected $exclude(name: string): this {
        if (!(this.excluded.some(a => a.name === name))) {
            this.excluded.push({name});
        }
        return this;
    }

    protected $include(name:string): this {
        const excluded = this.excluded.findIndex(a => a.name === name);
        if (excluded > -1) this.excluded.splice(excluded, 1);
        return this;
    }
}