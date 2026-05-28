export type FieldErrors<T> = Partial<Record<keyof T, string[]>>

export type ActionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string; fields?: FieldErrors<T> }
