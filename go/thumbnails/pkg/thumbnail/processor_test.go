package thumbnail

import (
	"bytes"
	"mime/multipart"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dto"
)

func newTestProcessor() Processor {
	return &processor{
		baseUrl:       "/tmp/test",
		ffmpegFormats: []string{"mp4", "webm", "avi"},
		imageFormats:  []string{"jpg", "png", "gif", "webp"},
	}
}

func TestProcessor_SupportsFile_ImageFile(t *testing.T) {
	// given
	p := newTestProcessor()
	fileEntry := dto.FileEntryDto{
		MediaType: "image/jpeg",
		Extension: "jpg",
	}

	// when
	result := p.SupportsFile(fileEntry)

	// then
	assert.True(t, result)
}

func TestProcessor_SupportsFile_VideoFile(t *testing.T) {
	// given
	p := newTestProcessor()
	fileEntry := dto.FileEntryDto{
		MediaType: "video/mp4",
		Extension: "mp4",
	}

	// when
	result := p.SupportsFile(fileEntry)

	// then
	assert.True(t, result)
}

func TestProcessor_SupportsFile_UnsupportedFile(t *testing.T) {
	// given
	p := newTestProcessor()
	fileEntry := dto.FileEntryDto{
		MediaType: "application/pdf",
		Extension: "pdf",
	}

	// when
	result := p.SupportsFile(fileEntry)

	// then
	assert.False(t, result)
}

func TestProcessor_SupportsFile_UnsupportedImageExtension(t *testing.T) {
	// given
	p := newTestProcessor()
	fileEntry := dto.FileEntryDto{
		MediaType: "image/tiff",
		Extension: "tiff",
	}

	// when
	result := p.SupportsFile(fileEntry)

	// then
	assert.False(t, result)
}

func TestProcessor_SupportsFile_UnsupportedVideoExtension(t *testing.T) {
	// given
	p := newTestProcessor()
	fileEntry := dto.FileEntryDto{
		MediaType: "video/x-matroska",
		Extension: "mov",
	}

	// when
	result := p.SupportsFile(fileEntry)

	// then
	assert.False(t, result)
}

