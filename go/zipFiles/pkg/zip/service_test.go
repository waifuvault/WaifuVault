package zip

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/zipfiles/pkg/mod"
)

func TestNewService_CreatesService(t *testing.T) {
	// given/when
	svc := NewService()

	// then
	assert.NotNil(t, svc)
}

func TestService_IsZipping_NotZipping(t *testing.T) {
	// given
	svc := NewService()
	concurrentKey := "test-key-123"

	// when
	result := svc.IsZipping(concurrentKey)

	// then
	assert.False(t, result)
}

func TestService_IsZipping_CurrentlyZipping(t *testing.T) {
	// given
	svc := NewService()
	concurrentKey := "test-key-456"
	activeZipping.Store(concurrentKey, true)
	defer activeZipping.Delete(concurrentKey)

	// when
	result := svc.IsZipping(concurrentKey)

	// then
	assert.True(t, result)
}

func TestService_ZipFiles_EmptyFileList(t *testing.T) {
	// given
	svc := NewService()
	albumName := "empty-album"
	files := []mod.ZipFileEntry{}
	concurrentKey := "test-empty"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	// when
	zipName, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.NoError(t, err)
	assert.NotEmpty(t, zipName)
	assert.Contains(t, zipName, albumName)
	assert.Contains(t, zipName, ".zip")

	zipPath := filepath.Join(tempDir, zipName)
	assert.FileExists(t, zipPath)

	isZipping := svc.IsZipping(concurrentKey)
	assert.False(t, isZipping)
}

func TestService_ZipFiles_SingleFile(t *testing.T) {
	// given
	svc := NewService()
	albumName := "single-file-album"
	concurrentKey := "test-single"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	testFileName := "test-file.txt"
	testFilePath := filepath.Join(tempDir, testFileName)
	testContent := []byte("test file content")
	err := os.WriteFile(testFilePath, testContent, 0644)
	assert.NoError(t, err)

	files := []mod.ZipFileEntry{
		{
			FullFileNameOnSystem: testFileName,
			ParsedFilename:       "renamed-file.txt",
		},
	}

	// when
	zipName, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.NoError(t, err)
	assert.NotEmpty(t, zipName)
	assert.Contains(t, zipName, albumName)

	zipPath := filepath.Join(tempDir, zipName)
	assert.FileExists(t, zipPath)

	zipFile, err := zip.OpenReader(zipPath)
	assert.NoError(t, err)
	defer zipFile.Close()

	assert.Len(t, zipFile.File, 1)
	assert.Equal(t, "renamed-file.txt", zipFile.File[0].Name)

	extractedFile, err := zipFile.File[0].Open()
	assert.NoError(t, err)
	defer extractedFile.Close()

	extractedContent, err := io.ReadAll(extractedFile)
	assert.NoError(t, err)
	assert.Equal(t, testContent, extractedContent)
}

func TestService_ZipFiles_MultipleFiles(t *testing.T) {
	// given
	svc := NewService()
	albumName := "multi-file-album"
	concurrentKey := "test-multi"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	files := []mod.ZipFileEntry{
		{FullFileNameOnSystem: "file1.txt", ParsedFilename: "first.txt"},
		{FullFileNameOnSystem: "file2.txt", ParsedFilename: "second.txt"},
		{FullFileNameOnSystem: "file3.txt", ParsedFilename: "third.txt"},
	}

	for _, file := range files {
		filePath := filepath.Join(tempDir, file.FullFileNameOnSystem)
		content := []byte(fmt.Sprintf("content of %s", file.FullFileNameOnSystem))
		err := os.WriteFile(filePath, content, 0644)
		assert.NoError(t, err)
	}

	// when
	zipName, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.NoError(t, err)
	assert.NotEmpty(t, zipName)

	zipPath := filepath.Join(tempDir, zipName)
	assert.FileExists(t, zipPath)

	zipFile, err := zip.OpenReader(zipPath)
	assert.NoError(t, err)
	defer zipFile.Close()

	assert.Len(t, zipFile.File, 3)

	fileNames := make([]string, len(zipFile.File))
	for i, f := range zipFile.File {
		fileNames[i] = f.Name
	}
	assert.Contains(t, fileNames, "first.txt")
	assert.Contains(t, fileNames, "second.txt")
	assert.Contains(t, fileNames, "third.txt")
}

func TestService_ZipFiles_FileNotFound(t *testing.T) {
	// given
	svc := NewService()
	albumName := "missing-file-album"
	concurrentKey := "test-missing"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	files := []mod.ZipFileEntry{
		{
			FullFileNameOnSystem: "non-existent-file.txt",
			ParsedFilename:       "renamed.txt",
		},
	}

	// when
	zipName, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.Error(t, err)
	assert.Empty(t, zipName)
	assert.False(t, svc.IsZipping(concurrentKey))
}

func TestService_ZipFiles_CleansUpConcurrentFlag(t *testing.T) {
	// given
	svc := NewService()
	albumName := "cleanup-test"
	concurrentKey := "test-cleanup"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	files := []mod.ZipFileEntry{}

	// when
	_, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.NoError(t, err)
	assert.False(t, svc.IsZipping(concurrentKey))
}

