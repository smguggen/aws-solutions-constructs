
import { WafOverrideStatement } from './statement/override';
import { 
    WebACLAction,
    WebACLOverride,
    WebACLRule,
    WebACLStatement,
    VisibilityConfig, 
    CustomResponseBody,
} from '../types';
export class WafRule implements WebACLRule<WebACLStatement> {
    Name:string
    Priority:number
    VisibilityConfig:VisibilityConfig = this.getDefaultVisibilityConfig()
    RuleLabels?:{Name:string}[] = []
    Statement:WebACLStatement
    

    get():any {
        if (!this.Name) throw new Error('WebACL Rules require Name field');
        if (!this.Priority) throw new Error('WebACL Rules require Priority field');
        return {
            Name:this.Name,
            Priority:this.Priority,
            VisibilityConfig:this.VisibilityConfig,
            RuleLabels:this.RuleLabels
        }
    }

    name(str:string):this {
        this.Name = str;
        return this;
    }

    priority(num:number):this {
        this.Priority = num;
        return this;
    }

    statement(s:WebACLStatement):this {
        this.Statement = s;
        return this;
    }

    metricName(str:string):this {
        this.VisibilityConfig = this.getDefaultVisibilityConfig(str);
        return this;
    }

    visibilityConfig( 
        name:string,
        metricsEnabled?:boolean, 
        requestsEnabled?:boolean
    ):this {
        this.validateMetricName(name);
        this.VisibilityConfig = {
            CloudWatchMetricsEnabled:typeof metricsEnabled === 'boolean' ? metricsEnabled : true,
            SampledRequestsEnabled:typeof requestsEnabled === 'boolean' ?requestsEnabled : true,
            MetricName:name
        }
        return this;
    }

    ruleLabel(str:string):this {
        const st = typeof str === 'string' ? {Name:str} : str
        this.RuleLabels.push(st);
        return this;
    }

    removeRuleLabel(str:string):this {
        this.RuleLabels = this.RuleLabels.filter(rule => rule.Name !== 'string');
        return this;
    }

    ruleLabels(...str:string[]):this {
        const strs = str.map(st =>  typeof st === 'string' ? {Name:st} : st);
        this.RuleLabels = this.RuleLabels.concat(strs);
        return this;
    }

    protected getDefaultVisibilityConfig(name:string = this.Name || 'metric'):VisibilityConfig {
        this.validateMetricName(name);
        return {
            CloudWatchMetricsEnabled:true,
            SampledRequestsEnabled:true,
            MetricName:name
        }
    }

    /*protected getCustomResponseBodies(body:CustomResponseBody[] = []): {
        [name:string]:CfnWebACL.CustomResponseBodyProperty
    } {
        const $this = this;
        return body.reduce((acc,b) => {
            const content = $this.validateCustomResponseBodyContent(b);
            acc[b.key] = {
                content,
                contentType:b.type as string
            }
            return acc;
        }, {});
    }

    protected getTags(tags:any): CfnTag[] {
        let res:CfnTag[] = [];
        if (tags && typeof tags === 'object') {
            for (const key in tags) {
                if (tags.hasOwnProperty(key)) {
                    const tag = tags[key];
                    if (tag.key && tag.value) {
                        tag.value = this.validateTagValue(tag.value);
                        res.push(tag);
                    } else {
                        res.push({
                            key,value:this.validateTagValue(tag)
                        })
                    }
                }
            }
        }
        return res;
    }*/

    private validateMetricName(str:string):this {
        const chars = /[a-z0-9\-\_]/i.test(str);
        const reservedNames = /(all|default\_?action)/i.test(str);
        const ln = str.length;
        if (ln < 1)  throw new Error(`Metric Name cannot be empty`);
        if (ln > 128) throw new Error(`Metric name cannot contain more than 128 characters`); 
        if (!chars) throw new Error(`Metric Name ${str} can only contain numbers,letters, hyphens, and underscores`); 
        if (reservedNames) throw new Error(`Metric Name ${str} cannot contain WAF reserved names like "All" or "Default_Action"`);
        return this;
    }

    private validateCustomResponseBodyContent(body:CustomResponseBody): string {
        const content = body.Content;
        let con:string = '';
        if (typeof content !== 'string') {
            try {
                con = JSON.stringify(content);
            } catch(e) {
                if (body.ContentType === 'APPLICATION_JSON') {
                    throw new Error('Invalid Custom Response Body. Content type is APPLICATION_JSON but content is not valid JSON');
                }
                try {
                    con = (content as any).toString();
                } catch(e) {
                    throw new Error('Invalid Custom Response Body. Content cannot be converted into string');
                }
            }
        } else {
            con = content;
        }
        if (!con) throw new Error('Custom Response Body Content cannot be empty string')
        if (con.length > 10240) throw new Error('Invalid Custom Response Body.Content cannot be longer then 10,240 characters');
        if (!/[\s\S]*/.test(con)) throw new Error('Invalid Custom Response Body. Content must follow regular expression pattern /[\s\S]*/')
        return con;
    }

    private validateTagValue(value:any): string {
        if (typeof value !== 'string') {
            try {
                return value.toString();
            } catch(e) {
                throw new Error(`WebAcl failed to create; ${value} is not a valid tag value`);
            }
        }
        return value;
    }

}