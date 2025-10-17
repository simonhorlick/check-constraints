import { Node } from "pgsql-parser";

export type ConstraintDirective = {
  /**
   * The value of this constraint MUST be a non-negative integer. A string
   * instance is valid against this constraint if its length is greater than,
   * or equal to minLength. The length of a string instance is defined as the
   * number of its characters.
   */
  minLength?: number;

  /**
   * The value of this constraint MUST be a non-negative integer. A string
   * instance is valid against this constraint if its length is less than, or
   * equal to maxLength. The length of a string instance is defined as the
   * number of its characters.
   */
  maxLength?: number;

  /**
   * The value of exclusiveMin MUST be a number, representing an exclusive
   * upper limit for a numeric instance. A numeric instance is valid only if it
   * has a value strictly greater than (not equal to) exclusiveMin.
   */
  exclusiveMin?: number;

  /**
   * The value of exclusiveMax MUST be a number, representing an exclusive
   * upper limit for a numeric instance. A numeric instance is valid only if it
   * is strictly less than (not equal to) exclusiveMax.
   */
  exclusiveMax?: number;

  /**
   * The value of this constraint MUST be a string. This string SHOULD be a
   * valid regular expression, according to the ECMA 262 regular expression
   * dialect. An instance is valid if the regular expression matches the
   * instance successfully. Recall: regular expressions are not implicitly
   * anchored.
   */
  pattern?: string;

  /**
   * The value of max MUST be a number, representing an inclusive upper limit
   * for a numeric instance. A numeric instance is valid only if the instance
   * is less than or exactly equal to max.
   */
  max?: number;

  /**
   * The value of min MUST be a number, representing an inclusive lower limit
   * for a numeric instance. A numeric instance is valid only if the instance
   * is greater than or exactly equal to min.
   */
  min?: number;

  /**
   * A numeric instance is valid only if its value is equal to the value of the
   * constraint.
   */
  equals?: number;

  /**
   * A value is valid if it is equal to one of the values in this array.
   */
  oneOf?: string[];
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

export type Arr = {
  _: "arr";
  elements: SNode[];
};

export type Ref = {
  _: "ref";
  name: string; // name of the column
};

type BinOpType =
  | "<"
  | ">"
  | "<="
  | ">="
  | "="
  | "AND"
  | "OR"
  | "~*"
  | "<>"
  | "LIKE";

export type BinOp = {
  _: "op";
  op: BinOpType;
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
  | ConstraintExpr
  | Arr;

// strNameOrThrow extracts the string name from a Postgres AST name node. If
// there are multiple parts to the name, they are joined with dots, for example
// pg_catalog.extract.
const strNameOrThrow = (name: Node[] | undefined): string => {
  if (!name || name.length === 0) {
    throw new Error("Expected a name but got none");
  }
  return name
    .map((n) => {
      if ("String" in n) {
        if (!n.String.sval) {
          throw new Error("String node has no sval: " + JSON.stringify(n));
        }
        return n.String.sval;
      } else {
        throw new Error("Expected a String node but got " + JSON.stringify(n));
      }
    })
    .join(".");
};

// toSNode converts a postgres AST node into a simplified tree structure that
// is easier for us to work with.
export const toSNode = (node: Node): SNode => {
  if (node == null || typeof node !== "object") {
    throw new Error("Invalid node: " + JSON.stringify(node));
  }

  // Each node is an object with a single key that indicates its type.
  if ("A_Const" in node) {
    const n = node["A_Const"];
    if ("ival" in n) {
      return {
        _: "int",
        value: n.ival?.ival ?? 0, // zero if missing
      };
    } else if ("sval" in n) {
      return {
        _: "str",
        value: n.sval?.sval ?? "",
      };
    } else {
      throw new Error("Unsupported constant type " + JSON.stringify(n));
    }
  } else if ("TypeCast" in node) {
    const expr = node.TypeCast;
    if (!expr.arg) {
      throw new Error("TypeCast without arg not supported");
    }
    // Do we need to do anything here?
    return toSNode(expr.arg);
  } else if ("A_Expr" in node) {
    const expr = node.A_Expr;
    switch (expr.kind) {
      case "AEXPR_OP":
        return {
          _: "op",
          op: strNameOrThrow(expr.name) as BinOpType,
          left: toSNode(expr.lexpr!),
          right: toSNode(expr.rexpr!),
        };
      case "AEXPR_OP_ANY":
        // This expression is of the form `foo = ANY (...)`.
        return {
          _: "op",
          op: strNameOrThrow(expr.name) as BinOpType,
          left: toSNode(expr.lexpr!),
          right: {
            _: "func",
            name: "ANY",
            args: [toSNode(expr.rexpr!)],
          },
        };
      case "AEXPR_LIKE":
        return {
          _: "op",
          op: "LIKE",
          left: toSNode(expr.lexpr!),
          right: toSNode(expr.rexpr!),
        };
      default:
        throw new Error("Unsupported A_Expr kind " + expr.kind);
    }
  } else if ("BoolExpr" in node) {
    const expr = node.BoolExpr;
    switch (expr.boolop!) {
      case "AND_EXPR":
        return {
          _: "op",
          op: "AND",
          left: toSNode(expr.args![0]),
          right: toSNode(expr.args![1]),
        };
      case "OR_EXPR":
        return {
          _: "op",
          op: "OR",
          left: toSNode(expr.args![0]),
          right: toSNode(expr.args![1]),
        };
      case "NOT_EXPR":
        throw new Error("NOT_EXPR is not supported");
    }
  } else if ("FuncCall" in node) {
    const func = node.FuncCall;
    return {
      _: "func",
      name: strNameOrThrow(func.funcname),
      args: func.args?.map(toSNode) ?? [],
    };
  } else if ("ColumnRef" in node) {
    return {
      _: "ref",
      name: strNameOrThrow(node.ColumnRef.fields),
    };
  } else if ("A_ArrayExpr" in node) {
    const arr = node.A_ArrayExpr;
    return {
      _: "arr",
      elements: arr.elements?.map(toSNode) ?? [],
    };
  } else {
    throw new Error("Unsupported node type: " + JSON.stringify(node));
  }
};
