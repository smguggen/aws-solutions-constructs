import { OrStatement,NestableStatement } from "../../../types";
import { WafUtilityStatement } from "../utility";

export class Or extends WafUtilityStatement implements OrStatement {
    Statements:NestableStatement[]

    get():OrStatement {
        return {
            Statements: this.statements
        }
    }
} 