import {
    WebACLAction,
    CloudFrontHeaders,
    CloudFrontHeader
} from '../types';


export interface StatementFields {
    Action:WebACLAction
}

export class ActionHandler {
    protected type:'Allow' | 'Block' | 'Count' = 'Allow'
    protected headers?:CloudFrontHeaders = []
    protected code?:number

    constructor(protected bodyKey?:string) {}

    get():StatementFields {
        let res:any = {}
        if (this.type === 'Block') {
            if ((this.headers.length || this.bodyKey) && !this.code) this.code = 500;
            if (this.code) {
                res.CustomResponse = {
                    ResponseCode:this.code,
                    CustomResponseBodyKey: this.bodyKey ? this.bodyKey : undefined,
                    ResponseHeaders: this.headers.length ? this.headers : undefined
                }
            }
            
        } else if (this.headers.length) {
            res.CustomRequestHandling = {
                InsertHeaders:this.headers
            }
        }

        return {
            Action: {
                [this.type]: res
            }
        }
    }

    allow(headers?:{[name:string]:string}):this {
        return this.getAction('Allow', headers);
    }

    block(headers?:{[name:string]:string}, code?:number):this {
        this.code = code;
        return this.getAction('Block', headers);
    }

    count(headers?:{[name:string]:string}):this {
        return this.getAction('Count', headers);
    }

    reset():this {
        this.headers = [];
        return this;
    }

    protected convertHeader(Name:string,Value:string):CloudFrontHeader {
        return {Name,Value}
    }

    protected convertHeaders(headers:{[name:string]:string}):CloudFrontHeaders {
        const res = []
        for (const header in headers) {
            if (headers.hasOwnProperty(header)) {
                res.push(this.convertHeader(header, headers[header]))
            }
        }
        return res;
    }

    private getAction(action:'Allow' | 'Block' | 'Count', headers?:{[name:string]:string}):this {
        this.type = action;
        if (headers) this.headers = this.headers.concat(this.convertHeaders(headers));
        return this;
    }
}