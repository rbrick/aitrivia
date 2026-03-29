package main

import (
	"errors"

	"github.com/labstack/echo/v5"
)

type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return e.Message
}

func newAPIError(statusCode int, message string) *APIError {
	return &APIError{
		StatusCode: statusCode,
		Message:    message,
	}
}

func writeErrorResponse(c *echo.Context, err error) error {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		return c.JSON(apiErr.StatusCode, map[string]string{"error": apiErr.Message})
	}

	return c.JSON(500, map[string]string{"error": err.Error()})
}

// D = DTO
// T = return type
func Wrap[D any, T any](controllerFunc func(D) (T, error)) echo.HandlerFunc {
	return func(c *echo.Context) error {
		var data D
		if err := c.Bind(&data); err != nil {
			return writeErrorResponse(c, newAPIError(400, err.Error()))
		}
		result, err := controllerFunc(data)
		if err != nil {
			return writeErrorResponse(c, err)
		}
		return c.JSON(200, result)
	}
}
