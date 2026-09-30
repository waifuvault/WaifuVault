package zip

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
	"github.com/klauspost/compress/zip"
	"github.com/waifuvault/WaifuVault/shared/storage"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/mod"
)

type (
	Service interface {
		ZipFiles(ctx context.Context, albumName string, filesToZip []mod.ZipFileEntry, concurrentKey string) (string, error)
		IsZipping(concurrentKey string) bool
	}

	service struct {
	}
)

const (
	zipEntryMode os.FileMode = 0o644
)

var (
	activeZipping sync.Map
)

func NewService() Service {
	return &service{}
}

func (s *service) IsZipping(concurrentKey string) bool {
	_, loaded := activeZipping.Load(concurrentKey)
	return loaded
}

func (s *service) ZipFiles(
	ctx context.Context,
	albumName string,
	filesToZip []mod.ZipFileEntry,
	concurrentKey string,
) (string, error) {
	activeZipping.LoadOrStore(concurrentKey, true)
	defer activeZipping.Delete(concurrentKey)

	outFile, zipName, err := createZipFile(albumName)
	if err != nil {
		return "", err
	}
	defer outFile.Close()

	zipWriter := zip.NewWriter(outFile)
	defer zipWriter.Close()

	for _, file := range filesToZip {
		if err := addFileToZip(ctx, zipWriter, file); err != nil {
			return "", err
		}
	}
	return zipName, nil
}

func addFileToZip(ctx context.Context, zipWriter *zip.Writer, fileObject mod.ZipFileEntry) error {
	file, err := getFileToZip(ctx, fileObject)
	if err != nil {
		return err
	}
	defer file.Close()

	header := &zip.FileHeader{
		Name:     filepath.Base(fileObject.ParsedFilename),
		Method:   zip.Deflate,
		Modified: file.ModTime,
	}
	header.SetMode(zipEntryMode)

	writer, err := zipWriter.CreateHeader(header)
	if err != nil {
		return err
	}

	_, err = io.Copy(writer, file)

	return err
}

func createZipFile(name string) (*os.File, string, error) {
	zipName := fmt.Sprintf("%s_%s.zip", uuid.New(), name)
	zipLocation := utils.FileBaseUrl + "/" + zipName
	create, err := os.Create(zipLocation)
	if err != nil {
		return nil, "", err
	}
	return create, zipName, nil
}

func getFileToZip(ctx context.Context, fileObject mod.ZipFileEntry) (*storage.Object, error) {
	backend, err := storage.ParseBackend(fileObject.StorageBackend)
	if err != nil {
		return nil, err
	}

	return storage.Open(ctx, backend, fileObject.FullFileNameOnSystem)
}
