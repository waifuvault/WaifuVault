package zip

import (
	"github.com/klauspost/compress/zip"
	"github.com/waifuvault/WaifuVault/pkg/mod"
	"github.com/waifuvault/WaifuVault/pkg/utils"
	"io"
	"path/filepath"
)

type Service interface {
	ZipFiles(albumName string, filesToZip []mod.ZipFileEntry) (string, error)
}

type service struct {
}

func NewService() Service {
	return &service{}
}

func (s *service) ZipFiles(albumName string, filesToZip []mod.ZipFileEntry) (string, error) {
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

	if _, err = io.Copy(writer, file); err != nil {
		return err
	}
	return err
}
