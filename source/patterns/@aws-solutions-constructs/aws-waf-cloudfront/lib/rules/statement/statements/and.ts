import { AndStatement,WebACLNestableStatement } from "../../../types";
import { WafUtilityStatement } from "../utility";

export class And extends WafUtilityStatement implements AndStatement {
    Statements:WebACLNestableStatement[]
} 