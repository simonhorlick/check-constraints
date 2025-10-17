import { describe, expect, it } from "vitest";
import { toSNode } from "./ast";
import { Node } from "@pgsql/types";

describe("ast", () => {
  it("should construct a simplified AST for CHECK (length(bio) < 10000)", () => {
    const ast: Node = {
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
    const ast: Node = {
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
      op: "~*",
      left: {
        _: "ref",
        name: "email",
      },
      right: {
        _: "str",
        value: "^.+@.+\\..+$",
      },
    });
  });

  it("should construct a simplified AST for CHECK ((((email)::text <> ''::text) AND (length((email)::text) < 100)))", () => {
    const ast: Node = {
      BoolExpr: {
        boolop: "AND_EXPR",
        args: [
          {
            A_Expr: {
              kind: "AEXPR_OP",
              name: [
                {
                  String: {
                    sval: "<>",
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
                        sval: "",
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
          },
          {
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
                  ],
                  funcformat: "COERCE_EXPLICIT_CALL",
                },
              },
              rexpr: {
                A_Const: {
                  ival: {
                    ival: 100,
                  },
                },
              },
            },
          },
        ],
      },
    };

    expect(toSNode(ast)).toEqual({
      _: "op",
      op: "AND",
      left: {
        _: "op",
        op: "<>",
        left: { _: "ref", name: "email" },
        right: { _: "str", value: "" },
      },
      right: {
        _: "op",
        op: "<",
        left: {
          _: "func",
          name: "length",
          args: [
            {
              _: "ref",
              name: "email",
            },
          ],
        },
        right: {
          _: "int",
          value: 100,
        },
      },
    });
  });

  it("should construct a simplified AST for CHECK ((VALUE >= 0))", () => {
    const ast: Node = {
      A_Expr: {
        kind: "AEXPR_OP",
        name: [
          {
            String: {
              sval: ">=",
            },
          },
        ],
        lexpr: {
          ColumnRef: {
            fields: [
              {
                String: {
                  sval: "value",
                },
              },
            ],
          },
        },
        rexpr: {
          A_Const: {
            ival: {},
          },
        },
      },
    };

    expect(toSNode(ast)).toEqual({
      _: "op",
      op: ">=",
      left: {
        _: "ref",
        name: "value",
      },
      right: {
        _: "int",
        value: 0,
      },
    });
  });

  it("should construct a simplified AST for CHECK (((VALUE)::text = ANY ((ARRAY['YES'::character varying, 'NO'::character varying])::text[])))", () => {
    const ast: Node = {
      A_Expr: {
        kind: "AEXPR_OP_ANY",
        name: [
          {
            String: {
              sval: "=",
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
                      sval: "value",
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
              A_ArrayExpr: {
                elements: [
                  {
                    TypeCast: {
                      arg: {
                        A_Const: {
                          sval: {
                            sval: "YES",
                          },
                        },
                      },
                      typeName: {
                        names: [
                          {
                            String: {
                              sval: "pg_catalog",
                            },
                          },
                          {
                            String: {
                              sval: "varchar",
                            },
                          },
                        ],
                        typemod: -1,
                      },
                    },
                  },
                  {
                    TypeCast: {
                      arg: {
                        A_Const: {
                          sval: {
                            sval: "NO",
                          },
                        },
                      },
                      typeName: {
                        names: [
                          {
                            String: {
                              sval: "pg_catalog",
                            },
                          },
                          {
                            String: {
                              sval: "varchar",
                            },
                          },
                        ],
                        typemod: -1,
                      },
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
              arrayBounds: [
                {
                  Integer: {
                    ival: -1,
                  },
                },
              ],
            },
          },
        },
      },
    };

    expect(toSNode(ast)).toEqual({
      _: "op",
      op: "=",
      left: {
        _: "ref",
        name: "value",
      },
      right: {
        _: "func",
        name: "ANY",
        args: [
          {
            _: "arr",
            elements: [
              { _: "str", value: "YES" },
              { _: "str", value: "NO" },
            ],
          },
        ],
      },
    });
  });

  it("should extract the correct function name for functions with multiple parts", () => {
    const ast: Node = {
      BoolExpr: {
        boolop: "AND_EXPR",
        args: [
          {
            A_Expr: {
              kind: "AEXPR_OP",
              name: [
                {
                  String: {
                    sval: "=",
                  },
                },
              ],
              lexpr: {
                FuncCall: {
                  funcname: [
                    {
                      String: {
                        sval: "pg_catalog",
                      },
                    },
                    {
                      String: {
                        sval: "extract",
                      },
                    },
                  ],
                  args: [
                    {
                      A_Const: {
                        sval: {
                          sval: "day",
                        },
                      },
                    },
                    {
                      ColumnRef: {
                        fields: [
                          {
                            String: {
                              sval: "event_date",
                            },
                          },
                        ],
                      },
                    },
                  ],
                  funcformat: "COERCE_SQL_SYNTAX",
                },
              },
              rexpr: {
                A_Const: {
                  ival: {
                    ival: 13,
                  },
                },
              },
            },
          },
          {
            A_Expr: {
              kind: "AEXPR_OP",
              name: [
                {
                  String: {
                    sval: "=",
                  },
                },
              ],
              lexpr: {
                FuncCall: {
                  funcname: [
                    {
                      String: {
                        sval: "pg_catalog",
                      },
                    },
                    {
                      String: {
                        sval: "extract",
                      },
                    },
                  ],
                  args: [
                    {
                      A_Const: {
                        sval: {
                          sval: "dow",
                        },
                      },
                    },
                    {
                      ColumnRef: {
                        fields: [
                          {
                            String: {
                              sval: "event_date",
                            },
                          },
                        ],
                      },
                    },
                  ],
                  funcformat: "COERCE_SQL_SYNTAX",
                },
              },
              rexpr: {
                A_Const: {
                  ival: {
                    ival: 5,
                  },
                },
              },
            },
          },
        ],
      },
    };
    console.log(JSON.stringify(toSNode(ast), null, 2));
    expect(toSNode(ast)).toEqual({
      _: "op",
      op: "AND",
      left: {
        _: "op",
        op: "=",
        left: {
          _: "func",
          name: "pg_catalog.extract",
          args: [
            {
              _: "str",
              value: "day",
            },
            {
              _: "ref",
              name: "event_date",
            },
          ],
        },
        right: {
          _: "int",
          value: 13,
        },
      },
      right: {
        _: "op",
        op: "=",
        left: {
          _: "func",
          name: "pg_catalog.extract",
          args: [
            {
              _: "str",
              value: "dow",
            },
            {
              _: "ref",
              name: "event_date",
            },
          ],
        },
        right: {
          _: "int",
          value: 5,
        },
      },
    });
  });
});
