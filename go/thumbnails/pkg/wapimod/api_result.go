package wapimod

import (
	"errors"

	"github.com/rs/zerolog/log"
)

// ApiResult represents the standard API response format
type ApiResult struct {
	Success bool   `json:"success" example:"true" description:"Whether the operation was successful"`
	Message string `json:"message" example:"Operation completed successfully" description:"Result message or error description"`
}

func NewApiResult(msg string, success bool) ApiResult {
	if !success {
		return NewApiError(msg, errors.New(msg))
	} else {
		return ApiResult{
			Success: success,
			Message: msg,
		}
	}
}

func NewApiError(msg string, err error) ApiResult {
	if err != nil {
		log.Err(err).Msg(msg)
	}
	return ApiResult{
		Success: false,
		Message: msg,
	}
}
