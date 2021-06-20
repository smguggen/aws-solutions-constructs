import { ActionBase } from './base'
import {WafBlock,WebACLHeaders,CustomResponseBodies} from '../../types'

export class BlockAction extends ActionBase {
    ResponseCode?:number
    CustomResponseBodyKey?:keyof CustomResponseBodies

    constructor(code?:number, bodyKey?:string, headers?:{[name:string]:string}) {
        super();
        if (headers) this.responseHeaders(headers);
        if (code) this.responseCode(code);
        if (bodyKey) this.customResponseBodyKey(bodyKey);
    }

    get():WafBlock {
        const res:any = {
            Block:{}
        }
        if (this.ResponseCode || this.CustomResponseBodyKey || this.headers.length) {
            res.Block.CustomResponse = {
                ResponseCode:this.ResponseCode || 500
            }
            if (this.headers.length) res.Block.CustomResponse.ResponseHeaders = this.headers;
            if (this.CustomResponseBodyKey) res.Block.CustomResponse.CustomResponseBodyKey = this.CustomResponseBodyKey;
        }
        return res;
    }

    get ResponseHeaders():WebACLHeaders {
        return this.headers;
    }

    responseCode(num:number):this {
        this.ResponseCode = num;
        return this;
    }

    customResponseBodyKey(str:keyof CustomResponseBodies):this {
        this.CustomResponseBodyKey = str;
        return this;
    }

    responseHeader(key:string,value:any):this {
        this.convertHeader(key,value);
        return this;
    }

    responseHeaders(headers:{[name:string]:string} = {}):this {
        this.convertHeaders(headers);
        return this;
    }

}