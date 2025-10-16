import { describe, expect, it } from "vitest";
import { BinOp } from "./ast";
import { extractConstraintsFromAST } from "./constraints";

// len(a) < 100 => exclusiveMax: 100 (we can turn this inequality into an exclusiveMax)
// len(a) > 10 => exclusiveMin: 10
// 100 < len(a) => exclusiveMin: 100
// (len(a) > 2) AND (len(a) > 3) => exclusiveMin: 3
// (len(a) > 10) AND (len(a) < 2) => exclusiveMin: 10, exclusiveMax: 2 (bizarre case)
// 1 < 2 => true
// 2 < 1 => false
// len(a) > 10 AND false => false
// len(a) > 10 AND true => exclusiveMin: 10 (we can ignore an "AND true")
// len("a") > 0 => true (we only care about constraints on the given column)

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
        exclusiveMax: 10000,
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
        exclusiveMin: 5,
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
        exclusiveMin: 10, // take the max
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
        exclusiveMax: 5, // take the min
      },
    });
  });
});
