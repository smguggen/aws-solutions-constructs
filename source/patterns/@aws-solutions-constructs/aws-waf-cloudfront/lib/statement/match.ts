import {WebACLFieldToMatch,WebACLTextTransformation,WebACLAction} from '../types';
import {ActionHandler,StatementFields} from './action';


export enum TextTransformationType {
    CommandLine = 'CMD_LINE',
    Compress = 'COMPRESS_WHITE_SPACE',
    HtmlDecode = 'HTML_ENTITY_DECODE',
    Lowercase = 'LOWERCASE',
    UrlDecode = 'URL_DECODE',
    None = 'NONE'
}

export enum FieldToMatch {
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

interface MatchStatementFields extends StatementFields {
    FieldToMatch:WebACLFieldToMatch
    TextTransformations: WebACLTextTransformation[]
}


export class MatchHandler extends ActionHandler {
    protected fieldToMatch:WebACLFieldToMatch
    protected textTransformationTypes:TextTransformationType[] = []

    protected get textTransformations():WebACLTextTransformation[] {
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

    get():MatchStatementFields {
        if (!this.fieldToMatch) this.fieldToMatch = {
            UriPath:{}
        }
        return {
            ...super.get(),
            FieldToMatch:this.fieldToMatch,
            TextTransformations:this.textTransformations
        }
    }


    match(Type:FieldToMatch, value?:string | string[], scope:MatchScope = MatchScope.All):this {
        let res:any = {}
        if (Type === FieldToMatch.Json) {
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
            this.fieldToMatch = res;
            return this;
        }
        if (Type === FieldToMatch.Header || Type === FieldToMatch.Argument) {
            const key = Type === FieldToMatch.Header ? 'SingleHeader' : 'SingleQueryArgument';
            this.fieldToMatch = {
                [key]: {
                    Name:value as string
                }
            }
            return this;
        }
        this.fieldToMatch = {[Type]:{}}
        return this;
    }

    transformation(Type:TextTransformationType,Priority:number = this.textTransformations.length):this {
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