func TestGetExtensionFromFilename_ValidExtension(t *testing.T) {
	// given
	tests := []struct {
		name     string
		filename string
		expected string
	}{
		{
			name:     "simple jpg file",
			filename: "image.jpg",
			expected: "jpg",
		},
		{
			name:     "uppercase extension",
			filename: "IMAGE.PNG",
			expected: "png",
		},
		{
			name:     "multiple dots",
			filename: "my.test.file.webp",
			expected: "webp",
		},
		{
			name:     "path with extension",
			filename: "/path/to/file.gif",
			expected: "gif",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			result := getExtensionFromFilename(tt.filename)

			// then
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetExtensionFromFilename_NoExtension(t *testing.T) {
	// given
	filename := "noextension"

	// when
	result := getExtensionFromFilename(filename)

	// then
	assert.Equal(t, "", result)
}

func TestCalculateThumbnailDimensions_ValidDimensions(t *testing.T) {
	// given
	tests := []struct {
		name         string
		origWidth    int
		origHeight   int
		expectWidth  int
		expectHeight int
	}{
		{
			name:         "landscape image",
			origWidth:    1920,
			origHeight:   1080,
			expectWidth:  400,
			expectHeight: 225,
		},
		{
			name:         "portrait image",
			origWidth:    1080,
			origHeight:   1920,
			expectWidth:  400,
			expectHeight: 711,
		},
		{
			name:         "square image",
			origWidth:    1000,
			origHeight:   1000,
			expectWidth:  400,
			expectHeight: 400,
		},
		{
			name:         "small image",
			origWidth:    200,
			origHeight:   100,
			expectWidth:  400,
			expectHeight: 200,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			width, height, err := calculateThumbnailDimensions(tt.origWidth, tt.origHeight)

			// then
			assert.NoError(t, err)
			assert.Equal(t, tt.expectWidth, width)
			assert.Equal(t, tt.expectHeight, height)
		})
	}
}

func TestCalculateThumbnailDimensions_ZeroWidth(t *testing.T) {
	// given
	origWidth := 0
	origHeight := 1000

	// when
	width, height, err := calculateThumbnailDimensions(origWidth, origHeight)

	// then
	assert.NoError(t, err)
	assert.Equal(t, 0, width)
	assert.Equal(t, 0, height)
}

func TestGetFilenameFromURL_ValidURL(t *testing.T) {
	// given
	tests := []struct {
		name     string
		url      string
		expected string
	}{
		{
			name:     "simple filename",
			url:      "https://example.com/image.jpg",
			expected: "image.jpg",
		},
		{
			name:     "filename with query params",
			url:      "https://example.com/photo.png?size=large&format=webp",
			expected: "photo.png",
		},
		{
			name:     "nested path",
			url:      "https://cdn.example.com/users/123/avatar.gif",
			expected: "avatar.gif",
		},
		{
			name:     "filename with fragment",
			url:      "https://example.com/file.webp?v=1",
			expected: "file.webp",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// when
			result := getFilenameFromURL(tt.url)

			// then
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetFilenameFromURL_NoFilename(t *testing.T) {
	// given
	url := "https://example.com"

	// when
	result := getFilenameFromURL(url)

	// then
	assert.Equal(t, "", result)
}

func TestIsAnimatedImage_AnimatedFormats(t *testing.T) {
	// given
	tests := []struct {
		extension string
		expected  bool
	}{
		{"gif", true},
		{"webp", true},
		{"heif", true},
		{"jpg", false},
		{"png", false},
		{"jpeg", false},
		{"bmp", false},
	}

	for _, tt := range tests {
		t.Run(tt.extension, func(t *testing.T) {
			// when
			result := isAnimatedImage(tt.extension)

			// then
			assert.Equal(t, tt.expected, result)
		})
	}
}

func createMultipartFileHeader(filename string, content []byte) *multipart.FileHeader {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", filename)
	part.Write(content)
	writer.Close()

	reader := multipart.NewReader(body, writer.Boundary())
	form, _ := reader.ReadForm(10 << 20)
	return form.File["file"][0]
}

func TestProcessor_SupportsMultipartFile_SupportedImageFile(t *testing.T) {
	// given
	p := newTestProcessor()
	jpegHeader := []byte{0xFF, 0xD8, 0xFF, 0xE0}
	header := createMultipartFileHeader("test.jpg", jpegHeader)

	// when
	result := p.SupportsMultipartFile(header)

	// then
	assert.True(t, result)
}

func TestProcessor_SupportsMultipartFile_UnsupportedFile(t *testing.T) {
	// given
	p := newTestProcessor()
	pdfHeader := []byte{0x25, 0x50, 0x44, 0x46}
	header := createMultipartFileHeader("test.pdf", pdfHeader)

	// when
	result := p.SupportsMultipartFile(header)

	// then
	assert.False(t, result)
}

func TestProcessor_IsSupportedMediaType_ImageSupported(t *testing.T) {
	// given
	p := newTestProcessor().(*processor)

	// when
	result := p.isSupportedMediaType("image/jpeg", "jpg")

	// then
	assert.True(t, result)
}

func TestProcessor_IsSupportedMediaType_VideoSupported(t *testing.T) {
	// given
	p := newTestProcessor().(*processor)

	// when
	result := p.isSupportedMediaType("video/mp4", "mp4")

	// then
	assert.True(t, result)
}

func TestProcessor_IsSupportedMediaType_ImageUnsupportedExtension(t *testing.T) {
	// given
	p := newTestProcessor().(*processor)

	// when
	result := p.isSupportedMediaType("image/tiff", "tiff")

	// then
	assert.False(t, result)
}

func TestProcessor_IsSupportedMediaType_VideoUnsupportedExtension(t *testing.T) {
	// given
	p := newTestProcessor().(*processor)

	// when
	result := p.isSupportedMediaType("video/quicktime", "mov")

	// then
	assert.False(t, result)
}

func TestProcessor_IsSupportedMediaType_UnsupportedMediaType(t *testing.T) {
	// given
	p := newTestProcessor().(*processor)

	// when
	result := p.isSupportedMediaType("application/pdf", "pdf")

	// then
	assert.False(t, result)
}

func TestGetMimeType_ImageFromBinary(t *testing.T) {
	// given
	jpegHeader := []byte{0xFF, 0xD8, 0xFF, 0xE0}

	// when
	mimeType := GetMimeType("test.jpg", jpegHeader)

	// then
	assert.True(t, strings.HasPrefix(mimeType, "image/jpeg"))
}

func TestGetMimeType_ImageFromExtension(t *testing.T) {
	// given
	octetStream := []byte{0x00, 0x00, 0x00, 0x00}

	// when
	mimeType := GetMimeType("test.png", octetStream)

	// then
	assert.Equal(t, "image/png", mimeType)
}

func TestGetMimeType_OctetStream(t *testing.T) {
	// given
	unknownData := []byte{0x00, 0x00, 0x00, 0x00}

	// when
	mimeType := GetMimeType("test", unknownData)

	// then
	assert.Equal(t, "application/octet-stream", mimeType)
}

func TestProcessor_GetImportParams_AnimatedImage(t *testing.T) {
	// given
	p := newTestProcessor().(*processor)

	// when
	params := p.getImportParams("gif")

	// then
	assert.NotNil(t, params)
	assert.NotNil(t, params.NumPages)
}

func TestProcessor_GetImportParams_StaticImage(t *testing.T) {
	// given
	p := newTestProcessor().(*processor)

	// when
	params := p.getImportParams("jpg")

	// then
	assert.NotNil(t, params)
}

func TestDetectMimeTypeFromMultipart_ValidFile(t *testing.T) {
	// given
	jpegHeader := []byte{0xFF, 0xD8, 0xFF, 0xE0}
	header := createMultipartFileHeader("test.jpg", jpegHeader)

	// when
	mimeType, err := detectMimeTypeFromMultipart(header)

	// then
	assert.NoError(t, err)
	assert.True(t, strings.HasPrefix(mimeType, "image/jpeg"))
}

func TestDetectMimeTypeFromMultipart_EmptyFile(t *testing.T) {
	// given
	header := createMultipartFileHeader("empty.txt", []byte{})

	// when
	mimeType, err := detectMimeTypeFromMultipart(header)

	// then
	assert.NoError(t, err)
	assert.NotEmpty(t, mimeType)
}

func TestProcessor_GenerateThumbnailFromMultipart_UnsupportedFileType(t *testing.T) {
	// given
	p := newTestProcessor()
	pdfHeader := []byte{0x25, 0x50, 0x44, 0x46}
	header := createMultipartFileHeader("test.pdf", pdfHeader)
	file, _ := header.Open()

	// when
	result, err := p.GenerateThumbnailFromMultipart(file, header, false)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "unsupported file type")
}

func TestProcessor_GenerateThumbnail_UnsupportedFileType(t *testing.T) {
	// given
	p := newTestProcessor()
	fileEntry := dto.FileEntryDto{
		MediaType: "application/pdf",
		Extension: "pdf",
	}

	// when
	result, err := p.GenerateThumbnail(fileEntry, false)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, ErrUnsupportedFileType)
}

func TestFileSupported_ImageWithSupportedExtension(t *testing.T) {
	// given
	file := dto.FileEntryDto{
		MediaType: "image/jpeg",
		Extension: "jpg",
	}
	ffmpegFormats := []string{"mp4", "webm"}
	imageExtensions := []string{"jpg", "png", "gif"}

	// when
	result := fileSupported(file, ffmpegFormats, imageExtensions)

	// then
	assert.True(t, result)
}

func TestFileSupported_ImageWithUnsupportedExtension(t *testing.T) {
	// given
	file := dto.FileEntryDto{
		MediaType: "image/tiff",
		Extension: "tiff",
	}
	ffmpegFormats := []string{"mp4", "webm"}
	imageExtensions := []string{"jpg", "png", "gif"}

	// when
	result := fileSupported(file, ffmpegFormats, imageExtensions)

	// then
	assert.False(t, result)
}

func TestFileSupported_VideoWithSupportedExtension(t *testing.T) {
	// given
	file := dto.FileEntryDto{
		MediaType: "video/mp4",
		Extension: "mp4",
	}
	ffmpegFormats := []string{"mp4", "webm"}
	imageExtensions := []string{"jpg", "png"}

	// when
	result := fileSupported(file, ffmpegFormats, imageExtensions)

	// then
	assert.True(t, result)
}

func TestFileSupported_VideoWithMatroskaExtension(t *testing.T) {
	// given
	file := dto.FileEntryDto{
		MediaType: "video/x-matroska",
		Extension: "mkv",
	}
	ffmpegFormats := []string{"matroska"}
	imageExtensions := []string{"jpg", "png"}

	// when
	result := fileSupported(file, ffmpegFormats, imageExtensions)

	// then
	assert.True(t, result)
}

func TestFileSupported_VideoWithUnsupportedExtension(t *testing.T) {
	// given
	file := dto.FileEntryDto{
		MediaType: "video/quicktime",
		Extension: "mov",
	}
	ffmpegFormats := []string{"mp4", "webm"}
	imageExtensions := []string{"jpg", "png"}

	// when
	result := fileSupported(file, ffmpegFormats, imageExtensions)

	// then
	assert.False(t, result)
}

func TestFileSupported_NonImageNonVideo(t *testing.T) {
	// given
	file := dto.FileEntryDto{
		MediaType: "application/zip",
		Extension: "zip",
	}
	ffmpegFormats := []string{"mp4"}
	imageExtensions := []string{"jpg"}

	// when
	result := fileSupported(file, ffmpegFormats, imageExtensions)

	// then
	assert.False(t, result)
}

func TestNewProcessor_CreatesProcessorWithCorrectConfig(t *testing.T) {
	// given
	ffmpegFormats := []string{"mp4", "webm", "avi"}
	supportedExtensions := []string{"jpg", "png", "gif"}

	// when
	p := NewProcessor(ffmpegFormats, supportedExtensions)

	// then
	assert.NotNil(t, p)
	processor := p.(*processor)
	assert.Equal(t, ffmpegFormats, processor.ffmpegFormats)
	assert.Equal(t, supportedExtensions, processor.imageFormats)
}
