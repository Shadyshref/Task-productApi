import xss from "xss";

export const sanitizer = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = xss(req.body[key]);
      }
    });
  }

  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === "string") {
        req.query[key] = xss(req.query[key]);
      }
    });
  }

  if (req.params) {
    Object.keys(req.params).forEach((key) => {
      if (typeof req.params[key] === "string") {
        req.params[key] = xss(req.params[key]);
      }
    });
  }

  next();
};
