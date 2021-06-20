import { NotStatement,WebACLNestableStatement } from "../../../types";
import { WafUtilityStatement } from "../utility";

export class Not extends WafUtilityStatement implements NotStatement {
    Statement:WebACLNestableStatement
} 