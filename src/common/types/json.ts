export type JsonValue =
  string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [Key in string]?: JsonValue };
