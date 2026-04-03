// Sends a consistent success response shape across all endpoints
const sendSuccess = (res, statusCode = 200, message = "Success", data = {}) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

module.exports = { sendSuccess };