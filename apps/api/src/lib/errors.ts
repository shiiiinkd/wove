export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 401 | 404 | 409 | 500,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
