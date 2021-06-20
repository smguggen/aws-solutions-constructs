///<reference types="@types/node"/>

export interface WebACL {
    DefaultAction:WebACLDefaultAction
    Name:string
    Scope:'CLOUDFRONT' | 'REGIONAL'
    VisibilityConfig:VisibilityConfig
    Rules?:WebACLRule<WebACLStatement>[]
    CustomResponseBodies?:CustomResponseBodies
    Description?:string
    Tags?:WebACLTag[]
}

export interface WebACLRule<S extends WebACLStatement> {
    Name:string
    Priority:number
    Statement:S
    VisibilityConfig:VisibilityConfig
    Action?:WebACLAction
    OverrideAction?:WebACLOverride
    RuleLabels?: {Name:string}[]
}

export interface WebACLActionRule extends Omit<WebACLRule<WebACLActionStatement>, 'OverrideAction'> {
    Action:WebACLAction
}

export interface WebACLMatchRule extends Omit<WebACLRule<WebACLMatchStatement>, 'OverrideAction'> {
    Action:WebACLAction
}


export interface WebACLOverrideRule extends Omit<WebACLRule<WebACLOverrideStatement>, 'Action'> {
    OverrideAction:WebACLOverride
}

export interface VisibilityConfig {
    CloudWatchMetricsEnabled:boolean,
    MetricName: string,
    SampledRequestsEnabled:boolean
}

export type WafAction = WafAllow | WafBlock | WafCount

export interface WafAllow {
    Allow:WebACLAllow
}

export interface WafBlock {
    Block:WebACLBlock
}

export interface WafCount {
    Count:WebACLCount
}
export interface WebACLDefaultAction {
    Allow?: WebACLAllow
    Block?: WebACLBlock
}

export interface WebACLAction extends WebACLDefaultAction {
    Count?: WebACLCount
}

export interface WebACLOverride {
    Count?: WebACLCount
    None?: {}
}

export interface WebACLAllow {
    CustomRequestHandling?:CustomRequestHandling
}

export interface WebACLBlock {
    CustomResponse?:WebACLCustomResponse
}

export interface WebACLCount extends WebACLAllow {}

export interface CustomResponseBody {
    Content:string
    ContentType:'APPLICATION_JSON' | 'TEXT_HTML' | 'TEXT_PLAIN'
}

export interface CustomResponseBodies {
    [name:string]: CustomResponseBody
}

export interface WebACLCustomResponse {
    ResponseCode:number
    CustomResponseBodyKey?:keyof CustomResponseBodies
    ResponseHeaders?:WebACLHeaders
}

export interface CustomRequestHandling {
    InsertHeaders:WebACLHeaders
}

export interface WebACLTag {
    Key:string
    Value:string
}

export interface WebACLHeader {
    Name:string
    Value:string
}

export type WebACLHeaders = WebACLHeader[]

export type WebACLNestableStatement = ByteMatchStatement | GeoMatchStatement | 
    LabelMatchStatement | IPSetReferenceStatement | RegexPatternSetReferenceStatement |
    SizeConstraintStatement | SqliMatchStatement | XssMatchStatement
    

export type WebACLOverrideStatement = ManagedRuleGroupStatement | RuleGroupReferenceStatement
    
export type WebACLActionStatement = WebACLNestableStatement | RateBasedStatement
    
export type WebACLUtilityStatement = AndStatement | OrStatement | NotStatement

export type WebACLStatement = WebACLActionStatement | WebACLOverrideStatement | WebACLUtilityStatement

export interface WebACLMatchStatement {
    FieldToMatch:FieldToMatch
    TextTransformations:TextTransformation[]
}

export interface ByteMatchStatement extends WebACLMatchStatement {
    SearchString:Buffer | string
    PositionalConstraint: PositionalConstraint
}

export interface GeoMatchStatement {
    ForwardedIPConfig?:ForwardedIPConfig
    CountryCodes?:CountryCode[]
}

export interface IPSetReferenceStatement {
    ARN: string
    IPSetForwardedIPConfig?:IPSetForwardedIPConfig
}

export interface LabelMatchStatement {
    Key:string
    Scope: 'LABEL' | 'NAMESPACE'
}

export interface RegexPatternSetReferenceStatement extends WebACLMatchStatement {
    ARN:string
}

export interface SizeConstraintStatement extends WebACLMatchStatement {
    ComparisonOperator: ComparisonOperator
    Size:number
}

export interface SqliMatchStatement extends WebACLMatchStatement {}

export interface XssMatchStatement extends WebACLMatchStatement {}

export interface RateBasedStatement {
    AggregateKeyType: 'IP' | 'FORWARDED_IP'
    Limit: number
    ForwardedIPConfig?:ForwardedIPConfig
    ScopeDownStatement?:WebACLStatement
}

export interface ManagedRuleGroupStatement {
    Name:string
    VendorName:string
    ExcludedRules?:ExcludedRule[]
    ScopeDownStatement?:WebACLStatement
}

export interface RuleGroupReferenceStatement {
    ARN:string
    ExcludedRules?:ExcludedRule[]
}

export interface NotStatement {
    Statement:WebACLNestableStatement
}

export interface OrStatement {
    Statements: WebACLNestableStatement[]
}

