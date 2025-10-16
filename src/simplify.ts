import { SNode } from "./ast";

export const simplifySNode = (node: SNode): SNode => {
  const visit = (n: SNode): SNode => {
    // Transform length(ref) into a length node.
    if (n._ === "func" && n.name === "length" && n.args.length === 1) {
      const arg = n.args[0];
      if (arg._ === "ref") {
        return { _: "len", arg: arg.name };
      }
    }
    return n;
  };

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
