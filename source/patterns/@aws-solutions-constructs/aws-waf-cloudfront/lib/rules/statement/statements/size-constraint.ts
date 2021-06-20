import { MatchHandler } from "../match";
import { SizeConstraintStatement,ComparisonOperator } from "../../../types"
;
export class SizeConstraint extends MatchHandler implements SizeConstraintStatement{
    Size:number
    ComparisonOperator:ComparisonOperator = 'EQ'

    get():SizeConstraintStatement {
        if (!this.Size) throw new Error('SizeConstraintStatement requires Size property')
        return {
            ...super.get(),
            Size:this.Size,
            ComparisonOperator:this.ComparisonOperator
        }
    }

    size(size:number):this {
        this.Size = size;
        return this;
    }

    comparisonOperator(str:string | ComparisonOperator): this {
       switch(str.toUpperCase()) {
            case 'EQ':
            case 'EQUALS':
            case '=': this.ComparisonOperator = 'EQ';
            break;
            case 'NE':
            case 'NOT_EQUAL':
            case '!=': this.ComparisonOperator = 'NE'
            break;
            case 'LE':
            case 'LESS_THAN_OR_EQUAL':
            case "<=": this.ComparisonOperator = 'LE';
            break;
            case 'LT':
            case 'LESS_THAN':
            case '<': this.ComparisonOperator = 'LT';
            break;
            case 'GE':
            case 'GREATER_THAN_OR_EQUAL':
            case ">=": this.ComparisonOperator = 'GE';
            break;
            case 'GT':
            case 'GREATER_THAN':
            case '>': this.ComparisonOperator = 'GT';
            break;
       }
       return this;
   }

    eq(size?:number):this {
        if (size) this.Size = size;
        this.ComparisonOperator = 'EQ';
        return this;
    }

    ne(size?:number):this {
        if (size) this.Size = size;
        this.ComparisonOperator = 'NE';
        return this;
    }

    le(size?:number):this {
        if (size) this.Size = size;
        this.ComparisonOperator = 'LE';
        return this;
    }

    lt(size?:number):this {
        if (size) this.Size = size;
        this.ComparisonOperator = 'LT';
        return this;
    }

    ge(size?:number):this {
        if (size) this.Size = size;
        this.ComparisonOperator = 'GE';
        return this;
    }

    gt(size?:number):this {
        if (size) this.Size = size;
        this.ComparisonOperator = 'GT';
        return this;
    }
    
}