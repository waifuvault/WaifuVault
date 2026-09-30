package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/waifuvault/WaifuVault/shared/utils"
)

type (
	Backend string

	Object struct {
		io.ReadCloser
		Size    int64
		ModTime time.Time
	}

	NotFoundError struct {
		Backend Backend
		Key     string
		Err     error
	}
)

const (
	Local Backend = "local"
	S3    Backend = "s3"
)

var (
	ErrNotFound       = errors.New("storage object not found")
	ErrUnknownBackend = errors.New("unknown storage backend")
)

func ParseBackend(value string) (Backend, error) {
	switch Backend(value) {
	case "", Local:
		return Local, nil
	case S3:
		return S3, nil
	}

	return "", fmt.Errorf("%w: %q", ErrUnknownBackend, value)
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s object %q not found", e.Backend, e.Key)
}

func (e *NotFoundError) Unwrap() error {
	return e.Err
}

func (e *NotFoundError) Is(target error) bool {
	return target == ErrNotFound
}

func ObjectKey(prefix, fileName string) string {
	trimmed := strings.TrimRight(prefix, "/")
	if trimmed == "" {
		return fileName
	}

	return trimmed + "/" + fileName
}

func Open(ctx context.Context, backend Backend, key string) (*Object, error) {
	switch backend {
	case "", Local:
		return openLocal(key)
	case S3:
		store, err := loadS3Store()
		if err != nil {
			return nil, err
		}

		return store.open(ctx, key)
	}

	return nil, fmt.Errorf("%w: %q", ErrUnknownBackend, backend)
}

func InputLocation(ctx context.Context, backend Backend, key string) (string, error) {
	switch backend {
	case "", Local:
		return filepath.Join(utils.FileBaseUrl, key), nil
	case S3:
		store, err := loadS3Store()
		if err != nil {
			return "", err
		}

		return store.presign(ctx, key)
	}

	return "", fmt.Errorf("%w: %q", ErrUnknownBackend, backend)
}

func openLocal(key string) (*Object, error) {
	file, err := os.Open(filepath.Join(utils.FileBaseUrl, key))
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, &NotFoundError{Backend: Local, Key: key, Err: err}
		}
		return nil, err
	}

	info, err := file.Stat()
	if err != nil {
		file.Close()
		return nil, err
	}

	return &Object{
		ReadCloser: file,
		Size:       info.Size(),
		ModTime:    info.ModTime(),
	}, nil
}
