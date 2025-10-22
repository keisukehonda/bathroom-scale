export type SafeParseSuccess<T> = { success: true; data: T }
export type SafeParseError = { success: false; error: ZodError }
export type SafeParseReturn<T> = SafeParseSuccess<T> | SafeParseError

export class ZodError extends Error {
  issues: { path: (string | number)[]; message: string }[]
  constructor(issues: { path: (string | number)[]; message: string }[])
}

export interface ZodType<T> {
  parse(data: unknown): T
  safeParse(data: unknown): SafeParseReturn<T>
  optional(): ZodType<T | undefined>
}

export interface ZodEnum<T extends readonly string[]> extends ZodType<T[number]> {}

export interface ZodNumber extends ZodType<number> {
  int(): this
  min(value: number): this
  max(value: number): this
}

export interface ZodString extends ZodType<string> {
  trim(): this
  min(length: number): this
  max(length: number): this
  datetime(): this
}

export interface ZodArray<T> extends ZodType<T[]> {
  length(size: number): this
}

export type ZodObjectShape = { [key: string]: ZodType<any> }

export interface ZodObject<T extends ZodObjectShape>
  extends ZodType<{ [K in keyof T]: ReturnType<T[K]['parse']> }> {}

export declare const z: {
  enum<T extends readonly string[]>(values: T): ZodEnum<T>
  object<T extends ZodObjectShape>(shape: T): ZodObject<T>
  number(): ZodNumber
  string(): ZodString
  array<T>(schema: ZodType<T>): ZodArray<T>
  ZodError: typeof ZodError
}
