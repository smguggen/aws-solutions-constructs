import { WafRule } from "./rule"
import {CountAction,NoneAction} from './actions';
import { WebACLOverride, WebACLOverrideRule, WebACLOverrideStatement } from "../types"

export class WafOverrideRule extends WafRule implements WebACLOverrideRule {
    Statement:WebACLOverrideStatement

    protected overrideAction:CountAction | NoneAction
    
    get():WebACLOverrideRule {
        const override = this.overrideAction
        if (!override) throw new Error("Rules must have either an Action or an Override field present")
        return {
            ...super.get(),
            OverrideAction: this.OverrideAction
        }
    }

    get OverrideAction():WebACLOverride {
        return this.overrideAction.get();
    }

    get Action():WebACLOverride {
        return this.OverrideAction
    }

    count(headers?:{[name:string]:string}):this {
        this.overrideAction = new CountAction(headers);
        return this;
    }

    none():this {
        this.overrideAction = new NoneAction();
        return this;
    }

}