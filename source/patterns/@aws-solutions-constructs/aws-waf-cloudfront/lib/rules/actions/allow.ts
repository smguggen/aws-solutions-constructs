import { ActionBase } from './base'
import {WafAllow,WebACLHeaders} from '../../types'

export class AllowAction extends ActionBase {

    constructor(headers?:{[name:string]:string}) {
        super();
        if (headers) this.insertHeaders(headers);
    }

    get():WafAllow {
        const res:any = {
            Allow:{}
        }
        if (this.headers.length) res.Allow.CustomRequestHandling = {
            InsertHeaders:this.headers
        }
        return res;
    }

    get InsertHeaders():WebACLHeaders {
        return this.headers;
    }

    insertHeader(key:string,value:any):this {
        this.convertHeader(key,value);
        return this;
    }

    insertHeaders(headers:{[name:string]:string} = {}):this {
        this.convertHeaders(headers);
        return this;
    }

}