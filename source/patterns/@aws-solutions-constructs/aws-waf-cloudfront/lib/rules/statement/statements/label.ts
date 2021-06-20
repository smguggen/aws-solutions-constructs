import { LabelMatchStatement} from "../../../types";
import { WafActionStatement } from "../action";

export class LabelMatch extends WafActionStatement implements LabelMatchStatement {
    Scope:'LABEL' | 'NAMESPACE' = 'LABEL'
    Key:string

    get():LabelMatchStatement {
        if (!this.Key) throw new Error('LabelMatchStatement requires Key property')
        return {
            Key:this.Key,
            Scope:this.Scope
        }
    }

    scope(str?:string):this {
        str = (str || '').toUpperCase();
        if (['LABEL', 'NAMESPACE'].includes(str)) {
            this.Scope = str as 'LABEL' | 'NAMESPACE';
        }
        return this;
    }

    label():this {
        this.Scope = 'LABEL';
        return this;
    }

    namespace():this {
        this.Scope = 'NAMESPACE';
        return this;
    }

    key(str:string):this {
        this.Key = str;
        return this;
    }
}