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
    minLength: { type: GraphQLInt },
    maxLength: { type: GraphQLInt },
    max: { type: GraphQLInt },
    min: { type: GraphQLInt },
    exclusiveMin: { type: GraphQLInt },
    exclusiveMax: { type: GraphQLInt },
    pattern: { type: GraphQLString },
    startsWith: { type: GraphQLString },
    endsWith: { type: GraphQLString },
    equals: { type: GraphQLString }, // This could be a Int?
    oneOf: { type: new GraphQLList(GraphQLString) },
  },
  description: "A directive to specify constraints on input fields.",
});
