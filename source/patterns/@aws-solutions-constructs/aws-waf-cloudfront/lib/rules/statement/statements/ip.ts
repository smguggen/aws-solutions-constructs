import { IPSetReferenceStatement,IPSetForwardedIPConfig } from "../../../types";
import { WafActionStatement } from "../action";

export class IPSetReference extends WafActionStatement implements IPSetReferenceStatement {
    ARN:string
    IPSetForwardedIPConfig?:IPSetForwardedIPConfig

    get():IPSetReferenceStatement {
        if (!this.ARN) throw new Error('RegexPatternSetReferenceStatement requires valid ARN');
        const res:any = {
            ARN:this.ARN
        }
        if (this.IPSetForwardedIPConfig) {
            res.ForwardedIPConfig = this.IPSetForwardedIPConfig;
        }
        return res;
    }

    arn(str:string): this {
        this.ARN = str;
        return this;
    }

    ipSetForwardedIPConfig(header?:string,fallback?:string, position?:string):this {
        const def = this.defaultIPConfig;
        if (fallback) fallback = fallback.toUpperCase();
        if (position) position = position.toUpperCase();
        const Position = ['FIRST', 'LAST'].includes(position) ? position as 'FIRST' | 'LAST' | 'ANY' : (this.IPSetForwardedIPConfig?.Position || 'ANY');
        this.IPSetForwardedIPConfig = {
            HeaderName:header || this.IPSetForwardedIPConfig?.HeaderName ||def.HeaderName,
            FallbackBehavior:['MATCH', 'NO_MATCH'].includes(fallback) ? fallback as 'MATCH' | 'NO_MATCH' : (this.IPSetForwardedIPConfig?.FallbackBehavior || 'NO_MATCH'),
            Position
        }
        return this;
    }

    match():this {
        return this.ipSetForwardedIPConfig(this.IPSetForwardedIPConfig?.HeaderName,'MATCH',this.IPSetForwardedIPConfig?.Position);
    }
    noMatch():this {
        return this.ipSetForwardedIPConfig(this.IPSetForwardedIPConfig?.HeaderName,'NO_MATCH',this.IPSetForwardedIPConfig?.Position);
    }
    first():this {
        return this.ipSetForwardedIPConfig(this.IPSetForwardedIPConfig?.HeaderName,this.IPSetForwardedIPConfig?.FallbackBehavior,'FIRST');
    }
    last():this {
        return this.ipSetForwardedIPConfig(this.IPSetForwardedIPConfig?.HeaderName,this.IPSetForwardedIPConfig?.FallbackBehavior,'LAST');
    }
    any():this {
        return this.ipSetForwardedIPConfig(this.IPSetForwardedIPConfig?.HeaderName,this.IPSetForwardedIPConfig?.FallbackBehavior,'ANY');
    }

    protected get defaultIPConfig():IPSetForwardedIPConfig {
        return {
            HeaderName:'X-Forwarded-For',
            FallbackBehavior:'NO_MATCH',
            Position:'ANY'
        }
    }
}