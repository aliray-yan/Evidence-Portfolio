export function notFound(req, res) {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl
  });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.error(err);
  }

  res.status(status).json({
    message: status === 500 ? "Something went wrong" : err.message,
    details: isProduction ? undefined : err.details
  });
}
