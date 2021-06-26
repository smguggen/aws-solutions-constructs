import { ForwardedIPHandler } from "../forwarded-ip";
import { GeoMatchStatement,CountryCode,CountryCodes } from "../../../types";

export class GeoMatch extends ForwardedIPHandler implements GeoMatchStatement {
    CountryCodes:CountryCodes = []

    get():GeoMatchStatement {
        if (!this.CountryCodes.length) throw new Error('GeoMatchStatement requires CountryCodes property')
        const res:any = {
            ...super.get(),
            CountryCodes:this.CountryCodes
        }
        return res;
    }

    countryCodes(...codes:string[]):this {
        const list = this.codes;
        const validCodes = codes.reduce((acc,code) => {
            const c = code.toUpperCase();
            if (list.includes(c) && 
                !acc.includes(c) &&
                !this.CountryCodes.includes(c as CountryCode)
            ) acc.push(c);
            return acc;
        },[]);
        this.CountryCodes = this.CountryCodes.concat(validCodes);

        return this;
    }

    removeCountryCode(code):this {
        code = code.toUpperCase();
        this.CountryCodes = this.CountryCodes.filter(cc => cc != code);
        return this;
    }

    get codes():string[] {
        return ["AF","AX","AL","DZ","AS","AD","AO",
        "AI","AQ","AG","AR","AM","AW","AU","AT","AZ","BS",
        "BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO",
        "BQ","BA","BW","BV","BR","IO","BN","BG","BF","BI",
        "KH","CM","CA","CV","KY","CF","TD","CL","CN","CX",
        "CC","CO","KM","CG","CD","CK","CR","CI","HR","CU",
        "CW","CY","CZ","DK","DJ","DM","DO","EC","EG","SV",
        "GQ","ER","EE","ET","FK","FO","FJ","FI","FR","GF",
        "PF","TF","GA","GM","GE","DE","GH","GI","GR","GL",
        "GD","GP","GU","GT","GG","GN","GW","GY","HT","HM",
        "VA","HN","HK","HU","IS","IN","ID","IR","IQ","IE",
        "IM","IL","IT","JM","JP","JE","JO","KZ","KE","KI",
        "KP","KR","KW","KG","LA","LV","LB","LS","LR","LY",
        "LI","LT","LU","MO","MK","MG","MW","MY","MV","ML",
        "MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC",
        "MN","ME","MS","MA","MZ","MM","NA","NR","NP","NL",
        "NC","NZ","NI","NE","NG","NU","NF","MP","NO","OM",
        "PK","PW","PS","PA","PG","PY","PE","PH","PN","PL",
        "PT","PR","QA","RE","RO","RU","RW","BL","SH","KN",
        "LC","MF","PM","VC","WS","SM","ST","SA","SN","RS",
        "SC","SL","SG","SX","SK","SI","SB","SO","ZA","GS",
        "SS","ES","LK","SD","SR","SJ","SZ","SE","CH","SY",
        "TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN",
        "TR","TM","TC","TV","UG","UA","AE","GB","US","UM",
        "UY","UZ","VU","VE","VN","VG","VI","WF","EH","YE",
        "ZM","ZW"]
    }
}