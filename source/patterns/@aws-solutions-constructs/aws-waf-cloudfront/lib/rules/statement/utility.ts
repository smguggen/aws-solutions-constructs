import {WafActionStatement} from './action';
import {    
    ByteMatch, 
    GeoMatch, 
    LabelMatch, 
    IPSetReference, 
    RegexPatternSetReference,
    SizeConstraint, 
    SqliMatch, 
    XssMatch
} from './statements'
export class WafUtilityStatement {
    
    getStatement($str:any):WafActionStatement {
        if (typeof $str === 'string') {
            const str = $str.toLowerCase();
            if (str.startsWith('byte'))  return new ByteMatch();
            if (str.startsWith('geo'))  return new GeoMatch();
            if (str.startsWith('label'))  return new LabelMatch();
            if (str.startsWith('ip'))  return new IPSetReference();
            if (str.startsWith('reg'))  return new RegexPatternSetReference();
            if (str.startsWith('size'))  return new SizeConstraint();
            if (str.startsWith('sql'))  return new SqliMatch();
            if (str.startsWith('xss'))  return new XssMatch();
            throw new Error(`Can't find Statement to match the term ${$str}`);
        }
        if ($str instanceof ByteMatch ||
            $str instanceof GeoMatch ||
            $str instanceof LabelMatch ||
            $str instanceof IPSetReference ||
            $str instanceof RegexPatternSetReference ||
            $str instanceof SizeConstraint ||
            $str instanceof SqliMatch ||
            $str instanceof XssMatch
        ) return $str;
        throw new Error('Invalid Nestable Statement')
    }
}