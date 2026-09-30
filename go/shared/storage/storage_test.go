package storage

import (
	"errors"
	"io"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/waifuvault/WaifuVault/shared/utils"
)

func useTempFileBaseUrl(t *testing.T) string {
	t.Helper()

	original := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	t.Cleanup(func() {
		utils.FileBaseUrl = original
	})

	return tempDir
}

func TestParseBackend(t *testing.T) {
	cases := []struct {
		name    string
		value   string
		want    Backend
		wantErr bool
	}{
		{name: "empty means local", value: "", want: Local},
		{name: "local", value: "local", want: Local},
		{name: "s3", value: "s3", want: S3},
		{name: "unknown", value: "gcs", wantErr: true},
		{name: "wrong case", value: "S3", wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// when
			got, err := ParseBackend(tc.value)

			// then
			if tc.wantErr {
				if !errors.Is(err, ErrUnknownBackend) {
					t.Fatalf("expected ErrUnknownBackend, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestObjectKey(t *testing.T) {
	cases := []struct {
		name     string
		prefix   string
		fileName string
		want     string
	}{
		{name: "no prefix", prefix: "", fileName: "abc.png", want: "abc.png"},
		{name: "prefix without slash", prefix: "files", fileName: "abc.png", want: "files/abc.png"},
		{name: "prefix with slash", prefix: "files/", fileName: "abc.png", want: "files/abc.png"},
		{name: "prefix with many slashes", prefix: "files///", fileName: "abc.png", want: "files/abc.png"},
		{name: "nested prefix", prefix: "prod/files", fileName: "abc", want: "prod/files/abc"},
		{name: "slash only prefix", prefix: "/", fileName: "abc.png", want: "abc.png"},
		{name: "many slashes only prefix", prefix: "///", fileName: "abc.png", want: "abc.png"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// when
			got := ObjectKey(tc.prefix, tc.fileName)

			// then
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestLoadS3Settings(t *testing.T) {
	cases := []struct {
		name          string
		env           map[string]string
		wantErr       bool
		wantPathStyle bool
		wantBucket    string
		wantRegion    string
		wantEndpoint  string
		wantAccessKey string
		wantPrefix    string
	}{
		{
			name: "hetzner",
			env: map[string]string{
				"S3_ENDPOINT":          "https://fsn1.your-objectstorage.com",
				"S3_REGION":            "fsn1",
				"S3_BUCKET":            "waifuvault-files",
				"S3_ACCESS_KEY_ID":     "key",
				"S3_SECRET_ACCESS_KEY": "secret",
				"S3_PREFIX":            "files",
				"S3_FORCE_PATH_STYLE":  "true",
			},
			wantPathStyle: true,
			wantBucket:    "waifuvault-files",
			wantRegion:    "fsn1",
			wantEndpoint:  "https://fsn1.your-objectstorage.com",
			wantAccessKey: "key",
			wantPrefix:    "files",
		},
		{
			name:       "path style defaults to false",
			env:        map[string]string{"S3_REGION": "fsn1", "S3_BUCKET": "bucket"},
			wantBucket: "bucket",
			wantRegion: "fsn1",
		},
		{
			name:    "missing bucket",
			env:     map[string]string{"S3_REGION": "fsn1"},
			wantErr: true,
		},
		{
			name:    "missing region",
			env:     map[string]string{"S3_BUCKET": "bucket"},
			wantErr: true,
		},
		{
			name:    "invalid path style",
			env:     map[string]string{"S3_REGION": "fsn1", "S3_BUCKET": "bucket", "S3_FORCE_PATH_STYLE": "maybe"},
			wantErr: true,
		},
		{
			name:    "access key without secret",
			env:     map[string]string{"S3_REGION": "fsn1", "S3_BUCKET": "bucket", "S3_ACCESS_KEY_ID": "key"},
			wantErr: true,
		},
	}

	allKeys := []string{"S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PREFIX", "S3_FORCE_PATH_STYLE"}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// given
			for _, key := range allKeys {
				t.Setenv(key, tc.env[key])
			}

			// when
			settings, err := loadS3Settings()

			// then
			if tc.wantErr {
				if !errors.Is(err, ErrS3NotConfigured) {
					t.Fatalf("expected ErrS3NotConfigured, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if settings.forcePathStyle != tc.wantPathStyle {
				t.Fatalf("expected forcePathStyle %t, got %t", tc.wantPathStyle, settings.forcePathStyle)
			}
			if settings.bucket != tc.wantBucket || settings.region != tc.wantRegion || settings.endpoint != tc.wantEndpoint {
				t.Fatalf("unexpected settings: %+v", settings)
			}
			if settings.accessKeyID != tc.wantAccessKey || settings.prefix != tc.wantPrefix {
				t.Fatalf("unexpected settings: %+v", settings)
			}
		})
	}
}

func TestOpen_LocalFile(t *testing.T) {
	// given
	tempDir := useTempFileBaseUrl(t)
	content := []byte("local content")
	if err := os.WriteFile(filepath.Join(tempDir, "file.txt"), content, 0o644); err != nil {
		t.Fatal(err)
	}

	// when
	object, err := Open(t.Context(), Local, "file.txt")

	// then
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer object.Close()

	got, err := io.ReadAll(object)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(content) {
		t.Fatalf("expected %q, got %q", content, got)
	}
	if object.Size != int64(len(content)) {
		t.Fatalf("expected size %d, got %d", len(content), object.Size)
	}
	if object.ModTime.IsZero() {
		t.Fatal("expected a modification time")
	}
}

func TestOpen_LocalFileNotFound(t *testing.T) {
	// given
	useTempFileBaseUrl(t)

	// when
	object, err := Open(t.Context(), Local, "missing.txt")

	// then
	if object != nil {
		t.Fatal("expected no object")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
	if !errors.Is(err, fs.ErrNotExist) {
		t.Fatalf("expected fs.ErrNotExist to be preserved, got %v", err)
	}

	var notFound *NotFoundError
	if !errors.As(err, &notFound) {
		t.Fatalf("expected *NotFoundError, got %T", err)
	}
	if notFound.Backend != Local || notFound.Key != "missing.txt" {
		t.Fatalf("unexpected not found error: %+v", notFound)
	}
}

func TestOpen_UnknownBackend(t *testing.T) {
	// when
	_, err := Open(t.Context(), Backend("ftp"), "file.txt")

	// then
	if !errors.Is(err, ErrUnknownBackend) {
		t.Fatalf("expected ErrUnknownBackend, got %v", err)
	}
}

func TestInputLocation_Local(t *testing.T) {
	// given
	tempDir := useTempFileBaseUrl(t)

	// when
	location, err := InputLocation(t.Context(), Local, "video.mp4")

	// then
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if location != filepath.Join(tempDir, "video.mp4") {
		t.Fatalf("unexpected location %q", location)
	}
}

func TestS3Store_PresignUsesEndpointPrefixAndPathStyle(t *testing.T) {
	// given
	t.Setenv("S3_ENDPOINT", "https://fsn1.your-objectstorage.com")
	t.Setenv("S3_REGION", "fsn1")
	t.Setenv("S3_BUCKET", "waifuvault-files")
	t.Setenv("S3_ACCESS_KEY_ID", "key")
	t.Setenv("S3_SECRET_ACCESS_KEY", "secret")
	t.Setenv("S3_PREFIX", "files/")
	t.Setenv("S3_FORCE_PATH_STYLE", "true")

	store, err := newS3Store()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// when
	location, err := store.presign(t.Context(), "abc.mp4")

	// then
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	parsed, err := url.Parse(location)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Host != "fsn1.your-objectstorage.com" {
		t.Fatalf("unexpected host %q", parsed.Host)
	}
	if parsed.Path != "/waifuvault-files/files/abc.mp4" {
		t.Fatalf("unexpected path %q", parsed.Path)
	}
	if parsed.Query().Get("X-Amz-Expires") != "900" {
		t.Fatalf("unexpected expiry %q", parsed.Query().Get("X-Amz-Expires"))
	}
}

func TestInputLocation_UnknownBackend(t *testing.T) {
	// when
	_, err := InputLocation(t.Context(), Backend("ftp"), "video.mp4")

	// then
	if !errors.Is(err, ErrUnknownBackend) {
		t.Fatalf("expected ErrUnknownBackend, got %v", err)
	}
}
