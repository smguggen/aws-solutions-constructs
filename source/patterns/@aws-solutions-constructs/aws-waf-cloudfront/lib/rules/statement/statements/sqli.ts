import { MatchHandler } from "../match";
import { SqliMatchStatement } from "../../../types"

export class SqliMatch extends MatchHandler implements SqliMatchStatement {}