export type ConstraintDirective = {
  // The minimum allowed length of the string.
  minLength?: number;
  // The maximum allowed length of the string.
  maxLength?: number;
  // The allowed length of the string must be greater than this value.
  exclusiveMin?: number;
  // The allowed length of the string must be less than this value.
  exclusiveMax?: number;
};

type ConstraintResultFailure = {
  success: false;
  message: string;
};
type ConstraintResultSuccess = {
  success: true;
  constraints: ConstraintDirective;
};

export type ConstraintResult =
  | ConstraintResultFailure
  | ConstraintResultSuccess;

export type Length = {
  _: "len";
  arg: string; // we only support having a single column name here
};

export type IntConst = {
  _: "int";
  value: number;
};

export type StrConst = {
  _: "str";
  value: string;
};

export type BoolConst = {
  _: "bool";
  value: boolean;
};

export type Ref = {
  _: "ref";
  name: string; // name of the column
};

export type BinOp = {
  _: "op";
  op: "<" | ">" | "<=" | ">=" | "=" | "AND" | "OR";
  left: SNode;
  right: SNode;
};

export type Func = {
  _: "func";
  name: string;
  args: SNode[];
};

export type ConstraintExpr = {
  _: "constraint";
  constraints: ConstraintDirective;
};

export type SNode =
  | Length
  | IntConst
  | StrConst
  | BoolConst
  | BinOp
  | Func
  | Ref
  | ConstraintExpr;

// toSNode converts a postgres AST node into a simplified tree structure that
// is easier for us to work with.
export const toSNode = (node: any): SNode => {
  if (node.hasOwnProperty("A_Const")) {
    if (node.A_Const.hasOwnProperty("ival")) {
      return {
        _: "int",
        value: node.A_Const.ival.ival,
      };
    } else {
      throw new Error(
        "Unsupported constant type " + JSON.stringify(node.A_Const)
      );
    }
  } else if (node.hasOwnProperty("A_Expr")) {
    const expr = node.A_Expr;
    if (expr.kind === "AEXPR_OP") {
      return {
        _: "op",
        op: expr.name[0].String.sval,
        left: toSNode(expr.lexpr),
        right: toSNode(expr.rexpr),
      };
    } else {
      throw new Error("Unsupported A_Expr kind " + expr.kind);
    }
  } else if (node.hasOwnProperty("FuncCall")) {
    const func = node.FuncCall;
    return {
      _: "func",
      name: func.funcname[0].String.sval,
      args: func.args.map(toSNode),
    };
  } else if (node.hasOwnProperty("ColumnRef")) {
    return {
      _: "ref",
      name: node.ColumnRef.fields[0].String.sval,
    };
  } else {
    throw new Error("Unsupported node type: " + JSON.stringify(node));
  }
};
