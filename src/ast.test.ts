import { describe, expect, it } from "vitest";
import { toSNode } from "./ast";

describe("ast", () => {
  it("should construct a simplified AST for CHECK (length(bio) < 10000)", () => {
    const ast = {
      A_Expr: {
        kind: "AEXPR_OP",
        name: [
          {
            String: {
              sval: "<",
            },
          },
        ],
        lexpr: {
          FuncCall: {
            funcname: [
              {
                String: {
                  sval: "length",
                },
              },
            ],
            args: [
              {
                ColumnRef: {
                  fields: [
                    {
                      String: {
                        sval: "bio",
                      },
                    },
                  ],
                },
              },
            ],
            funcformat: "COERCE_EXPLICIT_CALL",
          },
        },
        rexpr: {
          A_Const: {
            ival: {
              ival: 10000,
            },
          },
        },
      },
    };

    expect(toSNode(ast)).toEqual({
      _: "op",
      op: "<",
      left: {
        _: "func",
        name: "length",
        args: [
          {
            _: "ref",
            name: "bio",
          },
        ],
      },
      right: {
        _: "int",
        value: 10000,
      },
    });
  });

  it("should construct a simplified AST for CHECK (((email)::text ~* '^.+@.+..+$'::text))", () => {
    const ast = {
      A_Expr: {
        kind: "AEXPR_OP",
        name: [
          {
            String: {
              sval: "~*",
            },
          },
        ],
        lexpr: {
          TypeCast: {
            arg: {
              ColumnRef: {
                fields: [
                  {
                    String: {
                      sval: "email",
                    },
                  },
                ],
              },
            },
            typeName: {
              names: [
                {
                  String: {
                    sval: "text",
                  },
                },
              ],
              typemod: -1,
            },
          },
        },
        rexpr: {
          TypeCast: {
            arg: {
              A_Const: {
                sval: {
                  sval: "^.+@.+\\..+$",
                },
              },
            },
            typeName: {
              names: [
                {
                  String: {
                    sval: "text",
                  },
                },
              ],
              typemod: -1,
            },
          },
        },
      },
    };

    expect(toSNode(ast)).toEqual({
      _: "op",
      op: "<",
      left: {
        _: "func",
        name: "length",
        args: [
          {
            _: "ref",
            name: "bio",
          },
        ],
      },
      right: {
        _: "int",
        value: 10000,
      },
    });
  });

  it("should construct a simplified AST for CHECK ((((email)::text <> ''::text) AND (length((email)::text) < 100)))", () => {
    const ast = {
      A_Expr: {
        kind: "AEXPR_OP",
        name: [
          {
            String: {
              sval: "~*",
            },
          },
        ],
        lexpr: {
          TypeCast: {
            arg: {
              ColumnRef: {
                fields: [
                  {
                    String: {
                      sval: "email",
                    },
                  },
                ],
              },
            },
            typeName: {
              names: [
                {
                  String: {
                    sval: "text",
                  },
                },
              ],
              typemod: -1,
            },
          },
        },
        rexpr: {
          TypeCast: {
            arg: {
              A_Const: {
                sval: {
                  sval: "^.+@.+\\..+$",
                },
              },
            },
            typeName: {
              names: [
                {
                  String: {
                    sval: "text",
                  },
                },
              ],
              typemod: -1,
            },
          },
        },
      },
    };

    expect(toSNode(ast)).toEqual({
      _: "op",
      op: "<",
      left: {
        _: "func",
        name: "length",
        args: [
          {
            _: "ref",
            name: "bio",
          },
        ],
      },
      right: {
        _: "int",
        value: 10000,
      },
    });
  });
});
