import { MatchHandler } from "../match";
import { RegexPatternSetReferenceStatement } from "../../../types"
;
export class RegexPatternSetReference extends MatchHandler implements RegexPatternSetReferenceStatement{
   ARN:string = ''

   arn(str:string): this {
       this.ARN = str;
       return this;
   }

    get():RegexPatternSetReferenceStatement {
        if (!this.ARN) throw new Error('RegexPatternSetReferenceStatement requires valid ARN');
        return {
            ...super.get(),
            ARN:this.ARN
        }
    }
}