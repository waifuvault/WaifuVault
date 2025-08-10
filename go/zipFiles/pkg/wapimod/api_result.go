package wapimod

import (
	"errors"

	"github.com/rs/zerolog/log"
)

type ApiResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
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
