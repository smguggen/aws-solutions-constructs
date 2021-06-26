import { StatementProperty } from '../../types';
import { FindStatement, StatementInstance, NestableStatementInstance } from './find';
export class WafUtilityStatement {
    private $list:StatementProperty[] = []

    protected readonly finder = new FindStatement();

    add(statement:StatementProperty | StatementInstance):this {
        if (this.finder.isNestable(statement as StatementProperty | StatementInstance)) {
            const nm = this.finder.getStatementName(statement);
            if (!(this.$list).includes(nm)) {
                this.$list.push(nm);
            }
        }
        return this;
    }

    remove(statement:StatementProperty | StatementInstance):this {
        const nm = this.finder.getStatementName(statement);
        this.$list = this.$list.filter(item => this.finder.getStatementName(item) !== nm,this)
        return this;
    }

    get hasStatements():boolean {
        return this.statements.length ? true : false;
    }
    get list():StatementProperty[] {
        return this.$list;
    }
    get statements():NestableStatementInstance[] {
        return this.list.map(item => this.find(item),this) as NestableStatementInstance[];
    }
    find(type:StatementProperty | StatementInstance):StatementInstance {
        return this.finder.getStatement(type);
    }
}