import { RateBasedStatement, WebACLStatement } from "../../../types";
import { ForwardedIPHandler } from "../forwarded-ip";

export class RateBased extends ForwardedIPHandler implements RateBasedStatement {
    AggregateKeyType:'IP' | 'FORWARDED_IP' = 'IP'
    Limit:number
    ScopeDownStatement?:WebACLStatement

    readonly nestable = false
    
    get():RateBasedStatement {
        if (!this.Limit) throw new Error('RateBasedStatement requires Limit property')
        return {
            ...super.get(),
            AggregateKeyType:this.AggregateKeyType,
            Limit:this.Limit,
            ScopeDownStatement:this.ScopeDownStatement
        }
    }

    limit(lim:number):this {
        this.Limit = lim;
        return this;
    }

    aggregateKeyType(str:string):this {
        str = str.toUpperCase();
        if (['IP', 'FORWARDED_IP'].includes(str)) this.AggregateKeyType = str as 'IP' | 'FORWARDED_IP';
        return this;
    }

    ip():this {
        this.AggregateKeyType = 'IP';
        return this;
    }
    forwardedIP():this {
        this.AggregateKeyType = 'FORWARDED_IP';
        return this;
    }
    forwardedIp():this {
        return this.forwardedIP();
    }

    scopeDownget(statement:WebACLStatement):this {
        this.ScopeDownStatement = statement;
        return this;
    }

}