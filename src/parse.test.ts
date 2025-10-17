import { describe, expect, it } from "vitest";
import { parseCheckConstraint } from "./parse";
import { Node } from "@pgsql/types";

describe("parse", () => {
  it("should parse CHECK ((VALUE >= 0))", async () => {
    const ast = await parseCheckConstraint("CHECK ((VALUE >= 0))");
    expect(ast).toEqual({
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
            location: 39,
          },
        },
        rexpr: {
          A_Const: {
            ival: {},
            location: 48,
          },
        },
        location: 45,
      },
    } satisfies Node);
  });

  it("should parse CHECK (((VALUE)::text = ANY ((ARRAY['YES'::character varying, 'NO'::character varying])::text[])))", async () => {
    const ast = await parseCheckConstraint(
      "CHECK (((VALUE)::text = ANY ((ARRAY['YES'::character varying, 'NO'::character varying])::text[])))"
    );
    console.log(JSON.stringify(ast, null, 2));
  });
});
