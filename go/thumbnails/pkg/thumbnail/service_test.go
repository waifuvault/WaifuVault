package thumbnail

import (
	"errors"
	"mime/multipart"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/dao"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
)

func setupTestRedis(t *testing.T) *redis.Client {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	t.Cleanup(mr.Close)

	return redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
}

func newTestService(dao dao.Dao, processor Processor, rdb *redis.Client) Service {
	return &service{
		dao:           dao,
		processor:     processor,
		ffmpegFormats: []string{"mp4", "webm", "avi"},
		supportedExts: []string{"jpg", "png", "gif", "webp"},
		redisClient:   rdb,
	}
}

func TestService_GetAllSupportedExtensions(t *testing.T) {
	// given
	mockRedis := setupTestRedis(t)
	daoService := dao.NewMockDao(t)
	svc := newTestService(daoService, nil, mockRedis)

	// when
	result := svc.GetAllSupportedExtensions()

	// then
	assert.Len(t, result, 7)
	assert.Contains(t, result, "mp4")
	assert.Contains(t, result, "webm")
	assert.Contains(t, result, "avi")
	assert.Contains(t, result, "jpg")
	assert.Contains(t, result, "png")
	assert.Contains(t, result, "gif")
	assert.Contains(t, result, "webp")
}

func TestService_GenerateThumbnail_UnsupportedFileType(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockRedis := setupTestRedis(t)
	daoService := dao.NewMockDao(t)
	header := &multipart.FileHeader{
		Filename: "test.pdf",
		Size:     1024,
	}
	mockProcessor.EXPECT().SupportsMultipartFile(header).Return(false)
	svc := newTestService(daoService, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnail(header, true)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "unsupported file type")
}

func TestService_GenerateThumbnailFromURL_Success(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockRedis := setupTestRedis(t)
	daoService := dao.NewMockDao(t)
	url := "https://example.com/image.jpg"
	mockProcessor.EXPECT().GenerateThumbnailFromURL(url, true).Return([]byte("thumbnail"), nil)
	svc := newTestService(daoService, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailFromURL(url, true)

	// then
	assert.NoError(t, err)
	assert.Equal(t, []byte("thumbnail"), result)
}

func TestService_GenerateThumbnailFromURL_InvalidURL(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockRedis := setupTestRedis(t)
	daoService := dao.NewMockDao(t)
	url := "file:///etc/passwd"
	mockProcessor.EXPECT().GenerateThumbnailFromURL(url, true).Return(nil, ErrInvalidURL)
	svc := newTestService(daoService, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailFromURL(url, true)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, ErrInvalidURL))
}

func TestService_GenerateThumbnailFromURL_FileTooLarge(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockRedis := setupTestRedis(t)
	daoService := dao.NewMockDao(t)
	url := "https://example.com/huge.jpg"
	mockProcessor.EXPECT().GenerateThumbnailFromURL(url, true).Return(nil, ErrFileTooLarge)
	svc := newTestService(daoService, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailFromURL(url, true)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, ErrFileTooLarge))
}

func TestService_GenerateThumbnailFromURL_UnsupportedFileType(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockRedis := setupTestRedis(t)
	daoService := dao.NewMockDao(t)
	url := "https://example.com/file.exe"
	mockProcessor.EXPECT().GenerateThumbnailFromURL(url, true).Return(nil, ErrUnsupportedFileType)
	svc := newTestService(daoService, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailFromURL(url, true)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, ErrUnsupportedFileType))
}

func TestService_GenerateThumbnailByToken_Success(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockDao := dao.NewMockDao(t)
	mockRedis := setupTestRedis(t)
	fileToken := uuid.New()
	fileEntry := &mod.FileEntry{
		Token:     fileToken,
		MediaType: "image/jpeg",
		Extension: "jpg",
		FileName:  "test",
	}
	mockDao.EXPECT().GetFileEntry(fileToken).Return(fileEntry, nil)
	mockProcessor.EXPECT().SupportsFile(mock.Anything).Return(true)
	mockProcessor.EXPECT().GenerateThumbnail(mock.Anything, true).Return([]byte("thumbnail"), nil)
	svc := newTestService(mockDao, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailByToken(fileToken, true)

	// then
	assert.NoError(t, err)
	assert.Equal(t, []byte("thumbnail"), result)
}

func TestService_GenerateThumbnailByToken_FileNotFound(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockDao := dao.NewMockDao(t)
	mockRedis := setupTestRedis(t)
	fileToken := uuid.New()
	mockDao.EXPECT().GetFileEntry(fileToken).Return(nil, errors.New("not found"))
	svc := newTestService(mockDao, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailByToken(fileToken, true)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, ErrFileNotFound))
}

