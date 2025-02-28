package utils

import (
	"fmt"
)

// ConnectionURL func for building URL connection.
func ConnectionURL() string {
	// Return connection URL.
	return fmt.Sprintf(
		"%s:%s",
		"0.0.0.0",
		"8080",
	)
}
