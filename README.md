# check-constraints

Parsing PostgreSQL CHECK constraints into an AST.

```bash
npm run test
```

## What?

This plugin pulls all of the CHECK constraints from postgres and transforms
them into constraint directives on the relevant input fields.

For example, given a table defined like this:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT CHECK (email ~* '^.+@.+\..+$'),
  age INT CHECK (age >= 18),
  username TEXT CHECK (length(username) > 0),
  bio TEXT CHECK (length(bio) <= 500)
);
```

The following input object would be generated:

```graphql
input UserInput {
  email: Email! @constraint(pattern: "^.+@.+\\..+$")
  age: Int @constraint(min: 18)
  username: String! @constraint(minLength: 1)
  bio: String @constraint(maxLength: 500)
}
```

To bring this (somewhat crazy idea) to it's logical conclusion, you could then
run this through a codegen tool such as [graphql-codegen-typescript-validation-schema](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/tree/main) to generate
validation schemas for your frontend forms.

```typescript
import * as v from 'valibot'

export function UserInputSchema(): v.GenericSchema<UserInput> {
  return v.object({
    email: v.pipe(v.pipe(v.string(), v.email()), v.regex(/^.+@.+\..+$/), v.minLength(1), v.maxLength(99)),
    age: v.pipe(v.number(), v.minValue(18)),
    bio: v.nullish(v.pipe(v.string(), v.maxLength(500))),
    username: v.pipe(v.string(), v.minLength(1)),
  })
}
```

## Installation

```bash
npm install --save check-constraints
```

```typescript
import {
  makeConstraintDirectivePlugin,
  ConstraintDirectiveTypeDefsPlugin,
} from "check-constraints";

const preset: GraphileConfig.Preset = {
  // ...

  plugins: [
    makeConstraintDirectivePlugin({
      // Optional: include constraint directives in field descriptions
      // This makes constraints visible in GraphiQL and other GraphQL explorers
      printConstraintInDescription: false, // default
    }),
    ConstraintDirectiveTypeDefsPlugin,
  ],

  // ...
};
```

Or use the default configuration:

```typescript
import {
  ConstraintDirectivePlugin,
  ConstraintDirectiveTypeDefsPlugin,
} from "check-constraints";

const preset: GraphileConfig.Preset = {
  // ...

  plugins: [
    ConstraintDirectivePlugin, // Same as makeConstraintDirectivePlugin()
    ConstraintDirectiveTypeDefsPlugin,
  ],

  // ...
};
```

## Packaging

```bash
npm run build
# Optionally test locally
npm pack
# Publish
npm publish
```