func TestService_GenerateThumbnailByToken_UnsupportedFileType(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockDao := dao.NewMockDao(t)
	mockRedis := setupTestRedis(t)
	fileToken := uuid.New()
	fileEntry := &mod.FileEntry{
		Token:     fileToken,
		MediaType: "application/pdf",
		Extension: "pdf",
		FileName:  "test",
	}
	mockDao.EXPECT().GetFileEntry(fileToken).Return(fileEntry, nil)
	mockProcessor.EXPECT().SupportsFile(mock.Anything).Return(false)
	svc := newTestService(mockDao, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailByToken(fileToken, true)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, ErrUnsupportedFileType))
}

func TestService_GenerateThumbnailByToken_ProcessorError(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockDao := dao.NewMockDao(t)
	mockRedis := setupTestRedis(t)
	fileToken := uuid.New()
	fileEntry := &mod.FileEntry{
		Token:     fileToken,
		MediaType: "image/jpeg",
		Extension: "jpg",
		FileName:  "test",
	}
	expectedErr := errors.New("processing failed")
	mockDao.EXPECT().GetFileEntry(fileToken).Return(fileEntry, nil)
	mockProcessor.EXPECT().SupportsFile(mock.Anything).Return(true)
	mockProcessor.EXPECT().GenerateThumbnail(mock.Anything, true).Return(nil, expectedErr)
	svc := newTestService(mockDao, mockProcessor, mockRedis)

	// when
	result, err := svc.GenerateThumbnailByToken(fileToken, true)

	// then
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, expectedErr, err)
}

func TestService_IsAlbumLoading(t *testing.T) {
	// given
	mockRedis := setupTestRedis(t)
	daoService := dao.NewMockDao(t)
	svc := newTestService(daoService, nil, mockRedis)
	albumProcessing.Store(123, true)
	defer albumProcessing.Delete(123)

	// when
	loading := svc.IsAlbumLoading(123)
	notLoading := svc.IsAlbumLoading(456)

	// then
	assert.True(t, loading)
	assert.False(t, notLoading)
}

func TestService_GenerateThumbnailByToken_CacheHit(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockDao := dao.NewMockDao(t)
	mockRedis := setupTestRedis(t)
	fileToken := uuid.New()
	cachedThumbnail := []byte("cached_thumbnail")
	svc := newTestService(mockDao, mockProcessor, mockRedis)
	serviceImpl := svc.(*service)
	cacheKey := fileToken.String() + ":animated"
	serviceImpl.storeThumbnailInCache(cacheKey, cachedThumbnail, 0)

	// when
	cacheValue := serviceImpl.getThumbnailFromCache(cacheKey)

	// then
	assert.NotNil(t, cacheValue)
	assert.Equal(t, cachedThumbnail, cacheValue)
}

func TestService_GenerateThumbnailFromURL_CacheHit(t *testing.T) {
	// given
	mockProcessor := NewMockProcessor(t)
	mockDao := dao.NewMockDao(t)
	mockRedis := setupTestRedis(t)
	url := "https://example.com/image.jpg"
	cachedThumbnail := []byte("cached_thumbnail")
	svc := newTestService(mockDao, mockProcessor, mockRedis)
	serviceImpl := svc.(*service)
	cacheKey := "url:" + url + ":animated"
	serviceImpl.storeThumbnailInCache(cacheKey, cachedThumbnail, 0)

	// when
	cacheValue := serviceImpl.getThumbnailFromCache(cacheKey)

	// then
	assert.NotNil(t, cacheValue)
	assert.Equal(t, cachedThumbnail, cacheValue)
}
