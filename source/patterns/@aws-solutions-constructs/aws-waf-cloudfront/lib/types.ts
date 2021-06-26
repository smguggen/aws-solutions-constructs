///<reference types="@types/node"/>

export interface WebACLProps {
    DefaultAction:DefaultAction
    Name:string
    Scope:'CLOUDFRONT' | 'REGIONAL'
    VisibilityConfig:VisibilityConfig
    Rules?:WebACLRule<WebACLStatement>[]
    CustomResponseBodies?:CustomResponseBodies
    Description?:string
    Tags?:Tag[]
}

export interface WebACLRule<S extends WebACLStatement> {
    Name:string
    Priority:number
    Statement:S
    VisibilityConfig:VisibilityConfig
    Action?:Action
    OverrideAction?:Override
    RuleLabels?: {Name:string}[]
}

export interface ActionRule extends Omit<WebACLRule<ActionStatement>,'OverrideAction'> {
    Action:Action
}

export interface MatchRule extends Omit<WebACLRule<MatchStatement>,'OverrideAction'> {
    Action:Action
}

export interface OverrideRule extends Omit<WebACLRule<OverrideStatement>,'Action'> {
    OverrideAction:Override
}

export interface DefaultAction {
    Allow?: Allow
    Block?: Block
}

export interface VisibilityConfig {
    CloudWatchMetricsEnabled:boolean,
    MetricName: string,
    SampledRequestsEnabled:boolean
}

export interface Action extends DefaultAction {
    Count?: Count
}

export interface Override {
    Count?: Count
    None?: {}
}

export interface Allow {
    CustomRequestHandling?:CustomRequestHandling
}

export interface Block {
    CustomResponse?:CustomResponse
}

export interface Count extends Allow {}

export interface CustomResponseBody {
    Content:string
    ContentType:'APPLICATION_JSON' | 'TEXT_HTML' | 'TEXT_PLAIN'
}

export interface CustomResponseBodies {
    [name:string]: CustomResponseBody
}

export interface CustomResponse {
    ResponseCode:number
    CustomResponseBodyKey?:keyof CustomResponseBodies
    ResponseHeaders?:WebACLHeaders
}

export interface CustomRequestHandling {
    InsertHeaders:WebACLHeaders
}

export interface Tag {
    Key:string
    Value:string
}

export interface WebACLHeader {
    Name:string
    Value:string
}

export type WebACLHeaders = WebACLHeader[]

export interface ByteMatchStatement extends MatchStatement {
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

export interface RegexPatternSetReferenceStatement extends MatchStatement {
    ARN:string
}

export interface SizeConstraintStatement extends MatchStatement {
    ComparisonOperator: ComparisonOperator
    Size:number
}

export interface SqliMatchStatement extends MatchStatement {}

export interface XssMatchStatement extends MatchStatement {}

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
    Statement:NestableStatement
}

export interface OrStatement {
    Statements: NestableStatement[]
}

export interface AndStatement {
    Statements: NestableStatement[]
}

export interface FieldToMatch {
    SingleHeader?:Argument
    AllQueryArguments?:ArgumentMap
    SingleQueryArgument?:Argument
    Body?:ArgumentMap
    Method?:ArgumentMap
    UriPath?:ArgumentMap
    QueryString?:ArgumentMap
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
    All?:ArgumentMap
    IncludedPaths?:string[]
}

export interface TextTransformation {
    Priority:Number
    Type: 'NONE' | 'COMPRESS_WHITE_SPACE' | 'HTML_ENTITY_DECODE' |      
        'LOWERCASE' | 'CMD_LINE' | 'URL_DECODE'
}

export type Argument = {
    Name: string
}

export type ArgumentMap = {[name:string]:string}

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

export type NestableStatement = ByteMatchStatement | GeoMatchStatement | 
LabelMatchStatement | IPSetReferenceStatement |RegexPatternSetReferenceStatement |
SizeConstraintStatement | SqliMatchStatement | XssMatchStatement

export type OverrideStatement = ManagedRuleGroupStatement |RuleGroupReferenceStatement
    
export type ActionStatement = NestableStatement | RateBasedStatement
    
export type UtilityStatement = AndStatement | OrStatement | NotStatement

export type WebACLStatement = ActionStatement | OverrideStatement |UtilityStatement

export interface MatchStatement {
    FieldToMatch:FieldToMatch
    TextTransformations:TextTransformation[]
}

export enum StatementProperty {
    Byte = 'ByteMatchStatement',
    Regex = 'RegexPatternSetStatement',
    Size = 'SizeConstraintStatement',
    Sql = 'SqliMatchStatement',
    Xss = 'XssMatchStatement',
    Geo = 'GeoMatchStatement',
    Label = 'LabelMatchStatement',
    IP = 'IPSetReferenceStatement',
    Rate = 'RateBasedStatement',
    Managed = 'ManagedRuleGroupStatement',
    Group = 'RuleGroupReferenceStatement',
    And = 'AndStatement',
    Or = 'OrStatement',
    Not = 'NotStatement',
    None = ''
}

export interface ActionStatementProps {
    allowHeaders?: {[name:string]:string} | boolean
    blockHeaders?: {[name:string]:string} | boolean
    countHeaders?: {[name:string]:string} | boolean
}

export enum TextTransformationProperty {
    CommandLine = 'CMD_LINE',
    Compress = 'COMPRESS_WHITE_SPACE',
    HtmlDecode = 'HTML_ENTITY_DECODE',
    Lowercase = 'LOWERCASE',
    UrlDecode = 'URL_DECODE',
    None = 'NONE'
}

export enum FieldToMatchProperty {
    Header = 'SingleHeader',
    Argument = 'SingleQueryArgument',
    Arguments = 'AllQueryArguments',
    Body = 'Body',
    Method = 'Method',
    Path = 'UriPath',
    Query = 'QueryString',
    Json = 'JsonBody'
}

export enum MatchScope {
    All = 'ALL',
    Key = 'KEY',
    Value = 'VALUE'
}

export interface MatchStatementProps extends ActionStatementProps {
    field: FieldToMatch
    value?: string | string[]
    scope?:MatchScope
    textTransformations?:TextTransformationProperty[]
}

export interface StatementPropertyMap {
    match:WebACLStatement[]
    action:WebACLStatement[]
    override:WebACLStatement[]
    nestable:WebACLStatement[]
    utility:WebACLStatement[]
}

export interface OverrideStatementProps {
    countHeaders?: {[name:string]:string} | boolean
}

export type ActionProperty = Allow | Block | Count

export interface AllowProperty {
    Allow:Allow
}

export interface BlockProperty {
    Block:Block
}

export interface CountProperty {
    Count:Count
}