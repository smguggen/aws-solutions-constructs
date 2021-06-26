import { WafRule } from "./rule"
import {CountAction,NoneAction} from './actions';
import { Override,OverrideRule,OverrideStatement} from "../types"

export class WafOverrideRule extends WafRule implements OverrideRule {
    Statement:OverrideStatement

    protected overrideAction:CountAction | NoneAction
    
    get():OverrideRule {
        const override = this.overrideAction
        if (!override) throw new Error("Rules must have either an Action or an Override field present")
        return {
            ...super.get(),
            OverrideAction: this.OverrideAction
        }
    }

    get OverrideAction():Override {
        return this.overrideAction.get();
    }

    get Action():Override {
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