export interface AndStatement {
    Statements: WebACLNestableStatement[]
}

export interface FieldToMatch {
    SingleHeader?:WebACLArgument
    AllQueryArguments?:WebACLArgumentMap
    SingleQueryArgument?:WebACLArgument
    Body?:WebACLArgumentMap
    Method?:WebACLArgumentMap
    UriPath?:WebACLArgumentMap
    QueryString?:WebACLArgumentMap
    JsonBody?:JsonBody
}

export type ComparisonOperator = 'EQ' | 'NE' | 'LE' | 'LT' | 'GE' | 'GT'

export type PositionalConstraint = 'EXACTLY' | 'STARTS_WITH' | 'ENDS_WITH' |
'CONTAINS' | 'CONTAINS_WORD';

export interface JsonBody {
    MatchPattern:MatchPattern
    MatchScope: 'ALL' | 'KEY' | 'VALUE'
    InvalidFallbackBehavior?: 'MATCH' | 'NO_MATCH' | 'EVALUATE_AS_STRING'
}

export interface MatchPattern {
    All?:WebACLArgumentMap
    IncludedPaths?:string[]
}

export interface TextTransformation {
    Priority:Number
    Type: 'NONE' | 'COMPRESS_WHITE_SPACE' | 'HTML_ENTITY_DECODE' |      
        'LOWERCASE' | 'CMD_LINE' | 'URL_DECODE'
}

export type WebACLArgument = {
    Name: string
}

export type WebACLArgumentMap = {[name:string]:string}

export interface ForwardedIPConfig {
    FallbackBehavior: 'MATCH' | 'NO_MATCH'
    HeaderName:string
}

export interface IPSetForwardedIPConfig extends ForwardedIPConfig {
    Position:'FIRST' | 'LAST' | 'ANY'
}

export type CountryCode = "AF" | "AX" | "AL" | "DZ" | "AS" | "AD" | "AO" | 
    "AI" | "AQ" | "AG" | "AR" | "AM" | "AW" | "AU" | "AT" | "AZ" | "BS" | 
    "BH" | "BD" | "BB" | "BY" | "BE" | "BZ" | "BJ" | "BM" | "BT" | "BO" | 
    "BQ" | "BA" | "BW" | "BV" | "BR" | "IO" | "BN" | "BG" | "BF" | "BI" | 
    "KH" | "CM" | "CA" | "CV" | "KY" | "CF" | "TD" | "CL" | "CN" | "CX" | 
    "CC" | "CO" | "KM" | "CG" | "CD" | "CK" | "CR" | "CI" | "HR" | "CU" | 
    "CW" | "CY" | "CZ" | "DK" | "DJ" | "DM" | "DO" | "EC" | "EG" | "SV" | 
    "GQ" | "ER" | "EE" | "ET" | "FK" | "FO" | "FJ" | "FI" | "FR" | "GF" | 
    "PF" | "TF" | "GA" | "GM" | "GE" | "DE" | "GH" | "GI" | "GR" | "GL" | 
    "GD" | "GP" | "GU" | "GT" | "GG" | "GN" | "GW" | "GY" | "HT" | "HM" | 
    "VA" | "HN" | "HK" | "HU" | "IS" | "IN" | "ID" | "IR" | "IQ" | "IE" | 
    "IM" | "IL" | "IT" | "JM" | "JP" | "JE" | "JO" | "KZ" | "KE" | "KI" | 
    "KP" | "KR" | "KW" | "KG" | "LA" | "LV" | "LB" | "LS" | "LR" | "LY" | 
    "LI" | "LT" | "LU" | "MO" | "MK" | "MG" | "MW" | "MY" | "MV" | "ML" | 
    "MT" | "MH" | "MQ" | "MR" | "MU" | "YT" | "MX" | "FM" | "MD" | "MC" | 
    "MN" | "ME" | "MS" | "MA" | "MZ" | "MM" | "NA" | "NR" | "NP" | "NL" | 
    "NC" | "NZ" | "NI" | "NE" | "NG" | "NU" | "NF" | "MP" | "NO" | "OM" | 
    "PK" | "PW" | "PS" | "PA" | "PG" | "PY" | "PE" | "PH" | "PN" | "PL" | 
    "PT" | "PR" | "QA" | "RE" | "RO" | "RU" | "RW" | "BL" | "SH" | "KN" | 
    "LC" | "MF" | "PM" | "VC" | "WS" | "SM" | "ST" | "SA" | "SN" | "RS" | 
    "SC" | "SL" | "SG" | "SX" | "SK" | "SI" | "SB" | "SO" | "ZA" | "GS" | 
    "SS" | "ES" | "LK" | "SD" | "SR" | "SJ" | "SZ" | "SE" | "CH" | "SY" | 
    "TW" | "TJ" | "TZ" | "TH" | "TL" | "TG" | "TK" | "TO" | "TT" | "TN" | 
    "TR" | "TM" | "TC" | "TV" | "UG" | "UA" | "AE" | "GB" | "US" | "UM" | 
    "UY" | "UZ" | "VU" | "VE" | "VN" | "VG" | "VI" | "WF" | "EH" | "YE" | 
    "ZM" | "ZW"

export type CountryCodes = CountryCode[]
    
export interface ExcludedRule {
    Name:string
}