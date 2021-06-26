import { MatchHandler } from "../match";
import { ByteMatchStatement,PositionalConstraint } from "../../../types"
;
export class ByteMatch extends MatchHandler implements ByteMatchStatement {
    SearchString:string = ''
    PositionalConstraint: PositionalConstraint = 'EXACTLY'
        get():ByteMatchStatement {
        return {
            ...super.get(),
            SearchString:this.SearchString,
            PositionalConstraint:this.PositionalConstraint
        }
    }

    searchString(str:string):this {
        this.SearchString = str;
        return this;
    }

    positionalConstraint(constraint:PositionalConstraint):this {
        this.PositionalConstraint = constraint;
        return this;
    }

    exactly(str?:string):this {
        if (str) this.SearchString = str;
        this.PositionalConstraint = 'EXACTLY';
        return this;
    }

    startsWith(str?:string):this {
        if (str) this.SearchString = str;
        this.PositionalConstraint = 'STARTS_WITH';
        return this;
    }

    endsWith(str?:string):this {
        if (str) this.SearchString = str;
        this.PositionalConstraint = 'ENDS_WITH';
        return this;
    }

    contains(str?:string):this {
        if (str) this.SearchString = str;
        this.PositionalConstraint = 'CONTAINS';
        return this;
    }

    containsWord(str?:string):this {
        if (str) this.SearchString = str;
        this.PositionalConstraint = 'CONTAINS_WORD';
        return this;
    }
}