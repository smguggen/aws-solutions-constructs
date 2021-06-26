import { FindStatement, StatementInstance } from './find';
import {    
    ByteMatch, 
    GeoMatch, 
    LabelMatch, 
    IPSetReference, 
    RegexPatternSetReference,
    SizeConstraint, 
    SqliMatch, 
    XssMatch,
    RateBased,
    And,
    Or,
    Not,
    RuleGroupReference,
    ManagedRuleGroup
} from './statements'
import {StatementProperty,WebACLStatement,NestableStatement} from '../../types';
export class RuleStatement {
    type:StatementProperty
    statement:StatementInstance
    private finder = new FindStatement()
    
    get():WebACLStatement {
        return {
            [this.type]: {

            }
        }
    }
    set(type:StatementProperty):StatementInstance {
        this.type = type;
        this.statement = this.finder.getStatement(type);
        return this.statement;
    }

    and(...types:(StatementProperty | StatementInstance)[]) {
        types.unshift(this.type);
        this.set(StatementProperty.And) as And;

    }

    or(...types:(StatementProperty | StatementInstance)[]) {
        types.unshift(this.type);
        this.set(StatementProperty.Or) as Or;

    }
    not(...types:(StatementProperty | StatementInstance)[]) {
        types.unshift(this.type);
        this.set(StatementProperty.And) as Not;
    }
    byte():ByteMatch {
        return this.set(StatementProperty.Byte) as ByteMatch;
    }
    regex():RegexPatternSetReference {
       return this.set(StatementProperty.Regex) as RegexPatternSetReference;
    }
    size():SizeConstraint {
        return this.set(StatementProperty.Size) as SizeConstraint;
    }
    sql():SqliMatch {
        return this.set(StatementProperty.Sql) as SqliMatch;
    }
    xss():XssMatch {
        return this.set(StatementProperty.Xss) as XssMatch;
    }
    geo():GeoMatch {
        return this.set(StatementProperty.Geo) as GeoMatch;
    }
    label():LabelMatch {
        return this.set(StatementProperty.Label) as LabelMatch;
    }
    ip():IPSetReference {
        return this.set(StatementProperty.IP) as IPSetReference;
    }
    rate():RateBased {
        return this.set(StatementProperty.Rate) as RateBased;
    }
    managed():ManagedRuleGroup {
        return this.set(StatementProperty.Managed) as ManagedRuleGroup;
    }
    group():RuleGroupReference {
        return this.set(StatementProperty.Group) as RuleGroupReference;
    }
    get utility():'And' | 'Or' | 'Not' | null {
        const ut = ['AndStatement', 'OrStatement', 'NotStatement'].includes(this.type);
        if (ut) return this.type.replace('Statement', '') as 'And' | 'Or' | 'Not';
        return null;
    }

    isNestable(type:StatementProperty):boolean {
        return [
            'ByteMatchStatement', 'GeoMatchStatement', 
            'LabelMatchStatement', 'IPSetReferenceStatement','RegexPatternSetReferenceStatement','SizeConstraintStatement', 'SqliMatchStatement', 'XssMatchStatement'
        ].includes(type);
    }
    private getUtility(type?:string): 'And' | 'Or' | 'Not' {
        const res = type.substring(0,1).toUpperCase() + type.substring(1).toLowerCase();
        if (!(['And','Or','Not'].includes(res))) throw new Error(`${res} is not a Utility Type`);
        return res as 'And' | 'Or' | 'Not';
    } 

}