func TestService_ZipFiles_WithSubdirectories(t *testing.T) {
	// given
	svc := NewService()
	albumName := "subdirs-album"
	concurrentKey := "test-subdirs"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	subDir := filepath.Join(tempDir, "subdir")
	err := os.Mkdir(subDir, 0755)
	assert.NoError(t, err)

	testFileName := "subdir/nested-file.txt"
	testFilePath := filepath.Join(tempDir, testFileName)
	testContent := []byte("nested content")
	err = os.WriteFile(testFilePath, testContent, 0644)
	assert.NoError(t, err)

	files := []mod.ZipFileEntry{
		{
			FullFileNameOnSystem: testFileName,
			ParsedFilename:       "extracted-name.txt",
		},
	}

	// when
	zipName, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.NoError(t, err)
	assert.NotEmpty(t, zipName)

	zipPath := filepath.Join(tempDir, zipName)
	assert.FileExists(t, zipPath)

	zipFile, err := zip.OpenReader(zipPath)
	assert.NoError(t, err)
	defer zipFile.Close()

	assert.Len(t, zipFile.File, 1)
	assert.Equal(t, "extracted-name.txt", zipFile.File[0].Name)
}

func TestService_ZipFiles_LargeFile(t *testing.T) {
	// given
	svc := NewService()
	albumName := "large-file-album"
	concurrentKey := "test-large"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	testFileName := "large-file.bin"
	testFilePath := filepath.Join(tempDir, testFileName)
	largeContent := make([]byte, 1024*1024)
	for i := range largeContent {
		largeContent[i] = byte(i % 256)
	}
	err := os.WriteFile(testFilePath, largeContent, 0644)
	assert.NoError(t, err)

	files := []mod.ZipFileEntry{
		{
			FullFileNameOnSystem: testFileName,
			ParsedFilename:       "large.bin",
		},
	}

	// when
	zipName, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.NoError(t, err)
	assert.NotEmpty(t, zipName)

	zipPath := filepath.Join(tempDir, zipName)
	assert.FileExists(t, zipPath)

	zipFile, err := zip.OpenReader(zipPath)
	assert.NoError(t, err)
	defer zipFile.Close()

	assert.Len(t, zipFile.File, 1)

	extractedFile, err := zipFile.File[0].Open()
	assert.NoError(t, err)
	defer extractedFile.Close()

	extractedContent, err := io.ReadAll(extractedFile)
	assert.NoError(t, err)
	assert.Equal(t, largeContent, extractedContent)
}

func TestService_ZipFiles_SpecialCharactersInFilename(t *testing.T) {
	// given
	svc := NewService()
	albumName := "special-chars-album"
	concurrentKey := "test-special"

	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	testFileName := "test-file.txt"
	testFilePath := filepath.Join(tempDir, testFileName)
	testContent := []byte("content")
	err := os.WriteFile(testFilePath, testContent, 0644)
	assert.NoError(t, err)

	files := []mod.ZipFileEntry{
		{
			FullFileNameOnSystem: testFileName,
			ParsedFilename:       "file with spaces & special-chars.txt",
		},
	}

	// when
	zipName, err := svc.ZipFiles(albumName, files, concurrentKey)

	// then
	assert.NoError(t, err)
	assert.NotEmpty(t, zipName)

	zipPath := filepath.Join(tempDir, zipName)
	assert.FileExists(t, zipPath)

	zipFile, err := zip.OpenReader(zipPath)
	assert.NoError(t, err)
	defer zipFile.Close()

	assert.Len(t, zipFile.File, 1)
	assert.Equal(t, "file with spaces & special-chars.txt", zipFile.File[0].Name)
}

func TestGetFileToZip_ValidFile(t *testing.T) {
	// given
	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	testFileName := "valid-file.txt"
	testFilePath := filepath.Join(tempDir, testFileName)
	err := os.WriteFile(testFilePath, []byte("test"), 0644)
	assert.NoError(t, err)

	fileEntry := mod.ZipFileEntry{
		FullFileNameOnSystem: testFileName,
		ParsedFilename:       "renamed.txt",
	}

	// when
	file, err := getFileToZip(fileEntry)

	// then
	assert.NoError(t, err)
	assert.NotNil(t, file)
	file.Close()
}

func TestGetFileToZip_FileNotFound(t *testing.T) {
	// given
	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	fileEntry := mod.ZipFileEntry{
		FullFileNameOnSystem: "non-existent.txt",
		ParsedFilename:       "renamed.txt",
	}

	// when
	file, err := getFileToZip(fileEntry)

	// then
	assert.Error(t, err)
	assert.Nil(t, file)
}

func TestCreateZipFile_CreatesFile(t *testing.T) {
	// given
	originalFileBaseUrl := utils.FileBaseUrl
	tempDir := t.TempDir()
	utils.FileBaseUrl = tempDir
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	albumName := "test-album"

	// when
	file, zipName, err := createZipFile(albumName)

	// then
	assert.NoError(t, err)
	assert.NotNil(t, file)
	assert.NotEmpty(t, zipName)
	assert.Contains(t, zipName, albumName)
	assert.Contains(t, zipName, ".zip")

	file.Close()

	zipPath := filepath.Join(tempDir, zipName)
	assert.FileExists(t, zipPath)
}

func TestCreateZipFile_InvalidDirectory(t *testing.T) {
	// given
	originalFileBaseUrl := utils.FileBaseUrl
	utils.FileBaseUrl = "/invalid/nonexistent/directory"
	defer func() { utils.FileBaseUrl = originalFileBaseUrl }()

	albumName := "test-album"

	// when
	file, zipName, err := createZipFile(albumName)

	// then
	assert.Error(t, err)
	assert.Nil(t, file)
	assert.Empty(t, zipName)
}
