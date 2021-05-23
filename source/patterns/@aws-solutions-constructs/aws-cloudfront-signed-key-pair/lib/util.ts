import {CookieOptions} from './keypair';
import {SignedCookieName} from '.';

export function getName(...names: string[]): string {
    return `${names.join('-')}`
}

export function getUniqueName(...names: string[]): string {
    const differentiator = Math.random().toString(36).substring(7);
    names.push(differentiator);
    return getName(...names);
}

export function format(str:string = '') {
    return encodeURIComponent(str).replace('+', '-')
    .replace('=', '_')
    .replace('/', '~');
}

export function prefixUrl(url:string):string {
    return 'https://' + String(url).replace(/https?\:\/\//, '');
}

function formatCookieDate(exp:Date | number | string):Date {
    let dt;
    if (exp instanceof Date) {
        dt = exp;
    } else {
        exp = Number(exp);
        if (isNaN(exp)) throw new Error('Invalid Cookie Date')
        if (exp < 946728000000) exp *= 1000;
        dt = new Date(exp);
    }
    if (/invalid date/i.test(dt.toString())) {
        throw new Error('Invalid Cookie Date');
    }
    return dt;
}

export function formatCookie($name:SignedCookieName, val:any, options:CookieOptions = {}) {
    if (val && typeof val === 'object') val = JSON.stringify(val);
    const opt = {
      path:'/',
      secure:true,
      httpOnly:false,
      ...options
    }
    const regex = /[\;\,\s]/;
    const msg = 'cannot contain semicolons, colons, or spaces'
    const value = format(val);
    let name = $name as string;
    if (regex.test(name) || regex.test(value)) {
      throw new Error('Cookie strings ' + msg);
    }
    name += '=' + value;
    
    if (opt.domain) {
      if (!regex.test(opt.domain)) {
        name += '; Domain=' + opt.domain;
      } else { console.error(`Domain "${opt.domain}" ${msg}`) }
    }
    
    if (opt.path) {
      if (!regex.test(opt.path)) {
          name += '; Path=' + opt.path;
      } else {console.error(`Path ${opt.path} ${msg}`)}
    }
    
    let exp = options.expires || options.maxAge ? formatCookieDate(options.expires || options.maxAge as Date | string | number) : null;
    if (exp) {
      if (exp.getTime() <= Date.now()) {
        console.error(`Cookie ${name} is expired`);
      }
      if (opt.maxAge) {
          name += '; Max-Age=' + Math.floor(exp.getTime()/1000);
      } else {
          name += '; Expires=' + exp.toUTCString();
      }
    }
    if (opt.sameSite) {
      const ss = opt.sameSite;
      name += '; SameSite=';
      const sameSite = /(strict|lax|none)/i.test(ss) ?
        (ss.substring(0,1).toUpperCase() + ss.substring(1).toLowerCase()) : 
        opt.sameSite ? 'Strict' : 'Lax';
      name += sameSite;
    }
    if (opt.httpOnly) name += '; HttpOnly';
    if (opt.secure) name += '; Secure';
    
    return name;
}