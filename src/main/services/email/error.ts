export class CustomEmailError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CustomEmailError'
  }
}
