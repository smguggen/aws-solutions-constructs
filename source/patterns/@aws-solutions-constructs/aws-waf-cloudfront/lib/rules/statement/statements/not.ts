import {NotStatement,NestableStatement} from "../../../types";
import { WafUtilityStatement } from "../utility";
import { NestableStatementInstance } from '../find';

export class Not extends WafUtilityStatement implements NotStatement {
    Statement:NestableStatement

    get():NotStatement {
        return {
            Statement: this.statement
        }
    }

    get hasStatements():boolean {
        return this.statement ? true : false;
    }

    get statements():any {
        return undefined;
    }
    get statement():NestableStatementInstance {
        const statements = this.list.map(item => this.find(item),this) as NestableStatementInstance[];
        const ln = statements.length;
        if (ln > 1) {
            const nested = statements.pop();
            return nested;
        } else if (ln === 1) {
            return statements[0];
        }
        return undefined;
    }
} 