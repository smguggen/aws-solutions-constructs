import { ActionBase } from './base'
import {WafCount,WebACLHeaders} from '../../types'

export class CountAction extends ActionBase {

    constructor(headers?:{[name:string]:string}) {
        super();
        if (headers) this.insertHeaders(headers);
    }

    get():WafCount {
        const res:any = {
            Count:{}
        }
        if (this.headers.length) res.Count.CustomRequestHandling = {
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