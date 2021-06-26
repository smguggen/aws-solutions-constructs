import {
    FieldToMatch,
    TextTransformation,
    FieldToMatchProperty,
    TextTransformationProperty,
    MatchScope
} from '../../types';
import { WafActionStatement } from './action';

export class MatchHandler extends WafActionStatement {

    params:any = {}
    FieldToMatch:FieldToMatch
    protected textTransformationTypes:TextTransformationProperty[] = []

    get():any {
        if (!this.FieldToMatch) this.FieldToMatch = {
            UriPath:{}
        }
        return {
            FieldToMatch:this.FieldToMatch,
            TextTransformations:this.TextTransformations
        }
    }

    get TextTransformations():TextTransformation[] {
        if (!this.textTransformationTypes || !this.textTransformationTypes.length) {
            return [{
                Priority:0,
                Type:'NONE'
            }]
        }
        return this.textTransformationTypes.map((Type,Priority) => {
            return {Type,Priority}
        });
    }

    match(Type:FieldToMatchProperty, value?:string | string[], scope:MatchScope = MatchScope.All):this {
        let res:any = {}
        if (Type === FieldToMatchProperty.Json) {
            res = {
                JsonBody:{
                    MatchPattern:{}
                }
            }
            if (value) {
                if (!Array.isArray(value)) value = [value];
                res.JsonBody.MatchPattern.IncludedPaths = value;
            } else {
                res.JsonBody.MatchPattern.All = {}
            }
            res.JsonBody.MatchScope = scope;
            res.JsonBody.InvalidFallbackBehavior = 'EVALUATE_AS_STRING';
            this.FieldToMatch = res;
            return this;
        }
        if (Type === FieldToMatchProperty.Header || Type === FieldToMatchProperty.Argument) {
            const key = Type === FieldToMatchProperty.Header ? 'SingleHeader' : 'SingleQueryArgument';
            this.FieldToMatch = {
                [key]: {
                    Name:value as string
                }
            }
            return this;
        }
        this.FieldToMatch = {[Type]:{}}
        return this;
    }

    transformation(Type:TextTransformationProperty,Priority:number = this.TextTransformations.length):this {
        this.textTransformationTypes = this.textTransformationTypes.filter(type => type != Type);
        this.textTransformationTypes.splice(Priority,0,Type);
        return this;
    }

    transformations(...types:TextTransformationProperty[]):this {
        this.textTransformationTypes = this.textTransformationTypes.concat(types);
        return this;
    }

    reset():this {
        this.textTransformationTypes = [];
        return this;
    }
}