import {FieldToMatch,TextTransformation} from '../../types';
import { WafActionStatement } from './action';
export enum TextTransformationType {
    CommandLine = 'CMD_LINE',
    Compress = 'COMPRESS_WHITE_SPACE',
    HtmlDecode = 'HTML_ENTITY_DECODE',
    Lowercase = 'LOWERCASE',
    UrlDecode = 'URL_DECODE',
    None = 'NONE'
}

export enum FieldToMatchType {
    Header = 'SingleHeader',
    Argument = 'SingleQueryArgument',
    Arguments = 'AllQueryArguments',
    Body = 'Body',
    Method = 'Method',
    Path = 'UriPath',
    Query = 'QueryString',
    Json = 'JsonBody'
}

export enum MatchScope {
    All = 'ALL',
    Key = 'KEY',
    Value = 'VALUE'
}
export class MatchHandler extends WafActionStatement {

    params:any = {}
    FieldToMatch:FieldToMatch
    protected textTransformationTypes:TextTransformationType[] = []

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

    match(Type:FieldToMatchType, value?:string | string[], scope:MatchScope = MatchScope.All):this {
        let res:any = {}
        if (Type === FieldToMatchType.Json) {
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
        if (Type === FieldToMatchType.Header || Type === FieldToMatchType.Argument) {
            const key = Type === FieldToMatchType.Header ? 'SingleHeader' : 'SingleQueryArgument';
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

    transformation(Type:TextTransformationType,Priority:number = this.TextTransformations.length):this {
        this.textTransformationTypes = this.textTransformationTypes.filter(type => type != Type);
        this.textTransformationTypes.splice(Priority,0,Type);
        return this;
    }

    transformations(...types:TextTransformationType[]):this {
        this.textTransformationTypes = this.textTransformationTypes.concat(types);
        return this;
    }

    reset():this {
        this.textTransformationTypes = [];
        return this;
    }
}