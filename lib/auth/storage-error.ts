export class InviteStorageError extends Error {
  readonly code: "not_found" | "db_error";
  constructor(code: InviteStorageError["code"], message: string) {
    super(message);
    this.name = "InviteStorageError";
    this.code = code;
  }
}
