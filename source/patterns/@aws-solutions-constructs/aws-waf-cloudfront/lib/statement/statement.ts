import {ActionHandler} from './action';
import {
    MatchHandler,
    FieldToMatch,
    MatchScope,
    TextTransformationType
} from './match';
import {
    ByteMatchStatement
} from '../types';

export enum WafStatement {
    Byte = 'ByteMatchStatement',
    Regex = 'RegexPatternSetStatement',
    Size = 'SizeConstraintStatement',
    Sql = 'SqliMatchStatement',
    Xss = 'XssMatchStatement',

    Geo = 'GeoMatchStatement',
    Label = 'LabelMatchStatement',
    IP = 'IPSetReferenceStatement',

    Rate = 'RateBasedStatement',

    Managed = 'ManagedRuleGroupStatement',
    Group = 'RuleGroupReferenceStatement',

    And = 'AndStatement',
    Or = 'OrStatement',
    Not = 'NotStatement',
    None = ''
}

export interface ActionStatementProps {
    allowHeaders?: {[name:string]:string} | boolean
    blockHeaders?: {[name:string]:string} | boolean
    countHeaders?: {[name:string]:string} | boolean
}

export interface MatchStatementProps extends ActionStatementProps {
    field: FieldToMatch
    value?: string | string[]
    scope?:MatchScope
    textTransformations?:TextTransformationType[]
}

export interface StatementTypeMap {
    match:WafStatement[]
    action:WafStatement[]
    override:WafStatement[]
    nestable:WafStatement[]
    utility:WafStatement[]
}

export interface WafOverrideStatementProps {
    countHeaders?: {[name:string]:string} | boolean
}


export class RuleStatement {
    name:WafStatement = WafStatement.None
    protected type:keyof StatementTypeMap
    protected typeMap:StatementTypeMap = this.$typeMap()

    byteMatch(str:string):MatchHandler {
        this.set(WafStatement.Byte);
        
    }



    set(waf:WafStatement):this {
        this.name = waf;
        this.type = this.getType(waf);
        return this;
    }


    get isValid():boolean {
        return this.name !== WafStatement.None
    }

    get isAction():boolean {
        return this.typeMap.action.includes(this.name);
    }

    get isOverride():boolean {
        return this.typeMap.override.includes(this.name);
    }

    get isNestable():boolean {
        return this.typeMap.nestable.includes(this.name);
    }

    get isUtility():boolean {
        return this.typeMap.utility.includes(this.name);
    }

    reset() {
        this.name === WafStatement.None
    }

    protected getType(waf:WafStatement):keyof StatementTypeMap {
        if (this.typeMap.match.includes(waf)) return 'match';
        if (this.typeMap.nestable.includes(waf)) return  'nestable'; 
        if (this.typeMap.action.includes(waf)) return  'action'; 
        if (this.typeMap.override.includes(waf)) return 'override';
        if (this.typeMap.utility.includes(waf)) return 'utility';
    }



    protected $typeMap():StatementTypeMap {
        const res:any = {};
        res.match = [
            WafStatement.Byte,
            WafStatement.Regex,
            WafStatement.Size,
            WafStatement.Sql,
            WafStatement.Xss,
        ];
        res.nestable = [
            ...res.match,
            WafStatement.Geo,
            WafStatement.Label,
            WafStatement.IP,
        ]
        res.action = [
            ...res.nestable,
            WafStatement.Rate,
        ];
        res.override = [
            WafStatement.Managed,
            WafStatement.Group,
        ];

        res.utility = [
            WafStatement.And,
            WafStatement.Or,
            WafStatement.Not
        ];
        return res;
    }
}   