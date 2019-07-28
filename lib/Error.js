const BizError = exports.BizError = class BizError extends Error {
  constructor(message, status = 400) {
    super(message); // (1)
    this.status = status;
  }
}
