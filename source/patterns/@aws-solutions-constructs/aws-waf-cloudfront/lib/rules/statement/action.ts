export class WafActionStatement {
    readonly nestable:boolean = true;


    and() {
        if (!this.nestable) return this;
    }

    or() {
        if (!this.nestable) return this;

    }

    not() {
        if (!this.nestable) return this;

    }
}