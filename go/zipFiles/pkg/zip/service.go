package zip

import (
	"github.com/klauspost/compress/zip"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/mod"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/utils"
	"io"
	"path/filepath"
	"sync"
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

	outFile, zipName, err := utils.CreateZipFile(albumName)
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
	file, err := utils.GetFileToZip(fileObject)
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
