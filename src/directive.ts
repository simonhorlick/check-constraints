import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
} from "grafast/graphql";

export const constraintDirective = new GraphQLDirective({
  name: "constraint",
  locations: [DirectiveLocation.INPUT_FIELD_DEFINITION],
  args: {
    minLength: {
      type: GraphQLInt,
      description:
        "The value of this constraint MUST be a non-negative integer. A string instance is valid against this constraint if its length is greater than, or equal to minLength. The length of a string instance is defined as the number of its characters.",
    },
    maxLength: {
      type: GraphQLInt,
      description:
        "The value of this constraint MUST be a non-negative integer. A string instance is valid against this constraint if its length is less than, or equal to maxLength. The length of a string instance is defined as the number of its characters.",
    },
    max: {
      type: GraphQLInt,
      description:
        "The value of max MUST be a number, representing an inclusive upper limit for a numeric instance. A numeric instance is valid only if the instance is less than or exactly equal to max.",
    },
    min: {
      type: GraphQLInt,
      description:
        "The value of min MUST be a number, representing an inclusive lower limit for a numeric instance. A numeric instance is valid only if the instance is greater than or exactly equal to min.",
    },
    exclusiveMin: {
      type: GraphQLInt,
      description:
        "The value of exclusiveMin MUST be a number, representing an exclusive upper limit for a numeric instance. A numeric instance is valid only if it has a value strictly greater than (not equal to) exclusiveMin.",
    },
    exclusiveMax: {
      type: GraphQLInt,
      description:
        "The value of exclusiveMax MUST be a number, representing an exclusive upper limit for a numeric instance. A numeric instance is valid only if it is strictly less than (not equal to) exclusiveMax.",
    },
    pattern: {
      type: GraphQLString,
      description:
        "The value of this constraint MUST be a string. This string SHOULD be a valid regular expression, according to the ECMA 262 regular expression dialect. An instance is valid if the regular expression matches the instance successfully. Recall: regular expressions are not implicitly anchored.",
    },
    startsWith: {
      type: GraphQLString,
      description:
        "The value of this constraint MUST be a string. An instance is valid if it begins with the characters of the constraint's string.",
    },
    endsWith: {
      type: GraphQLString,
      description:
        "The value of this constraint MUST be a string. An instance is valid if it ends with the characters of the constraint's string.",
    },
    equals: {
      type: GraphQLString,
      description:
        "A value is valid only if its value is equal to the value of the constraint.",
    }, // This could be a Int?
    oneOf: {
      type: new GraphQLList(GraphQLString),
      description:
        "A value is valid if it is equal to one of the values in this array.",
    },
  },
  description: "A directive to specify constraints on input fields.",
});
