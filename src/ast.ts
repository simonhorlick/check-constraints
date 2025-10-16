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

export type BinOp = {
  _: "op";
  op: "<" | ">" | "<=" | ">=" | "=" | "AND" | "OR" | "~*" | "<>";
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

// toSNode converts a postgres AST node into a simplified tree structure that
// is easier for us to work with.
export const toSNode = (node: any): SNode => {
  if (node.hasOwnProperty("A_Const")) {
    if (node.A_Const.hasOwnProperty("ival")) {
      return {
        _: "int",
        value: node.A_Const.ival.ival ?? 0, // zero if missing
      };
    } else if (node.A_Const.hasOwnProperty("sval")) {
      return {
        _: "str",
        value: node.A_Const.sval.sval,
      };
    } else {
      throw new Error(
        "Unsupported constant type " + JSON.stringify(node.A_Const)
      );
    }
  } else if (node.hasOwnProperty("TypeCast")) {
    const expr = node.TypeCast;
    // Do we need to do anything here?
    return toSNode(expr.arg);
  } else if (node.hasOwnProperty("A_Expr")) {
    const expr = node.A_Expr;
    if (expr.kind === "AEXPR_OP") {
      return {
        _: "op",
        op: expr.name[0].String.sval,
        left: toSNode(expr.lexpr),
        right: toSNode(expr.rexpr),
      };
    } else if (expr.kind === "AEXPR_OP_ANY") {
      // This expression is of the form `foo = ANY (...)`.
      return {
        _: "op",
        op: expr.name[0].String.sval,
        left: toSNode(expr.lexpr),
        right: {
          _: "func",
          name: "ANY",
          args: [toSNode(expr.rexpr)],
        },
      };
    } else {
      throw new Error("Unsupported A_Expr kind " + expr.kind);
    }
  } else if (node.hasOwnProperty("BoolExpr")) {
    const expr = node.BoolExpr;
    const mapop = (op: string) => {
      switch (op) {
        case "AND_EXPR":
          return "AND";
        case "OR_EXPR":
          return "OR";
        default:
          throw new Error("Unsupported BoolExpr op " + op);
      }
    };
    return {
      _: "op",
      op: mapop(expr.boolop),
      left: toSNode(expr.args[0]),
      right: toSNode(expr.args[1]),
    };
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
  } else if (node.hasOwnProperty("A_ArrayExpr")) {
    const arr = node.A_ArrayExpr;
    return {
      _: "arr",
      elements: arr.elements.map(toSNode),
    };
  } else {
    throw new Error("Unsupported node type: " + JSON.stringify(node));
  }
};
