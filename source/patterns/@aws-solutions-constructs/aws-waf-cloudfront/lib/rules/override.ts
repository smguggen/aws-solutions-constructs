import { WafRule } from "./rule"
import {CountAction} from './actions';
import { WebACLAction, WebACLActionRule, WebACLActionStatement } from "../types"

export class WafActionRule extends WafRule implements WebACLActionRule {
    Statement:WebACLActionStatement

    protected action:CountAction | 
    
    get():WebACLActionRule {
        const action = this.action
        if (!action) throw new Error("Rules must have either an Action or an Override field present")
        return {
            ...super.get(),
            Action: this.Action
        }
    }

    get Action():WebACLAction {
        return this.action.get();
    }

    allow(headers?:{[name:string]:string}):this {
        this.action = new AllowAction(headers);
        return this;
    }

    block(code?:number, bodyKey?:string, headers?:{[name:string]:string}):this {
        this.action = new BlockAction(code, bodyKey, headers);
        return this;
    }

    count(headers?:{[name:string]:string}):this {
        this.action = new CountAction(headers);
        return this;
    }

}