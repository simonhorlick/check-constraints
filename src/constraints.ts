import { ConstraintResult, SNode } from "./ast";

export const extractConstraintsFromAST = (
  node: SNode,
  columnName: string
): ConstraintResult => {
  // First we map the postgres AST into a simpler representation.

  // Any composite expressions that are the conjunction of other expressions can
  // be evaluated recursively.

  // Visit each node and see if we can transform it into a constraint. Working
  // our way up the tree, simplifying as we go.

  const visit = (n: SNode): SNode => {
    // Transform length op int.
    // FIXME: this assumes len is on the left. Perhaps transform the tree so
    // we can assume that?
    if (
      n._ === "op" &&
      n.left._ === "len" &&
      n.left.arg === columnName &&
      n.right._ === "int"
    ) {
      switch (n.op) {
        case "<":
          return {
            _: "constraint",
            constraints: { exclusiveMax: n.right.value },
          };
        case "<=":
          return {
            _: "constraint",
            constraints: { maxLength: n.right.value },
          };
        case ">":
          return {
            _: "constraint",
            constraints: { exclusiveMin: n.right.value },
          };
        case ">=":
          return {
            _: "constraint",
            constraints: { minLength: n.right.value },
          };
        case "=":
          return {
            _: "constraint",
            constraints: {
              minLength: n.right.value,
              maxLength: n.right.value,
            },
          };
        default:
          return n;
      }
    }

    // Transform AND expressions by merging constraints.
    if (n._ === "op" && n.op === "AND") {
      const l = visit(n.left);
      const r = visit(n.right);
      if (l._ === "constraint" && r._ === "constraint") {
        return {
          _: "constraint",
          constraints: {
            minLength: MaxOrUndefined(
              l.constraints.minLength,
              r.constraints.minLength
            ),
            maxLength: MinOrUndefined(
              l.constraints.maxLength,
              r.constraints.maxLength
            ),
            exclusiveMin: MaxOrUndefined(
              l.constraints.exclusiveMin,
              r.constraints.exclusiveMin
            ),
            exclusiveMax: MinOrUndefined(
              l.constraints.exclusiveMax,
              r.constraints.exclusiveMax
            ),
          },
        };
      }
    }

    return n;
  };

  const MaxOrUndefined = (a: number | undefined, b: number | undefined) => {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (a === undefined && b === undefined) return undefined;
    return Math.max(a, b);
  };

  const MinOrUndefined = (a: number | undefined, b: number | undefined) => {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (a === undefined && b === undefined) return undefined;
    return Math.min(a, b);
  };

  const go = (node: SNode): SNode => {
    switch (node._) {
      case "len":
      case "int":
      case "str":
      case "bool":
      case "ref":
      case "constraint":
        return visit(node);
      case "op":
        const l = visit(node.left);
        const r = visit(node.right);
        return visit({
          _: "op",
          op: node.op,
          left: l,
          right: r,
        });
      case "func":
        const args = node.args.map(visit);
        return visit({ _: "func", name: node.name, args: args });
    }
  };
  const result = go(node);

  if (result._ === "constraint") {
    return { success: true, constraints: result.constraints };
  }

  return { success: false, message: JSON.stringify(result) };
};
