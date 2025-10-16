import { describe, expect, it } from "vitest";
import { simplifySNode } from "./simplify";
import { Func, Length } from "./ast";

describe("simplify", () => {
  it("should simplify a length(a) into a length node", () => {
    const ast: Func = {
      _: "func",
      name: "length",
      args: [
        {
          _: "ref",
          name: "a",
        },
      ],
    };

    const actual = simplifySNode(ast);
    const expected: Length = {
      _: "len",
      arg: "a",
    };

    expect(actual).toEqual(expected);
  });
});
