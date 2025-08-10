package zip

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
	"github.com/klauspost/compress/zip"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/mod"
)

var activeZipping sync.Map

type Service interface {
	ZipFiles(albumName string, filesToZip []mod.ZipFileEntry, concurrentKey string) (string, error)
	IsZipping(concurrentKey string) bool
}

type service struct {
}

func NewService() Service {
	return &service{}
}

func (s *service) IsZipping(concurrentKey string) bool {
	_, loaded := activeZipping.Load(concurrentKey)
	return loaded
}

func (s *service) ZipFiles(
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
		if err := addFileToZip(zipWriter, file); err != nil {
			return "", err
		}
	}
	return zipName, nil
}

func addFileToZip(zipWriter *zip.Writer, fileObject mod.ZipFileEntry) error {
	file, err := getFileToZip(fileObject)
	if err != nil {
		return err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}

	header, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}

	header.Name = filepath.Base(fileObject.ParsedFilename)
	header.Method = zip.Deflate

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

func getFileToZip(FileOnDisk mod.ZipFileEntry) (*os.File, error) {
	return os.Open(filepath.Join(utils.FileBaseUrl, FileOnDisk.FullFileNameOnSystem))
}
