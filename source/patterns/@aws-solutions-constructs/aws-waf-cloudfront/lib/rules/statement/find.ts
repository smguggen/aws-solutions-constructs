import { StatementProperty } from '../../types';
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

export type NestableStatementInstance = ByteMatch | 
GeoMatch | 
LabelMatch | 
IPSetReference | 
RegexPatternSetReference |
SizeConstraint | 
SqliMatch | 
XssMatch

export type StatementInstance =  NestableStatementInstance |
RateBased |
And |
Or |
Not |
RuleGroupReference |
ManagedRuleGroup

export class FindStatement {
    readonly statements:any = {
        ByteMatch: new ByteMatch(), 
        GeoMatch: new GeoMatch(), 
        LabelMatch: new LabelMatch(), 
        IPSetReference: new IPSetReference(), 
        RegexPatternSetReference:new RegexPatternSetReference(),
        SizeConstraint:new SizeConstraint(), 
        SqliMatch:new SqliMatch(), 
        XssMatch:new XssMatch(),
        RateBased:new RateBased(),
        And:new And(),
        Or:new Or(),
        Not:new Not(),
        RuleGroupReference:new RuleGroupReference(),
        ManagedRuleGroup:new ManagedRuleGroup()
    }

    getStatement($str:any):StatementInstance {
        if (typeof $str === 'string') {
            const str = $str.trim();
            if (/^byte/i.test(str)) return this.statements.ByteMatch;
            if (/^geo/i.test(str)) return this.statements.GeoMatch;
            if (/^label/i.test(str))  return this.statements.LabelMatch;
            if (/^ip/i.test(str))  return this.statements.IPSetReference;
            if (/^reg/i.test(str))  return this.statements.RegexPatternSetReference;
            if (/^size/i.test(str))  return this.statements.SizeConstraint;
            if (/^sql/i.test(str))  return this.statements.SqliMatch;
            if (/^xss/i.test(str))  return this.statements.XssMatch;
            if (/^rate/i.test(str))  return this.statements.RateBased;
            if (/^managed/i.test(str))  return this.statements.ManagedRuleGroup;
            if (/^and/i.test(str))  return this.statements.And;
            if (/^or/i.test(str))  return this.statements.Or;
            if (/^not/i.test(str))  return this.statements.Not;
            if (/(rule|group|reference)/i.test(str))  return this.statements.RuleGroupReference;
            throw new Error(`Can't find Statement to match the term ${$str}`);
        }
        if ($str instanceof ByteMatch ||
            $str instanceof GeoMatch ||
            $str instanceof LabelMatch ||
            $str instanceof IPSetReference ||
            $str instanceof RegexPatternSetReference ||
            $str instanceof SizeConstraint ||
            $str instanceof SqliMatch ||
            $str instanceof XssMatch
        ) return $str;
        throw new Error('Invalid Statement')
    }

    getStatementName($str:StatementProperty | StatementInstance):StatementProperty {
        if (typeof $str === 'string') {
            const str = $str.trim();
            if (/^byte/i.test(str)) return StatementProperty.Byte;
            if (/^geo/i.test(str)) return StatementProperty.Geo;
            if (/^label/i.test(str))  return StatementProperty.Label;
            if (/^ip/i.test(str))  return StatementProperty.IP;
            if (/^reg/i.test(str))  return StatementProperty.Regex;
            if (/^size/i.test(str))  return StatementProperty.Size;
            if (/^sql/i.test(str))  return StatementProperty.Sql;
            if (/^xss/i.test(str))  return StatementProperty.Xss;
            if (/^rate/i.test(str))  return StatementProperty.Rate;
            if (/^managed/i.test(str))  return StatementProperty.Managed;
            if (/^and/i.test(str))  return StatementProperty.And;
            if (/^or/i.test(str))  return StatementProperty.Or;
            if (/^not/i.test(str))  return StatementProperty.Not;
            if (/(rule|group|reference)/i.test(str))  return StatementProperty.Group;
            throw new Error(`Can't find Statement to match the term ${$str}`);
        }
        if ($str instanceof ByteMatch) return StatementProperty.Byte;
        if ($str instanceof GeoMatch) return StatementProperty.Geo;
        if ($str instanceof LabelMatch) return StatementProperty.Label;
        if ($str instanceof IPSetReference) return StatementProperty.IP; 
        if ($str instanceof RegexPatternSetReference) return StatementProperty.Regex;
        if ($str instanceof SizeConstraint) return StatementProperty.Size;
        if ($str instanceof SqliMatch) return StatementProperty.Sql;
        if ($str instanceof XssMatch) return StatementProperty.Xss;
        throw new Error('Invalid Statement')
    }

    isNestable(type:StatementProperty | StatementInstance):boolean {
        if (typeof type === 'string') {
            return [
                'ByteMatchStatement', 'GeoMatchStatement', 
                'LabelMatchStatement', 'IPSetReferenceStatement','RegexPatternSetReferenceStatement','SizeConstraintStatement', 'SqliMatchStatement', 'XssMatchStatement'
            ].includes(type);
        }
        return type instanceof ByteMatch ||
            type instanceof GeoMatch ||
            type instanceof LabelMatch ||
            type instanceof IPSetReference ||
            type instanceof RegexPatternSetReference ||
            type instanceof SizeConstraint ||
            type instanceof SqliMatch ||
            type instanceof XssMatch
    }
}