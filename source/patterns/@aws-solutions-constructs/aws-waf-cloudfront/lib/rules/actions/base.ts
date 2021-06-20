import {WebACLHeaders} from '../../types'

export class ActionBase {
    headers:WebACLHeaders = []

    convertHeader(key:string, value:any):this {
        if (typeof value !== 'string') {
            try {
                value = JSON.parse(value);
            } catch(e) {
                try {
                    value = value.toString();
                } catch(e) {
                    throw new Error(`Header Value for key ${key} cannot be converted into string`);
                }
            }
        }
        let header = this.headers.findIndex(h => h.Name === key);
        if (header > -1) {
            this.headers[header].Value = value;
        } else {
            this.headers.push({
                Name:key,
                Value:value
            });
        }
        return this;
    }

    convertHeaders(headers:{[name:string]:string} = {}):this {
        for (let i in headers) {
            if (headers.hasOwnProperty(i)) {
                this.convertHeader(i,headers[i]);
            }
        }
        return this;
    }
}