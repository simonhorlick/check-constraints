import { describe, expect, it } from "vitest";
import { BinOp, SNode } from "./ast";
import { extractConstraintsFromAST } from "./constraints";

describe("constraints", () => {
  // length(bio) < 10000
  const lenLessThanConst: BinOp = {
    _: "op",
    op: "<",
    left: {
      _: "len",
      arg: "bio",
    },
    right: {
      _: "int",
      value: 10000,
    },
  };

  it("should extract lessThan constraints from a length expression", () =>
    expect(extractConstraintsFromAST(lenLessThanConst, "bio")).toEqual({
      success: true,
      constraints: {
        maxLength: 9999, // maxLength is <=, so we subtract 1
      },
    }));

  // length(bio) > 5
  const lenGreaterThan5: BinOp = {
    _: "op",
    op: ">",
    left: {
      _: "len",
      arg: "bio",
    },
    right: {
      _: "int",
      value: 5,
    },
  };

  it("should extract greaterThan constraints from a length expression", () =>
    expect(extractConstraintsFromAST(lenGreaterThan5, "bio")).toEqual({
      success: true,
      constraints: {
        minLength: 6, // minLength is >=, so we add 1
      },
    }));

  // length(bio) = 5
  const lenEqualConst: BinOp = {
    _: "op",
    op: "=",
    left: {
      _: "len",
      arg: "bio",
    },
    right: {
      _: "int",
      value: 5,
    },
  };

  it("should extract equal constraints from a length expression", () =>
    expect(extractConstraintsFromAST(lenEqualConst, "bio")).toEqual({
      success: true,
      constraints: {
        minLength: 5,
        maxLength: 5,
      },
    }));

  // (email)::text ~* '^.+@.+..+$'::text
  const emailPattern: BinOp = {
    _: "op",
    op: "~*",
    left: {
      _: "ref",
      name: "email",
    },
    right: {
      _: "str",
      value: "^.+@.+..+$",
    },
  };

  it("should extract pattern constraints from a regex expression", () =>
    expect(extractConstraintsFromAST(emailPattern, "email")).toEqual({
      success: true,
      constraints: {
        pattern: "^.+@.+..+$",
      },
    }));

  const lenGreaterThan10: BinOp = {
    _: "op",
    op: ">",
    left: {
      _: "len",
      arg: "bio",
    },
    right: {
      _: "int",
      value: 10,
    },
  };

  it("should merge greaterThan constraints from AND expressions", () => {
    // length(bio) > 5 AND length(bio) > 10
    const andExpr: BinOp = {
      _: "op",
      op: "AND",
      left: lenGreaterThan5,
      right: lenGreaterThan10,
    };
    expect(extractConstraintsFromAST(andExpr, "bio")).toEqual({
      success: true,
      constraints: {
        minLength: 11, // take the max
      },
    });
  });

  const lenLessThan10: BinOp = {
    _: "op",
    op: "<",
    left: {
      _: "len",
      arg: "bio",
    },
    right: {
      _: "int",
      value: 10,
    },
  };

  // length(bio) < 5
  const lenLessThan5: BinOp = {
    _: "op",
    op: "<",
    left: {
      _: "len",
      arg: "bio",
    },
    right: {
      _: "int",
      value: 5,
    },
  };

  it("should merge lessThan constraints from AND expressions", () => {
    // length(bio) < 5 AND length(bio) < 10 => length(bio) < 5
    const andExpr: BinOp = {
      _: "op",
      op: "AND",
      left: lenLessThan5,
      right: lenLessThan10,
    };
    expect(extractConstraintsFromAST(andExpr, "bio")).toEqual({
      success: true,
      constraints: {
        maxLength: 4, // take the min
      },
    });
  });

  it("should extract value constraints: age < 120 => exclusiveMax: 120", () => {
    const valueExpr: BinOp = {
      _: "op",
      op: "<",
      left: {
        _: "ref",
        name: "age",
      },
      right: {
        _: "int",
        value: 120,
      },
    };

    expect(extractConstraintsFromAST(valueExpr, "age")).toEqual({
      success: true,
      constraints: {
        exclusiveMax: 120,
      },
    });
  });

  it("should extract value constraints: age =< 120 => max: 120", () => {
    const valueExpr: BinOp = {
      _: "op",
      op: "<=",
      left: {
        _: "ref",
        name: "age",
      },
      right: {
        _: "int",
        value: 120,
      },
    };

    expect(extractConstraintsFromAST(valueExpr, "age")).toEqual({
      success: true,
      constraints: {
        max: 120,
      },
    });
  });

  it("should extract value constraints: age > 10 => exclusiveMin: 10", () => {
    const valueExpr: BinOp = {
      _: "op",
      op: ">",
      left: {
        _: "ref",
        name: "age",
      },
      right: {
        _: "int",
        value: 10,
      },
    };

    expect(extractConstraintsFromAST(valueExpr, "age")).toEqual({
      success: true,
      constraints: {
        exclusiveMin: 10,
      },
    });
  });

  it("should extract value constraints: age >= 10 => min: 10", () => {
    const valueExpr: BinOp = {
      _: "op",
      op: ">=",
      left: {
        _: "ref",
        name: "age",
      },
      right: {
        _: "int",
        value: 10,
      },
    };

    expect(extractConstraintsFromAST(valueExpr, "age")).toEqual({
      success: true,
      constraints: {
        min: 10,
      },
    });
  });

  it("should extract constraints: email <> '' AND length(email) < 100", () => {
    const expr: SNode = {
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
    };

    // We can't express the non-empty constraint directly, but it is equivalent
    // to a minLength of 1, so we use that.
    expect(extractConstraintsFromAST(expr, "email")).toEqual({
      success: true,
      constraints: {
        minLength: 1,
        maxLength: 99,
      },
    });
  });

  it("should extract constraints: value = ANY (ARRAY['YES', 'NO'])", () => {
    const expr: SNode = {
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
    };

    expect(extractConstraintsFromAST(expr, "value")).toEqual({
      success: true,
      constraints: {
        oneOf: ["YES", "NO"],
      },
    });
  });

  it("should not extract constraints: CHECK (word = reverse(word))", () => {
    const expr: SNode = {
      _: "op",
      op: "=",
      left: {
        _: "ref",
        name: "word",
      },
      right: {
        _: "func",
        name: "reverse", // Unsupported function
        args: [
          {
            _: "ref",
            name: "word",
          },
        ],
      },
    };

    expect(extractConstraintsFromAST(expr, "word").success).toBe(false);
  });

  it("should extract startsWith from: number LIKE '+1%'", () => {
    const expr: SNode = {
      _: "op",
      op: "LIKE",
      left: {
        _: "ref",
        name: "number",
      },
      right: {
        _: "str",
        value: "+1%",
      },
    };

    expect(extractConstraintsFromAST(expr, "number")).toEqual({
      success: true,
      constraints: {
        startsWith: "+1",
      },
    });
  });

  it("should extract endsWith from: plurals LIKE '%s'", () => {
    const expr: SNode = {
      _: "op",
      op: "LIKE",
      left: {
        _: "ref",
        name: "plurals",
      },
      right: {
        _: "str",
        value: "%s",
      },
    };

    expect(extractConstraintsFromAST(expr, "plurals")).toEqual({
      success: true,
      constraints: {
        endsWith: "s",
      },
    });
  });
});
