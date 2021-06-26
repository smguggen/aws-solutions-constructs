import { AndStatement,NestableStatement } from "../../../types";
import { WafUtilityStatement } from "../utility";
export class And extends WafUtilityStatement implements AndStatement {
    Statements:NestableStatement[]

    get():AndStatement {
        return {
            Statements: this.statements
        }
    }

} 