import { parse } from "pgsql-parser";
import { Node } from "@pgsql/types";

export const parseCheckConstraint = async (def: string): Promise<Node> => {
  // In order to parse the CHECK statement we wrap it in an ALTER
  // TABLE statment. Of course, we then have to unwrap it.
  const parsed = await parse(`ALTER TABLE x ADD CONSTRAINT y ${def};`);

  return parsed.stmts[0].stmt.AlterTableStmt.cmds[0].AlterTableCmd.def
    .Constraint.raw_expr;
};
