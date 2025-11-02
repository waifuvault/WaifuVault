package thumbnail

import "errors"

var (
	ErrUnsupportedFileType      = errors.New("unsupported file type")
	ErrFailedToDownload         = errors.New("failed to download file from URL")
	ErrFailedToExtractExtension = errors.New("failed to determine file extension")
	ErrFileNotFound             = errors.New("file not found")
	ErrInvalidURL               = errors.New("invalid URL")
	ErrFileTooLarge             = errors.New("file too large")
)
