import { ConstraintDirective, ConstraintResult, SNode } from "./ast";

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
    // Transform length(ref) into a length node.
    // FIXME: why do we do this here and in simplify?
    if (
      n._ === "func" &&
      n.name === "length" &&
      n.args.length === 1 &&
      n.args[0]._ === "ref"
    ) {
      return { _: "len", arg: n.args[0].name };
    }

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
            constraints: { maxLength: n.right.value - 1 },
          };
        case "<=":
          return {
            _: "constraint",
            constraints: { maxLength: n.right.value },
          };
        case ">":
          return {
            _: "constraint",
            constraints: { minLength: n.right.value + 1 },
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
        let constraints: ConstraintDirective = {};
        if (
          l.constraints.minLength !== undefined ||
          r.constraints.minLength !== undefined
        ) {
          constraints.minLength = MaxOrUndefined(
            l.constraints.minLength,
            r.constraints.minLength
          );
        }
        if (
          l.constraints.maxLength !== undefined ||
          r.constraints.maxLength !== undefined
        ) {
          constraints.maxLength = MinOrUndefined(
            l.constraints.maxLength,
            r.constraints.maxLength
          );
        }
        if (
          l.constraints.min !== undefined ||
          r.constraints.min !== undefined
        ) {
          constraints.min = MaxOrUndefined(
            l.constraints.min,
            r.constraints.min
          );
        }
        if (
          l.constraints.max !== undefined ||
          r.constraints.max !== undefined
        ) {
          constraints.max = MinOrUndefined(
            l.constraints.max,
            r.constraints.max
          );
        }
        if (
          l.constraints.exclusiveMin !== undefined ||
          r.constraints.exclusiveMin !== undefined
        ) {
          constraints.exclusiveMin = MaxOrUndefined(
            l.constraints.exclusiveMin,
            r.constraints.exclusiveMin
          );
        }
        if (
          l.constraints.exclusiveMax !== undefined ||
          r.constraints.exclusiveMax !== undefined
        ) {
          constraints.exclusiveMax = MinOrUndefined(
            l.constraints.exclusiveMax,
            r.constraints.exclusiveMax
          );
        }
        return {
          _: "constraint",
          constraints: constraints,
        };
      }
    }

    // Transform regex match expressions.
    if (
      n._ === "op" &&
      n.op === "~*" &&
      n.left._ === "ref" &&
      n.left.name === columnName &&
      n.right._ === "str"
    ) {
      return {
        _: "constraint",
        constraints: {
          pattern: n.right.value,
        },
      };
    }

    // Transform non-empty string checks (col <> '') into minLength: 1
    if (
      n._ === "op" &&
      n.op === "<>" &&
      n.left._ === "ref" &&
      n.left.name === columnName &&
      n.right._ === "str" &&
      n.right.value === ""
    ) {
      return {
        _: "constraint",
        constraints: {
          minLength: 1,
        },
      };
    }

    // Transform value constraints (e.g. age > 3)
    if (
      n._ === "op" &&
      n.left._ === "ref" &&
      n.left.name === columnName &&
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
            constraints: { max: n.right.value },
          };
        case ">":
          return {
            _: "constraint",
            constraints: { exclusiveMin: n.right.value },
          };
        case ">=":
          return {
            _: "constraint",
            constraints: { min: n.right.value },
          };
        case "=":
          return {
            _: "constraint",
            constraints: {
              equals: n.right.value,
            },
          };
        default:
          throw new Error(`Unsupported operation: ${n.op}`);
      }
    }

    return n;
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
        const l = go(node.left);
        const r = go(node.right);
        return visit({
          _: "op",
          op: node.op,
          left: l,
          right: r,
        });
      case "func":
        const args = node.args.map(go);
        return visit({ _: "func", name: node.name, args: args });
    }
  };
  const result = go(node);

  if (result._ === "constraint") {
    return { success: true, constraints: result.constraints };
  }

  return { success: false, message: JSON.stringify(result) };
};
