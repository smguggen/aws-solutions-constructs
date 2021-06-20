import { WafActionStatement } from "./action";
import { ForwardedIPConfig } from "../../types";

export class ForwardedIPHandler extends WafActionStatement {
    ForwardedIPConfig?:ForwardedIPConfig

    get():any {
        const res:any = {}
        if (this.ForwardedIPConfig) {
            res.ForwardedIPConfig = this.ForwardedIPConfig;
        }
        return res;
    }

    forwardedIPConfig(header?:string,fallback?:string):this {
        const def = this.defaultIPConfig;
        if (fallback) fallback = fallback.toUpperCase();
        this.ForwardedIPConfig = {
            HeaderName:header || this.ForwardedIPConfig?.HeaderName ||def.HeaderName,
            FallbackBehavior:['MATCH', 'NO_MATCH'].includes(fallback) ? fallback as 'MATCH' | 'NO_MATCH' : (this.ForwardedIPConfig?.FallbackBehavior || 'NO_MATCH')
        }
        return this;
    }

    match():this {
        return this.forwardedIPConfig(this.ForwardedIPConfig?.HeaderName,'MATCH');
    }
    noMatch():this {
        return this.forwardedIPConfig(this.ForwardedIPConfig?.HeaderName,'NO_MATCH');
    }

    get defaultIPConfig():ForwardedIPConfig {
        return {
            HeaderName:'X-Forwarded-For',
            FallbackBehavior:'NO_MATCH'
        }
    }
}